# Rollback

The production image tag is one line in `helm/atelier/values-production.yaml`:

```yaml
tag: "<sha>" # deploy-image-tag
```

To roll back, run the Deploy workflow with the previous SHA, or commit that line yourself on `dev`. Argo CD reconciles the Deployment image fields. Replica counts stay with the HorizontalPodAutoscaler.

If a chart or manifest change is the problem, revert the git commit. Argo CD prunes resources that disappeared from git.

If the bad change is Terraform, do not destroy the cluster to roll back an application image. Revert the Terraform commit and plan before the next apply. State locks are the S3 lockfile; wait for a stuck plan to finish rather than deleting the lock object unless you know the holder has stopped.

Platform controllers (load balancer, DNS, Karpenter, Argo CD) roll back by reverting their Helm values under `platform/` and applying the environment again. That apply is the two-stage script, and the second stage updates the releases.
