resource "aws_kms_key" "secrets" {
  description             = "Encrypts Kubernetes secrets for ${var.cluster_name}."
  deletion_window_in_days = 30
  enable_key_rotation     = true
  tags                    = local.tags

  #checkov:skip=CKV_AWS_109:The account root must be able to administer this CMK.
  #checkov:skip=CKV_AWS_356:KMS key policies require a resource of star.
}

resource "aws_kms_alias" "secrets" {
  name          = "alias/${var.cluster_name}-eks-secrets"
  target_key_id = aws_kms_key.secrets.key_id
}

data "aws_iam_policy_document" "secrets" {
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

  statement {
    sid    = "ClusterSecrets"
    effect = "Allow"
    principals {
      type        = "AWS"
      identifiers = [aws_iam_role.cluster.arn]
    }
    actions = [
      "kms:Encrypt",
      "kms:Decrypt",
      "kms:ReEncrypt*",
      "kms:GenerateDataKey*",
      "kms:DescribeKey",
    ]
    resources = ["*"]
  }
}

resource "aws_kms_key_policy" "secrets" {
  key_id = aws_kms_key.secrets.id
  policy = data.aws_iam_policy_document.secrets.json
}

resource "aws_kms_key" "logs" {
  description             = "Encrypts EKS control plane logs for ${var.cluster_name}."
  deletion_window_in_days = 30
  enable_key_rotation     = true
  tags                    = local.tags

  #checkov:skip=CKV_AWS_109:The account root must be able to administer this CMK.
  #checkov:skip=CKV_AWS_356:KMS key policies require a resource of star.
}

resource "aws_kms_alias" "logs" {
  name          = "alias/${var.cluster_name}-eks-logs"
  target_key_id = aws_kms_key.logs.key_id
}

data "aws_iam_policy_document" "logs" {
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

  statement {
    sid    = "CloudWatchLogs"
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = ["logs.${data.aws_region.current.name}.amazonaws.com"]
    }
    actions = [
      "kms:Encrypt",
      "kms:Decrypt",
      "kms:ReEncrypt*",
      "kms:GenerateDataKey*",
      "kms:DescribeKey",
    ]
    resources = ["*"]
    condition {
      test     = "ArnLike"
      variable = "kms:EncryptionContext:aws:logs:arn"
      values   = ["arn:${data.aws_partition.current.partition}:logs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:*"]
    }
  }
}

resource "aws_kms_key_policy" "logs" {
  key_id = aws_kms_key.logs.id
  policy = data.aws_iam_policy_document.logs.json
}

resource "aws_cloudwatch_log_group" "cluster" {
  name              = "/aws/eks/${var.cluster_name}/cluster"
  retention_in_days = 365
  kms_key_id        = aws_kms_key.logs.arn
  tags              = local.tags

  depends_on = [aws_kms_key_policy.logs]
}
