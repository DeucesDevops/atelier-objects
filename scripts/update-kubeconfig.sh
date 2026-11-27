#!/usr/bin/env bash
set -euo pipefail

# shellcheck disable=SC1091
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib/common.sh"

env_name="${1:-}"
if [[ -z "${env_name}" ]]; then
  die "usage: update-kubeconfig.sh <dev|production>"
fi

require_cmd terraform
require_cmd aws

dir="$(env_dir "${env_name}")"
cluster_name="$(terraform -chdir="${dir}" output -raw cluster_name)"
region="$(terraform -chdir="${dir}" output -raw aws_region)"

aws eks update-kubeconfig --name "${cluster_name}" --region "${region}"
