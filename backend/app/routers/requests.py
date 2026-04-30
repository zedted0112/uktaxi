from datetime import datetime, timezone, timedelta
from typing import Optional, List
import uuid
from fastapi import APIRouter, HTTPException
from ..database import get_db
from ..models.request import BookingRequest, CreateRequestIn, SEAT_HOLD_MINUTES
from ..helpers import generate_ref, can_cancel
from ..notifications import send_notification
from .rides import auto_mark_departed_rides

router = APIRouter(prefix="/requests", tags=["requests"])


def _parse_utc(iso_value: str) -> datetime:
    return datetime.fromisoformat(iso_value.replace("Z", "+00:00")).astimezone(timezone.utc)


def _is_active_hold(req: dict, now: datetime) -> bool:
    if req.get("status") != "pending":
        return False
    hold_expires_at = req.get("hold_expires_at")
    if not hold_expires_at:
        return True
    return _parse_utc(hold_expires_at) >= now


@router.post("", response_model=BookingRequest)
async def create_request(payload: CreateRequestIn):
    # Booking creation validates seat availability against both confirmed seats
    # and pending requests to reduce double-allocation risk.
    db = get_db()
    ride = await db.rides.find_one({"id": payload.ride_id}, {"_id": 0})
    if not ride or ride["status"] != "published":
        raise HTTPException(status_code=404, detail="Ride not available")
    user = await db.users.find_one({"phone": payload.user_phone}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not payload.seat_numbers:
        raise HTTPException(status_code=400, detail="At least one seat is required")
    if len(set(payload.seat_numbers)) != len(payload.seat_numbers):
        raise HTTPException(status_code=400, detail="Duplicate seat numbers are not allowed")

    now = datetime.now(timezone.utc)
    canonical_phone = user["phone"]
    pending_count = await db.requests.count_documents({"user_phone": canonical_phone, "status": "pending"})
    if pending_count >= 4:
        raise HTTPException(status_code=400, detail="Maximum 4 active pending requests allowed")

    booked = set(ride.get("booked_seats", []))
    pending = await db.requests.find(
        {"ride_id": payload.ride_id, "status": "pending"}, {"_id": 0}
    ).to_list(200)
    reserved = {s for p in pending if _is_active_hold(p, now) for s in p["seat_numbers"]}
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
        user_phone=canonical_phone,
        user_name=user["name"],
        seat_numbers=payload.seat_numbers,
        total_price=ride["price"] * len(payload.seat_numbers),
        hold_expires_at=(now + timedelta(minutes=SEAT_HOLD_MINUTES)).replace(microsecond=0).isoformat(),
        from_city=ride["from_city"], to_city=ride["to_city"],
        from_stand=ride["from_stand"], to_stand=ride["to_stand"],
        date=ride["date"], depart_time=ride["depart_time"],
        arrive_time=ride["arrive_time"], duration=ride["duration"],
        vehicle_type=ride["vehicle_type"], vehicle_number=ride["vehicle_number"],
        driver_name=ride["driver_name"], driver_phone=ride["driver_phone"],
    )
    await db.requests.insert_one(req.dict())

    # Driver receives an in-app notification for every new passenger request.
    await send_notification(
        recipient_phone=ride["driver_phone"],
        title="New Seat Request",
        body=f"{req.user_name} wants {len(req.seat_numbers)} seat(s) on your {req.date} ride.",
        data={"type": "new_request", "request_id": req.id, "ride_id": req.ride_id},
    )

    return req


@router.get("", response_model=List[BookingRequest])
async def list_requests(user_phone: Optional[str] = None, driver_phone: Optional[str] = None):
    await auto_mark_departed_rides()
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
    await auto_mark_departed_rides()
    db = get_db()
    r = await db.requests.find_one({"id": req_id}, {"_id": 0})
    if not r:
        raise HTTPException(status_code=404, detail="Request not found")
    return BookingRequest(**r)


@router.post("/{req_id}/confirm", response_model=BookingRequest)
async def confirm_request(req_id: str, driver_phone: str):
    # Confirmation moves seats from "requested" to "booked" on the ride and
    # transitions request state in one handler.
    db = get_db()
    r = await db.requests.find_one({"id": req_id}, {"_id": 0})
    if not r:
        raise HTTPException(status_code=404, detail="Request not found")
    if r["status"] != "pending":
        raise HTTPException(status_code=400, detail=f"Cannot confirm a {r['status']} request")
    ride = await db.rides.find_one({"id": r["ride_id"]}, {"_id": 0})
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    if ride["status"] != "published":
        raise HTTPException(status_code=400, detail=f"Cannot confirm request for a {ride['status']} ride")
    if driver_phone != r["driver_phone"]:
        raise HTTPException(status_code=403, detail="Only this ride's driver can confirm the request")
    booked = set(ride.get("booked_seats", []))
    for s in r["seat_numbers"]:
        if s in booked:
            raise HTTPException(status_code=400, detail=f"Seat {s} already booked")
    new_booked = list(booked.union(set(r["seat_numbers"])))
    await db.rides.update_one({"id": ride["id"]}, {"$set": {"booked_seats": new_booked}})
    await db.requests.update_one({"id": req_id}, {"$set": {"status": "confirmed"}})
    r["status"] = "confirmed"

    # Passenger is notified so ticket state can be checked from alerts tab.
    await send_notification(
        recipient_phone=r["user_phone"],
        title="Booking Confirmed!",
        body=f"Your seat(s) on the {r['date']} ride to {r['to_city']} are confirmed.",
        data={"type": "booking_confirmed", "request_id": req_id},
    )

    # Once any ride is confirmed for this passenger, all other pending requests
    # are auto-cancelled to avoid multiple concurrent active bookings.
    cancel_batch = str(uuid.uuid4())
    await db.requests.update_many(
        {"user_phone": r["user_phone"], "status": "pending", "id": {"$ne": req_id}},
        {
            "$set": {
                "status": "cancelled",
                "cancel_reason": "Ride is booked by other Driver",
                "_auto_cancel_batch": cancel_batch,
            }
        },
    )
    auto_cancelled = await db.requests.find(
        {"_auto_cancel_batch": cancel_batch},
        {"_id": 0},
    ).to_list(200)
    if auto_cancelled:
        await db.requests.update_many(
            {"_auto_cancel_batch": cancel_batch},
            {"$unset": {"_auto_cancel_batch": ""}},
        )
        for pending_req in auto_cancelled:
            await send_notification(
                recipient_phone=pending_req["driver_phone"],
                title="Booking Request Auto-Cancelled",
                body=(
                    f"Passenger {pending_req['user_name']} request was cancelled. "
                    "Reason: Ride is booked by other Driver."
                ),
                data={"type": "booking_auto_cancelled", "request_id": pending_req["id"]},
            )
        await send_notification(
            recipient_phone=r["user_phone"],
            title="Other Requests Cancelled",
            body="Your remaining pending requests were cancelled. Reason: Ride is booked by other Driver.",
            data={"type": "booking_auto_cancelled_others", "request_id": req_id},
        )

    return BookingRequest(**r)


@router.post("/{req_id}/reject", response_model=BookingRequest)
async def reject_request(req_id: str):
    # Rejection is allowed only for pending requests to preserve state integrity.
    db = get_db()
    r = await db.requests.find_one({"id": req_id}, {"_id": 0})
    if not r:
        raise HTTPException(status_code=404, detail="Request not found")
    if r["status"] != "pending":
        raise HTTPException(status_code=400, detail=f"Cannot reject a {r['status']} request")
    await db.requests.update_one({"id": req_id}, {"$set": {"status": "rejected"}})
    r["status"] = "rejected"

    # Passenger receives a rejection event in the in-app inbox.
    await send_notification(
        recipient_phone=r["user_phone"],
        title="Booking Not Accepted",
        body=f"Your seat request for the {r['date']} ride to {r['to_city']} was not accepted.",
        data={"type": "booking_rejected", "request_id": req_id},
    )

    return BookingRequest(**r)


@router.post("/{req_id}/cancel", response_model=BookingRequest)
async def cancel_request(req_id: str):
    # Passenger cancellation respects the same departure cutoff as ride cancel.
    db = get_db()
    r = await db.requests.find_one({"id": req_id}, {"_id": 0})
    if not r:
        raise HTTPException(status_code=404, detail="Request not found")
    if r["status"] in ("cancelled", "rejected"):
        raise HTTPException(status_code=400, detail="Already cancelled")
    if not can_cancel(r["date"], r["depart_time"]):
        raise HTTPException(status_code=400, detail="Cannot cancel within 30 minutes of departure")
    if r["status"] == "confirmed":
        # Confirmed seats are released back to ride inventory on cancellation.
        ride = await db.rides.find_one({"id": r["ride_id"]}, {"_id": 0})
        if ride:
            freed = [s for s in ride.get("booked_seats", []) if s not in r["seat_numbers"]]
            await db.rides.update_one({"id": ride["id"]}, {"$set": {"booked_seats": freed}})
    await db.requests.update_one({"id": req_id}, {"$set": {"status": "cancelled"}})
    r["status"] = "cancelled"

    # Driver gets a cancellation notice so seat management stays in sync.
    await send_notification(
        recipient_phone=r["driver_phone"],
        title="Booking Cancelled",
        body=f"{r['user_name']} cancelled their seat(s) on the {r['date']} ride.",
        data={"type": "booking_cancelled", "request_id": req_id},
    )

    return BookingRequest(**r)
