import logging
import asyncio
import httpx
from .models.notification import Notification
from .database import get_db

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


async def send_push(
    token: str | None,
    title: str,
    body: str,
    data: dict | None = None,
    recipient_phone: str | None = None,
) -> None:
    """
    Persist the notification to MongoDB (always) then fire an Expo push
    notification if a valid token is available. Never raises — a failed
    push must not break the API response.
    """
    payload_data = data or {}
    notif_type = payload_data.get("type", "general")

    # Always save to DB so users can read it later
    if recipient_phone:
        notif = Notification(
            recipient_phone=recipient_phone,
            title=title,
            body=body,
            type=notif_type,
            data=payload_data,
        )
        try:
            db = get_db()
            await db.notifications.insert_one(notif.dict())
        except Exception as exc:
            logger.warning(f"Could not persist notification: {exc}")

    # Attempt Expo push if we have a valid token
    if not token or not token.startswith("ExponentPushToken"):
        return

    push_payload = {
        "to": token,
        "title": title,
        "body": body,
        "sound": "default",
        "data": payload_data,
    }
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            r = await client.post(EXPO_PUSH_URL, json=push_payload)
            if r.status_code != 200:
                logger.warning(f"Expo push returned {r.status_code}: {r.text}")
    except Exception as exc:
        logger.warning(f"Push notification failed (non-fatal): {exc}")


def fire_and_forget(coro) -> None:
    """Schedule a coroutine without blocking the current request."""
    asyncio.create_task(coro)
