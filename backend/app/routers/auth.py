import logging
from fastapi import APIRouter, Depends, HTTPException
import requests
from ..database import get_db
from ..models.user import User, OtpRequest, OtpVerify, RegisterIn, UpdateProfileIn, GoogleVerifyIn, AuthOut
from ..models.vehicle import VEHICLES
from ..config import ENABLE_DEMO_MODE, GOOGLE_WEB_CLIENT_ID
from ..security import create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)


@router.post("/request-otp")
async def request_otp(payload: OtpRequest):
    if not ENABLE_DEMO_MODE:
        raise HTTPException(status_code=400, detail="Phone OTP demo mode is disabled. Use Google sign-in.")
    # Demo mode always accepts a synthetic OTP flow so frontend onboarding can
    # be developed before integrating a real SMS provider.
    logger.info(f"OTP requested for {payload.phone}")
    return {"ok": True, "message": "Use OTP 123456 (any 6-digit also accepted in demo)"}


@router.post("/verify-otp")
async def verify_otp(payload: OtpVerify):
    if not ENABLE_DEMO_MODE:
        raise HTTPException(status_code=400, detail="Phone OTP demo mode is disabled. Use Google sign-in.")
    # Validation stays intentionally lightweight: it verifies format and then
    # returns existing user record if the phone already exists.
    if len(payload.otp) != 6 or not payload.otp.isdigit():
        raise HTTPException(status_code=400, detail="Invalid OTP")
    db = get_db()
    user = await db.users.find_one({"phone": payload.phone}, {"_id": 0})
    if not user:
        return {"ok": True, "user": None, "token": None}
    from ..config import ADMIN_EMAIL_WHITELIST
    user["is_admin"] = (user.get("email") or "").strip().lower() in ADMIN_EMAIL_WHITELIST
    token = create_access_token(user)
    return {"ok": True, "user": user, "token": token}


@router.post("/register", response_model=AuthOut)
async def register_user(payload: RegisterIn):
    # Registration is idempotent by phone number. If the user already exists,
    # the same profile is returned instead of creating duplicates.
    db = get_db()
    existing = await db.users.find_one({"phone": payload.phone}, {"_id": 0})
    if existing:
        return AuthOut(user=User(**existing), token=create_access_token(existing))
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
    user_dict = u.dict()
    from ..config import ADMIN_EMAIL_WHITELIST
    user_dict["is_admin"] = (user_dict.get("email") or "").strip().lower() in ADMIN_EMAIL_WHITELIST
    await db.users.insert_one(user_dict)
    return AuthOut(user=User(**user_dict), token=create_access_token(user_dict))


@router.post("/google-verify")
async def google_verify(payload: GoogleVerifyIn):
    try:
        r = requests.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"id_token": payload.id_token},
            timeout=8,
        )
        info = r.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Google token verification failed")

    if r.status_code != 200:
        raise HTTPException(status_code=400, detail=info.get("error_description") or "Invalid Google token")
    if info.get("email_verified") not in ("true", True):
        raise HTTPException(status_code=400, detail="Google email is not verified")
    if GOOGLE_WEB_CLIENT_ID and info.get("aud") != GOOGLE_WEB_CLIENT_ID:
        raise HTTPException(status_code=400, detail="Google token audience mismatch")

    db = get_db()
    email = (info.get("email") or "").strip().lower()
    sub = (info.get("sub") or "").strip()
    if not email or not sub:
        raise HTTPException(status_code=400, detail="Google token missing identity fields")

    existing = await db.users.find_one(
        {"$or": [{"google_sub": sub}, {"email": email}]},
        {"_id": 0},
    )
    if existing:
        from ..config import ADMIN_EMAIL_WHITELIST
        existing["is_admin"] = email in ADMIN_EMAIL_WHITELIST
        return {"ok": True, "user": User(**existing), "token": create_access_token(existing), "profile": None}

    profile = {
        "email": email,
        "google_sub": sub,
        "name": (info.get("name") or "").strip() or email.split("@")[0],
        "picture": info.get("picture"),
    }
    return {"ok": True, "user": None, "token": None, "profile": profile}


@router.get("/me")
async def me(current=Depends(get_current_user)):
    # Frontend session restore calls this endpoint to refresh user profile.
    return User(**current)


@router.patch("/me", response_model=User)
async def update_me(payload: UpdateProfileIn, current=Depends(get_current_user)):
    db = get_db()
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
        await db.users.update_one({"id": current["id"]}, {"$set": updates})
        current.update(updates)
    return User(**current)
