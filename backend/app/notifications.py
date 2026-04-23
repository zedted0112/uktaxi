import logging
import asyncio
import httpx

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


async def send_push(
    token: str | None,
    title: str,
    body: str,
    data: dict | None = None,
) -> None:
    """
    Fire an Expo push notification. Silently no-ops if the token is missing
    or invalid so it never breaks the API response.
    """
    if not token or not token.startswith("ExponentPushToken"):
        return
    payload = {
        "to": token,
        "title": title,
        "body": body,
        "sound": "default",
        "data": data or {},
    }
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            r = await client.post(EXPO_PUSH_URL, json=payload)
            if r.status_code != 200:
                logger.warning(f"Expo push returned {r.status_code}: {r.text}")
    except Exception as exc:
        logger.warning(f"Push notification failed (non-fatal): {exc}")


def fire_and_forget(coro) -> None:
    """Schedule a coroutine without blocking the current request."""
    asyncio.create_task(coro)
