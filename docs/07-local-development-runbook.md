# UKTaxi Local Development Runbook

## Prerequisites
- Node.js 18+ and Yarn 1.x
- Python 3.10+ (3.13 recommended; install via Homebrew: `brew install python@3.13`)
- MongoDB running locally or MongoDB Atlas URI
- Expo Go app on physical device for testing

## Repository Layout
```
UKParivahan-sync/
  backend/         FastAPI service (entry: server.py → app/main.py)
  frontend/        Expo Router app
  docs/            Developer documentation
```

## Environment Variables

### Backend (`backend/.env`)
Create the file (not committed to git):
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=uktaxi
CORS_ORIGINS=*
ENABLE_DEMO_MODE=true
```
For MongoDB Atlas:
```env
MONGO_URL=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net
DB_NAME=uktaxi
ENABLE_DEMO_MODE=true
```

`ENABLE_DEMO_MODE=false` skips startup demo seed and disables `GET /api/demo/accounts` (production-style). See [`backend/.env.example`](../backend/.env.example).

### Frontend (`frontend/.env`)
```env
EXPO_PUBLIC_BACKEND_URL=http://192.168.x.x:8000
EXPO_PUBLIC_BACKEND_PORT=8000
```
Replace `192.168.x.x` with your LAN IP (run `ifconfig en0` on Mac).
> If `EXPO_PUBLIC_BACKEND_URL` is not set, the app auto-detects using Expo host IP from `Constants.expoConfig.hostUri`. This usually works for device testing on the same WiFi network.

## Setup Steps

### 1) Backend setup
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2) Frontend setup
```bash
cd frontend
yarn install
```

## Run Services

### One script (backend + Expo QR in one terminal)

From repo root (requires `backend/.venv` and `frontend/node_modules` already created):

```bash
./scripts/quick-start.sh
```

Optional: `BACKEND_PORT`, `FRONTEND_PORT`, or `EXPO_TUNNEL=1` for `npx expo --tunnel`. See [README.md](../README.md#quick-start-one-command).

### Start backend
```bash
cd backend
source .venv/bin/activate
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

### Start frontend (with QR code for device)
```bash
cd frontend
npx expo start --port 8081
```

Scan the QR code in Expo Go on your device. Device and laptop must be on the same WiFi network.

### Start frontend (tunnel mode — any network)
```bash
cd frontend
yarn start --tunnel
```

## Useful Commands

### Frontend
```bash
yarn lint              # ESLint check
yarn android           # Launch on Android emulator
yarn ios               # Launch on iOS simulator
yarn web               # Launch in browser
```

### Backend
```bash
pytest -q                                        # Run API tests
export EXPO_PUBLIC_BACKEND_URL=http://localhost:8000 && pytest -q  # with env
```

## Demo Data Behavior
- On backend startup, `seed_demo()` runs automatically.
- If `SCHEMA_VERSION` changed OR `users` collection is empty, it drops `users`, `rides`, `requests` and recreates demo data.
- **This is expected for demo/dev** — do not use with live production data.

Demo OTP: `123456` (any 6-digit code also accepted).

## Troubleshooting

### "Network request failed" on device
- Confirm `EXPO_PUBLIC_BACKEND_URL` matches your laptop's LAN IP (not `localhost`).
- Device and laptop must be on the same WiFi network.
- Check backend is actually running on port 8000: `curl http://localhost:8000/`.

### Frontend cannot reach API via auto-detection
- Set `EXPO_PUBLIC_BACKEND_URL` explicitly in `frontend/.env`.
- Kill stale Metro/backend processes: `lsof -ti:8000 | xargs kill -9`.

### Expo starts but app blank/loading
```bash
cd frontend
yarn start --clear
```

### Backend fails at startup
- Verify `MONGO_URL` and `DB_NAME` in `backend/.env`.
- Ensure MongoDB is running: `brew services start mongodb-community` (local) or check Atlas URI.
- Verify Python venv is activated before running uvicorn.

### Port already in use
```bash
lsof -ti:8000 | xargs kill -9   # kill backend port
lsof -ti:8081 | xargs kill -9   # kill Metro port
```

