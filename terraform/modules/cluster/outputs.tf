output "cluster_name" {
  description = "EKS cluster name."
  value       = aws_eks_cluster.this.name
}

output "cluster_endpoint" {
  description = "Kubernetes API endpoint."
  value       = aws_eks_cluster.this.endpoint
}

output "cluster_certificate_authority_data" {
  description = "Base64-encoded cluster CA certificate."
  value       = aws_eks_cluster.this.certificate_authority[0].data
}

output "oidc_provider_arn" {
  description = "IAM OIDC provider ARN used for IRSA."
  value       = aws_iam_openid_connect_provider.cluster.arn
}

output "oidc_provider_url" {
  description = "OIDC issuer host path without the https scheme."
  value       = replace(aws_eks_cluster.this.identity[0].oidc[0].issuer, "https://", "")
}

output "node_role_arn" {
  description = "IAM role ARN of the baseline managed node group."
  value       = aws_iam_role.node.arn
}

output "node_role_name" {
  description = "IAM role name of the baseline managed node group."
  value       = aws_iam_role.node.name
}

output "cluster_security_group_id" {
  description = "Security group created by EKS for the control plane."
  value       = aws_eks_cluster.this.vpc_config[0].cluster_security_group_id
}

output "node_security_group_id" {
  description = "Security group attached to baseline nodes."
  value       = aws_security_group.node.id
}

output "kms_key_arn" {
  description = "KMS key used for Kubernetes secret encryption."
  value       = aws_kms_key.secrets.arn
}
