from typing import Optional, List
from fastapi import APIRouter, HTTPException
from ..database import get_db
from ..models.request import BookingRequest, CreateRequestIn
from ..helpers import generate_ref, can_cancel
from ..notifications import send_notification, fire_and_forget

router = APIRouter(prefix="/requests", tags=["requests"])


@router.post("", response_model=BookingRequest)
async def create_request(payload: CreateRequestIn):
    db = get_db()
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
    reserved = {s for p in pending for s in p["seat_numbers"]}
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

    fire_and_forget(send_notification(
        recipient_phone=ride["driver_phone"],
        title="New Seat Request",
        body=f"{req.user_name} wants {len(req.seat_numbers)} seat(s) on your {req.date} ride.",
        data={"type": "new_request", "request_id": req.id, "ride_id": req.ride_id},
    ))

    return req


@router.get("", response_model=List[BookingRequest])
async def list_requests(user_phone: Optional[str] = None, driver_phone: Optional[str] = None):
    db = get_db()
    q: dict = {}
    if user_phone:
        q["user_phone"] = user_phone
    if driver_phone:
        q["driver_phone"] = driver_phone
    items = await db.requests.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [BookingRequest(**b) for b in items]


@router.get("/{req_id}", response_model=BookingRequest)
async def get_request(req_id: str):
    db = get_db()
    r = await db.requests.find_one({"id": req_id}, {"_id": 0})
    if not r:
        raise HTTPException(status_code=404, detail="Request not found")
    return BookingRequest(**r)


@router.post("/{req_id}/confirm", response_model=BookingRequest)
async def confirm_request(req_id: str):
    db = get_db()
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

    fire_and_forget(send_notification(
        recipient_phone=r["user_phone"],
        title="Booking Confirmed!",
        body=f"Your seat(s) on the {r['date']} ride to {r['to_city']} are confirmed.",
        data={"type": "booking_confirmed", "request_id": req_id},
    ))

    return BookingRequest(**r)


@router.post("/{req_id}/reject", response_model=BookingRequest)
async def reject_request(req_id: str):
    db = get_db()
    r = await db.requests.find_one({"id": req_id}, {"_id": 0})
    if not r:
        raise HTTPException(status_code=404, detail="Request not found")
    if r["status"] != "pending":
        raise HTTPException(status_code=400, detail=f"Cannot reject a {r['status']} request")
    await db.requests.update_one({"id": req_id}, {"$set": {"status": "rejected"}})
    r["status"] = "rejected"

    fire_and_forget(send_notification(
        recipient_phone=r["user_phone"],
        title="Booking Not Accepted",
        body=f"Your seat request for the {r['date']} ride to {r['to_city']} was not accepted.",
        data={"type": "booking_rejected", "request_id": req_id},
    ))

    return BookingRequest(**r)


@router.post("/{req_id}/cancel", response_model=BookingRequest)
async def cancel_request(req_id: str):
    db = get_db()
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

    fire_and_forget(send_notification(
        recipient_phone=r["driver_phone"],
        title="Booking Cancelled",
        body=f"{r['user_name']} cancelled their seat(s) on the {r['date']} ride.",
        data={"type": "booking_cancelled", "request_id": req_id},
    ))

    return BookingRequest(**r)
