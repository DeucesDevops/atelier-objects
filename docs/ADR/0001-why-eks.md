# ADR 0001: EKS

## Status

Accepted.

## Context

The commerce stack is nine containers plus Postgres, Redis, and a Kafka-compatible broker. It needs a load balancer, private nodes, IAM for AWS APIs, image storage, and a git-driven deploy. The cloud account is AWS. The region default is us-east-1.

kops is not used. It would run a second control plane lifecycle beside AWS, and this repository is not keeping a `kops/` tree.

ECS would run the containers, but the service graph is already expressed as Kubernetes Deployments, Services, an Ingress, HPAs, and PDBs. Argo CD, Karpenter, External Secrets, and the load balancer controller are Kubernetes controllers. Re-modeling that on ECS task definitions would fork the deploy path from the chart.

## Decision

Run the application on EKS. The control plane is an `aws_eks_cluster` in `terraform/modules/cluster`, with a managed node group for baseline capacity and Karpenter for the rest. IRSA and Pod Identity grant AWS access without long-lived keys. Images live in ECR. Delivery is Argo CD tracking `dev`.

## Consequences

- Operators need Terraform, kubectl, and Helm.
- The first apply is two stages because the Helm provider needs a living API server.
- Cluster upgrades follow EKS versions. The default is 1.34, which is in standard support.
- A private API endpoint is the default. Public access is an explicit CIDR list.
