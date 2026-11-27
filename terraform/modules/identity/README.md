# Identity

CI roles and in-cluster AWS roles.

`github_oidc.tf` creates the GitHub Actions OIDC provider and two roles:

- `github-terraform-plan` reads AWS and can lock the state bucket. The plan workflow assumes it.
- `github-ecr-push` pushes to the commerce repositories. The build workflow assumes it.

Only `repo:<github_repository>:*` can assume them. The provider is one per account. A second environment sets `create_github_oidc_provider` to false and passes the existing ARN.

`irsa.tf` creates IRSA roles for the AWS Load Balancer Controller, external-dns, External Secrets, the EBS CSI driver, and Karpenter. The EBS role also trusts `pods.eks.amazonaws.com`, and a pod identity association attaches it to `kube-system/ebs-csi-controller-sa`. The addon is created with the cluster, so the association lives here instead of inside the addon and the two modules do not cycle.

The Load Balancer Controller policy is the upstream document in `policies/alb-controller.json`. Karpenter's controller policies are the upstream statements with CloudFormation substitutions turned into Terraform template variables.

`karpenter.tf` creates the interruption queue and the EventBridge rules that feed it. The node role is what `EC2NodeClass` references.
