import logging
from fastapi import APIRouter, HTTPException
from ..database import get_db
from ..models.user import User, OtpRequest, OtpVerify, RegisterIn
from ..models.vehicle import VEHICLES

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)


@router.post("/request-otp")
async def request_otp(payload: OtpRequest):
    logger.info(f"OTP requested for {payload.phone}")
    return {"ok": True, "message": "Use OTP 123456 (any 6-digit also accepted in demo)"}


@router.post("/verify-otp")
async def verify_otp(payload: OtpVerify):
    if len(payload.otp) != 6 or not payload.otp.isdigit():
        raise HTTPException(status_code=400, detail="Invalid OTP")
    db = get_db()
    user = await db.users.find_one({"phone": payload.phone}, {"_id": 0})
    return {"ok": True, "user": user}


@router.post("/register", response_model=User)
async def register_user(payload: RegisterIn):
    db = get_db()
    existing = await db.users.find_one({"phone": payload.phone}, {"_id": 0})
    if existing:
        return User(**existing)
    data = payload.dict()
    if payload.role == "driver":
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
    db = get_db()
    u = await db.users.find_one({"phone": phone}, {"_id": 0})
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    return User(**u)
