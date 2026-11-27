output "github_oidc_provider_arn" {
  description = "GitHub Actions OIDC provider ARN."
  value       = local.github_oidc_provider_arn
}

output "github_terraform_plan_role_arn" {
  description = "Role assumed by the Terraform plan workflow. Store it as AWS_TERRAFORM_ROLE_ARN."
  value       = aws_iam_role.github_terraform_plan.arn
}

output "github_ecr_push_role_arn" {
  description = "Role assumed by the image build workflow. Store it as AWS_ECR_PUSH_ROLE_ARN."
  value       = aws_iam_role.github_ecr_push.arn
}

output "alb_controller_role_arn" {
  description = "IRSA role for the AWS Load Balancer Controller."
  value       = aws_iam_role.alb_controller.arn
}

output "external_dns_role_arn" {
  description = "IRSA role for external-dns."
  value       = aws_iam_role.external_dns.arn
}

output "external_secrets_role_arn" {
  description = "IRSA role for External Secrets."
  value       = aws_iam_role.external_secrets.arn
}

output "ebs_csi_role_arn" {
  description = "Role for the EBS CSI driver, trusted by IRSA and EKS Pod Identity."
  value       = aws_iam_role.ebs_csi.arn
}

output "karpenter_controller_role_arn" {
  description = "IRSA role for the Karpenter controller."
  value       = aws_iam_role.karpenter_controller.arn
}

output "karpenter_node_role_name" {
  description = "Instance role name referenced by the Karpenter EC2NodeClass."
  value       = aws_iam_role.karpenter_node.name
}

output "karpenter_node_role_arn" {
  description = "Instance role ARN for nodes launched by Karpenter."
  value       = aws_iam_role.karpenter_node.arn
}

output "karpenter_queue_name" {
  description = "SQS queue Karpenter uses for interruption events."
  value       = aws_sqs_queue.karpenter.name
}
