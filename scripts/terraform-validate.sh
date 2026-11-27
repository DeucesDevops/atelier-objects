#!/usr/bin/env bash
set -euo pipefail

# shellcheck disable=SC1091
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib/common.sh"

require_cmd terraform

modules=(
  bootstrap
  modules/network
  modules/cluster
  modules/ecr
  modules/dns
  modules/storage
  modules/identity
  modules/platform
  environments/dev
  environments/production
)

log "terraform fmt -check -recursive"
terraform fmt -check -recursive "${ROOT}/terraform"

for rel in "${modules[@]}"; do
  dir="${ROOT}/terraform/${rel}"
  log "fmt ${rel}"
  terraform fmt -check -recursive "${dir}"
  log "init ${rel}"
  terraform -chdir="${dir}" init -backend=false -input=false -no-color
  log "validate ${rel}"
  terraform -chdir="${dir}" validate -no-color
done

if command -v tflint >/dev/null 2>&1; then
  log "tflint"
  tflint --init --chdir="${ROOT}" --config="${ROOT}/.tflint.hcl"
  tflint --recursive --chdir="${ROOT}" --config="${ROOT}/.tflint.hcl"
else
  log "tflint not installed; skipped"
fi
