from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from .config import MONGO_URL, DB_NAME
import json
import time
from pathlib import Path

_client: AsyncIOMotorClient | None = None
_DEBUG_LOG_PATH = Path("/Users/himalayancoder/Downloads/UKParivahan-sync/.cursor/debug-e76646.log")


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
