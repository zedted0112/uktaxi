import uuid
from datetime import datetime, timezone
from typing import Literal, List
from pydantic import BaseModel, Field


class Ride(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    driver_id: str
    driver_phone: str
    driver_name: str
    vehicle_type: str
    vehicle_number: str
    seat_layout: List[List[int]]
    from_city: str
    to_city: str
    from_stand: str
    to_stand: str
    date: str
    depart_time: str
    arrive_time: str
    duration: str
    price: int
    total_seats: int
    booked_seats: List[int] = []
    offline_seats: List[int] = []
    status: Literal["published", "departed", "cancelled", "completed"] = "published"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class RidePublic(Ride):
    seats_left: int = 0


class PublishRideIn(BaseModel):
    driver_phone: str
    from_city: str
    to_city: str
    from_stand: str
    to_stand: str
    date: str
    depart_time: str
    arrive_time: str
    duration: str
    price: int
    offline_seats: List[int] = []


class OfflineSeatsIn(BaseModel):
    offline_seats: List[int]
