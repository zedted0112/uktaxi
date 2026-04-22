from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")


# ---------------- Models ----------------
class Trip(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    from_city: str
    to_city: str
    from_stand: str
    to_stand: str
    depart_time: str  # "07:00 AM"
    arrive_time: str  # "11:30 AM"
    duration: str  # "4h 30m"
    date: str  # "2026-02-14"
    price: int  # per seat in INR
    total_seats: int = 6
    booked_seats: List[int] = []
    vehicle_type: str  # "Innova Crysta"
    vehicle_number: str  # "UK 07 1234"
    driver_name: str
    driver_phone: str

class TripPublic(BaseModel):
    id: str
    from_city: str
    to_city: str
    from_stand: str
    to_stand: str
    depart_time: str
    arrive_time: str
    duration: str
    date: str
    price: int
    total_seats: int
    booked_seats: List[int]
    seats_left: int
    vehicle_type: str
    vehicle_number: str
    driver_name: str
    driver_phone: str

class BookingCreate(BaseModel):
    trip_id: str
    user_name: str
    user_phone: str
    seat_numbers: List[int]

class Booking(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    booking_ref: str
    trip_id: str
    user_name: str
    user_phone: str
    seat_numbers: List[int]
    total_price: int
    status: str = "pending"  # pending | confirmed | cancelled
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    # snapshot of trip for ticket display
    from_city: str
    to_city: str
    from_stand: str
    to_stand: str
    depart_time: str
    arrive_time: str
    duration: str
    date: str
    vehicle_type: str
    vehicle_number: str
    driver_name: str
    driver_phone: str


# ---------------- Helpers ----------------
def trip_to_public(t: dict) -> TripPublic:
    booked = t.get("booked_seats", [])
    return TripPublic(
        id=t["id"],
        from_city=t["from_city"],
        to_city=t["to_city"],
        from_stand=t["from_stand"],
        to_stand=t["to_stand"],
        depart_time=t["depart_time"],
        arrive_time=t["arrive_time"],
        duration=t["duration"],
        date=t["date"],
        price=t["price"],
        total_seats=t["total_seats"],
        booked_seats=booked,
        seats_left=t["total_seats"] - len(booked),
        vehicle_type=t["vehicle_type"],
        vehicle_number=t["vehicle_number"],
        driver_name=t["driver_name"],
        driver_phone=t["driver_phone"],
    )


def generate_booking_ref() -> str:
    return "UTK-" + uuid.uuid4().hex[:8].upper()


# ---------------- Seed Data ----------------
async def seed_trips():
    count = await db.trips.count_documents({})
    if count > 0:
        return
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    seed = [
        {
            "from_city": "Uttarkashi", "to_city": "Dehradun",
            "from_stand": "Uttarkashi Bus Stand", "to_stand": "Dehradun ISBT",
            "depart_time": "06:30 AM", "arrive_time": "11:30 AM", "duration": "5h 00m",
            "date": today, "price": 450,
            "vehicle_type": "Toyota Innova Crysta", "vehicle_number": "UK 07 TA 1234",
            "driver_name": "Rakesh Negi", "driver_phone": "+91 98765 43210",
            "booked_seats": [2, 5],
        },
        {
            "from_city": "Uttarkashi", "to_city": "Dehradun",
            "from_stand": "Uttarkashi Bus Stand", "to_stand": "Dehradun ISBT",
            "depart_time": "02:00 PM", "arrive_time": "07:00 PM", "duration": "5h 00m",
            "date": today, "price": 500,
            "vehicle_type": "Mahindra Bolero", "vehicle_number": "UK 07 TA 5678",
            "driver_name": "Suresh Rana", "driver_phone": "+91 98123 45678",
            "booked_seats": [1],
        },
        {
            "from_city": "Dehradun", "to_city": "Uttarkashi",
            "from_stand": "Dehradun ISBT", "to_stand": "Uttarkashi Bus Stand",
            "depart_time": "07:00 AM", "arrive_time": "12:30 PM", "duration": "5h 30m",
            "date": today, "price": 450,
            "vehicle_type": "Toyota Innova Crysta", "vehicle_number": "UK 07 TA 9012",
            "driver_name": "Vinod Bhatt", "driver_phone": "+91 99887 76655",
            "booked_seats": [3, 4, 6],
        },
        {
            "from_city": "Uttarkashi", "to_city": "Rishikesh",
            "from_stand": "Uttarkashi Bus Stand", "to_stand": "Rishikesh Tapovan",
            "depart_time": "08:00 AM", "arrive_time": "12:30 PM", "duration": "4h 30m",
            "date": today, "price": 400,
            "vehicle_type": "Toyota Innova Crysta", "vehicle_number": "UK 07 TA 3456",
            "driver_name": "Mohan Rawat", "driver_phone": "+91 97654 32109",
            "booked_seats": [],
        },
        {
            "from_city": "Uttarkashi", "to_city": "Rishikesh",
            "from_stand": "Uttarkashi Bus Stand", "to_stand": "Rishikesh Tapovan",
            "depart_time": "03:30 PM", "arrive_time": "08:00 PM", "duration": "4h 30m",
            "date": today, "price": 420,
            "vehicle_type": "Mahindra Scorpio", "vehicle_number": "UK 07 TA 7890",
            "driver_name": "Deepak Semwal", "driver_phone": "+91 98012 34567",
            "booked_seats": [2],
        },
        {
            "from_city": "Rishikesh", "to_city": "Uttarkashi",
            "from_stand": "Rishikesh Tapovan", "to_stand": "Uttarkashi Bus Stand",
            "depart_time": "09:00 AM", "arrive_time": "01:30 PM", "duration": "4h 30m",
            "date": today, "price": 400,
            "vehicle_type": "Toyota Innova Crysta", "vehicle_number": "UK 07 TA 2345",
            "driver_name": "Pawan Uniyal", "driver_phone": "+91 97712 34567",
            "booked_seats": [4, 5],
        },
    ]
    for t in seed:
        obj = Trip(**t)
        await db.trips.insert_one(obj.dict())
    logger.info(f"Seeded {len(seed)} trips")


# ---------------- Routes ----------------
@api_router.get("/")
async def root():
    return {"message": "Uttarkashi Taxi Union API"}


@api_router.get("/trips", response_model=List[TripPublic])
async def list_trips(from_city: Optional[str] = None, to_city: Optional[str] = None):
    query = {}
    if from_city:
        query["from_city"] = from_city
    if to_city:
        query["to_city"] = to_city
    trips = await db.trips.find(query, {"_id": 0}).to_list(500)
    return [trip_to_public(t) for t in trips]


@api_router.get("/trips/{trip_id}", response_model=TripPublic)
async def get_trip(trip_id: str):
    t = await db.trips.find_one({"id": trip_id}, {"_id": 0})
    if not t:
        raise HTTPException(status_code=404, detail="Trip not found")
    return trip_to_public(t)


@api_router.post("/bookings", response_model=Booking)
async def create_booking(payload: BookingCreate):
    t = await db.trips.find_one({"id": payload.trip_id}, {"_id": 0})
    if not t:
        raise HTTPException(status_code=404, detail="Trip not found")
    booked = set(t.get("booked_seats", []))
    for s in payload.seat_numbers:
        if s in booked:
            raise HTTPException(status_code=400, detail=f"Seat {s} already booked")
        if s < 1 or s > t["total_seats"]:
            raise HTTPException(status_code=400, detail=f"Invalid seat {s}")
    new_booked = list(booked.union(set(payload.seat_numbers)))
    await db.trips.update_one({"id": payload.trip_id}, {"$set": {"booked_seats": new_booked}})

    booking = Booking(
        booking_ref=generate_booking_ref(),
        trip_id=payload.trip_id,
        user_name=payload.user_name,
        user_phone=payload.user_phone,
        seat_numbers=payload.seat_numbers,
        total_price=t["price"] * len(payload.seat_numbers),
        status="pending",
        from_city=t["from_city"],
        to_city=t["to_city"],
        from_stand=t["from_stand"],
        to_stand=t["to_stand"],
        depart_time=t["depart_time"],
        arrive_time=t["arrive_time"],
        duration=t["duration"],
        date=t["date"],
        vehicle_type=t["vehicle_type"],
        vehicle_number=t["vehicle_number"],
        driver_name=t["driver_name"],
        driver_phone=t["driver_phone"],
    )
    await db.bookings.insert_one(booking.dict())
    return booking


@api_router.get("/bookings", response_model=List[Booking])
async def list_bookings(user_phone: Optional[str] = None):
    query = {}
    if user_phone:
        query["user_phone"] = user_phone
    items = await db.bookings.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [Booking(**b) for b in items]


@api_router.get("/bookings/{booking_id}", response_model=Booking)
async def get_booking(booking_id: str):
    b = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not b:
        raise HTTPException(status_code=404, detail="Booking not found")
    return Booking(**b)


@api_router.get("/driver/trips/{driver_phone}")
async def driver_trips(driver_phone: str):
    trips = await db.trips.find({"driver_phone": driver_phone}, {"_id": 0}).to_list(100)
    result = []
    for t in trips:
        bookings = await db.bookings.find({"trip_id": t["id"]}, {"_id": 0}).to_list(100)
        result.append({
            "trip": trip_to_public(t).dict(),
            "bookings": [Booking(**b).dict() for b in bookings],
        })
    return result


@api_router.get("/driver/all")
async def driver_all():
    """Return all trips + bookings for demo driver portal."""
    trips = await db.trips.find({}, {"_id": 0}).to_list(500)
    result = []
    for t in trips:
        bookings = await db.bookings.find({"trip_id": t["id"]}, {"_id": 0}).to_list(100)
        result.append({
            "trip": trip_to_public(t).dict(),
            "bookings": [Booking(**b).dict() for b in bookings],
        })
    return result


@api_router.post("/bookings/{booking_id}/confirm", response_model=Booking)
async def confirm_booking(booking_id: str):
    b = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not b:
        raise HTTPException(status_code=404, detail="Booking not found")
    await db.bookings.update_one({"id": booking_id}, {"$set": {"status": "confirmed"}})
    b["status"] = "confirmed"
    return Booking(**b)


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def startup_event():
    await seed_trips()


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
