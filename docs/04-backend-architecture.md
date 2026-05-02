# UKTaxi Backend Architecture

## Backend Scope
The backend is a modular FastAPI service under `backend/app/` that handles:
- Auth bootstrap via OTP demo flow
- Driver profile and vehicle setup
- Ride publishing and seat availability
- Booking request lifecycle and cancellation rules
- In-app notification persistence
- Demo data seeding

## Package Structure
```
backend/
  server.py                  # Thin entry-point shim: `from app.main import app`
  requirements.txt
  .env                       # MONGO_URL, DB_NAME, CORS_ORIGINS
  app/
    main.py                  # FastAPI app, CORS middleware, router registration
    config.py                # Env variable loading, SCHEMA_VERSION, CORS_ORIGINS
    database.py              # Motor client singleton: get_db(), close_client()
    helpers.py               # ride_public(), parse_depart(), can_cancel(), generate_ref()
    notifications.py         # send_notification() — saves to DB notifications collection
    seed.py                  # seed_demo() — startup demo data population
    models/
      __init__.py
      user.py                # User, OtpRequest, OtpVerify, RegisterIn, UpdateDriverVehicleIn
      ride.py                # Ride, RidePublic, PublishRideIn, OfflineSeatsIn
      request.py             # BookingRequest, CreateRequestIn
      vehicle.py             # VEHICLES dict (static catalog)
      notification.py        # Notification
    routers/
      auth.py                # /auth/* — OTP, register, me
      vehicles.py            # /vehicles/*
      drivers.py             # /drivers/*
      rides.py               # /rides/*
      requests.py            # /requests/*
      notifications.py       # /notifications/*
      demo.py                # /demo/*
```

The `uvicorn server:app` command still works because `server.py` imports `app` from `app.main`.

## Runtime Lifecycle
1. Load env from `backend/.env` via `app/config.py`.
2. Initialize Motor `AsyncIOMotorClient` via `app/database.py` (lazy singleton).
3. Create FastAPI app in `app/main.py`, attach CORS middleware with `CORS_ORIGINS`.
4. Register all domain routers under `/api` prefix.
5. On startup event, run `seed_demo(get_db())`.
6. On shutdown event, call `close_client()`.

## CORS Configuration
`CORS_ORIGINS` is loaded from `.env`:
```env
CORS_ORIGINS=*              # dev default — allow all origins
CORS_ORIGINS=https://uktaxi.app  # production — restrict to known origin
```

## Route Architecture
All routes are under `/api`.

| Router | Prefix | Key endpoints |
|---|---|---|
| `auth` | `/api/auth` | `POST /request-otp`, `POST /verify-otp`, `POST /register`, `GET /me` |
| `vehicles` | `/api/vehicles` | `GET /`, `GET /{id}` |
| `drivers` | `/api/drivers` | `POST /{phone}/vehicle` |
| `rides` | `/api/rides` | `POST /`, `GET /`, `GET /{id}`, `POST /{id}/offline-seats`, `POST /{id}/cancel` |
| `requests` | `/api/requests` | `POST /`, `GET /`, `GET /{id}`, `POST /{id}/confirm`, `POST /{id}/reject`, `POST /{id}/cancel` |
| `notifications` | `/api/notifications` | `GET /`, `GET /unread-count`, `POST /{id}/read`, `POST /read-all` |
| `demo` | `/api/demo` | `GET /accounts` |

## Notification System (Backend)
Every state-changing booking action `await`s `send_notification()` directly — no fire-and-forget.

```python
# app/notifications.py
async def send_notification(recipient_phone, title, body, data=None) -> None:
    notif = Notification(recipient_phone=recipient_phone, ...)
    await db.notifications.insert_one(notif.dict())
```

Notification triggers:
| Event | Recipient |
|---|---|
| Passenger creates seat request | Driver |
| Driver confirms request | Passenger |
| Driver rejects request | Passenger |
| Passenger cancels booking | Driver |
| Driver cancels ride | All affected passengers |

## Business Helper Functions (`app/helpers.py`)
- `ride_public(r)`: adds computed `seats_left` field before returning ride.
- `parse_depart(date, time)`: parses human-readable departure into datetime for cutoff checks.
- `can_cancel(date, time)`: returns True if current time is >30 minutes before departure.
- `generate_ref()`: returns unique `UTK-XXXXXXXX` booking reference string.

## Data Access Pattern
- Async Motor collection operations: `find_one`, `find`, `insert_one`, `update_one`, `update_many`.
- Mongo `_id` excluded from all API payloads via `{"_id": 0}` projection.
- Application UUID string IDs are generated at model creation time via `uuid.uuid4()`.

## Domain Rules Enforced in Backend
- Driver can publish only if profile contains a seat layout.
- Offline seats must exist in the vehicle's seat layout.
- New request seats must not be: already booked, pending in another request, or outside seat layout.
- Request state transitions are guarded: only `pending` can be confirmed/rejected.
- Cancellation blocked within 30 minutes of departure (both rides and requests).
- Confirming a request atomically appends seats to `ride.booked_seats`.
- Cancelling a confirmed request removes its seats from `ride.booked_seats`.

## Seeding Strategy (`app/seed.py`)
- `SCHEMA_VERSION` in `config.py` controls reseed trigger.
- At startup: if schema version changed OR `users` collection is empty, backend drops `users`, `rides`, `requests` and recreates demo data.
- **Note: seeding is destructive**. Never run in production with live data unless schema version is stable.

## Operational Risks
- No DB transactions for seat assignment — concurrent confirms can race.
- Startup seed can wipe key collections when schema version changes.
- API auth is trust-based on phone values — not hardened for production.
