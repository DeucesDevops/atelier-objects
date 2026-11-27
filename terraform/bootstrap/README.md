# Terraform state bootstrap

Creates the S3 bucket used by every environment backend. Locking is Terraform's native S3 lockfile (`use_lockfile = true` on the `s3` backend). There is no DynamoDB lock table.

The state bucket has versioning, a customer-managed KMS key, public access blocked, and access logs in a sibling bucket. Bootstrap itself uses the local backend, because the bucket cannot store its own state on the first apply. Keep the local state file somewhere durable and do not commit it.

```bash
cp terraform.tfvars.example terraform.tfvars
# set a globally unique state_bucket_name
../../scripts/bootstrap-state.sh
```

Copy `state_bucket_name` into `terraform/environments/<env>/backend.hcl` (see `backend.hcl.example`). The backend block in each environment already sets `use_lockfile = true`.
