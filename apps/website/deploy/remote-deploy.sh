#!/usr/bin/env bash
set -euo pipefail

: "${APP_ROOT:?APP_ROOT is required}"
: "${RELEASE_ID:?RELEASE_ID is required}"
: "${APP_ENV_FILE:?APP_ENV_FILE is required}"
: "${WEBSITE_SERVICE:?WEBSITE_SERVICE is required}"

RELEASE_DIR="${APP_ROOT}/releases/${RELEASE_ID}"

if [ ! -d "${RELEASE_DIR}" ]; then
  echo "release_dir_missing" >&2
  exit 1
fi

if [ ! -f "${APP_ENV_FILE}" ]; then
  echo "app_env_file_missing" >&2
  exit 1
fi

ln -sfn "${APP_ENV_FILE}" "${RELEASE_DIR}/.env.local"

cd "${RELEASE_DIR}"

export NODE_ENV=development
export NPM_CONFIG_PRODUCTION=false
npm ci
NODE_ENV=production npm run build
npm prune --omit=dev
unset NPM_CONFIG_PRODUCTION
export NODE_ENV=production

ln -sfn "${RELEASE_DIR}" "${APP_ROOT}/current"

sudo systemctl restart "${WEBSITE_SERVICE}"
