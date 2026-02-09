#!/usr/bin/env bash
set -euo pipefail

WEBSITE_PORT=3010
DASHBOARD_PORT=8010
BACKEND_PORT=8011

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_PATH="${PROJECT_ROOT}/.venv/bin/activate"
BACKEND_LOG_DIR="${PROJECT_ROOT}/apps/dashboard/backend/logs"
BACKEND_LOG_FILE="${BACKEND_LOG_DIR}/uvicorn.local.log"

if [ ! -f "${VENV_PATH}" ]; then
  echo "missing_venv: expected ${VENV_PATH}" >&2
  echo "create it first: python3 -m venv .venv" >&2
  exit 1
fi

# shellcheck disable=SC1090
source "${VENV_PATH}"

free_port() {
  local port="$1"
  if command -v fuser >/dev/null 2>&1; then
    fuser -k "${port}/tcp" 2>/dev/null || true
    return
  fi
  if command -v lsof >/dev/null 2>&1; then
    lsof -ti "tcp:${port}" 2>/dev/null | xargs -r kill -9 || true
    return
  fi
  echo "warning: neither lsof nor fuser is available; port ${port} was not pre-cleared" >&2
}

mkdir -p "${BACKEND_LOG_DIR}"

free_port "${WEBSITE_PORT}"
free_port "${DASHBOARD_PORT}"
free_port "${BACKEND_PORT}"

export NEXT_PUBLIC_API_BASE_URL="http://127.0.0.1:${BACKEND_PORT}/api"
export BACKEND_CORS_ORIGINS="[\"http://localhost:${DASHBOARD_PORT}\",\"http://127.0.0.1:${DASHBOARD_PORT}\"]"
export LOG_FILE_PATH="${BACKEND_LOG_FILE}"
export LOG_FILE_WHEN="midnight"
export LOG_FILE_INTERVAL="1"
export LOG_FILE_BACKUP_COUNT="14"

backend_pid=""
dashboard_pid=""
website_pid=""

cleanup() {
  local code=$?
  if [ -n "${backend_pid}" ]; then kill "${backend_pid}" 2>/dev/null || true; fi
  if [ -n "${dashboard_pid}" ]; then kill "${dashboard_pid}" 2>/dev/null || true; fi
  if [ -n "${website_pid}" ]; then kill "${website_pid}" 2>/dev/null || true; fi
  wait "${backend_pid}" "${dashboard_pid}" "${website_pid}" 2>/dev/null || true
  exit "${code}"
}

trap cleanup INT TERM EXIT

(
  cd "${PROJECT_ROOT}/apps/dashboard/backend"
  uvicorn app.main:app --reload --host 127.0.0.1 --port "${BACKEND_PORT}"
) &
backend_pid=$!

npm --prefix "${PROJECT_ROOT}/apps/dashboard" run dev -- --port "${DASHBOARD_PORT}" &
dashboard_pid=$!

npm --prefix "${PROJECT_ROOT}/apps/website" run dev -- --port "${WEBSITE_PORT}" &
website_pid=$!

echo "website:   http://localhost:${WEBSITE_PORT}"
echo "dashboard: http://localhost:${DASHBOARD_PORT}"
echo "backend:   http://127.0.0.1:${BACKEND_PORT}/health"
echo "press Ctrl+C to stop all local services"

wait "${backend_pid}" "${dashboard_pid}" "${website_pid}"
