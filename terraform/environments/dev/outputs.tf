output "cluster_name" {
  description = "EKS cluster name."
  value       = module.cluster.cluster_name
}

output "aws_region" {
  description = "Region used for this environment."
  value       = var.aws_region
}

output "cluster_endpoint" {
  description = "Kubernetes API endpoint."
  value       = module.cluster.cluster_endpoint
}

output "cluster_certificate_authority_data" {
  description = "Base64-encoded cluster CA."
  value       = module.cluster.cluster_certificate_authority_data
}

output "oidc_provider_arn" {
  description = "Cluster OIDC provider ARN."
  value       = module.cluster.oidc_provider_arn
}

output "node_role_arn" {
  description = "Baseline node role ARN."
  value       = module.cluster.node_role_arn
}

output "ecr_repository_urls" {
  description = "ECR repository URLs by service."
  value       = module.ecr.repository_urls
}

output "name_servers" {
  description = "Route 53 name servers to delegate."
  value       = module.dns.name_servers
}

output "certificate_arn" {
  description = "ACM certificate ARN."
  value       = module.dns.certificate_arn
}

output "github_terraform_plan_role_arn" {
  description = "OIDC role for Terraform plan."
  value       = module.identity.github_terraform_plan_role_arn
}

output "github_ecr_push_role_arn" {
  description = "OIDC role for image pushes."
  value       = module.identity.github_ecr_push_role_arn
}

output "karpenter_node_role_name" {
  description = "Karpenter EC2NodeClass role name."
  value       = module.identity.karpenter_node_role_name
}

output "backups_bucket_name" {
  description = "Backup bucket."
  value       = module.storage.backups_bucket_name
}

output "assets_bucket_name" {
  description = "Asset bucket."
  value       = module.storage.assets_bucket_name
}
