import os
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL: str = os.environ["MONGO_URL"]
DB_NAME: str = os.environ["DB_NAME"]

SCHEMA_VERSION: int = 5  # bump to trigger a full reseed

# Comma-separated list of allowed CORS origins.
# Set CORS_ORIGINS=* in .env for local dev; restrict to real domains in production.
_raw_origins = os.getenv("CORS_ORIGINS", "*")
CORS_ORIGINS: list[str] = [o.strip() for o in _raw_origins.split(",")]
