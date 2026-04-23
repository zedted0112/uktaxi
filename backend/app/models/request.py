import uuid
from datetime import datetime, timezone
from typing import Literal, List
from pydantic import BaseModel, Field


class BookingRequest(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    booking_ref: str
    ride_id: str
    user_phone: str
    user_name: str
    seat_numbers: List[int]
    total_price: int
    status: Literal["pending", "confirmed", "rejected", "cancelled"] = "pending"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
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
