# Setup

Prerequisites: Terraform 1.10 or newer, AWS CLI, kubectl, Helm, and an AWS account. The default region is `us-east-1`.

Nothing in this repository is applied for you. `plan` and `apply` talk to whatever account your credentials point at. Do not commit `backend.hcl`, `terraform.tfvars`, or `.env`.

## 1. State bucket

```bash
cp terraform/bootstrap/terraform.tfvars.example terraform/bootstrap/terraform.tfvars
# set a globally unique state_bucket_name
./scripts/bootstrap-state.sh
```

The bucket uses versioning and a customer-managed key. Environments lock state with the S3 backend's `use_lockfile` setting. There is no DynamoDB table.

## 2. Environment files

```bash
cd terraform/environments/production   # or dev
cp backend.hcl.example backend.hcl
cp terraform.tfvars.example terraform.tfvars
```

Set `domain` to a zone you control. `example.com` in the example file is not a real zone. Set `state_bucket_arn` from the bootstrap output. Replace `203.0.113.10/32` with the CIDR that should reach the Kubernetes API, or leave `endpoint_public_access` false and use a private network.

Dev is the same shape with two AZs, one NAT gateway, `t3.medium` nodes, and ECR prefix `atelier-dev-`.

## 3. Secrets Manager

Create one JSON secret per service that needs credentials. The ExternalSecret key is `atelier/<environment>/<service>`.

| Secret | Keys |
| --- | --- |
| `atelier/<env>/auth-service` | `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET` |
| `atelier/<env>/catalog-service` | `DATABASE_URL`, `REDIS_URL`, `KAFKA_BROKERS` |
| `atelier/<env>/order-service` | `DATABASE_URL`, `JWT_SECRET`, `KAFKA_BROKERS` |
| `atelier/<env>/inventory-service` | `DATABASE_URL`, `KAFKA_BROKERS` |
| `atelier/<env>/payment-service` | `DATABASE_URL`, `DATABASE_USER`, `DATABASE_PASSWORD`, `KAFKA_BROKERS` |
| `atelier/<env>/notification-service` | `KAFKA_BROKERS` |
| `atelier/<env>/analytics-service` | `DATABASE_URL`, `KAFKA_BROKERS` |

`DATABASE_URL` for the TypeScript and Python services is a `postgres://` or `postgresql://` URL. Payment uses a JDBC URL plus `DATABASE_USER` and `DATABASE_PASSWORD`, matching `services/payment-service`.

For in-cluster dev data, `KAFKA_BROKERS` is `redpanda.data.svc.cluster.local:9092` and `REDIS_URL` is `redis://redis.data.svc.cluster.local:6379`. Hostnames for Postgres follow [data services](RUNBOOKS/data-services.md).

## 4. Apply

```bash
./scripts/apply-environment.sh production
```

Stage 1 creates the network, EKS, ECR, DNS, buckets, and IAM. Stage 2 installs the controllers and Argo CD, then applies the gp3 StorageClass, the ClusterSecretStore, the Karpenter NodePool, and the Prometheus rules.

Delegate the domain to the `name_servers` output or certificate validation and external-dns will not finish.

## 5. Images

Push images with the build workflow, or build them locally and push the git SHA. Repository names are `<prefix><service>` and tags are immutable. Set the GitHub secret `AWS_ECR_PUSH_ROLE_ARN` to the `github_ecr_push_role_arn` output. Set the repository variable `ECR_REPOSITORY_PREFIX` to the same prefix (`atelier-` or `atelier-dev-`). Set `VITE_API_URL` to the public API origin before building `web-app`, because Vite bakes it into the static files.

## 6. GitHub Actions variables

| Name | Used by |
| --- | --- |
| Secret `AWS_TERRAFORM_ROLE_ARN` | Terraform plan |
| Secret `TF_STATE_BUCKET` | Terraform plan backend |
| Variable `TF_DOMAIN` | Terraform plan `domain` |
| Secret `AWS_ECR_PUSH_ROLE_ARN` | Image push |
| Variable `ECR_REPOSITORY_PREFIX` | Image repository names |
| Variable `VITE_API_URL` | web-app build |
| Secret `SONAR_TOKEN`, `SONAR_HOST_URL` | SonarQube, optional |

Plan is skipped when the AWS role, state bucket, or domain is unset.

## Local checks

```bash
make validate
make test
```

`make validate` still checks Compose, and also formats and validates Terraform, shellchecks the scripts, and lints the charts.
