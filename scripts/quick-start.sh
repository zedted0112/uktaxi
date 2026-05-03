#!/usr/bin/env bash
# Starts FastAPI (background) and Expo dev server (foreground) so you get one terminal with the QR code.
# Usage from repo root: ./scripts/quick-start.sh
# Optional overrides:
#   BACKEND_PORT=8000 FRONTEND_PORT=8081 ./scripts/quick-start.sh
#   EXPO_TUNNEL=0 ./scripts/quick-start.sh   # force LAN mode
#   EXPO_CLEAR=1 ./scripts/quick-start.sh    # clear Metro cache on startup
# Exports for local API (see frontend/src/api.ts): EXPO_PUBLIC_DEMO_MODE=true (default),
# EXPO_PUBLIC_BACKEND_PORT, EXPO_PUBLIC_BACKEND_URL=http://<LAN-IP>:PORT for device builds.
#   USE_DEV_CLIENT=1 ./scripts/quick-start.sh   # QR for custom dev build (default is --go = Expo Go)

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-8081}"
BACKEND_PID=""
LOCAL_IP=""

free_port() {
  local port="$1"
  local label="${2:-Port}"
  local pids
  pids="$(lsof -ti :"${port}" 2>/dev/null || true)"
  if [[ -z "${pids}" ]]; then
    return 0
  fi

  echo "${label} port ${port} is in use. Stopping existing process(es): ${pids}"
  while IFS= read -r pid; do
    [[ -z "${pid}" ]] && continue
    kill "${pid}" 2>/dev/null || true
  done <<< "${pids}"

  sleep 1

  local still_running
  still_running="$(lsof -ti :"${port}" 2>/dev/null || true)"
  if [[ -n "${still_running}" ]]; then
    echo "Force-stopping remaining process(es) on port ${port}: ${still_running}"
    while IFS= read -r pid; do
      [[ -z "${pid}" ]] && continue
      kill -9 "${pid}" 2>/dev/null || true
    done <<< "${still_running}"
  fi
}

cleanup() {
  if [[ -n "${BACKEND_PID}" ]] && kill -0 "${BACKEND_PID}" 2>/dev/null; then
    echo ""
    echo "Stopping backend (pid ${BACKEND_PID})..."
    kill "${BACKEND_PID}" 2>/dev/null || true
    wait "${BACKEND_PID}" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

detect_local_ip() {
  ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true
}

if [[ ! -d "${ROOT}/backend/.venv" ]]; then
  echo "Missing backend/.venv — run once:"
  echo "  cd backend && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt"
  exit 1
fi

if [[ ! -f "${ROOT}/backend/.env" ]]; then
  echo "Warning: backend/.env not found. Copy backend/.env.example to backend/.env" >&2
fi

if [[ ! -d "${ROOT}/frontend/node_modules" ]]; then
  echo "Missing frontend/node_modules — run: cd frontend && yarn install"
  exit 1
fi

free_port "${BACKEND_PORT}" "Backend"
free_port "${FRONTEND_PORT}" "Frontend"

echo "Starting backend on 0.0.0.0:${BACKEND_PORT} ..."
cd "${ROOT}/backend"
"${ROOT}/backend/.venv/bin/uvicorn" server:app --reload --host 0.0.0.0 --port "${BACKEND_PORT}" &
BACKEND_PID=$!

# Brief wait so Mongo connect / seed can fail fast before Expo starts
sleep 1
if ! kill -0 "${BACKEND_PID}" 2>/dev/null; then
  echo "Backend exited immediately — check backend/.env and MongoDB." >&2
  exit 1
fi

echo "Backend pid ${BACKEND_PID} — API: http://127.0.0.1:${BACKEND_PORT}/api/"
echo ""
echo "Starting Expo on port ${FRONTEND_PORT} (QR below; Ctrl+C stops Expo and backend)..."
echo ""

cd "${ROOT}/frontend"
LOCAL_IP="$(detect_local_ip)"
# Match frontend api.ts: local-only bases + correct port when EXPO_PUBLIC_DEMO_MODE=true.
export EXPO_PUBLIC_BACKEND_PORT="${BACKEND_PORT}"
export EXPO_PUBLIC_DEMO_MODE="${EXPO_PUBLIC_DEMO_MODE:-true}"
if [[ -n "${LOCAL_IP}" ]]; then
  export EXPO_PUBLIC_BACKEND_URL="http://${LOCAL_IP}:${BACKEND_PORT}"
  # Metro / Expo Go use this so the phone loads JS from your LAN IP (not localhost/tunnel guesswork).
  export REACT_NATIVE_PACKAGER_HOSTNAME="${LOCAL_IP}"
  echo "Local API for Expo: EXPO_PUBLIC_DEMO_MODE=${EXPO_PUBLIC_DEMO_MODE} EXPO_PUBLIC_BACKEND_PORT=${BACKEND_PORT}"
  echo "Phone / same Wi-Fi: ${EXPO_PUBLIC_BACKEND_URL} (also used when demo mode is off)"
  echo "Metro hostname for device: REACT_NATIVE_PACKAGER_HOSTNAME=${LOCAL_IP}"
else
  echo "Could not detect LAN IP (en0/en1); EXPO_PUBLIC_BACKEND_URL unchanged — simulator may use localhost/10.0.2.2 via app."
fi

EXPO_TUNNEL="${EXPO_TUNNEL:-0}"
EXPO_CLEAR="${EXPO_CLEAR:-1}"
USE_DEV_CLIENT="${USE_DEV_CLIENT:-0}"

expo_start_args() {
  EXPO_ARGS=(start "--port" "${FRONTEND_PORT}")
  if [[ "${USE_DEV_CLIENT}" == "1" ]] || [[ "${USE_DEV_CLIENT}" == "true" ]]; then
    EXPO_ARGS+=(--dev-client)
  else
    EXPO_ARGS+=(--go)
  fi
  if [[ "${EXPO_TUNNEL}" == "1" ]] || [[ "${EXPO_TUNNEL}" == "true" ]]; then
    EXPO_ARGS+=(--tunnel)
  else
    EXPO_ARGS+=(--lan)
  fi
  if [[ "${EXPO_CLEAR}" == "1" ]] || [[ "${EXPO_CLEAR}" == "true" ]]; then
    EXPO_ARGS+=(--clear)
  fi
}

expo_start_args

if ! npx expo "${EXPO_ARGS[@]}"; then
  if [[ "${EXPO_TUNNEL}" == "1" ]] || [[ "${EXPO_TUNNEL}" == "true" ]]; then
    echo "Tunnel failed, falling back to LAN mode..."
    EXPO_TUNNEL=0
    expo_start_args
    npx expo "${EXPO_ARGS[@]}"
  else
    exit 1
  fi
fi
