import uuid
from datetime import datetime, timezone
from typing import Literal, Optional, List
from pydantic import BaseModel, Field

Role = Literal["user", "driver"]


class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    phone: str
    name: str
    role: Role
    vehicle_preset: Optional[str] = None
    vehicle_type: Optional[str] = None
    vehicle_number: Optional[str] = None
    total_seats: Optional[int] = None
    seat_layout: Optional[List[List[int]]] = None
    push_token: Optional[str] = None  # Expo push token for device notifications
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class OtpRequest(BaseModel):
    phone: str


class OtpVerify(BaseModel):
    phone: str
    otp: str


class RegisterIn(BaseModel):
    phone: str
    name: str
    role: Role
    vehicle_preset: Optional[str] = None
    vehicle_number: Optional[str] = None


class UpdateDriverVehicleIn(BaseModel):
    vehicle_preset: str
    vehicle_number: str
