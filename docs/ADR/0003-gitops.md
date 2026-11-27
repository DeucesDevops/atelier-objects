# ADR 0003: Argo CD for application deploys

## Status

Accepted.

## Context

Terraform already installs cluster controllers. Installing the commerce Deployments with Terraform as well would make every image bump a Terraform apply, and it would fight the HorizontalPodAutoscaler over replica counts.

## Decision

Terraform installs Argo CD and an Application that syncs `helm/atelier` from `dev`. The production image tag is a line in `values-production.yaml`. The deploy workflow, after the `production` environment approval, updates that line and pushes to `dev`. Argo CD ignores Deployment replica differences.

## Consequences

- The cluster and the application have different release paths.
- A private repository needs an Argo CD repo credential created out of band. The URL in the chart is public to this repository and contains no token.
- Dev tracks `values.yaml` only, so the production tag bump does not resize the dev cluster.
