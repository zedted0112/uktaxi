import uuid
from datetime import datetime, timedelta, timezone
from typing import Literal, List, Optional
from pydantic import BaseModel, Field

SEAT_HOLD_MINUTES = 2


class GuestPassenger(BaseModel):
    seat_number: int
    name: str
    phone: str


class BookingRequest(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    booking_ref: Optional[str] = None
    ride_id: str
    user_phone: str
    user_name: str
    seat_numbers: List[int]
    total_price: int
    status: Literal["pending", "confirmed", "rejected", "cancelled", "completed"] = "pending"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    hold_expires_at: str = Field(
        default_factory=lambda: (datetime.now(timezone.utc) + timedelta(minutes=SEAT_HOLD_MINUTES)).isoformat()
    )
    cancel_reason: Optional[str] = None
    guest_passengers: List[GuestPassenger] = Field(default_factory=list)
    # Snapshot fields from the ride at booking time
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
    guest_name: Optional[str] = None
    guest_phone: Optional[str] = None
