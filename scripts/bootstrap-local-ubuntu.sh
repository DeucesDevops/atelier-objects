#!/usr/bin/env bash

# Bootstrap the Commerce Platform on a local Ubuntu server or Ubuntu VM.
# Run this inside Ubuntu. For an Ubuntu VM hosted on a Mac, set VITE_API_URL to
# the VM address if the browser runs on macOS, for example:
#   VITE_API_URL=http://192.168.64.10:8080 ./scripts/bootstrap-local-ubuntu.sh

set -Eeuo pipefail

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

export VITE_API_URL="${VITE_API_URL:-http://localhost:8080}"
export INSTALL_AWS_CLI=false
export HOST_CONTEXT='local Ubuntu server'
exec "${SCRIPT_DIR}/bootstrap-ec2-ubuntu.sh"
