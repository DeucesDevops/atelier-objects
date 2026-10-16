# ADR-001 — kOps learning target for Atelier Objects

**Status:** Selected by the user on 16 October 2026. Repository scaffold implemented; cloud implementation and live validation remain future work.

## Context

The user requested architecture images and a plan/folder structure modeled on an AgriBridge chat, then explicitly selected kOps. This commerce application has nine services, six PostgreSQL stores, Redis and Kafka-compatible events; it needs its own service boundaries and operational plan.

The application repository is reusable across platforms. Its companion `aws-devsecops-platform` repository originally proposed EKS, Jenkins and Argo CD. Its current README, architecture, plan and ADR now follow this smaller kOps direction; the original proposal is archived for reference. No live infrastructure was replaced.

## Decision

- Define the cluster with kOps and provision its generated Terraform through Terraform.
- Use Terraform for the foundation, data services, secrets resources, application ALB/target groups and DNS. Separate foundation state from generated cluster state.
- Use one Helm chart for the nine application services and a persistent single-broker Redpanda learning deployment. Keep PostgreSQL on RDS and Redis on ElastiCache.
- Bind web/gateway NodePort Services to existing instance-type target groups via TargetGroupBinding. The controller handles registrations, not ownership of another ALB.
- Start with GitHub Actions publishing immutable ECR releases and deploying through Helm. Preserve the existing application/Jenkins/Compose artifacts; reconcile cloud automation ownership before implementation.
- Keep Terraform, kOps, chart, addons and platform scripts in the platform repository. Keep application source, Dockerfiles, local Compose and these workload documentation assets here.

## Consequences

kOps exposes control-plane, etcd and cluster-upgrade responsibilities. A one-control-plane/two-AZ-network learning target saves resources but has no control-plane HA. Single-instance RDS/cache and one broker also remain single failure boundaries. Size workers after measuring the Java, Python, Node and broker workloads.

The proposed managed data connections, environment isolation, browser API configuration, broker storage, schema migrations and readiness checks need changes before deployment. Existing basic health routes and demo event handling do not prove production readiness.

The companion plan and release ownership now reflect this kOps choice. A future EKS/GitOps design would require another explicit decision and a coherent owner for each release. The platform scaffold reserves Terraform roots, kOps definitions, Helm templates, automation, monitoring and documentation paths. It does not yet define or deploy resources.

## References

- [kOps Terraform integration](https://kops.sigs.k8s.io/terraform/)
- [TargetGroupBinding](https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/targetgroupbinding/targetgroupbinding/)
- [Architecture guide](../architecture/README.md)
- [Implementation plan](../plans/implementation-plan.md)
