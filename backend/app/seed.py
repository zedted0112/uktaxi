import logging
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase

from .config import SCHEMA_VERSION, ENABLE_DEMO_MODE
from .models.user import User
from .models.ride import Ride
from .models.vehicle import VEHICLES

logger = logging.getLogger(__name__)


async def seed_demo(db: AsyncIOMotorDatabase) -> None:
    if not ENABLE_DEMO_MODE:
        return
    # Demo seed runs only when schema changes or when DB is empty.
    # This keeps local environments reproducible for onboarding and tests.
    meta = await db.meta.find_one({"key": "schema"}) or {}
    if meta.get("version") == SCHEMA_VERSION and await db.users.count_documents({}) > 0:
        return

    # Seed reset is intentionally destructive for demo collections so stale
    # records never conflict with latest schema assumptions.
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
            vehicle_preset="innova", vehicle_type=VEHICLES["innova"]["name"],
            vehicle_number="UK 07 TA 5678",
            total_seats=VEHICLES["innova"]["total_seats"],
            seat_layout=VEHICLES["innova"]["seat_layout"],
        ),
        User(
            phone="+91 99887 76655", name="Mohan Rawat", role="driver",
            vehicle_preset="swift", vehicle_type=VEHICLES["swift"]["name"],
            vehicle_number="UK 07 TA 9999",
            total_seats=VEHICLES["swift"]["total_seats"],
            seat_layout=VEHICLES["swift"]["seat_layout"],
        ),
    ]
    passenger1 = User(phone="+91 98765 00001", name="Aarav Sharma", role="user")
    passenger2 = User(phone="+91 98765 00002", name="Priya Nautiyal", role="user")

    for u in drivers + [passenger1, passenger2]:
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
            price=400, booked_seats=[2], offline_seats=[2],
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

    # Schema marker allows future startups to skip unnecessary reseeding.
    await db.meta.update_one(
        {"key": "schema"},
        {"$set": {"key": "schema", "version": SCHEMA_VERSION}},
        upsert=True,
    )
    logger.info(f"Seeded {len(drivers)} drivers, 2 passengers, {len(rides)} rides (schema v{SCHEMA_VERSION})")
