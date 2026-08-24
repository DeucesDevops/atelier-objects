#!/usr/bin/env bash

set -Eeuo pipefail

readonly HEALTH_URL="${HEALTH_URL:-http://localhost:8080/health}"
readonly STARTUP_ATTEMPTS="${STARTUP_ATTEMPTS:-60}"

cleanup() {
  local exit_code=$?
  if [[ "${exit_code}" -ne 0 ]]; then
    docker compose ps || true
    docker compose logs --no-color --tail=200 || true
  fi
  docker compose down --volumes --remove-orphans
  exit "${exit_code}"
}
trap cleanup EXIT

docker compose up --build --detach

for ((attempt = 1; attempt <= STARTUP_ATTEMPTS; attempt++)); do
  if curl --fail --silent --show-error "${HEALTH_URL}" >/dev/null; then
    ./commerce-demo/seed.sh
    ./commerce-demo/demo-flow.sh
    exit 0
  fi
  sleep 5
done

printf 'API Gateway did not become healthy after %s attempts.\n' "${STARTUP_ATTEMPTS}" >&2
exit 1
