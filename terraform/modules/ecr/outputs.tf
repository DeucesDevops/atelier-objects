output "repository_urls" {
  description = "Repository URL by service name."
  value       = { for name, repo in aws_ecr_repository.this : name => repo.repository_url }
}

output "repository_arns" {
  description = "Repository ARN by service name."
  value       = { for name, repo in aws_ecr_repository.this : name => repo.arn }
}

output "repository_prefix" {
  description = "Prefix shared by every repository name."
  value       = var.repository_prefix
}

output "kms_key_arn" {
  description = "KMS key that encrypts images."
  value       = aws_kms_key.ecr.arn
}
