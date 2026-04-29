from typing import List
from fastapi import APIRouter, HTTPException
from ..database import get_db
from ..models.notification import Notification

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=List[Notification])
async def list_notifications(phone: str):
    """Return all notifications for the given phone, newest first."""
    # Notification inbox is intentionally scoped by recipient phone so both
    # passenger and driver tabs can reuse the same endpoint shape.
    db = get_db()
    items = await db.notifications.find(
        {"recipient_phone": phone}, {"_id": 0}
    ).sort("created_at", -1).to_list(200)
    return [Notification(**n) for n in items]


@router.get("/unread-count")
async def unread_count(phone: str):
    """Return the number of unread notifications for the given phone."""
    # Lightweight count endpoint powers bell badges without fetching full rows.
    db = get_db()
    count = await db.notifications.count_documents(
        {"recipient_phone": phone, "read": False}
    )
    return {"count": count}


@router.post("/{notif_id}/read")
async def mark_read(notif_id: str):
    """Mark a single notification as read."""
    # Row-level read action supports tap-to-read UX in the notification list.
    db = get_db()
    result = await db.notifications.update_one(
        {"id": notif_id}, {"$set": {"read": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"ok": True}


@router.post("/read-all")
async def mark_all_read(phone: str):
    """Mark all notifications for a phone as read."""
    # Bulk action keeps inbox cleanup to one request from frontend.
    db = get_db()
    await db.notifications.update_many(
        {"recipient_phone": phone, "read": False},
        {"$set": {"read": True}},
    )
    return {"ok": True}
