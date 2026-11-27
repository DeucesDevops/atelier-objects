# Platform

Helm releases for the cluster add-ons that are not EKS managed addons:

- AWS Load Balancer Controller 3.7.0
- external-dns 1.24.0
- External Secrets 2.15.0
- Karpenter 1.15.3
- Argo CD 10.20.0
- kube-prometheus-stack 94.1.0

Chart values live under `/platform` and are loaded with `file()`. Terraform sets the cluster name, role ARNs, domain, and certificate. The Argo CD Application chart at `helm/atelier-argocd-application` is installed after Argo CD so the commerce workloads sync from git.

Apply this module only after the cluster answers the Kubernetes API. `scripts/apply-environment.sh` does that in two stages. The Kubernetes and Helm providers are configured by the environment root.

ExternalSecret, Karpenter NodePool, and the gp3 StorageClass are applied by the same script after the CRDs exist. Terraform does not plan those CRDs, because the CRDs are not in the API until this module has applied.
