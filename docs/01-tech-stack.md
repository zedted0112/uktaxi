# UKTaxi Tech Stack

## Overview
UKTaxi is a mobile-first ride publishing and booking app for Uttarkashi Taxi Union.
The repository contains:
- `frontend`: Expo + React Native client app
- `backend`: FastAPI + MongoDB API server

## Frontend Stack
| Layer | Tech | Notes |
|---|---|---|
| Runtime | Expo SDK 54 | Managed React Native runtime for Android/iOS |
| Framework | React 19 + React Native 0.81 | UI rendering and platform primitives |
| Routing | Expo Router 6 | File-based routing with role-based route groups |
| Navigation | React Navigation tabs | Tab UX for passenger and driver sections |
| State | React Context | Session/auth state in `src/auth.tsx` |
| Persistence | AsyncStorage | Stores signed-in user snapshot (`utk_auth_v1`) |
| Networking | `fetch` wrapper | Centralized in `src/api.ts` with dynamic URL resolution |
| Hooks | Custom hooks in `src/hooks/` | Data fetching with loading/error state per domain |
| Components | Shared UI in `src/components/` | Reusable cards, badges, spinners, notification inbox |
| Utilities | Helpers in `src/utils/` | `date.ts`, `phone.ts`, `seat.ts` |
| Styling | `StyleSheet` + design tokens | Tokens in `src/theme.ts` |
| UI icons | `@expo/vector-icons` | Feather + MaterialCommunityIcons |

## Backend Stack
| Layer | Tech | Notes |
|---|---|---|
| API framework | FastAPI 0.110 | Async API server and validation |
| ASGI server | Uvicorn 0.25 | Local and production server process |
| Validation | Pydantic v2 | Request/response models in `app/models/` |
| Database | MongoDB Atlas | Uses app-level UUID IDs, not Mongo `_id` in API |
| DB driver | Motor 3.3 | Async Mongo client |
| Env loading | `python-dotenv` | Loads `backend/.env` at startup |
| Middleware | Starlette CORS | Configurable via `CORS_ORIGINS` env variable |

## Data and Domain Stack
- Domain entities: `User`, `Ride`, `BookingRequest`, `Vehicle` catalog, `Notification`.
- Storage collections: `users`, `rides`, `requests`, `notifications`, `meta`.
- Seat state is computed through:
  - `offline_seats`: manually blocked by driver
  - `booked_seats`: confirmed online + offline seats combined

## Tooling and DX
### Frontend
- TypeScript (`~5.9`)
- ESLint (`expo lint`)
- Yarn classic (`yarn@1.22`)
- Metro bundler

### Backend
- `pytest` for integration API tests
- Python 3.13 (Homebrew) recommended for local venv

## Configuration Surface
### Required runtime variables
- Backend (`backend/.env`):
  - `MONGO_URL`
  - `DB_NAME`
  - `CORS_ORIGINS` (optional, defaults to `*`)
- Frontend (`frontend/.env`):
  - `EXPO_PUBLIC_BACKEND_URL` — falls back to Expo host IP if missing
  - `EXPO_PUBLIC_BACKEND_PORT` — defaults to `8000`
