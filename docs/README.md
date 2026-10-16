# Atelier Objects documentation

Architecture images and a ten-stage implementation plan for the commerce platform, adapted from the linked AgriBridge planning chat to this repository's actual services. The selected cloud target is **Kubernetes on AWS EC2 managed with kOps**, provisioned through Terraform and deployed with Helm.

Reviewed on **16 October 2026**. Docker diagrams describe repository configuration. AWS, Kubernetes and operational diagrams describe a **proposed target**, not deployed infrastructure. Application tests, remote workflows and cloud resources were not executed or verified for this documentation task.

## Start here

1. Read the [implementation plan](plans/implementation-plan.md).
2. Review the [architecture gallery and decisions](architecture/README.md).
3. Follow the [implemented folder structure and scaffold status](plans/folder-structure.md).
4. Record results against the [acceptance checklist](plans/acceptance-checklist.md).

## Architecture gallery

Each new image has an editable SVG counterpart alongside its PNG. The [original application SVG](architecture.svg) and [event contract](events.md) remain available.

| Image | What it explains | Editable source |
| --- | --- | --- |
| [01 · Docker](architecture/01-docker-architecture.png) | Current 17-service Compose stack, actual ports and storage | [SVG](architecture/01-docker-architecture.svg) |
| [02 · AWS](architecture/02-aws-architecture.png) | Terraform foundation, kOps on EC2, private data services and ALB | [SVG](architecture/02-aws-architecture.svg) |
| [03 · Kubernetes](architecture/03-kubernetes-cluster.png) | Helm workloads, Services, secrets, broker storage and platform addons | [SVG](architecture/03-kubernetes-cluster.svg) |
| [04 · Checkout and events](architecture/04-checkout-and-events.png) | Successful checkout, compensation, cancellation and consumers | [SVG](architecture/04-checkout-and-events.svg) |
| [05 · Delivery](architecture/05-delivery-pipeline.png) | Existing delivery artifacts and proposed ECR/Helm automation | [SVG](architecture/05-delivery-pipeline.svg) |
| [06 · Runtime and recovery](architecture/06-runtime-and-recovery.png) | Secrets, monitoring and independent recovery responsibilities | [SVG](architecture/06-runtime-and-recovery.svg) |
| [07 · Roadmap](architecture/07-implementation-roadmap.png) | Ten stages and their outcomes | [SVG](architecture/07-implementation-roadmap.svg) |

![Local Docker architecture](architecture/01-docker-architecture.png)

![Proposed AWS architecture](architecture/02-aws-architecture.png)

![Proposed Kubernetes architecture](architecture/03-kubernetes-cluster.png)

## Supporting documents

| Document | Purpose |
| --- | --- |
| [Local development](runbooks/local-development.md) | Existing commands, persistence and local troubleshooting |
| [Cloud delivery plan](runbooks/cloud-delivery.md) | Ordered infrastructure and application deployment handoffs |
| [Runtime configuration and secrets](security/runtime-configuration.md) | Current variables, build/runtime boundaries and planned controls |
| [Recovery plan](disaster-recovery/recovery-plan.md) | Database, broker, application and cluster restoration exercises |
| [Architecture decision](decisions/ADR-001-kops-learning-target.md) | Why kOps, learning limitations and repository ownership |

Diagrams are rendered deterministically from [the shared source](architecture/sources/render_diagrams.py). See the [regeneration instructions](architecture/README.md#editing-the-images). No generated credentials or environment files are included in these documents.
