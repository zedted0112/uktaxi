#!/usr/bin/env bash
# Starts FastAPI (background) and Expo dev server (foreground) so you get one terminal with the QR code.
# Usage from repo root: ./scripts/quick-start.sh
# Optional: BACKEND_PORT=8000 FRONTEND_PORT=8081 EXPO_TUNNEL=1 ./scripts/quick-start.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-8081}"
BACKEND_PID=""

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
EXPO_ARGS=(start "--port" "${FRONTEND_PORT}")
if [[ "${EXPO_TUNNEL:-}" == "1" ]] || [[ "${EXPO_TUNNEL:-}" == "true" ]]; then
  EXPO_ARGS+=(--tunnel)
fi

npx expo "${EXPO_ARGS[@]}"
