data "aws_caller_identity" "current" {}
data "aws_partition" "current" {}

locals {
  tags = merge({ ManagedBy = "terraform" }, var.tags)
}

resource "aws_kms_key" "ecr" {
  description             = "Encrypts commerce container images."
  deletion_window_in_days = 30
  enable_key_rotation     = true
  tags                    = local.tags

  #checkov:skip=CKV_AWS_109:The account root must be able to administer this CMK.
  #checkov:skip=CKV_AWS_356:KMS key policies require a resource of star.
}

resource "aws_kms_alias" "ecr" {
  name          = "alias/${trimsuffix(var.repository_prefix, "-")}-ecr"
  target_key_id = aws_kms_key.ecr.key_id
}

data "aws_iam_policy_document" "ecr_key" {
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

resource "aws_kms_key_policy" "ecr" {
  key_id = aws_kms_key.ecr.id
  policy = data.aws_iam_policy_document.ecr_key.json
}

resource "aws_ecr_repository" "this" {
  for_each = toset(var.services)

  name                 = "${var.repository_prefix}${each.value}"
  image_tag_mutability = "IMMUTABLE"
  force_delete         = false

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "KMS"
    kms_key         = aws_kms_key.ecr.arn
  }

  tags = merge(local.tags, { Service = each.value })
}

resource "aws_ecr_lifecycle_policy" "this" {
  for_each   = aws_ecr_repository.this
  repository = each.value.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep the most recent images"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = var.image_count
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}
