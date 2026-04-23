# UKTaxi Tech Stack

## Overview
UKTaxi is a mobile-first ride publishing and booking app for Uttarkashi Taxi Union.
The repository contains:
- `frontend`: Expo + React Native client app
- `backend`: FastAPI + MongoDB API server

## Frontend Stack
| Layer | Tech | Notes |
|---|---|---|
| Runtime | Expo SDK 54 | Managed React Native runtime for Android/iOS/Web |
| Framework | React 19 + React Native 0.81 | UI rendering and platform primitives |
| Routing | Expo Router 6 | File-based routing with route groups for roles |
| Navigation | React Navigation tabs/native | Tab UX for passenger and driver sections |
| State | React Context | Session/auth state in `src/auth.tsx` |
| Persistence | AsyncStorage | Stores current signed-in user snapshot (`utk_auth_v1`) |
| Networking | `fetch` wrapper | Centralized in `src/api.ts` |
| Styling | `StyleSheet` + design tokens | Tokens in `src/theme.ts` |
| UI helpers | `@expo/vector-icons`, custom `SeatMap` | Shared visual components for transport UX |

## Backend Stack
| Layer | Tech | Notes |
|---|---|---|
| API framework | FastAPI 0.110 | Async API server and validation |
| ASGI server | Uvicorn 0.25 | Local/prod server process |
| Validation | Pydantic v2 | Request/response models in `server.py` |
| Database | MongoDB | Uses app-level UUID IDs, not Mongo `_id` in API |
| DB driver | Motor 3.3 | Async Mongo client |
| Env loading | `python-dotenv` | Loads `backend/.env` at startup |
| Middleware | Starlette CORS | Wide-open CORS for demo mode |

## Data and Domain Stack
- Domain entities: `User`, `Ride`, `BookingRequest`, `Vehicle` catalog.
- Storage collections: `users`, `rides`, `requests`, `meta`.
- Seat state is computed through:
  - `offline_seats`: manually blocked by driver
  - `booked_seats`: confirmed online + offline seats

## Tooling and DX
### Frontend
- TypeScript (`~5.9`)
- ESLint (`expo lint`)
- Yarn classic (`yarn@1.22`)
- Metro with local cache config in `metro.config.js`

### Backend
- `pytest` for integration API tests
- Code quality tools listed in `requirements.txt`:
  - `black`, `isort`, `flake8`, `mypy`

## Configuration Surface
### Required runtime variables
- Backend:
  - `MONGO_URL`
  - `DB_NAME`
- Frontend:
  - `EXPO_PUBLIC_BACKEND_URL` (falls back to preview URL if missing)

## Notable Version/Dependency Observations
- Backend `requirements.txt` includes some libraries that are not used in current `server.py` flow (for example: `boto3`, `pandas`, `numpy`, `typer`).
- This is not blocking for runtime, but cleanup can reduce install time and maintenance overhead.
