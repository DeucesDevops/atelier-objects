# Repository folder structure

The reference plan's documentation organization is implemented while keeping this workload reusable. The application documentation and companion platform scaffold now exist. Platform directories and named placeholders establish ownership; infrastructure, workloads and deployment automation still require implementation.

## Application repository — current documentation layout

```text
atelier-objects/
├── services/                         # Existing nine application services + Dockerfiles
├── shared/                           # Existing event helpers
├── commerce-demo/                    # Existing seed and demo scripts
├── scripts/                          # Existing local / deployment / smoke scripts
├── .github/workflows/                # Existing GitHub Actions
├── Jenkinsfile                       # Existing alternative pipeline
├── compose.yml                       # Existing 17-service local stack
├── docs/
│   ├── README.md                     # Documentation entry point + gallery
│   ├── architecture.svg              # Original application drawing, retained
│   ├── events.md                     # Existing event contract, retained
│   ├── architecture/
│   │   ├── README.md                 # Current behavior + target architecture notes
│   │   ├── 01-docker-architecture.{png,svg}
│   │   ├── 02-aws-architecture.{png,svg}
│   │   ├── 03-kubernetes-cluster.{png,svg}
│   │   ├── 04-checkout-and-events.{png,svg}
│   │   ├── 05-delivery-pipeline.{png,svg}
│   │   ├── 06-runtime-and-recovery.{png,svg}
│   │   ├── 07-implementation-roadmap.{png,svg}
│   │   └── sources/render_diagrams.py
│   ├── plans/
│   │   ├── implementation-plan.md
│   │   ├── folder-structure.md
│   │   └── acceptance-checklist.md
│   ├── runbooks/
│   │   ├── local-development.md
│   │   └── cloud-delivery.md
│   ├── security/runtime-configuration.md
│   ├── disaster-recovery/recovery-plan.md
│   └── decisions/ADR-001-kops-learning-target.md
└── README.md
```

`{png,svg}` means two files with the same stem, not a literal filename. Do not move the existing service source or rename `compose.yml` to match another application.

## Platform repository — implemented scaffold

```text
aws-devsecops-platform/
├── terraform/
│   ├── bootstrap/                    # State buckets, locking and initial IAM
│   ├── foundation/                   # VPC, RDS, Redis, ECR, ALB, DNS, secrets, outputs
│   └── cluster/                      # kOps-generated Terraform + separate state
├── kops/
│   └── learning/
│       ├── cluster.yaml              # Cluster configuration is the source of truth
│       └── instance-groups.yaml
├── helm/
│   └── commerce/
│       ├── Chart.yaml
│       ├── values.yaml
│       ├── values-dev.yaml
│       ├── values-prod.yaml
│       ├── .helmignore
│       └── templates/
│           ├── _helpers.tpl
│           ├── deployments.yaml      # Placeholder for nine workloads rendered from values
│           ├── services.yaml
│           ├── serviceaccounts.yaml
│           ├── configmaps.yaml
│           ├── externalsecrets.yaml
│           ├── targetgroupbindings.yaml
│           ├── redpanda-statefulset.yaml
│           ├── redpanda-service.yaml
│           ├── database-init-job.yaml # Automated database/user/schema preparation
│           └── NOTES.txt
├── monitoring/
│   ├── prometheus/
│   ├── grafana/
│   ├── logging/
│   └── alerts/
├── scripts/
│   ├── provision/                    # Foundation → kOps generation → Terraform handoff
│   ├── deployment/                   # Terraform outputs + image manifest → Helm
│   ├── smoke-tests/                  # HTTPS checkout, compensation and events
│   ├── backup/
│   └── restore/
├── .github/workflows/
│   ├── validate-platform.yml
│   └── deploy-commerce.yml
├── docs/                             # Architecture, decisions, runbooks and evidence locations
├── plan.md                           # Selected kOps implementation sequence
└── README.md
```

Use one chart with per-environment values; separate template files per service are also reasonable if simpler to maintain. Runtime secret values never belong in chart values. The database initialization job needs an explicitly scoped provisioning identity and private database connectivity; ordinary application pods use their own users afterward.

The application pipeline can publish tested images and call a versioned platform deployment workflow, or publish a release manifest consumed by that workflow. Define a single owner for image publication and a single owner for each Helm release. Do not deploy the same workload with both direct Helm automation and Argo CD.

The companion platform README, architecture, plan and ADR now follow the selected kOps/GitHub Actions/Helm direction. The original EKS/Jenkins/Argo CD proposal is preserved at `aws-devsecops-platform/docs/plans/previous-eks-gitops-plan.md` as historical material.

Each reserved directory has a purpose-specific README so Git retains the layout. The two kOps YAML files contain comments only. Chart metadata and dev/prod values are valid, but template placeholders render **zero Kubernetes resources**. The platform validation workflow checks tracked directory presence; the manual deployment workflow explicitly fails until deployment is implemented. No Terraform resources, cloud scripts or AWS resources were created by the scaffold task.

The platform documentation also includes `docs/decisions/`, `docs/runbooks/`, `docs/security/`, `docs/disaster-recovery/` and `docs/evidence/` entry points. The target application workflow owns ECR image publication, and the platform workflow owns Helm releases. Existing application Docker Hub/Compose/Jenkins automation remains unchanged until its migration stage.
