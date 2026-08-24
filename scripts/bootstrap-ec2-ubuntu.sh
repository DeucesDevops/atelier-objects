#!/usr/bin/env bash

# Bootstrap and run the Commerce Platform on an Ubuntu host. This is the
# shared implementation used by the EC2, Azure VM, and local Ubuntu scripts.
#
# Host requirements installed here:
#   - Docker Engine, Buildx, and Docker Compose v2
#   - Git, curl, jq, unzip, make, and OpenSSL
#   - AWS CLI v2 (optional; enabled by default)
#
# Node.js, Java, Python, PostgreSQL, Redis, Redpanda, and Nginx do not need
# host installations: Docker Compose runs them in the application containers.

set -Eeuo pipefail

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly DEFAULT_APP_DIR="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
readonly APP_DIR="${APP_DIR:-${DEFAULT_APP_DIR}}"
readonly INSTALL_AWS_CLI="${INSTALL_AWS_CLI:-true}"
readonly START_APPLICATION="${START_APPLICATION:-true}"
readonly SEED_DEMO="${SEED_DEMO:-false}"
readonly HOST_CONTEXT="${HOST_CONTEXT:-Amazon EC2}"

log() {
  printf '[bootstrap] %s\n' "$*"
}

die() {
  printf '[bootstrap] ERROR: %s\n' "$*" >&2
  exit 1
}

if [[ ! -f /etc/os-release ]]; then
  die 'Cannot identify the operating system.'
fi

# shellcheck disable=SC1091
source /etc/os-release
if [[ "${ID:-}" != "ubuntu" ]]; then
  die "This script supports Ubuntu hosts; detected ${ID:-unknown}."
fi

if [[ ! -f "${APP_DIR}/compose.yml" ]]; then
  die "compose.yml was not found in APP_DIR=${APP_DIR}. Clone the repository first or set APP_DIR."
fi

if [[ "${EUID}" -eq 0 ]]; then
  SUDO=()
else
  command -v sudo >/dev/null 2>&1 || die 'sudo is required when not running as root.'
  SUDO=(sudo)
fi

export DEBIAN_FRONTEND=noninteractive

install_base_tools() {
  log 'Installing host utilities...'
  "${SUDO[@]}" apt-get update
  "${SUDO[@]}" apt-get install -y \
    ca-certificates \
    curl \
    git \
    gnupg \
    jq \
    make \
    openssl \
    unzip
}

install_docker() {
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    log 'Docker Engine and Compose v2 are already installed.'
    return
  fi

  log 'Installing Docker Engine, Buildx, and Compose v2 from Docker’s apt repository...'
  "${SUDO[@]}" install -m 0755 -d /etc/apt/keyrings
  curl -fsSL "https://download.docker.com/linux/ubuntu/gpg" \
    | "${SUDO[@]}" gpg --dearmor --yes -o /etc/apt/keyrings/docker.gpg
  "${SUDO[@]}" chmod a+r /etc/apt/keyrings/docker.gpg

  local architecture codename
  architecture="$(dpkg --print-architecture)"
  codename="${VERSION_CODENAME:?Ubuntu VERSION_CODENAME is unavailable}"
  printf 'deb [arch=%s signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu %s stable\n' \
    "${architecture}" "${codename}" \
    | "${SUDO[@]}" tee /etc/apt/sources.list.d/docker.list >/dev/null

  "${SUDO[@]}" apt-get update
  "${SUDO[@]}" apt-get install -y \
    docker-ce \
    docker-ce-cli \
    containerd.io \
    docker-buildx-plugin \
    docker-compose-plugin
  "${SUDO[@]}" systemctl enable --now docker
}

install_aws_cli() {
  if [[ "${INSTALL_AWS_CLI}" != "true" ]]; then
    log 'Skipping AWS CLI installation (INSTALL_AWS_CLI is not true).'
    return
  fi
  if command -v aws >/dev/null 2>&1; then
    log 'AWS CLI is already installed.'
    return
  fi

  local machine aws_arch temp_dir
  machine="$(uname -m)"
  case "${machine}" in
    x86_64) aws_arch='x86_64' ;;
    aarch64|arm64) aws_arch='aarch64' ;;
    *) die "AWS CLI v2 installer does not support architecture ${machine}." ;;
  esac

  log 'Installing AWS CLI v2...'
  temp_dir="$(mktemp -d)"
  curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-${aws_arch}.zip" -o "${temp_dir}/awscliv2.zip"
  unzip -q "${temp_dir}/awscliv2.zip" -d "${temp_dir}"
  "${SUDO[@]}" "${temp_dir}/aws/install"
  rm -rf -- "${temp_dir}"
}

configure_docker_access() {
  if [[ "${EUID}" -ne 0 ]]; then
    "${SUDO[@]}" usermod -aG docker "${USER}"
  fi

  # Use sudo during this run because new group membership only applies after
  # the user's next login.
  if docker info >/dev/null 2>&1; then
    DOCKER=(docker)
  else
    DOCKER=("${SUDO[@]}" docker)
  fi
  "${DOCKER[@]}" info >/dev/null || die 'Docker daemon is not available.'
}

detect_public_api_url() {
  if [[ -n "${VITE_API_URL:-}" ]]; then
    printf '%s' "${VITE_API_URL}"
    return
  fi

  local token public_ipv4
  token="$(curl -fsS --connect-timeout 2 -X PUT \
    -H 'X-aws-ec2-metadata-token-ttl-seconds: 60' \
    http://169.254.169.254/latest/api/token 2>/dev/null || true)"
  if [[ -n "${token}" ]]; then
    public_ipv4="$(curl -fsS --connect-timeout 2 \
      -H "X-aws-ec2-metadata-token: ${token}" \
      http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || true)"
  fi

  if [[ -n "${public_ipv4:-}" ]]; then
    printf 'http://%s:8080' "${public_ipv4}"
  else
    printf 'http://localhost:8080'
  fi
}

configure_application() {
  cd "${APP_DIR}"

  if [[ ! -f .env ]]; then
    log 'Creating .env with generated local credentials...'
    umask 077
    {
      printf 'POSTGRES_USER=commerce\n'
      printf 'POSTGRES_PASSWORD=%s\n' "$(openssl rand -hex 24)"
      printf 'JWT_SECRET=%s\n' "$(openssl rand -hex 48)"
      printf 'KAFKA_BROKERS=redpanda:9092\n'
      printf 'REDIS_URL=redis://redis:6379\n'
    } > .env
  else
    log 'Preserving the existing .env file.'
  fi

  export VITE_API_URL
  VITE_API_URL="$(detect_public_api_url)"
  if [[ "${VITE_API_URL}" == 'http://localhost:8080' ]]; then
    log "No public IPv4 was detected for ${HOST_CONTEXT}. Set VITE_API_URL and rerun if remote browsers need access."
  fi
  log "Frontend API URL: ${VITE_API_URL}"

  "${DOCKER[@]}" compose config --quiet
}

start_application() {
  if [[ "${START_APPLICATION}" != "true" ]]; then
    log 'Installation and configuration complete; application startup was skipped.'
    return
  fi

  log 'Building and starting the complete microservices stack...'
  "${DOCKER[@]}" compose up --build --detach

  log 'Waiting for the API Gateway...'
  local attempt
  for attempt in {1..60}; do
    if curl -fsS http://localhost:8080/health >/dev/null 2>&1; then
      break
    fi
    if [[ "${attempt}" -eq 60 ]]; then
      "${DOCKER[@]}" compose ps
      die 'API Gateway did not become healthy within five minutes. Inspect: docker compose logs'
    fi
    sleep 5
  done

  if [[ "${SEED_DEMO}" == "true" ]]; then
    log 'Seeding demonstration data...'
    ./commerce-demo/seed.sh
  fi

  "${DOCKER[@]}" compose ps
  log "Commerce Platform is running on ${HOST_CONTEXT}."
  log 'Web UI: use this host name or IP on port 5173'
  log "API Gateway: ${VITE_API_URL}"
  log 'Allow inbound TCP 5173 and 8080 only from trusted sources while testing.'
}

install_base_tools
install_docker
install_aws_cli
configure_docker_access
configure_application
start_application
