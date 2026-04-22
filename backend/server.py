from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logger = logging.getLogger(__name__)


# -------------- Models --------------
Role = Literal['user', 'driver']


class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    phone: str
    name: str
    role: Role
    vehicle_type: Optional[str] = None
    vehicle_number: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class Ride(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    driver_id: str
    driver_phone: str
    driver_name: str
    vehicle_type: str
    vehicle_number: str
    from_city: str
    to_city: str
    from_stand: str
    to_stand: str
    date: str               # "YYYY-MM-DD"
    depart_time: str        # "06:30 AM"
    arrive_time: str        # "11:30 AM"
    duration: str           # "5h 00m"
    price: int
    total_seats: int = 6
    booked_seats: List[int] = []
    status: Literal['published', 'cancelled', 'completed'] = 'published'
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class RidePublic(Ride):
    seats_left: int = 0


class PublishRideIn(BaseModel):
    driver_phone: str
    from_city: str
    to_city: str
    from_stand: str
    to_stand: str
    date: str
    depart_time: str
    arrive_time: str
    duration: str
    price: int
    total_seats: int = 6


class BookingRequest(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    booking_ref: str
    ride_id: str
    user_phone: str
    user_name: str
    seat_numbers: List[int]
    total_price: int
    status: Literal['pending', 'confirmed', 'rejected', 'cancelled'] = 'pending'
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    # ride snapshot for ticket / lists
    from_city: str
    to_city: str
    from_stand: str
    to_stand: str
    date: str
    depart_time: str
    arrive_time: str
    duration: str
    vehicle_type: str
    vehicle_number: str
    driver_name: str
    driver_phone: str


class CreateRequestIn(BaseModel):
    ride_id: str
    user_phone: str
    seat_numbers: List[int]


# -------------- Auth (mock phone OTP) --------------
class OtpRequest(BaseModel):
    phone: str


class OtpVerify(BaseModel):
    phone: str
    otp: str


class RegisterIn(BaseModel):
    phone: str
    name: str
    role: Role
    vehicle_type: Optional[str] = None
    vehicle_number: Optional[str] = None


@api_router.post("/auth/request-otp")
async def request_otp(payload: OtpRequest):
    # mock — no SMS. Return always ok.
    logger.info(f"OTP requested for {payload.phone}")
    return {"ok": True, "message": "Use OTP 123456 (any 6-digit also accepted in demo)"}


@api_router.post("/auth/verify-otp")
async def verify_otp(payload: OtpVerify):
    if len(payload.otp) != 6 or not payload.otp.isdigit():
        raise HTTPException(status_code=400, detail="Invalid OTP")
    user = await db.users.find_one({"phone": payload.phone}, {"_id": 0})
    return {"ok": True, "user": user}  # user may be None → client shows register


@api_router.post("/auth/register", response_model=User)
async def register_user(payload: RegisterIn):
    existing = await db.users.find_one({"phone": payload.phone}, {"_id": 0})
    if existing:
        return User(**existing)
    u = User(**payload.dict())
    await db.users.insert_one(u.dict())
    return u


@api_router.get("/auth/me")
async def me(phone: str):
    u = await db.users.find_one({"phone": phone}, {"_id": 0})
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    return User(**u)


# -------------- Helpers --------------
def ride_public(r: dict) -> dict:
    booked = r.get("booked_seats", [])
    out = {**r, "seats_left": r["total_seats"] - len(booked)}
    out.pop("_id", None)
    return out


def parse_depart(date: str, depart: str) -> datetime:
    """Parse '2026-04-22' + '06:30 AM' → naive datetime."""
    return datetime.strptime(f"{date} {depart}", "%Y-%m-%d %I:%M %p")


def can_cancel(date: str, depart: str) -> bool:
    now = datetime.utcnow() + timedelta(hours=5, minutes=30)  # IST
    cutoff = parse_depart(date, depart) - timedelta(minutes=30)
    return now < cutoff


def generate_ref() -> str:
    return "UTK-" + uuid.uuid4().hex[:8].upper()


# -------------- Rides --------------
@api_router.post("/rides", response_model=Ride)
async def publish_ride(payload: PublishRideIn):
    driver = await db.users.find_one({"phone": payload.driver_phone, "role": "driver"}, {"_id": 0})
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    ride = Ride(
        driver_id=driver["id"],
        driver_phone=driver["phone"],
        driver_name=driver["name"],
        vehicle_type=driver.get("vehicle_type") or "Taxi",
        vehicle_number=driver.get("vehicle_number") or "—",
        **payload.dict(exclude={"driver_phone"}),
    )
    await db.rides.insert_one(ride.dict())
    return ride


@api_router.get("/rides")
async def list_rides(
    from_city: Optional[str] = None,
    to_city: Optional[str] = None,
    date: Optional[str] = None,
    driver_phone: Optional[str] = None,
):
    q: dict = {"status": "published"}
    if from_city:
        q["from_city"] = from_city
    if to_city:
        q["to_city"] = to_city
    if date:
        q["date"] = date
    if driver_phone:
        q.pop("status", None)  # driver sees own rides regardless of status
        q["driver_phone"] = driver_phone
    rides = await db.rides.find(q, {"_id": 0}).sort("date", 1).to_list(500)
    return [ride_public(r) for r in rides]


@api_router.get("/rides/{ride_id}")
async def get_ride(ride_id: str):
    r = await db.rides.find_one({"id": ride_id}, {"_id": 0})
    if not r:
        raise HTTPException(status_code=404, detail="Ride not found")
    return ride_public(r)


@api_router.post("/rides/{ride_id}/cancel")
async def cancel_ride(ride_id: str):
    r = await db.rides.find_one({"id": ride_id}, {"_id": 0})
    if not r:
        raise HTTPException(status_code=404, detail="Ride not found")
    if not can_cancel(r["date"], r["depart_time"]):
        raise HTTPException(status_code=400, detail="Cannot cancel within 30 minutes of departure")
    await db.rides.update_one({"id": ride_id}, {"$set": {"status": "cancelled"}})
    # auto-cancel all pending/confirmed requests
    await db.requests.update_many(
        {"ride_id": ride_id, "status": {"$in": ["pending", "confirmed"]}},
        {"$set": {"status": "cancelled"}},
    )
    return {"ok": True}


# -------------- Requests --------------
@api_router.post("/requests", response_model=BookingRequest)
async def create_request(payload: CreateRequestIn):
    ride = await db.rides.find_one({"id": payload.ride_id}, {"_id": 0})
    if not ride or ride["status"] != "published":
        raise HTTPException(status_code=404, detail="Ride not available")
    user = await db.users.find_one({"phone": payload.user_phone}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    booked = set(ride.get("booked_seats", []))
    # also consider pending requests to avoid double-request for same seat
    pending = await db.requests.find(
        {"ride_id": payload.ride_id, "status": "pending"}, {"_id": 0}
    ).to_list(100)
    reserved = set()
    for p in pending:
        reserved.update(p["seat_numbers"])
    for s in payload.seat_numbers:
        if s in booked:
            raise HTTPException(status_code=400, detail=f"Seat {s} already booked")
        if s in reserved:
            raise HTTPException(status_code=400, detail=f"Seat {s} pending another request")
        if s < 1 or s > ride["total_seats"]:
            raise HTTPException(status_code=400, detail=f"Invalid seat {s}")
    req = BookingRequest(
        booking_ref=generate_ref(),
        ride_id=ride["id"],
        user_phone=user["phone"],
        user_name=user["name"],
        seat_numbers=payload.seat_numbers,
        total_price=ride["price"] * len(payload.seat_numbers),
        from_city=ride["from_city"],
        to_city=ride["to_city"],
        from_stand=ride["from_stand"],
        to_stand=ride["to_stand"],
        date=ride["date"],
        depart_time=ride["depart_time"],
        arrive_time=ride["arrive_time"],
        duration=ride["duration"],
        vehicle_type=ride["vehicle_type"],
        vehicle_number=ride["vehicle_number"],
        driver_name=ride["driver_name"],
        driver_phone=ride["driver_phone"],
    )
    await db.requests.insert_one(req.dict())
    return req


@api_router.get("/requests", response_model=List[BookingRequest])
async def list_requests(user_phone: Optional[str] = None, driver_phone: Optional[str] = None):
    q = {}
    if user_phone:
        q["user_phone"] = user_phone
    if driver_phone:
        q["driver_phone"] = driver_phone
    items = await db.requests.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [BookingRequest(**b) for b in items]


@api_router.get("/requests/{req_id}", response_model=BookingRequest)
async def get_request(req_id: str):
    r = await db.requests.find_one({"id": req_id}, {"_id": 0})
    if not r:
        raise HTTPException(status_code=404, detail="Request not found")
    return BookingRequest(**r)


@api_router.post("/requests/{req_id}/confirm", response_model=BookingRequest)
async def confirm_request(req_id: str):
    r = await db.requests.find_one({"id": req_id}, {"_id": 0})
    if not r:
        raise HTTPException(status_code=404, detail="Request not found")
    if r["status"] != "pending":
        raise HTTPException(status_code=400, detail=f"Cannot confirm a {r['status']} request")
    ride = await db.rides.find_one({"id": r["ride_id"]}, {"_id": 0})
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    booked = set(ride.get("booked_seats", []))
    for s in r["seat_numbers"]:
        if s in booked:
            raise HTTPException(status_code=400, detail=f"Seat {s} already booked")
    new_booked = list(booked.union(set(r["seat_numbers"])))
    await db.rides.update_one({"id": ride["id"]}, {"$set": {"booked_seats": new_booked}})
    await db.requests.update_one({"id": req_id}, {"$set": {"status": "confirmed"}})
    r["status"] = "confirmed"
    return BookingRequest(**r)


@api_router.post("/requests/{req_id}/reject", response_model=BookingRequest)
async def reject_request(req_id: str):
    r = await db.requests.find_one({"id": req_id}, {"_id": 0})
    if not r:
        raise HTTPException(status_code=404, detail="Request not found")
    if r["status"] != "pending":
        raise HTTPException(status_code=400, detail=f"Cannot reject a {r['status']} request")
    await db.requests.update_one({"id": req_id}, {"$set": {"status": "rejected"}})
    r["status"] = "rejected"
    return BookingRequest(**r)


@api_router.post("/requests/{req_id}/cancel", response_model=BookingRequest)
async def cancel_request(req_id: str):
    r = await db.requests.find_one({"id": req_id}, {"_id": 0})
    if not r:
        raise HTTPException(status_code=404, detail="Request not found")
    if r["status"] in ("cancelled", "rejected"):
        raise HTTPException(status_code=400, detail="Already cancelled")
    if not can_cancel(r["date"], r["depart_time"]):
        raise HTTPException(status_code=400, detail="Cannot cancel within 30 minutes of departure")
    # free seats if already confirmed
    if r["status"] == "confirmed":
        ride = await db.rides.find_one({"id": r["ride_id"]}, {"_id": 0})
        if ride:
            freed = [s for s in ride.get("booked_seats", []) if s not in r["seat_numbers"]]
            await db.rides.update_one({"id": ride["id"]}, {"$set": {"booked_seats": freed}})
    await db.requests.update_one({"id": req_id}, {"$set": {"status": "cancelled"}})
    r["status"] = "cancelled"
    return BookingRequest(**r)


# -------------- Seed --------------
async def seed_demo():
    if await db.users.count_documents({}) > 0:
        return
    # demo drivers
    drivers = [
        User(phone="+91 98765 43210", name="Rakesh Negi", role="driver",
             vehicle_type="Toyota Innova Crysta", vehicle_number="UK 07 TA 1234"),
        User(phone="+91 98123 45678", name="Suresh Rana", role="driver",
             vehicle_type="Mahindra Bolero", vehicle_number="UK 07 TA 5678"),
    ]
    # demo user
    user = User(phone="+91 98765 00001", name="Aarav Sharma", role="user")
    for u in drivers + [user]:
        await db.users.insert_one(u.dict())
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    tomorrow = (datetime.now(timezone.utc) + timedelta(days=1)).strftime("%Y-%m-%d")
    demo_rides = [
        Ride(driver_id=drivers[0].id, driver_phone=drivers[0].phone, driver_name=drivers[0].name,
             vehicle_type=drivers[0].vehicle_type, vehicle_number=drivers[0].vehicle_number,
             from_city="Uttarkashi", to_city="Dehradun",
             from_stand="Uttarkashi Bus Stand", to_stand="Dehradun ISBT",
             date=today, depart_time="06:30 AM", arrive_time="11:30 AM", duration="5h 00m",
             price=450, total_seats=6),
        Ride(driver_id=drivers[1].id, driver_phone=drivers[1].phone, driver_name=drivers[1].name,
             vehicle_type=drivers[1].vehicle_type, vehicle_number=drivers[1].vehicle_number,
             from_city="Uttarkashi", to_city="Rishikesh",
             from_stand="Uttarkashi Bus Stand", to_stand="Rishikesh Tapovan",
             date=tomorrow, depart_time="08:00 AM", arrive_time="12:30 PM", duration="4h 30m",
             price=400, total_seats=6),
    ]
    for r in demo_rides:
        await db.rides.insert_one(r.dict())
    logger.info(f"Seeded {len(drivers)} drivers, 1 user, {len(demo_rides)} rides")


@api_router.get("/")
async def root():
    return {"message": "Uttarkashi Taxi Union API"}


app.include_router(api_router)
app.add_middleware(
    CORSMiddleware, allow_credentials=True,
    allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')


@app.on_event("startup")
async def startup_event():
    # drop old seed data from prior schema so the new model takes over cleanly
    if await db.trips.count_documents({}) > 0:
        await db.trips.drop()
    if await db.bookings.count_documents({}) > 0:
        await db.bookings.drop()
    await seed_demo()


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
