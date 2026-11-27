output "zone_id" {
  description = "Route 53 hosted zone id."
  value       = aws_route53_zone.this.zone_id
}

output "zone_name" {
  description = "Zone apex."
  value       = aws_route53_zone.this.name
}

output "name_servers" {
  description = "Delegate the domain to these name servers."
  value       = aws_route53_zone.this.name_servers
}

output "certificate_arn" {
  description = "Validated ACM certificate ARN for the apex and wildcard."
  value       = aws_acm_certificate_validation.this.certificate_arn
}
