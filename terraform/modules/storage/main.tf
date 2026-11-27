data "aws_caller_identity" "current" {}
data "aws_partition" "current" {}

locals {
  tags = merge({ ManagedBy = "terraform" }, var.tags)
  buckets = {
    backups = "${var.name_prefix}-backups-${data.aws_caller_identity.current.account_id}"
    assets  = "${var.name_prefix}-assets-${data.aws_caller_identity.current.account_id}"
  }
}

resource "aws_kms_key" "storage" {
  description             = "Encrypts atelier backup and asset buckets."
  deletion_window_in_days = 30
  enable_key_rotation     = true
  tags                    = local.tags

  #checkov:skip=CKV_AWS_109:The account root must be able to administer this CMK.
  #checkov:skip=CKV_AWS_356:KMS key policies require a resource of star.
}

resource "aws_kms_alias" "storage" {
  name          = "alias/${var.name_prefix}-storage"
  target_key_id = aws_kms_key.storage.key_id
}

data "aws_iam_policy_document" "storage_key" {
  #checkov:skip=CKV_AWS_109:The account root must administer this CMK, and key policies require a resource of star.
  #checkov:skip=CKV_AWS_111:The account root must administer this CMK, and key policies require a resource of star.
  #checkov:skip=CKV_AWS_356:The account root must administer this CMK, and key policies require a resource of star.
  statement {
    sid    = "RootAdmin"
    effect = "Allow"
    principals {
      type        = "AWS"
      identifiers = ["arn:${data.aws_partition.current.partition}:iam::${data.aws_caller_identity.current.account_id}:root"]
    }
    actions   = ["kms:*"]
    resources = ["*"]
  }
}

resource "aws_kms_key_policy" "storage" {
  key_id = aws_kms_key.storage.id
  policy = data.aws_iam_policy_document.storage_key.json
}

resource "aws_s3_bucket" "logs" {
  bucket        = "${var.name_prefix}-logs-${data.aws_caller_identity.current.account_id}"
  force_destroy = var.force_destroy
  tags          = merge(local.tags, { Name = "${var.name_prefix}-logs" })

  #checkov:skip=CKV_AWS_18:This bucket is the access-log destination and cannot ship logs to itself.
  #checkov:skip=CKV_AWS_144:Buckets stay in the home region.
  #checkov:skip=CKV2_AWS_62:Access logs do not need event notifications.
}

resource "aws_s3_bucket" "data" {
  for_each      = local.buckets
  bucket        = each.value
  force_destroy = var.force_destroy
  tags          = merge(local.tags, { Name = each.value, Purpose = each.key })

  #checkov:skip=CKV_AWS_18:Access logging is aws_s3_bucket_logging.data. Checkov does not connect it for for_each buckets.
  #checkov:skip=CKV_AWS_21:Versioning is aws_s3_bucket_versioning.data.
  #checkov:skip=CKV_AWS_145:KMS encryption is aws_s3_bucket_server_side_encryption_configuration.data.
  #checkov:skip=CKV2_AWS_6:The public access block is aws_s3_bucket_public_access_block.data.
  #checkov:skip=CKV2_AWS_61:Lifecycle is aws_s3_bucket_lifecycle_configuration.data.

  #checkov:skip=CKV_AWS_144:Buckets stay in the home region.
  #checkov:skip=CKV2_AWS_62:Backup and asset buckets are not event sources.
}

resource "aws_s3_bucket_versioning" "logs" {
  bucket = aws_s3_bucket.logs.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_versioning" "data" {
  for_each = aws_s3_bucket.data
  bucket   = each.value.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "logs" {
  bucket = aws_s3_bucket.logs.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.storage.arn
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "data" {
  for_each = aws_s3_bucket.data
  bucket   = each.value.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.storage.arn
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "logs" {
  bucket                  = aws_s3_bucket.logs.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_public_access_block" "data" {
  for_each                = aws_s3_bucket.data
  bucket                  = each.value.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "logs" {
  bucket = aws_s3_bucket.logs.id
  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_ownership_controls" "data" {
  for_each = aws_s3_bucket.data
  bucket   = each.value.id
  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_logging" "data" {
  for_each      = aws_s3_bucket.data
  bucket        = each.value.id
  target_bucket = aws_s3_bucket.logs.id
  target_prefix = "${each.key}/"
}

resource "aws_s3_bucket_lifecycle_configuration" "logs" {
  bucket = aws_s3_bucket.logs.id
  rule {
    id     = "expire-access-logs"
    status = "Enabled"
    filter {}
    expiration {
      days = 365
    }
    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "data" {
  for_each = aws_s3_bucket.data
  bucket   = each.value.id
  rule {
    id     = "expire-noncurrent"
    status = "Enabled"
    filter {}
    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }
}

data "aws_iam_policy_document" "tls" {
  for_each = merge({ logs = aws_s3_bucket.logs.arn }, { for name, bucket in aws_s3_bucket.data : name => bucket.arn })

  statement {
    sid    = "DenyInsecureTransport"
    effect = "Deny"
    principals {
      type        = "*"
      identifiers = ["*"]
    }
    actions = ["s3:*"]
    resources = [
      each.value,
      "${each.value}/*",
    ]
    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }
}

data "aws_iam_policy_document" "logs" {
  source_policy_documents = [data.aws_iam_policy_document.tls["logs"].json]

  statement {
    sid    = "AllowS3LogDelivery"
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = ["logging.s3.amazonaws.com"]
    }
    actions   = ["s3:PutObject"]
    resources = ["${aws_s3_bucket.logs.arn}/*"]
    condition {
      test     = "ArnLike"
      variable = "aws:SourceArn"
      values   = [for bucket in aws_s3_bucket.data : bucket.arn]
    }
    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }
  }
}

resource "aws_s3_bucket_policy" "logs" {
  bucket = aws_s3_bucket.logs.id
  policy = data.aws_iam_policy_document.logs.json
}

resource "aws_s3_bucket_policy" "data" {
  for_each = aws_s3_bucket.data
  bucket   = each.value.id
  policy   = data.aws_iam_policy_document.tls[each.key].json
}
