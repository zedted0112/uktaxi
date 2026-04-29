import logging
import json
import time
from pathlib import Path
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from .config import SCHEMA_VERSION, CORS_ORIGINS, ENABLE_DEMO_MODE
from .database import get_db, close_client
from .seed import seed_demo
from .routers import auth, vehicles, drivers, rides, requests, demo, notifications

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)
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

app = FastAPI(title="Uttarkashi Taxi Union API", version=str(SCHEMA_VERSION))

# The API keeps CORS policy centralized so local mobile devices and production
# domains can be controlled from environment variables without code changes.
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register domain routers under /api prefix. Demo routes only mount when demo mode is on.
_api_routers = [
    auth.router,
    vehicles.router,
    drivers.router,
    rides.router,
    requests.router,
    notifications.router,
]
if ENABLE_DEMO_MODE:
    _api_routers.append(demo.router)
for router in _api_routers:
    app.include_router(router, prefix="/api")


@app.get("/api/")
async def root():
    # This endpoint gives clients a fast sanity check that backend schema and
    # server process are aligned.
    return {
        "message": "Uttarkashi Taxi Union API",
        "schema": SCHEMA_VERSION,
        "demo_mode": ENABLE_DEMO_MODE,
    }


@app.on_event("startup")
async def startup_event():
    # On startup, optional demo seed runs when ENABLE_DEMO_MODE is true (see config).
    # region agent log
    _debug_log(
        "H3",
        "main.py:startup_event",
        "startup entered",
        {"schema_version": SCHEMA_VERSION, "cors_any": "*" in CORS_ORIGINS},
    )
    # endregion
    if ENABLE_DEMO_MODE:
        try:
            await seed_demo(get_db())
            # region agent log
            _debug_log(
                "H4",
                "main.py:startup_event",
                "seed_demo completed",
                {"status": "ok"},
            )
            # endregion
        except Exception as exc:
            # region agent log
            _debug_log(
                "H4",
                "main.py:startup_event",
                "seed_demo failed",
                {"error_type": type(exc).__name__, "error_text": str(exc)[:220]},
            )
            # endregion
            raise
    else:
        logger.info(
            "ENABLE_DEMO_MODE=false: skipping demo seed and /api/demo routes are not mounted"
        )


@app.on_event("shutdown")
async def shutdown_event():
    # The process closes the shared Mongo client explicitly to avoid dangling
    # connections during reloads and test shutdowns.
    close_client()
