output "state_bucket_name" {
  description = "S3 bucket that holds Terraform state. Pass it as bucket in backend.hcl."
  value       = aws_s3_bucket.state.id
}

output "logs_bucket_name" {
  description = "Access-log bucket for the state bucket."
  value       = aws_s3_bucket.logs.id
}

output "kms_key_arn" {
  description = "KMS key that encrypts state objects."
  value       = aws_kms_key.state.arn
}

output "aws_region" {
  description = "Region the state bucket was created in."
  value       = var.aws_region
}
