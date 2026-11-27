# Cluster

The EKS control plane lives in this module as `aws_eks_cluster`, not behind a third-party module, so each concern has its own file:

| File | Resources |
| --- | --- |
| `main.tf` | Cluster IAM role and `aws_eks_cluster` |
| `node_groups.tf` | Baseline managed node group in the private subnets |
| `addons.tf` | vpc-cni, kube-proxy, eks-pod-identity-agent, coredns, aws-ebs-csi-driver |
| `access.tf` | Access entries for extra cluster admins |
| `oidc.tf` | Cluster OIDC provider used by IRSA |
| `security_groups.tf` | Control-plane and node security groups |
| `kms.tf` | Secrets encryption and control-plane log encryption |

`bootstrap_self_managed_addons` is false so the addon resources own vpc-cni, kube-proxy, and CoreDNS. vpc-cni and kube-proxy are installed before the node group. CoreDNS and the EBS CSI driver wait until nodes exist.

The EBS CSI driver receives credentials through the Pod Identity association in the identity module. That avoids a dependency cycle between the addon and the IRSA role.

The API is private by default. Set `endpoint_public_access` and replace `public_access_cidrs` with an operator range before expecting `kubectl` from outside the VPC. The Terraform caller is a cluster admin via `bootstrap_cluster_creator_admin_permissions`.

Outputs used by the environment root: endpoint, CA data, `oidc_provider_arn`, and the node role.
