# Pipeline

Workflows live in `.github/workflows`. Dependabot updates are in `.github/dependabot.yml`.

## CI

`ci.yaml` runs one matrix leg per service.

| Service | Lint | Test |
| --- | --- | --- |
| api-gateway, auth, catalog, order, inventory, web-app | `tsc --noEmit` | npm workspace test |
| payment-service | Maven compile | Maven test |
| notification-service, analytics-service | `compileall` | pytest |

Node legs install the workspace from the repository root. Python legs install that service's `requirements.txt`.

## Security

`security.yaml` runs four jobs:

- Gitleaks over the git history
- SonarQube when `SONAR_TOKEN` is set
- Trivy filesystem scan for vulnerabilities, misconfiguration, and secrets
- Checkov with `config/policies/checkov.yaml`, including the custom ECR scan check

## Build and push

`build-push.yaml` builds each service from the same Dockerfile and context as `compose.yml`.

| Service | Dockerfile | Context |
| --- | --- | --- |
| TypeScript services | `services/Dockerfile.typescript` | repository root, build-arg `SERVICE` |
| web-app | `services/web-app/Dockerfile` | repository root, build-arg `VITE_API_URL` when set |
| payment-service | `services/payment-service/Dockerfile` | `services/payment-service` |
| notification-service, analytics-service | service Dockerfile | repository root |

The job assumes `AWS_ECR_PUSH_ROLE_ARN` with GitHub OIDC. It scans the image with Trivy, writes an SPDX SBOM, and pushes the commit SHA. Immutable repositories keep an existing tag instead of overwriting it. The job is skipped when the role secret is unset.

## Terraform

`terraform.yaml` runs `terraform fmt -check`, `init -backend=false`, and `validate` for bootstrap, every module, and both environment roots.

On a pull request it plans dev and production with the OIDC plan role. The plan is skipped when `AWS_TERRAFORM_ROLE_ARN`, `TF_STATE_BUCKET`, or `TF_DOMAIN` is empty. The backend config sets `use_lockfile = true`.

## Deploy

`deploy.yaml` uses the GitHub environment `production`, which is the approval gate. After approval it sets the `tag` marked `deploy-image-tag` in `helm/atelier/values-production.yaml` and pushes that commit to `dev`. Argo CD tracks `dev` and rolls the commerce Deployments to that immutable tag.

Trigger it with the image tag that the build workflow pushed, usually the commit SHA.
