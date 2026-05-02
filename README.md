# UKTaxi (UKParivahan Sync)

Mobile-first taxi union app with:
- `frontend/` → Expo React Native app
- `backend/` → FastAPI + MongoDB API

This README is the fastest way for a new developer/tester to run the app and open it in Expo Go.

## Quick start (one command)

After [1) Clone and install](#1-clone-and-install) and [2) Configure environment variables](#2-configure-environment-variables):

```bash
./scripts/quick-start.sh
```

This starts **FastAPI in the background** on port `8000`, then **Expo in the foreground** on port `8081` so the **QR code appears in the same terminal**. Press **Ctrl+C** to stop both.

Optional environment variables:

| Variable | Default | Meaning |
|----------|---------|---------|
| `BACKEND_PORT` | `8000` | API port |
| `FRONTEND_PORT` | `8081` | Metro / Expo URL port |
| `EXPO_TUNNEL` | unset | Set to `1` or `true` to add `--tunnel` (different WiFi / remote testing) |

Example with tunnel:

```bash
EXPO_TUNNEL=1 ./scripts/quick-start.sh
```

## Prerequisites

- Node.js 18+
- Yarn 1.x
- Python 3.10+ (3.13 recommended)
- MongoDB Atlas URI (or local MongoDB)
- Expo Go app installed on Android/iOS phone

## 1) Clone and install

### Backend setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Frontend setup

```bash
cd frontend
yarn install
```

## 2) Configure environment variables

### Backend env (`backend/.env`)

Create `backend/.env`:

```env
MONGO_URL=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/uktaxi?retryWrites=true&w=majority&appName=Cluster0
DB_NAME=uktaxi
CORS_ORIGINS=*
ENABLE_DEMO_MODE=true
```

- `ENABLE_DEMO_MODE=true` (default if omitted): mounts `GET /api/demo/accounts` and may seed demo users/rides on startup.
- `ENABLE_DEMO_MODE=false`: no demo seed, no `/api/demo/*` routes — use for production or real data only.

The Expo auth screen calls **`GET /api/`** on load and reads **`demo_mode`** (same flag). When `demo_mode` is `false`, quick demo UI and hardcoded demo account chips are hidden, and OTP copy does not mention `123456`. If the device cannot reach the API on first open, demo UI stays off (safe default).

Copy from [`backend/.env.example`](backend/.env.example) and adjust.

If using local MongoDB:

```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=uktaxi
CORS_ORIGINS=*
ENABLE_DEMO_MODE=true
```

### Frontend env (`frontend/.env`)

Create `frontend/.env`:

```env
EXPO_PUBLIC_BACKEND_URL=http://<YOUR_LAPTOP_LAN_IP>:8000
EXPO_PUBLIC_BACKEND_PORT=8000
```

Example:

```env
EXPO_PUBLIC_BACKEND_URL=http://192.168.1.10:8000
EXPO_PUBLIC_BACKEND_PORT=8000
```

Use your laptop LAN IP (not `localhost`) so your phone can access backend on same WiFi.

## 3) Start backend

From repo root:

```bash
cd backend
source .venv/bin/activate
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

Backend should show:
- `Uvicorn running on http://0.0.0.0:8000`
- `Application startup complete.`

`GET http://localhost:8000/api/` returns JSON including `demo_mode` (boolean) and `schema` (number).

## 4) Start frontend (Expo Go)

In a second terminal:

```bash
cd frontend
npx expo start --port 8081
```

Then:
1. Open **Expo Go** on phone.
2. Scan the QR code shown in terminal/Expo UI.
3. App opens on device.

## 5) Demo login

- When **`demo_mode`** from `GET /api/` is true (backend `ENABLE_DEMO_MODE=true`): OTP `123456` works and the auth screen can show quick demo sign-in after loading accounts from `GET /api/demo/accounts`.
- When **`demo_mode`** is false: use normal phone flow; quick demo row is hidden and the app does not call `/api/demo/accounts`.

## Common issues

### Backend fails to start with MongoDB errors
- Check Atlas IP access list includes your current public IP.
- Ensure `MONGO_URL` is valid.
- Retry backend start after updating Atlas.

### Phone shows `Network request failed`
- Confirm phone and laptop are on same WiFi.
- Ensure `EXPO_PUBLIC_BACKEND_URL` uses laptop LAN IP, not `localhost`.
- Confirm backend is running on `8000`.

### Port already in use

```bash
lsof -ti:8000 | xargs kill -9
lsof -ti:8081 | xargs kill -9
```

### API tests (`backend/tests/`) fail with missing users

Integration tests expect a seeded DB. Run the backend with `ENABLE_DEMO_MODE=true` (or unset) so startup can seed demo data, then run `pytest` from `backend/` with `EXPO_PUBLIC_BACKEND_URL` pointing at that server.

## Project structure

```text
UKParivahan-sync/
  backend/     # FastAPI server
  frontend/    # Expo app
  docs/        # Architecture and runbook docs
```
