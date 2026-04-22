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

SCHEMA_VERSION = 4  # bump to trigger reseed

# -------------- Vehicle Catalog --------------
# seat_layout = list of rows; each row is list of seat numbers (0 = aisle/gap)
VEHICLES = {
    "bolero": {
        "id": "bolero",
        "name": "Mahindra Bolero",
        "type": "SUV",
        "total_seats": 9,
        "seat_layout": [[1], [2, 3, 4, 5], [6, 7, 8, 9]],  # 1 front + 4 middle + 4 rear
        "image": "https://images.unsplash.com/photo-1758219944472-745f682c70f8?w=600&q=80",
    },
    "innova": {
        "id": "innova",
        "name": "Toyota Innova Crysta",
        "type": "MUV",
        "total_seats": 6,
        "seat_layout": [[1], [2, 3, 4], [5, 6]],
        "image": "https://images.unsplash.com/photo-1758219944472-745f682c70f8?w=600&q=80",
    },
    "scorpio": {
        "id": "scorpio",
        "name": "Mahindra Scorpio",
        "type": "SUV",
        "total_seats": 7,
        "seat_layout": [[1], [2, 3, 4], [5, 6, 7]],
        "image": "https://images.unsplash.com/photo-1758219944472-745f682c70f8?w=600&q=80",
    },
    "eeco": {
        "id": "eeco",
        "name": "Maruti Eeco",
        "type": "Van",
        "total_seats": 4,
        "seat_layout": [[1], [2, 3, 4]],
        "image": "https://images.unsplash.com/photo-1758219944472-745f682c70f8?w=600&q=80",
    },
}


# -------------- Models --------------
Role = Literal['user', 'driver']


class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    phone: str
    name: str
    role: Role
    # driver-only
    vehicle_preset: Optional[str] = None   # id from VEHICLES
    vehicle_type: Optional[str] = None     # display name
    vehicle_number: Optional[str] = None
    total_seats: Optional[int] = None
    seat_layout: Optional[List[List[int]]] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class Ride(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    driver_id: str
    driver_phone: str
    driver_name: str
    vehicle_type: str
    vehicle_number: str
    seat_layout: List[List[int]]
    from_city: str
    to_city: str
    from_stand: str
    to_stand: str
    date: str
    depart_time: str
    arrive_time: str
    duration: str
    price: int
    total_seats: int
    booked_seats: List[int] = []          # both online-confirmed + offline
    offline_seats: List[int] = []         # driver-marked offline bookings
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
    offline_seats: List[int] = []


class OfflineSeatsIn(BaseModel):
    offline_seats: List[int]


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


class OtpRequest(BaseModel):
    phone: str


class OtpVerify(BaseModel):
    phone: str
    otp: str


class RegisterIn(BaseModel):
    phone: str
    name: str
    role: Role
    vehicle_preset: Optional[str] = None
    vehicle_number: Optional[str] = None


class UpdateDriverVehicleIn(BaseModel):
    vehicle_preset: str
    vehicle_number: str


# -------------- Helpers --------------
def ride_public(r: dict) -> dict:
    booked = r.get("booked_seats", [])
    out = {**r, "seats_left": r["total_seats"] - len(booked)}
    out.pop("_id", None)
    return out


def parse_depart(date: str, depart: str) -> datetime:
    return datetime.strptime(f"{date} {depart}", "%Y-%m-%d %I:%M %p")


def can_cancel(date: str, depart: str) -> bool:
    now = datetime.utcnow() + timedelta(hours=5, minutes=30)
    cutoff = parse_depart(date, depart) - timedelta(minutes=30)
    return now < cutoff


def generate_ref() -> str:
    return "UTK-" + uuid.uuid4().hex[:8].upper()


# -------------- Vehicles --------------
@api_router.get("/vehicles")
async def list_vehicles():
    return list(VEHICLES.values())


@api_router.get("/vehicles/{vehicle_id}")
async def get_vehicle(vehicle_id: str):
    v = VEHICLES.get(vehicle_id)
    if not v:
        raise HTTPException(status_code=404, detail="Unknown vehicle")
    return v


# -------------- Auth --------------
@api_router.post("/auth/request-otp")
async def request_otp(payload: OtpRequest):
    logger.info(f"OTP requested for {payload.phone}")
    return {"ok": True, "message": "Use OTP 123456 (any 6-digit also accepted in demo)"}


@api_router.post("/auth/verify-otp")
async def verify_otp(payload: OtpVerify):
    if len(payload.otp) != 6 or not payload.otp.isdigit():
        raise HTTPException(status_code=400, detail="Invalid OTP")
    user = await db.users.find_one({"phone": payload.phone}, {"_id": 0})
    return {"ok": True, "user": user}


@api_router.post("/auth/register", response_model=User)
async def register_user(payload: RegisterIn):
    existing = await db.users.find_one({"phone": payload.phone}, {"_id": 0})
    if existing:
        return User(**existing)
    data = payload.dict()
    if payload.role == "driver":
        preset = VEHICLES.get(payload.vehicle_preset or "")
        if not preset:
            raise HTTPException(status_code=400, detail="Invalid vehicle preset")
        data.update({
            "vehicle_preset": preset["id"],
            "vehicle_type": preset["name"],
            "total_seats": preset["total_seats"],
            "seat_layout": preset["seat_layout"],
        })
    u = User(**data)
    await db.users.insert_one(u.dict())
    return u


@api_router.get("/auth/me")
async def me(phone: str):
    u = await db.users.find_one({"phone": phone}, {"_id": 0})
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    return User(**u)


@api_router.post("/drivers/{phone}/vehicle", response_model=User)
async def update_vehicle(phone: str, payload: UpdateDriverVehicleIn):
    u = await db.users.find_one({"phone": phone, "role": "driver"}, {"_id": 0})
    if not u:
        raise HTTPException(status_code=404, detail="Driver not found")
    preset = VEHICLES.get(payload.vehicle_preset)
    if not preset:
        raise HTTPException(status_code=400, detail="Invalid vehicle preset")
    update = {
        "vehicle_preset": preset["id"],
        "vehicle_type": preset["name"],
        "vehicle_number": payload.vehicle_number,
        "total_seats": preset["total_seats"],
        "seat_layout": preset["seat_layout"],
    }
    await db.users.update_one({"phone": phone}, {"$set": update})
    u.update(update)
    return User(**u)


# -------------- Rides --------------
@api_router.post("/rides", response_model=Ride)
async def publish_ride(payload: PublishRideIn):
    driver = await db.users.find_one({"phone": payload.driver_phone, "role": "driver"}, {"_id": 0})
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    if not driver.get("seat_layout"):
        raise HTTPException(status_code=400, detail="Driver has no vehicle set up")
    # validate offline seats
    all_seats = {s for row in driver["seat_layout"] for s in row}
    for s in payload.offline_seats:
        if s not in all_seats:
            raise HTTPException(status_code=400, detail=f"Invalid offline seat {s}")
    ride = Ride(
        driver_id=driver["id"],
        driver_phone=driver["phone"],
        driver_name=driver["name"],
        vehicle_type=driver["vehicle_type"],
        vehicle_number=driver.get("vehicle_number") or "—",
        seat_layout=driver["seat_layout"],
        total_seats=driver["total_seats"],
        booked_seats=list(payload.offline_seats),
        offline_seats=list(payload.offline_seats),
        **payload.dict(exclude={"driver_phone", "offline_seats"}),
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
        q.pop("status", None)
        q["driver_phone"] = driver_phone
    rides = await db.rides.find(q, {"_id": 0}).sort("date", 1).to_list(500)
    return [ride_public(r) for r in rides]


@api_router.get("/rides/{ride_id}")
async def get_ride(ride_id: str):
    r = await db.rides.find_one({"id": ride_id}, {"_id": 0})
    if not r:
        raise HTTPException(status_code=404, detail="Ride not found")
    return ride_public(r)


@api_router.post("/rides/{ride_id}/offline-seats", response_model=Ride)
async def update_offline_seats(ride_id: str, payload: OfflineSeatsIn):
    r = await db.rides.find_one({"id": ride_id}, {"_id": 0})
    if not r:
        raise HTTPException(status_code=404, detail="Ride not found")
    # confirmed-online seats = booked minus current offline
    cur_offline = set(r.get("offline_seats", []))
    confirmed_online = set(r.get("booked_seats", [])) - cur_offline
    new_offline = set(payload.offline_seats)
    # offline cannot overlap with confirmed online
    conflict = confirmed_online & new_offline
    if conflict:
        raise HTTPException(status_code=400, detail=f"Seats already booked online: {sorted(conflict)}")
    all_seats = {s for row in r.get("seat_layout", []) for s in row}
    for s in new_offline:
        if s not in all_seats:
            raise HTTPException(status_code=400, detail=f"Invalid seat {s}")
    new_booked = list(confirmed_online | new_offline)
    await db.rides.update_one(
        {"id": ride_id},
        {"$set": {"offline_seats": list(new_offline), "booked_seats": new_booked}},
    )
    r["offline_seats"] = list(new_offline)
    r["booked_seats"] = new_booked
    return Ride(**r)


@api_router.post("/rides/{ride_id}/cancel")
async def cancel_ride(ride_id: str):
    r = await db.rides.find_one({"id": ride_id}, {"_id": 0})
    if not r:
        raise HTTPException(status_code=404, detail="Ride not found")
    if not can_cancel(r["date"], r["depart_time"]):
        raise HTTPException(status_code=400, detail="Cannot cancel within 30 minutes of departure")
    await db.rides.update_one({"id": ride_id}, {"$set": {"status": "cancelled"}})
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
    pending = await db.requests.find(
        {"ride_id": payload.ride_id, "status": "pending"}, {"_id": 0}
    ).to_list(200)
    reserved = set()
    for p in pending:
        reserved.update(p["seat_numbers"])
    all_seats = {s for row in ride.get("seat_layout", []) for s in row}
    for s in payload.seat_numbers:
        if s in booked:
            raise HTTPException(status_code=400, detail=f"Seat {s} already booked")
        if s in reserved:
            raise HTTPException(status_code=400, detail=f"Seat {s} pending another request")
        if s not in all_seats:
            raise HTTPException(status_code=400, detail=f"Invalid seat {s}")
    req = BookingRequest(
        booking_ref=generate_ref(),
        ride_id=ride["id"],
        user_phone=user["phone"],
        user_name=user["name"],
        seat_numbers=payload.seat_numbers,
        total_price=ride["price"] * len(payload.seat_numbers),
        from_city=ride["from_city"], to_city=ride["to_city"],
        from_stand=ride["from_stand"], to_stand=ride["to_stand"],
        date=ride["date"], depart_time=ride["depart_time"],
        arrive_time=ride["arrive_time"], duration=ride["duration"],
        vehicle_type=ride["vehicle_type"], vehicle_number=ride["vehicle_number"],
        driver_name=ride["driver_name"], driver_phone=ride["driver_phone"],
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
    meta = await db.meta.find_one({"key": "schema"}) or {}
    if meta.get("version") == SCHEMA_VERSION and await db.users.count_documents({}) > 0:
        return
    # reset collections
    await db.users.drop()
    await db.rides.drop()
    await db.requests.drop()

    drivers = [
        User(
            phone="+91 98765 43210", name="Rakesh Negi", role="driver",
            vehicle_preset="bolero", vehicle_type=VEHICLES["bolero"]["name"],
            vehicle_number="UK 07 TA 1234",
            total_seats=VEHICLES["bolero"]["total_seats"],
            seat_layout=VEHICLES["bolero"]["seat_layout"],
        ),
        User(
            phone="+91 98123 45678", name="Suresh Rana", role="driver",
            vehicle_preset="bolero", vehicle_type=VEHICLES["bolero"]["name"],
            vehicle_number="UK 07 TA 5678",
            total_seats=VEHICLES["bolero"]["total_seats"],
            seat_layout=VEHICLES["bolero"]["seat_layout"],
        ),
        User(
            phone="+91 99887 76655", name="Mohan Rawat", role="driver",
            vehicle_preset="eeco", vehicle_type=VEHICLES["eeco"]["name"],
            vehicle_number="UK 07 TA 9999",
            total_seats=VEHICLES["eeco"]["total_seats"],
            seat_layout=VEHICLES["eeco"]["seat_layout"],
        ),
    ]
    user = User(phone="+91 98765 00001", name="Aarav Sharma", role="user")
    user2 = User(phone="+91 98765 00002", name="Priya Nautiyal", role="user")
    for u in drivers + [user, user2]:
        await db.users.insert_one(u.dict())

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    tomorrow = (datetime.now(timezone.utc) + timedelta(days=1)).strftime("%Y-%m-%d")
    rides = [
        Ride(
            driver_id=drivers[0].id, driver_phone=drivers[0].phone, driver_name=drivers[0].name,
            vehicle_type=drivers[0].vehicle_type, vehicle_number=drivers[0].vehicle_number,
            seat_layout=drivers[0].seat_layout, total_seats=drivers[0].total_seats,
            from_city="Uttarkashi", to_city="Dehradun",
            from_stand="Uttarkashi Bus Stand", to_stand="Dehradun ISBT",
            date=today, depart_time="06:30 AM", arrive_time="11:30 AM", duration="5h 00m",
            price=450, booked_seats=[2, 5], offline_seats=[2, 5],
        ),
        Ride(
            driver_id=drivers[1].id, driver_phone=drivers[1].phone, driver_name=drivers[1].name,
            vehicle_type=drivers[1].vehicle_type, vehicle_number=drivers[1].vehicle_number,
            seat_layout=drivers[1].seat_layout, total_seats=drivers[1].total_seats,
            from_city="Uttarkashi", to_city="Rishikesh",
            from_stand="Uttarkashi Bus Stand", to_stand="Rishikesh Tapovan",
            date=tomorrow, depart_time="08:00 AM", arrive_time="12:30 PM", duration="4h 30m",
            price=400, booked_seats=[1], offline_seats=[1],
        ),
        Ride(
            driver_id=drivers[2].id, driver_phone=drivers[2].phone, driver_name=drivers[2].name,
            vehicle_type=drivers[2].vehicle_type, vehicle_number=drivers[2].vehicle_number,
            seat_layout=drivers[2].seat_layout, total_seats=drivers[2].total_seats,
            from_city="Dehradun", to_city="Uttarkashi",
            from_stand="Dehradun ISBT", to_stand="Uttarkashi Bus Stand",
            date=today, depart_time="02:00 PM", arrive_time="07:30 PM", duration="5h 30m",
            price=420, booked_seats=[], offline_seats=[],
        ),
    ]
    for r in rides:
        await db.rides.insert_one(r.dict())

    await db.meta.update_one(
        {"key": "schema"}, {"$set": {"key": "schema", "version": SCHEMA_VERSION}}, upsert=True
    )
    logger.info(f"Seeded {len(drivers)} drivers, 2 users, {len(rides)} rides (schema v{SCHEMA_VERSION})")


@api_router.get("/demo/accounts")
async def demo_accounts():
    """Return all seeded accounts for one-tap demo login."""
    items = await db.users.find({}, {"_id": 0}).to_list(100)
    return [User(**u).dict() for u in items]


@api_router.get("/")
async def root():
    return {"message": "Uttarkashi Taxi Union API", "schema": SCHEMA_VERSION}


app.include_router(api_router)
app.add_middleware(
    CORSMiddleware, allow_credentials=True,
    allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')


@app.on_event("startup")
async def startup_event():
    await seed_demo()


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
