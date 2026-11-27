resource "aws_kms_key" "flow" {
  description             = "Encrypts VPC flow logs for ${var.name}."
  deletion_window_in_days = 30
  enable_key_rotation     = true
  tags                    = local.tags

  #checkov:skip=CKV_AWS_109:The account root must be able to administer this CMK.
  #checkov:skip=CKV_AWS_356:KMS key policies require a resource of star.
}

resource "aws_kms_alias" "flow" {
  name          = "alias/${var.name}-vpc-flow"
  target_key_id = aws_kms_key.flow.key_id
}

data "aws_iam_policy_document" "flow_key" {
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

resource "aws_kms_key_policy" "flow" {
  key_id = aws_kms_key.flow.id
  policy = data.aws_iam_policy_document.flow_key.json
}

resource "aws_cloudwatch_log_group" "flow" {
  name              = "/aws/vpc/${var.name}/flow-logs"
  retention_in_days = 365
  kms_key_id        = aws_kms_key.flow.arn
  tags              = local.tags

  depends_on = [aws_kms_key_policy.flow]
}

data "aws_iam_policy_document" "flow_assume" {
  statement {
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = ["vpc-flow-logs.amazonaws.com"]
    }
    actions = ["sts:AssumeRole"]
  }
}

resource "aws_iam_role" "flow" {
  name               = "${var.name}-vpc-flow"
  assume_role_policy = data.aws_iam_policy_document.flow_assume.json
  tags               = local.tags
}

data "aws_iam_policy_document" "flow_write" {
  statement {
    effect = "Allow"
    actions = [
      "logs:CreateLogStream",
      "logs:PutLogEvents",
      "logs:DescribeLogGroups",
      "logs:DescribeLogStreams",
    ]
    resources = ["${aws_cloudwatch_log_group.flow.arn}:*"]
  }
}

resource "aws_iam_role_policy" "flow" {
  name   = "write-flow-logs"
  role   = aws_iam_role.flow.id
  policy = data.aws_iam_policy_document.flow_write.json
}

resource "aws_flow_log" "this" {
  vpc_id               = aws_vpc.this.id
  traffic_type         = "ALL"
  log_destination_type = "cloud-watch-logs"
  log_destination      = aws_cloudwatch_log_group.flow.arn
  iam_role_arn         = aws_iam_role.flow.arn
  tags                 = local.tags
}
