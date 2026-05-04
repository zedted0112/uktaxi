from datetime import datetime, timezone, timedelta
from typing import Optional, List
import uuid
from fastapi import APIRouter, Depends, HTTPException
from ..database import get_db
from ..models.request import BookingRequest, CreateRequestIn, SEAT_HOLD_MINUTES, GuestPassenger
from ..helpers import generate_ref, can_cancel
from ..notifications import send_notification
from .rides import auto_mark_departed_rides
from ..security import get_current_user

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
async def create_request(payload: CreateRequestIn, current=Depends(get_current_user)):
    # Booking creation validates seat availability against both confirmed seats
    # and pending requests to reduce double-allocation risk.
    db = get_db()
    if current["role"] != "user":
        raise HTTPException(status_code=403, detail="Only passengers can create booking requests")
    ride = await db.rides.find_one({"id": payload.ride_id}, {"_id": 0})
    if not ride or ride["status"] != "published":
        raise HTTPException(status_code=404, detail="Ride not available")
    if payload.user_phone != current["phone"]:
        raise HTTPException(status_code=403, detail="user_phone does not match authenticated user")
    user = await db.users.find_one({"id": current["id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not payload.seat_numbers:
        raise HTTPException(status_code=400, detail="At least one seat is required")
    if len(set(payload.seat_numbers)) != len(payload.seat_numbers):
        raise HTTPException(status_code=400, detail="Duplicate seat numbers are not allowed")

    now = datetime.now(timezone.utc)
    canonical_phone = user["phone"]
    confirmed_requests = await db.requests.find(
        {"user_phone": canonical_phone, "status": "confirmed"}, {"_id": 0}
    ).to_list(200)
    confirmed_same_request = next((req for req in confirmed_requests if req["ride_id"] == payload.ride_id), None)
    confirmed_same_ride = confirmed_same_request is not None
    confirmed_other_ride = any(req["ride_id"] != payload.ride_id for req in confirmed_requests)
    if confirmed_other_ride:
        raise HTTPException(
            status_code=400,
            detail="You already have a confirmed booking on another ride",
        )
    if confirmed_same_ride and (not payload.guest_name or not payload.guest_phone):
        raise HTTPException(
            status_code=400,
            detail="Guest name and phone are required for an additional seat on this ride",
        )

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

    if confirmed_same_request:
        if len(payload.seat_numbers) != 1:
            raise HTTPException(
                status_code=400,
                detail="Add one guest seat at a time on an existing confirmed booking",
            )
        seat_number = payload.seat_numbers[0]
        guest_passengers = list(confirmed_same_request.get("guest_passengers", []))
        guest_passengers.append(
            GuestPassenger(
                seat_number=seat_number,
                name=payload.guest_name.strip(),
                phone=payload.guest_phone.strip(),
            ).dict()
        )
        merged_seats = list(set(confirmed_same_request.get("seat_numbers", []) + [seat_number]))
        merged_total = int(confirmed_same_request.get("total_price", 0)) + int(ride["price"])

        await db.rides.update_one(
            {"id": ride["id"]},
            {"$set": {"booked_seats": list(booked.union({seat_number}))}},
        )
        await db.requests.update_one(
            {"id": confirmed_same_request["id"], "status": "confirmed"},
            {"$set": {"seat_numbers": merged_seats, "total_price": merged_total, "guest_passengers": guest_passengers}},
        )
        updated = await db.requests.find_one({"id": confirmed_same_request["id"]}, {"_id": 0})
        if updated is None:
            raise HTTPException(status_code=500, detail="Failed to update confirmed booking")
        await send_notification(
            recipient_phone=ride["driver_phone"],
            title="Guest Added To Booking",
            body=(
                f"{user['name']} added guest {payload.guest_name.strip()} "
                f"on seat {seat_number} for {ride['date']}."
            ),
            data={"type": "guest_added", "request_id": updated["id"], "ride_id": ride["id"]},
        )
        return BookingRequest(**updated)

    req = BookingRequest(
        ride_id=ride["id"],
        user_phone=canonical_phone,
        user_name=user["name"],
        seat_numbers=payload.seat_numbers,
        total_price=ride["price"] * len(payload.seat_numbers),
        hold_expires_at=(now + timedelta(minutes=SEAT_HOLD_MINUTES)).replace(microsecond=0).isoformat(),
        guest_passengers=[],
        from_city=ride["from_city"], to_city=ride["to_city"],
        from_stand=ride["from_stand"], to_stand=ride["to_stand"],
        date=ride["date"], depart_time=ride["depart_time"],
        arrive_time=ride["arrive_time"], duration=ride["duration"],
        vehicle_type=ride["vehicle_type"], vehicle_number=ride["vehicle_number"],
        driver_name=ride["driver_name"], driver_phone=ride["driver_phone"],
    )
    await db.requests.insert_one(req.dict(exclude_none=True))

    # Driver receives an in-app notification for every new passenger request.
    await send_notification(
        recipient_phone=ride["driver_phone"],
        title="New Seat Request",
        body=f"{req.user_name} wants {len(req.seat_numbers)} seat(s) on your {req.date} ride.",
        data={"type": "new_request", "request_id": req.id, "ride_id": req.ride_id},
    )

    return req


@router.get("", response_model=List[BookingRequest])
async def list_requests(
    user_phone: Optional[str] = None,
    driver_phone: Optional[str] = None,
    current=Depends(get_current_user),
):
    await auto_mark_departed_rides()
    db = get_db()
    q: dict = {}
    if user_phone:
        if user_phone != current["phone"]:
            raise HTTPException(status_code=403, detail="You can only view your own passenger requests")
        q["user_phone"] = user_phone
    if driver_phone:
        if driver_phone != current["phone"]:
            raise HTTPException(status_code=403, detail="You can only view your own driver requests")
        q["driver_phone"] = driver_phone
    if not user_phone and not driver_phone:
        q["user_phone" if current["role"] == "user" else "driver_phone"] = current["phone"]
    items = await db.requests.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [BookingRequest(**b) for b in items]


@router.get("/{req_id}", response_model=BookingRequest)
async def get_request(req_id: str, current=Depends(get_current_user)):
    await auto_mark_departed_rides()
    db = get_db()
    r = await db.requests.find_one({"id": req_id}, {"_id": 0})
    if not r:
        raise HTTPException(status_code=404, detail="Request not found")
    if current["phone"] not in (r.get("user_phone"), r.get("driver_phone")):
        raise HTTPException(status_code=403, detail="You cannot access this request")
    return BookingRequest(**r)


@router.post("/{req_id}/confirm", response_model=BookingRequest)
async def confirm_request(req_id: str, driver_phone: str, current=Depends(get_current_user)):
    if current["role"] != "driver":
        raise HTTPException(status_code=403, detail="Only drivers can confirm requests")
    if driver_phone != current["phone"]:
        raise HTTPException(status_code=403, detail="driver_phone does not match authenticated user")
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
    booking_ref = r.get("booking_ref") or generate_ref()
    await db.requests.update_one(
        {"id": req_id},
        {"$set": {"status": "confirmed", "booking_ref": booking_ref}},
    )
    r["status"] = "confirmed"
    r["booking_ref"] = booking_ref

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
async def reject_request(req_id: str, current=Depends(get_current_user)):
    # Rejection is allowed only for pending requests to preserve state integrity.
    db = get_db()
    r = await db.requests.find_one({"id": req_id}, {"_id": 0})
    if not r:
        raise HTTPException(status_code=404, detail="Request not found")
    if current["role"] != "driver" or r.get("driver_phone") != current["phone"]:
        raise HTTPException(status_code=403, detail="Only this ride's driver can reject the request")
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
async def cancel_request(req_id: str, current=Depends(get_current_user)):
    # Passenger cancellation respects the same departure cutoff as ride cancel.
    db = get_db()
    r = await db.requests.find_one({"id": req_id}, {"_id": 0})
    if not r:
        raise HTTPException(status_code=404, detail="Request not found")
    if current["phone"] != r.get("user_phone"):
        raise HTTPException(status_code=403, detail="Only the passenger can cancel this request")
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
