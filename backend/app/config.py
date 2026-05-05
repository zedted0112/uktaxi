import os
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent.parent
# Load `.env` then optional `.env.local` (gitignored) so laptops can override DB_NAME /
# ENABLE_DEMO_MODE without editing the shared Atlas `.env`.
load_dotenv(ROOT_DIR / ".env")
load_dotenv(ROOT_DIR / ".env.local", override=True)


def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None or raw.strip() == "":
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


# Required runtime settings. The process should fail fast if missing.
MONGO_URL: str = os.environ["MONGO_URL"]
# Keep DB selection env-driven to split environments cleanly:
# - UKTaxi_Dev for local/dev testing
# - UKTaxi_PROD for production deployments
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

# Optional strict audience check for Google ID tokens.
GOOGLE_WEB_CLIENT_ID: str = os.getenv("GOOGLE_WEB_CLIENT_ID", "").strip()

JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "change-me-in-production")
JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_HOURS: int = int(os.getenv("JWT_EXPIRE_HOURS", "168"))

# Push delivery (phone tray notifications) is optional and additive to DB inbox.
# Keep false by default so demo/local environments behave exactly as before.
ENABLE_PUSH_NOTIFICATIONS: bool = _env_bool("ENABLE_PUSH_NOTIFICATIONS", False)
EXPO_PUSH_URL: str = os.getenv("EXPO_PUSH_URL", "https://exp.host/--/api/v2/push/send").strip()
