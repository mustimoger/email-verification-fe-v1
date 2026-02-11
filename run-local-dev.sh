#!/usr/bin/env bash
set -euo pipefail

WEBSITE_PORT=3010
DASHBOARD_PORT=8010
BACKEND_PORT=8011

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_PATH="${PROJECT_ROOT}/.venv/bin/activate"
BACKEND_LOG_DIR="${PROJECT_ROOT}/apps/dashboard/backend/logs"
BACKEND_LOG_FILE="${BACKEND_LOG_DIR}/uvicorn.local.log"
BACKEND_ENV_FILE="${PROJECT_ROOT}/apps/dashboard/backend/.env"
BACKEND_ENV_LOCAL_FILE="${PROJECT_ROOT}/apps/dashboard/backend/.env.local"
WEBSITE_ENV_LOCAL_FILE="${PROJECT_ROOT}/apps/website/.env.local"

if [ ! -f "${VENV_PATH}" ]; then
  echo "missing_venv: expected ${VENV_PATH}" >&2
  echo "create it first: python3 -m venv .venv" >&2
  exit 1
fi

# shellcheck disable=SC1090
source "${VENV_PATH}"

load_env_file() {
  local env_file="$1"
  if [ -f "${env_file}" ]; then
    while IFS= read -r raw_line || [ -n "${raw_line}" ]; do
      local line="${raw_line}"
      line="${line#"${line%%[![:space:]]*}"}"
      line="${line%"${line##*[![:space:]]}"}"

      if [ -z "${line}" ] || [ "${line#\#}" != "${line}" ]; then
        continue
      fi

      if [ "${line#export }" != "${line}" ]; then
        line="${line#export }"
      fi

      if [ "${line#*=}" = "${line}" ]; then
        continue
      fi

      local key="${line%%=*}"
      local value="${line#*=}"

      key="${key#"${key%%[![:space:]]*}"}"
      key="${key%"${key##*[![:space:]]}"}"
      value="${value#"${value%%[![:space:]]*}"}"
      value="${value%"${value##*[![:space:]]}"}"

      if [ -z "${key}" ]; then
        continue
      fi

      if [ "${value#\"}" != "${value}" ] && [ "${value%\"}" != "${value}" ]; then
        value="${value#\"}"
        value="${value%\"}"
      elif [ "${value#\'}" != "${value}" ] && [ "${value%\'}" != "${value}" ]; then
        value="${value#\'}"
        value="${value%\'}"
      fi

      export "${key}=${value}"
    done < "${env_file}"
  fi
}

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

load_env_file "${BACKEND_ENV_FILE}"
load_env_file "${BACKEND_ENV_LOCAL_FILE}"
load_env_file "${WEBSITE_ENV_LOCAL_FILE}"

free_port "${WEBSITE_PORT}"
free_port "${DASHBOARD_PORT}"
free_port "${BACKEND_PORT}"

export NEXT_PUBLIC_API_BASE_URL="http://127.0.0.1:${BACKEND_PORT}/api"
export BACKEND_CORS_ORIGINS="[\"http://localhost:${DASHBOARD_PORT}\",\"http://127.0.0.1:${DASHBOARD_PORT}\"]"
export LOG_FILE_PATH="${BACKEND_LOG_FILE}"
export LOG_FILE_WHEN="midnight"
export LOG_FILE_INTERVAL="1"
export LOG_FILE_BACKUP_COUNT="14"

if [ -z "${CONTACT_NOTIFICATION_TO_EMAIL:-}" ] && [ -n "${SMTP_REPLY_TO:-}" ]; then
  export CONTACT_NOTIFICATION_TO_EMAIL="${SMTP_REPLY_TO}"
fi

required_contact_smtp_vars=(
  "SMTP_SERVER"
  "SMTP_PORT"
  "SMTP_USERNAME"
  "SMTP_PASSWORD"
  "SMTP_STARTTLS_REQUIRED"
  "SMTP_FROM_EMAIL"
  "SMTP_FROM_NAME"
  "SMTP_REPLY_TO"
)

missing_contact_smtp_vars=()
for key in "${required_contact_smtp_vars[@]}"; do
  if [ -z "${!key:-}" ]; then
    missing_contact_smtp_vars+=("${key}")
  fi
done

if [ "${#missing_contact_smtp_vars[@]}" -gt 0 ]; then
  echo "warning: /contact SMTP env is incomplete for website runtime"
  echo "missing keys: ${missing_contact_smtp_vars[*]}"
  echo "expected in: ${BACKEND_ENV_FILE}, ${BACKEND_ENV_LOCAL_FILE}, or ${WEBSITE_ENV_LOCAL_FILE}"
fi

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
