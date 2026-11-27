locals {
  tags = merge({ ManagedBy = "terraform" }, var.tags)
}

resource "aws_route53_zone" "this" {
  #checkov:skip=CKV2_AWS_38:DNSSEC waits until the zone is delegated. Signing an undelegated example zone does not help.
  #checkov:skip=CKV2_AWS_39:Route 53 query logs must live in us-east-1. Add them after the zone is delegated in that region.
  name = var.domain
  tags = local.tags
}

resource "aws_acm_certificate" "this" {
  domain_name               = var.domain
  subject_alternative_names = ["*.${var.domain}"]
  validation_method         = "DNS"
  tags                      = local.tags

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "validation" {
  for_each = {
    for dvo in aws_acm_certificate.this.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = aws_route53_zone.this.zone_id
}

resource "aws_acm_certificate_validation" "this" {
  certificate_arn         = aws_acm_certificate.this.arn
  validation_record_fqdns = [for record in aws_route53_record.validation : record.fqdn]
}
