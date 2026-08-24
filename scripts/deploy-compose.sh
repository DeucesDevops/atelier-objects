#!/usr/bin/env bash

# Run on the Ubuntu deployment host after the repository files are uploaded.
set -Eeuo pipefail

readonly APP_DIR="${APP_DIR:-/opt/commerce-platform}"
readonly RELEASE_DIR="${RELEASE_DIR:-${APP_DIR}/current}"

[[ -f "${RELEASE_DIR}/compose.yml" ]] || {
  printf 'compose.yml not found in %s\n' "${RELEASE_DIR}" >&2
  exit 1
}

cd "${RELEASE_DIR}"
export APP_DIR="${RELEASE_DIR}"
export START_APPLICATION=true
export SEED_DEMO="${SEED_DEMO:-false}"
exec ./scripts/bootstrap-ec2-ubuntu.sh
