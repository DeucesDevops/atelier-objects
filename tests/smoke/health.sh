#!/usr/bin/env bash
# Post-deploy checks for the public shopper path.
# BASE_URL is the API gateway origin, for example https://api.example.com
# WEB_URL is optional, for example https://shop.example.com
set -euo pipefail

base="${BASE_URL:?set BASE_URL to the API gateway origin}"

check() {
  local url="$1"
  printf 'GET %s\n' "${url}"
  curl --fail --silent --show-error --max-time 15 "${url}"
  printf '\n'
}

check "${base}/health"
if [[ -n "${WEB_URL:-}" ]]; then
  check "${WEB_URL}/health"
fi
