# UKTaxi Local Development Runbook

## Prerequisites
- Node.js 18+ and Yarn 1.x
- Python 3.10+ and `pip`
- MongoDB instance (local or hosted)
- Expo Go app (for physical mobile testing)

## Repository Layout
- `frontend`: Expo app
- `backend`: FastAPI service

## Environment Variables
### Backend (`backend/.env`)
Create file:
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=uktaxi
```

### Frontend (`frontend/.env`) optional
```env
EXPO_PUBLIC_BACKEND_URL=http://localhost:8000
```

If frontend env is missing, app falls back to preview backend URL hardcoded in `src/api.ts`.

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
### Start backend
```bash
cd backend
source .venv/bin/activate
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

### Start frontend
```bash
cd frontend
yarn start
```

### Start frontend with QR/tunnel
```bash
cd frontend
yarn start --tunnel
```

## Useful Commands
### Frontend
```bash
yarn lint
yarn android
yarn ios
yarn web
```

### Backend
```bash
pytest -q
```

## Demo Data Behavior
- On backend startup, `seed_demo()` may reset `users`, `rides`, and `requests` if schema version changed or data is empty.
- This is expected for demo/testing but can wipe local test data.

## Troubleshooting
### Frontend cannot reach API
- Confirm `EXPO_PUBLIC_BACKEND_URL` points to running backend.
- Ensure backend has CORS enabled (already permissive in current code).

### Expo starts but app blank/loading
- Clear cache and restart:
```bash
cd frontend
yarn start --clear
```

### Backend fails at startup with env errors
- Verify `MONGO_URL` and `DB_NAME` are set in `backend/.env`.

### Tests fail with connection errors
- `backend/tests/test_taxi_api.py` expects `EXPO_PUBLIC_BACKEND_URL` in environment.
- Export it before running pytest:
```bash
export EXPO_PUBLIC_BACKEND_URL=http://localhost:8000
pytest -q
```

## Git Hygiene Notes
- Metro cache churn can produce massive local changes under `frontend/.metro-cache`.
- Recommended:
  - keep cache artifacts out of commits
  - ensure `.gitignore` excludes generated cache directories
