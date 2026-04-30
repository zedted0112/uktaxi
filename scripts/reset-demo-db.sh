#!/usr/bin/env bash
# Reset DB to clean demo-only baseline.
# Usage from repo root: ./scripts/reset-demo-db.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="${ROOT}/backend"

if [[ ! -d "${BACKEND_DIR}/.venv" ]]; then
  echo "Missing backend/.venv — run backend setup first." >&2
  exit 1
fi

PYTHON_BIN="${BACKEND_DIR}/.venv/bin/python3.13"
if [[ ! -x "${PYTHON_BIN}" ]]; then
  PYTHON_BIN="${BACKEND_DIR}/.venv/bin/python"
fi

if [[ ! -x "${PYTHON_BIN}" ]]; then
  echo "No usable Python found in backend/.venv." >&2
  exit 1
fi

cd "${BACKEND_DIR}"

# Safety guard: never wipe production DB by accident.
TARGET_DB_NAME="$("${PYTHON_BIN}" - <<'PY'
from app.config import DB_NAME
print(DB_NAME)
PY
)"

if [[ "${TARGET_DB_NAME}" == "UKTaxi_PROD" ]]; then
  echo "Refusing to reset production database (DB_NAME=${TARGET_DB_NAME})." >&2
  echo "Switch backend/.env to DB_NAME=UKTaxi_Dev before running this script." >&2
  exit 1
fi

"${PYTHON_BIN}" - <<'PY'
import asyncio
from app.database import get_db
from app.seed import seed_demo

async def main():
    db = get_db()
    # Wipe runtime/demo-facing collections so stale test data is removed.
    await db.users.drop()
    await db.rides.drop()
    await db.requests.drop()
    await db.notifications.drop()
    await db.meta.delete_many({})

    # Reseed only the canonical demo baseline.
    await seed_demo(db)

    counts = {
        "users": await db.users.count_documents({}),
        "rides": await db.rides.count_documents({}),
        "requests": await db.requests.count_documents({}),
        "notifications": await db.notifications.count_documents({}),
    }
    print("Demo DB reset complete:", counts)

asyncio.run(main())
PY

