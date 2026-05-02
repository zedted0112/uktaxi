from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ASCENDING, DESCENDING, IndexModel
from pymongo.errors import DuplicateKeyError
from .config import MONGO_URL, DB_NAME
import json
import time
from pathlib import Path
import logging

_client: AsyncIOMotorClient | None = None
_DEBUG_LOG_PATH = Path("/Users/himalayancoder/Downloads/UKParivahan-sync/.cursor/debug-e76646.log")
logger = logging.getLogger(__name__)


def _debug_log(hypothesis_id: str, location: str, message: str, data: dict) -> None:
    payload = {
        "sessionId": "e76646",
        "runId": "initial",
        "hypothesisId": hypothesis_id,
        "location": location,
        "message": message,
        "data": data,
        "timestamp": int(time.time() * 1000),
    }
    try:
        with _DEBUG_LOG_PATH.open("a", encoding="utf-8") as f:
            f.write(json.dumps(payload, separators=(",", ":")) + "\n")
    except Exception:
        pass


def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        # A single shared client is created lazily and reused across requests.
        # Motor internally manages pooling, so per-request client creation is avoided.
        # region agent log
        _debug_log(
            "H1",
            "database.py:get_client",
            "creating mongo client",
            {
                "url_scheme": "mongodb+srv" if MONGO_URL.startswith("mongodb+srv://") else "other",
                "has_db_name": bool(DB_NAME),
            },
        )
        # endregion
        _client = AsyncIOMotorClient(MONGO_URL)
    return _client


def get_db() -> AsyncIOMotorDatabase:
    # Callers receive a database handle bound to the configured DB name.
    # This keeps collection access (`db.users`, `db.rides`) consistent everywhere.
    # region agent log
    _debug_log(
        "H2",
        "database.py:get_db",
        "resolving database handle",
        {"db_name": DB_NAME},
    )
    # endregion
    return get_client()[DB_NAME]


def close_client() -> None:
    global _client
    if _client is not None:
        # Explicit close is used during shutdown/reload to release sockets cleanly.
        _client.close()
        _client = None


async def ensure_indexes() -> None:
    """
    Ensure critical indexes exist for booking/ride integrity and query performance.
    Safe to call repeatedly on startup.
    """
    db = get_db()

    await db.users.create_indexes(
        [
            IndexModel([("id", ASCENDING)], name="users_id_unique", unique=True),
            IndexModel([("phone", ASCENDING)], name="users_phone_unique", unique=True),
        ]
    )

    await db.rides.create_indexes(
        [
            IndexModel([("id", ASCENDING)], name="rides_id_unique", unique=True),
            IndexModel([("driver_phone", ASCENDING), ("date", ASCENDING), ("status", ASCENDING)], name="rides_driver_date_status"),
        ]
    )
    # Existing duplicate active rides in legacy data can block adding this unique
    # guard; in that case we log and continue startup so environments stay usable.
    try:
        await db.rides.create_indexes(
            [
                IndexModel(
                    [("driver_phone", ASCENDING), ("date", ASCENDING)],
                    name="rides_one_active_driver_day",
                    unique=True,
                    partialFilterExpression={"status": {"$in": ["published", "departed"]}},
                ),
            ]
        )
    except DuplicateKeyError:
        logger.warning(
            "Skipped unique index rides_one_active_driver_day due to existing duplicate active rides in %s. "
            "Clean duplicate active rides and restart to enforce DB-level guard.",
            DB_NAME,
        )

    # Migrate booking_ref unique index to partial unique index so pending rows
    # can omit booking_ref until driver confirmation.
    req_indexes = await db.requests.index_information()
    booking_ref_idx = req_indexes.get("requests_booking_ref_unique")
    if booking_ref_idx and "partialFilterExpression" not in booking_ref_idx:
        await db.requests.drop_index("requests_booking_ref_unique")

    await db.requests.create_indexes(
        [
            IndexModel([("id", ASCENDING)], name="requests_id_unique", unique=True),
            IndexModel(
                [("booking_ref", ASCENDING)],
                name="requests_booking_ref_unique",
                unique=True,
                partialFilterExpression={"booking_ref": {"$exists": True, "$type": "string"}},
            ),
            IndexModel([("user_phone", ASCENDING), ("status", ASCENDING), ("created_at", DESCENDING)], name="requests_user_status_created"),
            IndexModel([("ride_id", ASCENDING), ("status", ASCENDING), ("created_at", DESCENDING)], name="requests_ride_status_created"),
            IndexModel([("driver_phone", ASCENDING), ("status", ASCENDING), ("created_at", DESCENDING)], name="requests_driver_status_created"),
        ]
    )

    await db.notifications.create_indexes(
        [
            IndexModel([("id", ASCENDING)], name="notifications_id_unique", unique=True),
            IndexModel([("recipient_phone", ASCENDING), ("read", ASCENDING), ("created_at", DESCENDING)], name="notifications_recipient_read_created"),
        ]
    )
