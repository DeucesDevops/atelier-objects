#!/usr/bin/env bash

# Bootstrap the Commerce Platform on an Ubuntu Azure Virtual Machine.
# Azure CLI is installed for VM administration; the application itself runs
# entirely through Docker Compose.

set -Eeuo pipefail

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly INSTALL_AZURE_CLI="${INSTALL_AZURE_CLI:-true}"

log() {
  printf '[azure-bootstrap] %s\n' "$*"
}

if [[ "${EUID}" -eq 0 ]]; then
  SUDO=()
else
  command -v sudo >/dev/null 2>&1 || { printf 'sudo is required.\n' >&2; exit 1; }
  SUDO=(sudo)
fi

install_azure_cli() {
  if [[ "${INSTALL_AZURE_CLI}" != "true" ]]; then
    log 'Skipping Azure CLI installation (INSTALL_AZURE_CLI is not true).'
    return
  fi
  if command -v az >/dev/null 2>&1; then
    log 'Azure CLI is already installed.'
    return
  fi

  log 'Installing Azure CLI from Microsoft’s signed apt repository...'
  "${SUDO[@]}" apt-get update
  "${SUDO[@]}" apt-get install -y ca-certificates curl gnupg lsb-release
  "${SUDO[@]}" install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://packages.microsoft.com/keys/microsoft.asc \
    | gpg --dearmor \
    | "${SUDO[@]}" tee /etc/apt/keyrings/microsoft.gpg >/dev/null
  "${SUDO[@]}" chmod go+r /etc/apt/keyrings/microsoft.gpg

  local azure_codename
  azure_codename="$(lsb_release -cs)"
  printf 'Types: deb\nURIs: https://packages.microsoft.com/repos/azure-cli/\nSuites: %s\nComponents: main\nArchitectures: %s\nSigned-by: /etc/apt/keyrings/microsoft.gpg\n' \
    "${azure_codename}" "$(dpkg --print-architecture)" \
    | "${SUDO[@]}" tee /etc/apt/sources.list.d/azure-cli.sources >/dev/null
  "${SUDO[@]}" apt-get update
  "${SUDO[@]}" apt-get install -y azure-cli
}

detect_azure_api_url() {
  if [[ -n "${VITE_API_URL:-}" ]]; then
    printf '%s' "${VITE_API_URL}"
    return
  fi

  local public_ipv4
  public_ipv4="$(curl -fsS --connect-timeout 2 \
    -H 'Metadata:true' \
    'http://169.254.169.254/metadata/instance/network/interface/0/ipv4/ipAddress/0/publicIpAddress?api-version=2021-02-01&format=text' \
    2>/dev/null || true)"
  if [[ -n "${public_ipv4}" ]]; then
    printf 'http://%s:8080' "${public_ipv4}"
  else
    printf 'http://localhost:8080'
  fi
}

install_azure_cli
export VITE_API_URL="$(detect_azure_api_url)"
export INSTALL_AWS_CLI=false
export HOST_CONTEXT='Azure Virtual Machine'
exec "${SCRIPT_DIR}/bootstrap-ec2-ubuntu.sh"
