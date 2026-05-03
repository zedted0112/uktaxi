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
    email: Optional[str] = None
    google_sub: Optional[str] = None
    auth_provider: Optional[Literal["phone", "google"]] = "phone"
    vehicle_preset: Optional[str] = None
    vehicle_type: Optional[str] = None
    vehicle_number: Optional[str] = None
    driving_license: Optional[str] = None
    preferred_taxi_stand: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    default_pickup_note: Optional[str] = None
    preferred_language: Optional[Literal["en", "hi"]] = None
    notify_booking_updates: Optional[bool] = True
    notify_promotions: Optional[bool] = False
    total_seats: Optional[int] = None
    seat_layout: Optional[List[List[int]]] = None
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
    email: Optional[str] = None
    google_sub: Optional[str] = None
    auth_provider: Optional[Literal["phone", "google"]] = "phone"
    vehicle_preset: Optional[str] = None
    vehicle_number: Optional[str] = None
    driving_license: Optional[str] = None


class UpdateProfileIn(BaseModel):
    name: Optional[str] = None
    preferred_taxi_stand: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    default_pickup_note: Optional[str] = None
    preferred_language: Optional[Literal["en", "hi"]] = None
    notify_booking_updates: Optional[bool] = None
    notify_promotions: Optional[bool] = None


class GoogleVerifyIn(BaseModel):
    id_token: str


class AuthOut(BaseModel):
    ok: bool = True
    user: User
    token: str


class UpdateDriverVehicleIn(BaseModel):
    vehicle_preset: str
    vehicle_number: str
