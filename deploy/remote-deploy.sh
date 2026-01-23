#!/usr/bin/env bash
set -euo pipefail

: "${APP_ROOT:?APP_ROOT is required}"
: "${RELEASE_ID:?RELEASE_ID is required}"
: "${APP_ENV_FILE:?APP_ENV_FILE is required}"
: "${BACKEND_ENV_FILE:?BACKEND_ENV_FILE is required}"
: "${BACKEND_VENV_PATH:?BACKEND_VENV_PATH is required}"
: "${FRONTEND_SERVICE:?FRONTEND_SERVICE is required}"
: "${BACKEND_SERVICE:?BACKEND_SERVICE is required}"

RELEASE_DIR="${APP_ROOT}/releases/${RELEASE_ID}"

if [ ! -d "${RELEASE_DIR}" ]; then
  echo "release_dir_missing" >&2
  exit 1
fi

if [ ! -f "${APP_ENV_FILE}" ]; then
  echo "app_env_file_missing" >&2
  exit 1
fi

if [ ! -f "${BACKEND_ENV_FILE}" ]; then
  echo "backend_env_file_missing" >&2
  exit 1
fi

ln -sfn "${APP_ENV_FILE}" "${RELEASE_DIR}/.env.local"
ln -sfn "${BACKEND_ENV_FILE}" "${RELEASE_DIR}/backend/.env"

cd "${RELEASE_DIR}"

npm ci --include=dev
NODE_ENV=production npm run build
export NODE_ENV=production

if [ ! -d "${BACKEND_VENV_PATH}" ]; then
  python3 -m venv "${BACKEND_VENV_PATH}"
fi

# shellcheck disable=SC1091
source "${BACKEND_VENV_PATH}/bin/activate"
python -m pip install --upgrade pip
pip install -r "${RELEASE_DIR}/backend/requirements.txt"

ln -sfn "${RELEASE_DIR}" "${APP_ROOT}/current"

sudo systemctl restart "${BACKEND_SERVICE}"
sudo systemctl restart "${FRONTEND_SERVICE}"
