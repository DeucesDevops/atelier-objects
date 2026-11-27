#!/usr/bin/env bash

atelier_lib_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "${atelier_lib_dir}/../.." && pwd)"

log() {
  printf '%s\n' "$*"
}

die() {
  printf 'error: %s\n' "$*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "missing command: $1"
}

require_file() {
  if [[ ! -f "$1" ]]; then
    die "missing file: $1"
  fi
}

env_dir() {
  case "$1" in
    dev | production) ;;
    *) die "environment must be dev or production" ;;
  esac
  printf '%s\n' "${ROOT}/terraform/environments/$1"
}
