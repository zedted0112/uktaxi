from datetime import datetime, timezone
from fastapi import APIRouter, Depends

from ..database import get_db
from ..models.push_token import PushRegisterIn, PushUnregisterIn, PushToken
from ..security import get_current_user

router = APIRouter(prefix="/push", tags=["push"])


@router.post("/register")
async def register_push_token(payload: PushRegisterIn, current=Depends(get_current_user)):
    db = get_db()
    now = datetime.now(timezone.utc).isoformat()

    # Keep one token bound to one account; reassociation updates ownership.
    existing = await db.push_tokens.find_one({"token": payload.token}, {"_id": 0})
    if existing:
        await db.push_tokens.update_one(
            {"token": payload.token},
            {
                "$set": {
                    "user_id": current["id"],
                    "phone": current["phone"],
                    "platform": payload.platform,
                    "app_version": payload.app_version,
                    "enabled": True,
                    "updated_at": now,
                }
            },
        )
        return {"ok": True}

    doc = PushToken(
        user_id=current["id"],
        phone=current["phone"],
        token=payload.token,
        platform=payload.platform,
        app_version=payload.app_version,
        updated_at=now,
    )
    await db.push_tokens.insert_one(doc.dict())
    return {"ok": True}


@router.post("/unregister")
async def unregister_push_token(payload: PushUnregisterIn, current=Depends(get_current_user)):
    db = get_db()
    await db.push_tokens.update_one(
        {"token": payload.token, "user_id": current["id"]},
        {"$set": {"enabled": False, "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    return {"ok": True}
