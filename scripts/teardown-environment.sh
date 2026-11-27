#!/usr/bin/env bash
set -euo pipefail

# shellcheck disable=SC1091
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib/common.sh"

env_name="${1:-}"
if [[ -z "${env_name}" ]]; then
  die "usage: teardown-environment.sh <dev|production>"
fi

dir="$(env_dir "${env_name}")"
require_cmd terraform
require_file "${dir}/backend.hcl"
require_file "${dir}/terraform.tfvars"

if command -v kubectl >/dev/null 2>&1 && kubectl cluster-info >/dev/null 2>&1; then
  log "deleting ingresses so load balancers are released"
  kubectl -n commerce delete ingress --all --wait=true --timeout=10m || true
  log "deleting persistent volume claims"
  for ns in commerce data monitoring; do
    if kubectl get namespace "${ns}" >/dev/null 2>&1; then
      kubectl -n "${ns}" delete pvc --all --wait=true --timeout=10m || true
    fi
  done
else
  log "cluster API is not reachable; continuing with terraform destroy"
fi

terraform -chdir="${dir}" init -input=false -backend-config=backend.hcl
terraform -chdir="${dir}" destroy -input=false -auto-approve -var-file=terraform.tfvars
