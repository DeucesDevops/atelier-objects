#!/usr/bin/env bash
set -euo pipefail

# shellcheck disable=SC1091
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib/common.sh"

require_cmd terraform
require_file "${ROOT}/terraform/bootstrap/terraform.tfvars"

log "Applying the state bucket. This uses the local backend."
terraform -chdir="${ROOT}/terraform/bootstrap" init -input=false
terraform -chdir="${ROOT}/terraform/bootstrap" apply -input=false -auto-approve -var-file=terraform.tfvars

log "State bucket: $(terraform -chdir="${ROOT}/terraform/bootstrap" output -raw state_bucket_name)"
log "Put that name in terraform/environments/<env>/backend.hcl and set use_lockfile = true."
