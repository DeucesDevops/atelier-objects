output "backups_bucket_name" {
  description = "Bucket for database and cluster backups."
  value       = aws_s3_bucket.data["backups"].id
}

output "assets_bucket_name" {
  description = "Bucket for public-catalog assets. Objects stay private; serve them through the application."
  value       = aws_s3_bucket.data["assets"].id
}

output "logs_bucket_name" {
  description = "Access logs for the backup and asset buckets."
  value       = aws_s3_bucket.logs.id
}

output "kms_key_arn" {
  description = "KMS key that encrypts the buckets."
  value       = aws_kms_key.storage.arn
}
