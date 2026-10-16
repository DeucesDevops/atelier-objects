# Cloud delivery runbook plan

**Proposed procedure.** Terraform, kOps configuration, the Helm chart and cloud delivery scripts below do not exist yet in this application repository. Implement them in the platform repository following the [folder structure](../plans/folder-structure.md), then replace this procedure with version-pinned, tested commands and recorded outputs.

## Infrastructure sequence

1. Reconcile the platform repository's older EKS plan with the selected kOps target. Select AWS region, budget, DNS ownership and environment isolation. Pin compatible Terraform/provider/kOps/Kubernetes/chart versions.
2. Bootstrap remote Terraform state and execution IAM with encryption, versioning, locking and restricted access. Keep secret-bearing state out of Git and public artifacts.
3. Apply foundation Terraform: network, routing, security groups, RDS, ElastiCache, ECR, state stores, IAM, Secrets Manager, ALB, target groups, certificate and DNS. If certificate validation depends on an existing registrar, record that external prerequisite explicitly.
4. Use foundation outputs in kOps cluster/instance-group definitions. Generate the **complete** cluster Terraform configuration, review it and apply with separate cluster state. Do not hand-edit generated resources or have foundation Terraform also own them.
5. Validate the cluster and configure the restricted API access path for the deployment runner. Provision any required runner connectivity through infrastructure automation.
6. Install platform addons reproducibly: controller, EBS CSI, secret operator, telemetry collectors. Set up scoped service-account AWS identities.
7. Initialize six databases and users through an automated job with private connectivity. Verify ordinary services use their own credentials and cannot access other stores. Rotate/protect the initialization identity afterward.

kOps can emit Terraform, but rolling updates may still be required after infrastructure changes. Keep kOps definitions as the source and follow its lifecycle guidance. [kOps Terraform workflow](https://kops.sigs.k8s.io/terraform/)

## Application release sequence

1. Build and test the nine candidate images. Record source commit and each image's digest in one release manifest. Fail before publishing/deploying if any declared gate fails.
2. Publish to ECR using scoped, short-lived AWS credentials. Do not substitute mutable `latest` tags for recorded release identity.
3. Read Terraform outputs programmatically to obtain target-group ARNs, registry locations, database/cache endpoints, cluster information and secret identifiers. Pass only the required values into release automation; keep sensitive outputs out of public logs.
4. Render/lint the single chart for the selected environment. Confirm that API routing and probe paths exist and that no secret value appears in rendered non-secret configuration.
5. Synchronize runtime secrets, prepare compatible migrations, and deploy the release with bounded rollout/startup timeouts. The existing automatic ORM schema synchronization must be replaced or explicitly constrained before rollback and production-like migration claims.
6. Wait for dependency readiness, then verify HTTPS registration/login, catalog, successful checkout, declined-payment compensation, cancellation/refund and real broker consumers. A passing ALB health check does not replace these checks.
7. Record the Helm revision, image manifest, smoke results and environment values revision. Promote those same digests with different runtime values only after this evidence is satisfactory.

The ALB and target groups are Terraform-owned. Helm applies Services and TargetGroupBinding resources; the controller registers instance targets. Route `/api` and `/api/*` to gateway, all other paths to web. Configure target health on actual `/health` paths and design dependency readiness separately. [TargetGroupBinding](https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/targetgroupbinding/targetgroupbinding/)

## Rollback and rotation

Use the prior release manifest/Helm revision and compatible runtime values. Confirm the old release can use the current schema before rolling back. A Helm rollback does not reverse a database migration or replay missing events.

For rotation, update the authoritative database/cache credential and Secrets Manager value in a coordinated sequence, wait for secret synchronization, restart affected pods and verify the application. JWT rotation currently invalidates tokens unless compatibility is explicitly implemented. Keep image digests unchanged.

## Teardown sequence

Inventory the environment's resources and data owners. Export necessary backups first. Remove application releases and their target registrations while the controller still runs; handle PVC retention explicitly. Remove cluster resources through their Terraform state, then foundation resources after checking references. Keep remote state and recovery data until destruction is verified. Record retained snapshots, volumes, addresses, load balancers, NAT gateways and log retention because they may continue to cost money.
