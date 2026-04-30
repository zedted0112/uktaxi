# Backend Test Context

This file gives quick context for running and debugging backend API tests in this repo.

## Test Scope

- Main integration/API test file: `backend/tests/test_taxi_api.py`
- Tests call live HTTP endpoints (`/api/...`) using `requests`, so backend must be running.

## Required Environment

- `EXPO_PUBLIC_BACKEND_URL` must be set for the test process.
- Example:
  - `EXPO_PUBLIC_BACKEND_URL=http://127.0.0.1:8000`

## Python / Pytest

Use the backend virtualenv Python 3.13 explicitly.

Commands:

```bash
./backend/.venv/bin/python3.13 -m pytest --version
EXPO_PUBLIC_BACKEND_URL=http://127.0.0.1:8000 ./backend/.venv/bin/python3.13 -m pytest backend/tests/test_taxi_api.py -q
```

Do not rely on global `python3 -m pytest` because it may not have `pytest` installed or may use an incompatible interpreter.

## Backend Startup (for local testing)

From repo root:

```bash
./scripts/quick-start.sh
```

This starts backend on port `8000` and Expo dev server. If backend is already running, reuse it.

## Booking Rules Covered by Tests

- Passenger can have up to 4 pending requests.
- 5th pending request should be rejected.
- Confirming one request should cancel passenger's other pending requests.
- Auto-cancel reason expected: `Ride is booked by other Driver`.
- Confirm endpoint expects `driver_phone` and should enforce ride-owner confirm behavior.

## Troubleshooting

- If tests fail at collection with missing `EXPO_PUBLIC_BACKEND_URL`, export it in the command.
- If endpoints behave unexpectedly, verify which backend process/interpreter is serving (`python3.13` venv is the canonical one).
- If running a dedicated backend just for tests, point tests to that port via `EXPO_PUBLIC_BACKEND_URL`.
