import logging
import asyncio
import requests
from .models.notification import Notification
from .database import get_db
from .config import ENABLE_PUSH_NOTIFICATIONS, EXPO_PUSH_URL

logger = logging.getLogger(__name__)


def _is_expo_push_token(token: str) -> bool:
    return token.startswith("ExponentPushToken[") or token.startswith("ExpoPushToken[")


async def _send_push_for_notification(recipient_phone: str, notif: Notification) -> None:
    if not ENABLE_PUSH_NOTIFICATIONS:
        return
    db = get_db()
    tokens = await db.push_tokens.find(
        {"phone": recipient_phone, "enabled": True},
        {"_id": 0, "token": 1},
    ).to_list(200)
    if not tokens:
        return

    messages = [
        {
            "to": row["token"],
            "title": notif.title,
            "body": notif.body,
            "data": notif.data,
            "sound": "default",
            "priority": "high",
        }
        for row in tokens
        if isinstance(row.get("token"), str) and _is_expo_push_token(row["token"])
    ]
    if not messages:
        return

    try:
        res = await asyncio.to_thread(
            requests.post,
            EXPO_PUSH_URL,
            json=messages,
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            timeout=8,
        )
        body = res.json() if res.content else {}
    except Exception as exc:
        logger.warning("Push send failed for %s: %s", recipient_phone, exc)
        return

    # Expo can return per-message errors in data[]; disable dead tokens.
    if not isinstance(body, dict):
        return
    results = body.get("data")
    if not isinstance(results, list):
        return
    for idx, result in enumerate(results):
        if not isinstance(result, dict):
            continue
        if result.get("status") == "ok":
            continue
        details = result.get("details") or {}
        error = result.get("message") or result.get("error")
        if details.get("error") == "DeviceNotRegistered":
            bad = messages[idx].get("to")
            if isinstance(bad, str):
                await db.push_tokens.update_one(
                    {"token": bad},
                    {"$set": {"enabled": False}},
                )
        if error:
            logger.warning("Push response error for %s: %s", recipient_phone, error)


async def send_notification(
    recipient_phone: str,
    title: str,
    body: str,
    data: dict | None = None,
) -> None:
    """
    Persist a notification to MongoDB so the user can read it in the
    in-app inbox (bell tab). Always awaited directly — no fire-and-forget.
    """
    notif = Notification(
        recipient_phone=recipient_phone,
        title=title,
        body=body,
        # Notification type drives frontend icon/status rendering.
        type=(data or {}).get("type", "general"),
        data=data or {},
    )
    try:
        db = get_db()
        # The app stores notifications durably so users can read them later
        # even if they were offline when the event happened.
        await db.notifications.insert_one(notif.dict())
        logger.info(f"Notification saved for {recipient_phone}: {title}")
        await _send_push_for_notification(recipient_phone, notif)
    except Exception as exc:
        # Notification persistence failures are logged but never block primary
        # booking/ride API responses.
        logger.warning(f"Could not persist notification: {exc}")
