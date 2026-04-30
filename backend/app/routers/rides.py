from typing import Optional
from fastapi import APIRouter, HTTPException
from ..database import get_db
from ..models.ride import Ride, PublishRideIn, OfflineSeatsIn
from ..helpers import ride_public, can_cancel, is_departed, is_completed_after_arrival
from ..notifications import send_notification

router = APIRouter(prefix="/rides", tags=["rides"])


async def auto_mark_departed_rides() -> None:
    """
    Lazily advance ride lifecycle by time:
    - ride.status: published -> departed
    - pending requests for that ride -> cancelled
    - affected passengers receive in-app notification
    - ride.status: departed -> completed (after arrival + 10 min)
    - confirmed requests for that ride -> completed
    """
    db = get_db()
    published = await db.rides.find({"status": "published"}, {"_id": 0}).to_list(500)
    for ride in published:
        if not is_departed(ride["date"], ride["depart_time"]):
            continue

        # Move status once; if already updated by another request, skip side-effects.
        result = await db.rides.update_one(
            {"id": ride["id"], "status": "published"},
            {"$set": {"status": "departed"}},
        )
        if result.matched_count == 0:
            continue

        pending_requests = await db.requests.find(
            {"ride_id": ride["id"], "status": "pending"},
            {"_id": 0},
        ).to_list(500)
        if pending_requests:
            await db.requests.update_many(
                {"ride_id": ride["id"], "status": "pending"},
                {"$set": {"status": "cancelled"}},
            )
            for req in pending_requests:
                await send_notification(
                    recipient_phone=req["user_phone"],
                    title="Ride Departed",
                    body=(
                        f"Your pending request for the {ride['date']} ride to "
                        f"{ride['to_city']} was auto-cancelled because the ride has departed."
                    ),
                    data={"type": "ride_departed", "ride_id": ride["id"], "request_id": req["id"]},
                )

    # Complete departed rides once arrival time + grace period has elapsed.
    departed = await db.rides.find({"status": "departed"}, {"_id": 0}).to_list(500)
    for ride in departed:
        if not is_completed_after_arrival(ride["date"], ride["arrive_time"], grace_minutes=10):
            continue
        result = await db.rides.update_one(
            {"id": ride["id"], "status": "departed"},
            {"$set": {"status": "completed"}},
        )
        if result.matched_count == 0:
            continue
        await db.requests.update_many(
            {"ride_id": ride["id"], "status": "confirmed"},
            {"$set": {"status": "completed"}},
        )


@router.post("", response_model=Ride)
async def publish_ride(payload: PublishRideIn):
    # Ride publishing copies vehicle snapshot data from driver profile so later
    # profile edits do not rewrite historical ride records.
    db = get_db()
    await auto_mark_departed_rides()
    driver = await db.users.find_one({"phone": payload.driver_phone, "role": "driver"}, {"_id": 0})
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    if not driver.get("seat_layout"):
        raise HTTPException(status_code=400, detail="Driver has no vehicle set up")
    if is_departed(payload.date, payload.depart_time):
        raise HTTPException(status_code=400, detail="Departure time already passed")
    same_day_active = await db.rides.find_one(
        {
            "driver_phone": payload.driver_phone,
            "date": payload.date,
            "status": {"$in": ["published", "departed"]},
        },
        {"_id": 0, "id": 1},
    )
    if same_day_active:
        raise HTTPException(
            status_code=400,
            detail="Finish or cancel your existing ride for this date before publishing a new one",
        )
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
    # Default listing is passenger-safe (published only). Driver-specific query
    # can include non-published records for management screens.
    db = get_db()
    await auto_mark_departed_rides()
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
    await auto_mark_departed_rides()
    db = get_db()
    r = await db.rides.find_one({"id": ride_id}, {"_id": 0})
    if not r:
        raise HTTPException(status_code=404, detail="Ride not found")
    return ride_public(r)


@router.post("/{ride_id}/offline-seats", response_model=Ride)
async def update_offline_seats(ride_id: str, payload: OfflineSeatsIn):
    # Offline-seat edits preserve already confirmed online seats so driver
    # manual blocks never overwrite paid/accepted passenger allocations.
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
    # Ride cancellation cascades to active requests and informs affected
    # passengers through the in-app notification stream.
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
