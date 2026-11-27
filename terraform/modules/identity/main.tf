data "aws_caller_identity" "current" {}
data "aws_partition" "current" {}
data "aws_region" "current" {}

locals {
  tags = merge({ ManagedBy = "terraform" }, var.tags)
  github_oidc_provider_arn = (
    var.create_github_oidc_provider
    ? aws_iam_openid_connect_provider.github[0].arn
    : var.github_oidc_provider_arn
  )
  policy_template_vars = {
    partition     = data.aws_partition.current.partition
    region        = data.aws_region.current.name
    account_id    = data.aws_caller_identity.current.account_id
    cluster_name  = var.cluster_name
    node_role_arn = aws_iam_role.karpenter_node.arn
    queue_arn     = aws_sqs_queue.karpenter.arn
  }
}
