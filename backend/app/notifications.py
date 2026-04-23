import logging
import asyncio
from .models.notification import Notification
from .database import get_db

logger = logging.getLogger(__name__)


async def send_notification(
    recipient_phone: str,
    title: str,
    body: str,
    data: dict | None = None,
) -> None:
    """
    Persist a notification to MongoDB so the user can read it in the
    in-app inbox (bell tab). Fire-and-forget via fire_and_forget().
    """
    notif = Notification(
        recipient_phone=recipient_phone,
        title=title,
        body=body,
        type=(data or {}).get("type", "general"),
        data=data or {},
    )
    try:
        db = get_db()
        await db.notifications.insert_one(notif.dict())
    except Exception as exc:
        logger.warning(f"Could not persist notification: {exc}")


def fire_and_forget(coro) -> None:
    """Schedule a coroutine without blocking the current request."""
    asyncio.create_task(coro)
