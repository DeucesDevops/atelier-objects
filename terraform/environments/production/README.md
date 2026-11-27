# Production

Thin root. It calls network, cluster, ecr, dns, storage, identity, and platform. Sizes are the production defaults: three AZs, a NAT gateway per AZ, and a three-node m6i.large baseline.

`providers.tf` points the Kubernetes and Helm providers at the EKS endpoint. The S3 backend uses `use_lockfile` for native locking. Copy the example backend and tfvars files before init. `domain` is required and the example value is `example.com`.

```bash
cp backend.hcl.example backend.hcl
cp terraform.tfvars.example terraform.tfvars
```

Apply with `scripts/apply-environment.sh production`. Do not point this root at a real account until the example CIDR and domain have been replaced.
