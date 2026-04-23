from typing import Optional
from fastapi import APIRouter, HTTPException
from ..database import get_db
from ..models.ride import Ride, PublishRideIn, OfflineSeatsIn
from ..helpers import ride_public, can_cancel
from ..notifications import send_notification

router = APIRouter(prefix="/rides", tags=["rides"])


@router.post("", response_model=Ride)
async def publish_ride(payload: PublishRideIn):
    db = get_db()
    driver = await db.users.find_one({"phone": payload.driver_phone, "role": "driver"}, {"_id": 0})
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    if not driver.get("seat_layout"):
        raise HTTPException(status_code=400, detail="Driver has no vehicle set up")
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


@router.get("")
async def list_rides(
    from_city: Optional[str] = None,
    to_city: Optional[str] = None,
    date: Optional[str] = None,
    driver_phone: Optional[str] = None,
):
    db = get_db()
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


@router.get("/{ride_id}")
async def get_ride(ride_id: str):
    db = get_db()
    r = await db.rides.find_one({"id": ride_id}, {"_id": 0})
    if not r:
        raise HTTPException(status_code=404, detail="Ride not found")
    return ride_public(r)


@router.post("/{ride_id}/offline-seats", response_model=Ride)
async def update_offline_seats(ride_id: str, payload: OfflineSeatsIn):
    db = get_db()
    r = await db.rides.find_one({"id": ride_id}, {"_id": 0})
    if not r:
        raise HTTPException(status_code=404, detail="Ride not found")
    cur_offline = set(r.get("offline_seats", []))
    confirmed_online = set(r.get("booked_seats", [])) - cur_offline
    new_offline = set(payload.offline_seats)
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


@router.post("/{ride_id}/cancel")
async def cancel_ride(ride_id: str):
    db = get_db()
    r = await db.rides.find_one({"id": ride_id}, {"_id": 0})
    if not r:
        raise HTTPException(status_code=404, detail="Ride not found")
    if not can_cancel(r["date"], r["depart_time"]):
        raise HTTPException(status_code=400, detail="Cannot cancel within 30 minutes of departure")
    # Fetch affected passengers before cancelling so we can notify them
    affected = await db.requests.find(
        {"ride_id": ride_id, "status": {"$in": ["pending", "confirmed"]}},
        {"user_phone": 1, "_id": 0},
    ).to_list(200)

    await db.rides.update_one({"id": ride_id}, {"$set": {"status": "cancelled"}})
    await db.requests.update_many(
        {"ride_id": ride_id, "status": {"$in": ["pending", "confirmed"]}},
        {"$set": {"status": "cancelled"}},
    )

    # Notify each affected passenger
    for entry in affected:
        await send_notification(
            recipient_phone=entry["user_phone"],
            title="Ride Cancelled",
            body=f"The driver cancelled the {r['date']} ride to {r['to_city']}.",
            data={"type": "ride_cancelled", "ride_id": ride_id},
        )

    return {"ok": True}
