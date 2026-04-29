import os
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent.parent
# Backend config is loaded once from backend/.env at import time.
load_dotenv(ROOT_DIR / ".env")


def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None or raw.strip() == "":
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


# Required runtime settings. The process should fail fast if missing.
MONGO_URL: str = os.environ["MONGO_URL"]
DB_NAME: str = os.environ["DB_NAME"]

SCHEMA_VERSION: int = 5  # bump to trigger a full reseed

# When false: no startup demo seed and no /api/demo routes (production / real DB).
# Default true so local clones keep current quick-start behavior without editing .env.
ENABLE_DEMO_MODE: bool = _env_bool("ENABLE_DEMO_MODE", True)

# Comma-separated list of allowed CORS origins.
# Set CORS_ORIGINS=* in .env for local dev; restrict to real domains in production.
_raw_origins = os.getenv("CORS_ORIGINS", "*")
# Splitting here keeps `main.py` middleware wiring simple and declarative.
CORS_ORIGINS: list[str] = [o.strip() for o in _raw_origins.split(",")]
