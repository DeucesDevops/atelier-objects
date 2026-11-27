# Dev uses the same modules as production with a /16 of its own, two AZs, one NAT gateway, and a two-node t3.medium baseline. ECR repositories are prefixed `atelier-dev-` so they do not collide with production in the same account. Prometheus retention is one day.

Copy `backend.hcl.example` and `terraform.tfvars.example`, then run `scripts/apply-environment.sh dev`.

If production already created the GitHub OIDC provider in this account, set `create_github_oidc_provider = false` and pass `github_oidc_provider_arn`.
