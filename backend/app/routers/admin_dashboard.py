import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from ..database import get_db
from ..security import get_admin_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])


class AdminStatsOut(BaseModel):
    completed_rides_today: int
    total_online_seats_today: int
    total_offline_seats_today: int


class PassengerDetail(BaseModel):
    seat_number: int
    name: str
    phone: str
    is_online: bool


class AdminRideDetail(BaseModel):
    ride_id: str
    vehicle_number: str
    driver_name: str
    driver_phone: str
    depart_time: str
    arrive_time: str
    status: str
    online_seats_count: int
    offline_seats_count: int
    passengers: List[PassengerDetail]


class AdminRidesOut(BaseModel):
    rides: List[AdminRideDetail]


@router.get("/stats", response_model=AdminStatsOut)
async def get_admin_stats(admin=Depends(get_admin_user)):
    db = get_db()
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    
    # 1. Completed rides today
    completed_rides = await db.rides.count_documents({
        "status": "completed",
        "created_at": {"$gte": today_start}
    })
    
    # 2. Total online and offline seats today across ALL rides
    # NOTE: booked_seats contains ALL occupied seats (offline + online).
    # Online-only = len(booked_seats) - len(offline_seats)
    pipeline = [
        {"$match": {"created_at": {"$gte": today_start}}},
        {"$group": {
            "_id": None,
            "total_booked": {"$sum": {"$size": {"$ifNull": ["$booked_seats", []]}}},
            "total_offline": {"$sum": {"$size": {"$ifNull": ["$offline_seats", []]}}}
        }}
    ]
    seat_stats = await db.rides.aggregate(pipeline).to_list(length=1)
    
    total_booked = seat_stats[0]["total_booked"] if seat_stats else 0
    total_offline = seat_stats[0]["total_offline"] if seat_stats else 0
    total_online = total_booked - total_offline
    
    return AdminStatsOut(
        completed_rides_today=completed_rides,
        total_online_seats_today=total_online,
        total_offline_seats_today=total_offline
    )


@router.get("/rides", response_model=AdminRidesOut)
async def get_admin_rides(
    date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    admin=Depends(get_admin_user)
):
    db = get_db()
    
    query = {}
    if date:
        # e.g., "2024-05-09"
        try:
            # We filter by the date string in the DB (since it's stored as "YYYY-MM-DD" inside 'date' field)
            # The 'date' field in Ride is exactly that string.
            query["date"] = date
        except ValueError:
            pass
    else:
        # Defaults to today's date string
        today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        query["date"] = today_str
        
    rides = await db.rides.find(query).to_list(length=100)
    
    result_rides = []
    
    for ride in rides:
        ride_id = ride.get("id")
        booked_seats = set(ride.get("booked_seats", []))
        offline_seats = set(ride.get("offline_seats", []))
        # Online seats = all booked minus the offline ones
        online_only_seats = booked_seats - offline_seats
        
        passengers = []
        
        # Add offline seats
        for seat in sorted(offline_seats):
            passengers.append(
                PassengerDetail(
                    seat_number=seat,
                    name="Offline Seat",
                    phone="",
                    is_online=False
                )
            )
            
        # Add online seats by fetching confirmed bookings
        if online_only_seats:
            bookings = await db.requests.find({
                "ride_id": ride_id,
                "status": "confirmed"
            }).to_list(length=100)
            
            for booking in bookings:
                user_name = booking.get("user_name", "")
                user_phone = booking.get("user_phone", "")
                
                # Check guest passengers
                guests = booking.get("guest_passengers", [])
                guest_map = {g["seat_number"]: g for g in guests}
                
                for seat in booking.get("seat_numbers", []):
                    if seat not in online_only_seats:
                        continue  # skip seats that aren't actually online
                    if seat in guest_map:
                        g = guest_map[seat]
                        passengers.append(
                            PassengerDetail(
                                seat_number=seat,
                                name=f"{g.get('name')} (Guest of {user_name})",
                                phone=g.get('phone', user_phone),
                                is_online=True
                            )
                        )
                    else:
                        passengers.append(
                            PassengerDetail(
                                seat_number=seat,
                                name=user_name,
                                phone=user_phone,
                                is_online=True
                            )
                        )
        
        # Sort passengers by seat number
        passengers.sort(key=lambda x: x.seat_number)
        
        result_rides.append(
            AdminRideDetail(
                ride_id=ride_id,
                vehicle_number=ride.get("vehicle_number", ""),
                driver_name=ride.get("driver_name", ""),
                driver_phone=ride.get("driver_phone", ""),
                depart_time=ride.get("depart_time", ""),
                arrive_time=ride.get("arrive_time", ""),
                status=ride.get("status", ""),
                online_seats_count=len(online_only_seats),
                offline_seats_count=len(offline_seats),
                passengers=passengers
            )
        )
        
    return AdminRidesOut(rides=result_rides)
