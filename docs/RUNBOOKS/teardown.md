# Teardown

Load balancers and volumes outlive the cluster if Terraform deletes the VPC first. The teardown script removes them before `terraform destroy`.

```bash
./scripts/teardown-environment.sh dev
```

What it does:

1. Deletes every Ingress in `commerce`, which makes the AWS Load Balancer Controller delete the ALBs.
2. Deletes persistent volume claims in `commerce`, `data`, and `monitoring`, which makes the EBS CSI driver delete the volumes.
3. Runs `terraform destroy` for that environment.

Pass `production` only when that environment should really go away. The state bucket from bootstrap is not destroyed by this script. Empty it and destroy `terraform/bootstrap` separately when you intend to drop remote state.

If the API server is already gone, the script continues with destroy. Orphaned load balancers then have to be deleted in the AWS console or with the CLI before the VPC can disappear.
