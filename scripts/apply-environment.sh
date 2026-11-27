#!/usr/bin/env bash
set -euo pipefail

# shellcheck disable=SC1091
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib/common.sh"

env_name="${1:-}"
if [[ -z "${env_name}" ]]; then
  die "usage: apply-environment.sh <dev|production>"
fi

dir="$(env_dir "${env_name}")"
require_cmd terraform
require_file "${dir}/backend.hcl"
require_file "${dir}/terraform.tfvars"

log "stage 1: network, cluster, registries, dns, storage, identity"
terraform -chdir="${dir}" init -input=false -backend-config=backend.hcl
terraform -chdir="${dir}" apply -input=false -auto-approve -var-file=terraform.tfvars \
  -target=module.network \
  -target=module.cluster \
  -target=module.ecr \
  -target=module.dns \
  -target=module.storage \
  -target=module.identity

log "stage 2: platform controllers"
terraform -chdir="${dir}" apply -input=false -auto-approve -var-file=terraform.tfvars

require_cmd kubectl
require_cmd envsubst
"${ROOT}/scripts/update-kubeconfig.sh" "${env_name}"

log "storage class, secret store, and Karpenter node pool"
kubectl apply -f "${ROOT}/platform/storageclasses/gp3.yaml"
kubectl annotate storageclass gp2 storageclass.kubernetes.io/is-default-class=false --overwrite || true
kubectl apply -f "${ROOT}/platform/external-secrets/cluster-secret-store.yaml"

cluster_name="$(terraform -chdir="${dir}" output -raw cluster_name)"
node_role="$(terraform -chdir="${dir}" output -raw karpenter_node_role_name)"
if [[ "${env_name}" == "dev" ]]; then
  cpu_limit="8"
else
  cpu_limit="32"
fi
export CLUSTER_NAME="${cluster_name}"
export KARPENTER_NODE_ROLE="${node_role}"
export KARPENTER_CPU_LIMIT="${cpu_limit}"
# envsubst must see the placeholders literally.
# shellcheck disable=SC2016
envsubst '${CLUSTER_NAME} ${KARPENTER_NODE_ROLE} ${KARPENTER_CPU_LIMIT}' \
  < "${ROOT}/platform/karpenter/nodepool.yaml" \
  | kubectl apply -f -

kubectl apply -f "${ROOT}/observability/alerts/commerce.yaml"
kubectl apply -f "${ROOT}/observability/slos/shopper-path.yaml"
kubectl -n monitoring create configmap commerce-dashboard \
  --from-file="commerce.json=${ROOT}/observability/dashboards/commerce.json" \
  --dry-run=client -o yaml | kubectl apply -f -
kubectl -n monitoring label configmap commerce-dashboard grafana_dashboard=1 --overwrite

if [[ "${APPLY_IN_CLUSTER_DATA:-false}" == "true" ]]; then
  log "in-cluster Postgres, Redis, and Redpanda"
  kubectl apply -f "${ROOT}/platform/data/in-cluster.yaml"
fi
