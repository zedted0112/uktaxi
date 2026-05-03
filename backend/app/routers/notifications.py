from typing import List
from fastapi import APIRouter, Depends, HTTPException
from ..database import get_db
from ..models.notification import Notification
from ..security import get_current_user

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=List[Notification])
async def list_notifications(current=Depends(get_current_user)):
    """Return all notifications for the given phone, newest first."""
    # Notification inbox is intentionally scoped by recipient phone so both
    # passenger and driver tabs can reuse the same endpoint shape.
    db = get_db()
    items = await db.notifications.find(
        {"recipient_phone": current["phone"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(200)
    return [Notification(**n) for n in items]


@router.get("/unread-count")
async def unread_count(current=Depends(get_current_user)):
    """Return the number of unread notifications for the given phone."""
    # Lightweight count endpoint powers bell badges without fetching full rows.
    db = get_db()
    count = await db.notifications.count_documents(
        {"recipient_phone": current["phone"], "read": False}
    )
    return {"count": count}


@router.post("/{notif_id}/read")
async def mark_read(notif_id: str, current=Depends(get_current_user)):
    """Mark a single notification as read."""
    # Row-level read action supports tap-to-read UX in the notification list.
    db = get_db()
    result = await db.notifications.update_one(
        {"id": notif_id, "recipient_phone": current["phone"]}, {"$set": {"read": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"ok": True}


@router.post("/read-all")
async def mark_all_read(current=Depends(get_current_user)):
    """Mark all notifications for a phone as read."""
    # Bulk action keeps inbox cleanup to one request from frontend.
    db = get_db()
    await db.notifications.update_many(
        {"recipient_phone": current["phone"], "read": False},
        {"$set": {"read": True}},
    )
    return {"ok": True}
