# Ten-stage implementation plan

Adapted from the linked plan for **Atelier Objects / Commerce Platform**, using Docker Compose, Terraform, kOps, one Helm chart and GitHub Actions. This is a practical implementation sequence, not a claim of completed deployment. The [roadmap image](../architecture/07-implementation-roadmap.png) summarizes the stages.

Application source stays in `atelier-objects`. Infrastructure, cluster definitions, charts and platform automation belong in `aws-devsecops-platform`. The [folder guide](folder-structure.md) shows both repositories. The companion scaffold and its planning documents now follow the selected kOps/GitHub Actions/Helm direction; the earlier EKS/Jenkins/Argo CD proposal is archived there. Resource definitions and cloud automation remain unimplemented.

## 1. Understand and baseline the application

Inspect all nine application services, six PostgreSQL stores, Redis and Redpanda. Map ports, public routes, authentication, checkout compensation and the domain-event envelope. Run the Node, Java and Python suites. Record service health and successful checkout, declined payment, cancellation/refund, notifications and analytics.

**Existing:** application code, tests, Compose, demo scripts, original architecture and event contract.

**Complete when:** a fresh local run works and the service/dependency map matches observed behavior. Keep evidence of commit, commands, dates and results. Do not substitute manual event ingestion for verifying real broker consumption.

## 2. Build traceable application images

Verify all nine images: five NestJS services use `services/Dockerfile.typescript`, Payment uses Maven/Java, Notification and Analytics use Python, and web uses Vite/Nginx. Preserve non-root runtimes. Pin supported bases and maintain dependency locks for the required languages. Add source revision/build labels consistently and publish a release manifest with image digests.

Measure image/startup size and check the target AWS CPU architecture. Review signal delivery in the TypeScript shell entrypoint and verify graceful shutdown. Do not assume an `EXPOSE` line is a health check.

**Existing:** multi-stage Dockerfiles and non-root runtime configuration.

**Complete when:** all nine candidate images build, run, can be traced to source, and pass the meaningful service checks without embedded secrets. The images tested are the ones promoted later.

## 3. Make the Compose integration reproducible

Retain the six PostgreSQL volumes; use independent generated local credentials rather than shared demonstration defaults for anything beyond an isolated demo. Document exposed host ports, consumer startup, seeding and teardown. Verify persistence after recreation and verify failures independently of `/health`.

Decide whether local broker persistence should match the target; currently Redpanda has no volume. Isolate CI smoke projects and ports from developer data. `make smoke` currently tears down volumes, so reserve it for a disposable environment until the script is isolated.

**Existing:** complete `compose.yml`, seed/demo scripts and smoke automation.

**Complete when:** a clean stack demonstrates successful checkout, declined-payment release, cancellation/refund, real event consumption and PostgreSQL persistence. Document broker and memory-only notification limitations.

## 4. Provision the AWS foundation with Terraform

Choose account, region, naming, budget and retention. Bootstrap encrypted versioned remote state with locking and scoped access. Create public/private/data subnets across two AZs, routing, egress, security groups, ECR repositories, IAM/OIDC foundations, DNS, ACM, application ALB and target groups, Secrets Manager entries, RDS and ElastiCache.

Start with one RDS instance holding six service-owned databases and separate users. Automate role/database initialization through private connectivity. Put raw credentials only into protected state/secrets workflows. Define cache TLS/auth and verify the Node clients' configuration. Generate outputs for charts and delivery without copied endpoints or ARNs.

**Complete when:** a second apply is stable; dependencies are private; secret resources and values are created through automation; the outputs document every platform handoff. Record estimated cost and resource cleanup owners. No SSH setup step is required in the new target.

## 5. Create Kubernetes with kOps and generated Terraform

Create a private versioned kOps state store separately from Terraform state and public OIDC discovery. Define the cluster, existing subnets, one control-plane node and worker instance groups sized from measured usage. Select compatible kOps/Kubernetes versions and a CNI; restrict API access. Configure etcd backup and suitable worker capacity in the Redpanda volume AZ.

Generate Terraform from the complete kOps configuration, review/apply it with its own state, then validate the cluster. Change kOps configuration rather than editing generated resources. Automate bootstrap/addons, including Load Balancer Controller, EBS CSI and External Secrets Operator. Plan runner connectivity and Kubernetes authorization explicitly.

**Complete when:** cluster validation and nodes pass checks, private dependencies are reachable, state ownership is clear, and the CI runner can reach and authenticate to the management API. Record the single-control-plane availability limitation.

## 6. Deploy the workload with one Helm chart

Create nine Deployments and Services, ConfigMaps, secret references, service accounts, requests/limits, startup/liveness/readiness probes and termination grace settings. Use actual `/health` endpoints initially for process checks; implement dependency-aware readiness before treating it as a deployment gate.

Deploy a single Redpanda StatefulSet with EBS-backed PVC, stable advertised addresses and retention. RDS and Redis remain external. Configure all per-service URLs, six database users, cache endpoints and JWT agreement between Auth and Orders. Plan explicit schema migrations instead of TypeORM `synchronize: true` / Hibernate automatic updates for controlled releases.

Connect web/gateway NodePort Services to Terraform-created ALB instance target groups through TargetGroupBinding. The controller must not create an overlapping Ingress-managed ALB. Route `/api` and `/api/*` to gateway and `/*` to web.

Enable same-origin browser requests so one web digest can be promoted. The current `VITE_API_URL` is compiled into JS; make the common build independent of an environment hostname. Keep secrets out of that value.

**Complete when:** HTTPS browsing, auth, checkout and asynchronous consumption work through the public endpoint; private backends are not exposed. Two values files render from one chart. Separate databases, secrets, cache data and broker topic/group namespaces between environments; make the hardcoded Kafka names configurable first.

## 7. Implement required CI gates

Use the existing commands as the baseline: root `npm ci`, workspace tests/build, Maven tests/package, both Python suites, configuration validation and a disposable full-stack smoke run. Establish lint/type-check/coverage policies appropriate to this codebase, dependency audits and image/secret scans. Publish useful test reports and failure logs without credentials.

Inspect and validate the workflow before relying on it. There is a pre-existing uncommitted change in `.github/workflows/ci-cd.yml`; it is outside this documentation change and was preserved. Existing workflow files are not evidence of a passing hosted run.

**Complete when:** a hosted run passes all declared gates and a deliberate failure blocks publishing/deployment. Preserve the exact successful run URL and source commit.

## 8. Automate publishing, deployment and promotion

Authenticate to AWS with short-lived credentials. Build once, exercise candidate images, publish them to ECR and record all nine digests. Feed Terraform outputs to Helm programmatically. Deploy development, wait for real readiness, run checkout/event smoke checks, and fail the release on errors.

Promote the same digests into the second learning environment with changed runtime configuration. Support a previous release manifest and compatible schema for rollback. Direct GitHub Actions → Helm is the initial route; GitOps and a second CI system are optional later extensions.

**Complete when:** a source change produces a verified deployment without copying configuration by hand; image digests stay identical between environments; a recorded rollback restores working checkout. Cloud role and network permissions are scoped to that path.

## 9. Collect metrics and logs

Add application instrumentation and dependency readiness where missing. Deploy Prometheus, Grafana and a chosen log collector/backend. Observe HTTP errors/latency, gateway upstream failures, order compensation failures, database connections, pod/node health, broker connectivity and consumer lag. Health responses alone do not prove message consumption.

Set bounded retention and a small dashboard that connects a request to service and event evidence. Add alert rules that identify the broken dependency and expected action. Tracing is useful after the basic signals work.

**Complete when:** controlled database, broker and worker failures produce visible symptoms and actionable alerts; restoration of service clears the alert. Record signal queries and results.

## 10. Rehearse recovery and finish the demonstration

Use the [recovery plan](../disaster-recovery/recovery-plan.md) to rehearse database restore, broker/replay behavior, application rollback and infrastructure recreation. Distinguish etcd state, kOps state, Terraform state and business data. Define measured recovery time/data-loss objectives and cost teardown order.

Capture successful and declined checkout, cancellation/refund, image promotion, secret rotation, data persistence, alerts, rollback and restore. Use the [acceptance checklist](acceptance-checklist.md) for evidence rather than marking stages complete from file presence.

**Complete when:** another engineer can reproduce the target from the repositories and documentation, without undocumented manual setup. Record remaining limitations such as memory-only notifications, best-effort event delivery and single-node dependencies.

## Scope controls

Keep a single application chart, small environment values and flat Terraform roots until real reuse justifies modules. HA control planes, replicated brokers, Multi-AZ RDS, autoscaling, Argo CD, advanced policy/signing and tracing can follow after the working baseline. Budgets, credential handling, access restrictions, persistence and tested recovery are part of the baseline.
