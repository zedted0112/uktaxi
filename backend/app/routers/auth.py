import logging
from fastapi import APIRouter, HTTPException
from ..database import get_db
from ..models.user import User, OtpRequest, OtpVerify, RegisterIn, UpdateProfileIn
from ..models.vehicle import VEHICLES

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)


@router.post("/request-otp")
async def request_otp(payload: OtpRequest):
    # Demo mode always accepts a synthetic OTP flow so frontend onboarding can
    # be developed before integrating a real SMS provider.
    logger.info(f"OTP requested for {payload.phone}")
    return {"ok": True, "message": "Use OTP 123456 (any 6-digit also accepted in demo)"}


@router.post("/verify-otp")
async def verify_otp(payload: OtpVerify):
    # Validation stays intentionally lightweight: it verifies format and then
    # returns existing user record if the phone already exists.
    if len(payload.otp) != 6 or not payload.otp.isdigit():
        raise HTTPException(status_code=400, detail="Invalid OTP")
    db = get_db()
    user = await db.users.find_one({"phone": payload.phone}, {"_id": 0})
    return {"ok": True, "user": user}


@router.post("/register", response_model=User)
async def register_user(payload: RegisterIn):
    # Registration is idempotent by phone number. If the user already exists,
    # the same profile is returned instead of creating duplicates.
    db = get_db()
    existing = await db.users.find_one({"phone": payload.phone}, {"_id": 0})
    if existing:
        return User(**existing)
    data = payload.dict()
    if payload.role == "driver":
        # Driver accounts are enriched from vehicle presets so seat layout and
        # capacity stay standardized across ride creation.
        preset = VEHICLES.get(payload.vehicle_preset or "")
        if not preset:
            raise HTTPException(status_code=400, detail="Invalid vehicle preset")
        data.update({
            "vehicle_preset": preset["id"],
            "vehicle_type": preset["name"],
            "total_seats": preset["total_seats"],
            "seat_layout": preset["seat_layout"],
        })
    u = User(**data)
    await db.users.insert_one(u.dict())
    return u


@router.get("/me")
async def me(phone: str):
    # Frontend session restore calls this endpoint to refresh user profile.
    db = get_db()
    u = await db.users.find_one({"phone": phone}, {"_id": 0})
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    return User(**u)


@router.patch("/me", response_model=User)
async def update_me(phone: str, payload: UpdateProfileIn):
    db = get_db()
    current = await db.users.find_one({"phone": phone}, {"_id": 0})
    if not current:
        raise HTTPException(status_code=404, detail="User not found")

    updates = payload.dict(exclude_none=True)
    if "name" in updates:
        updates["name"] = updates["name"].strip()
        if not updates["name"]:
            raise HTTPException(status_code=400, detail="Name cannot be empty")
    if "default_pickup_note" in updates and len(updates["default_pickup_note"]) > 220:
        raise HTTPException(status_code=400, detail="Pickup note must be 220 characters or less")
    if "emergency_contact_phone" in updates:
        raw = updates["emergency_contact_phone"].strip()
        digits = "".join(ch for ch in raw if ch.isdigit())
        if digits and len(digits) < 10:
            raise HTTPException(status_code=400, detail="Emergency contact phone looks invalid")
        updates["emergency_contact_phone"] = raw

    # Explicit read-only protections: these are managed via onboarding/help flow.
    readonly_keys = {"vehicle_preset", "vehicle_type", "vehicle_number", "driving_license", "seat_layout", "total_seats"}
    if any(k in updates for k in readonly_keys):
        raise HTTPException(status_code=400, detail="Vehicle and license details are read-only here")

    if updates:
        await db.users.update_one({"phone": phone}, {"$set": updates})
        current.update(updates)
    return User(**current)
