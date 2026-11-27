# Terraform

| Path | Role |
| --- | --- |
| `bootstrap` | State bucket. Locking is `use_lockfile` on the S3 backend. |
| `modules/network` | VPC, public and private subnets, NAT, load balancer tags |
| `modules/cluster` | EKS cluster, baseline nodes, addons, access, OIDC, security groups, KMS |
| `modules/ecr` | One immutable repository per service |
| `modules/dns` | Route 53 zone and ACM certificate |
| `modules/storage` | Backup and asset buckets |
| `modules/identity` | GitHub OIDC roles and IRSA |
| `modules/platform` | Helm releases for controllers, Argo CD, and monitoring |
| `environments/production` | Production sizes |
| `environments/dev` | Two AZs, one NAT gateway, smaller nodes |

Environment roots configure the Kubernetes and Helm providers from the cluster outputs. Apply with `scripts/apply-environment.sh`. Do not commit `backend.hcl` or `terraform.tfvars`.
