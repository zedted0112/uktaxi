# UKTaxi Backend Architecture

## Backend Scope
The backend is a single FastAPI service (`backend/server.py`) that handles:
- Auth bootstrap via OTP demo flow
- Driver profile and vehicle setup
- Ride publishing and seat availability
- Booking request lifecycle and cancellation rules
- Demo data seeding

## Runtime Lifecycle
1. Load env from `backend/.env`.
2. Initialize Mongo client (`AsyncIOMotorClient`) using `MONGO_URL`.
3. Bind database using `DB_NAME`.
4. Create FastAPI app and attach `/api` router.
5. On startup, run `seed_demo()`.
6. On shutdown, close Mongo client.

## Core Modules in `server.py`
### Config and infra
- Env loading, Mongo setup, logger setup.
- CORS middleware:
  - `allow_origins=["*"]`
  - `allow_methods=["*"]`
  - `allow_headers=["*"]`

### Static domain source
- `VEHICLES` dictionary:
  - preset metadata (id, name, type, total seats, seat layout, image).

### Pydantic models
- Principal entities:
  - `User`
  - `Ride`
  - `RidePublic`
  - `BookingRequest`
- Input payload schemas:
  - `PublishRideIn`
  - `OfflineSeatsIn`
  - `CreateRequestIn`
  - `OtpRequest`
  - `OtpVerify`
  - `RegisterIn`
  - `UpdateDriverVehicleIn`

### Business helper functions
- `ride_public()`: computes `seats_left`.
- `parse_depart()` and `can_cancel()`: cancellation cutoff handling.
- `generate_ref()`: booking reference generation (`UTK-XXXXXXXX`).

## Route Architecture
All routes are under `/api`.

### Vehicle routes
- Catalog read-only endpoints from static `VEHICLES`.

### Auth and user routes
- OTP request/verify (demo behavior).
- Register (driver path enriches vehicle metadata).
- User lookup (`/auth/me`).
- Driver vehicle update route.

### Ride routes
- Publish from driver profile vehicle.
- List and filter rides.
- Get ride details.
- Update offline seats with conflict guards.
- Cancel ride and cascade request status updates.

### Request routes
- Create booking request.
- List requests by user/driver filter.
- Get request detail.
- Confirm/reject/cancel request.
- Confirmation mutates ride booked seats.

## Data Access Pattern
- Async Motor collection operations (`find_one`, `find`, `insert_one`, `update_one`, `update_many`).
- Mongo `_id` is omitted from API payloads (`{"_id": 0}`).
- Application UUID string IDs are generated at model creation.

## Domain Rules Enforced in Backend
- Driver can publish only if profile contains seat layout.
- Offline seats must exist in seat layout.
- New request seats must not be:
  - already booked
  - pending in another request
  - outside seat layout
- Request state transitions are guarded:
  - only `pending` can be confirmed/rejected
  - cancellation blocked in non-eligible time window
- Ride cancel is blocked within 30 minutes of departure.

## Seeding Strategy
- `SCHEMA_VERSION` controls reseed trigger.
- At startup:
  - If schema version changed OR users empty, backend drops `users`, `rides`, `requests`.
  - Recreates demo users and rides.
  - Stores version in `meta` collection.

## Operational Risks
- **Seeding is destructive** for key collections when triggered.
- **No auth hardening** beyond phone identity conventions.
- **No DB transactions** for seat assignment; concurrent edge cases can race.
- **Monolithic file structure** slows maintainability as feature count grows.

## Suggested Refactor Targets (future)
- Split into modules:
  - `routers/`, `models/`, `services/`, `repositories/`
- Introduce transaction/locking strategy for seat confirmation.
- Add explicit schema/index migration management.
- Separate demo seeding from production runtime path.
