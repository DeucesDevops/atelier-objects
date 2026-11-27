data "aws_iam_policy_document" "irsa_assume" {
  for_each = {
    alb = {
      namespace = "kube-system"
      name      = "aws-load-balancer-controller"
    }
    dns = {
      namespace = "kube-system"
      name      = "external-dns"
    }
    secrets = {
      namespace = "external-secrets"
      name      = "external-secrets"
    }
    ebs = {
      namespace = "kube-system"
      name      = "ebs-csi-controller-sa"
    }
    karpenter = {
      namespace = "kube-system"
      name      = "karpenter"
    }
  }

  statement {
    effect = "Allow"
    principals {
      type        = "Federated"
      identifiers = [var.oidc_provider_arn]
    }
    actions = ["sts:AssumeRoleWithWebIdentity"]
    condition {
      test     = "StringEquals"
      variable = "${var.oidc_provider_url}:aud"
      values   = ["sts.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "${var.oidc_provider_url}:sub"
      values   = ["system:serviceaccount:${each.value.namespace}:${each.value.name}"]
    }
  }
}

data "aws_iam_policy_document" "ebs_assume" {
  source_policy_documents = [data.aws_iam_policy_document.irsa_assume["ebs"].json]
  statement {
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = ["pods.eks.amazonaws.com"]
    }
    actions = ["sts:AssumeRole", "sts:TagSession"]
  }
}

resource "aws_iam_role" "alb_controller" {
  name               = "${var.cluster_name}-alb-controller"
  assume_role_policy = data.aws_iam_policy_document.irsa_assume["alb"].json
  tags               = local.tags
}

resource "aws_iam_role_policy" "alb_controller" {
  name   = "alb-controller"
  role   = aws_iam_role.alb_controller.id
  policy = file("${path.module}/policies/alb-controller.json")

  #checkov:skip=CKV_AWS_355:This is the upstream AWS Load Balancer Controller policy. Several APIs have no resource-level permissions.
  #checkov:skip=CKV_AWS_290:Describe and CreateServiceLinkedRole actions in the upstream policy are not resource-scoped.
  #checkov:skip=CKV_AWS_289:Conditions in the upstream policy constrain the unscoped write actions.
}

resource "aws_iam_role" "external_dns" {
  name               = "${var.cluster_name}-external-dns"
  assume_role_policy = data.aws_iam_policy_document.irsa_assume["dns"].json
  tags               = local.tags
}

data "aws_iam_policy_document" "external_dns" {
  #checkov:skip=CKV_AWS_356:Route 53 list APIs do not support resource-level permissions.
  statement {
    sid       = "ChangeRecords"
    effect    = "Allow"
    actions   = ["route53:ChangeResourceRecordSets"]
    resources = ["arn:${data.aws_partition.current.partition}:route53:::hostedzone/${var.zone_id}"]
  }

  statement {
    sid    = "ListZones"
    effect = "Allow"
    actions = [
      "route53:ListHostedZones",
      "route53:ListHostedZonesByName",
      "route53:ListResourceRecordSets",
      "route53:ListTagsForResource",
    ]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "external_dns" {
  name   = "external-dns"
  role   = aws_iam_role.external_dns.id
  policy = data.aws_iam_policy_document.external_dns.json

  #checkov:skip=CKV_AWS_355:Route 53 list APIs do not support resource-level permissions.
  #checkov:skip=CKV_AWS_290:Route 53 list APIs do not support resource-level permissions.
}

resource "aws_iam_role" "external_secrets" {
  name               = "${var.cluster_name}-external-secrets"
  assume_role_policy = data.aws_iam_policy_document.irsa_assume["secrets"].json
  tags               = local.tags
}

data "aws_iam_policy_document" "external_secrets" {
  statement {
    sid    = "ReadCommerceSecrets"
    effect = "Allow"
    actions = [
      "secretsmanager:DescribeSecret",
      "secretsmanager:GetSecretValue",
      "secretsmanager:ListSecretVersionIds",
    ]
    resources = ["arn:${data.aws_partition.current.partition}:secretsmanager:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:secret:${var.secrets_prefix}*"]
  }
}

resource "aws_iam_role_policy" "external_secrets" {
  name   = "external-secrets"
  role   = aws_iam_role.external_secrets.id
  policy = data.aws_iam_policy_document.external_secrets.json
}

resource "aws_iam_role" "ebs_csi" {
  name               = "${var.cluster_name}-ebs-csi"
  assume_role_policy = data.aws_iam_policy_document.ebs_assume.json
  tags               = local.tags
}

resource "aws_iam_role_policy_attachment" "ebs_csi" {
  role       = aws_iam_role.ebs_csi.name
  policy_arn = "arn:${data.aws_partition.current.partition}:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy"
}

resource "aws_eks_pod_identity_association" "ebs_csi" {
  cluster_name    = var.cluster_name
  namespace       = "kube-system"
  service_account = "ebs-csi-controller-sa"
  role_arn        = aws_iam_role.ebs_csi.arn
}

resource "aws_iam_role" "karpenter_controller" {
  name               = "${var.cluster_name}-karpenter"
  assume_role_policy = data.aws_iam_policy_document.irsa_assume["karpenter"].json
  tags               = local.tags
}

resource "aws_iam_role_policy" "karpenter_node_lifecycle" {
  name   = "node-lifecycle"
  role   = aws_iam_role.karpenter_controller.id
  policy = templatefile("${path.module}/policies/karpenter-node-lifecycle.json.tftpl", local.policy_template_vars)
}

resource "aws_iam_role_policy" "karpenter_iam" {
  name   = "iam-integration"
  role   = aws_iam_role.karpenter_controller.id
  policy = templatefile("${path.module}/policies/karpenter-iam.json.tftpl", local.policy_template_vars)
}

resource "aws_iam_role_policy" "karpenter_discovery" {
  name   = "discovery"
  role   = aws_iam_role.karpenter_controller.id
  policy = templatefile("${path.module}/policies/karpenter-discovery.json.tftpl", local.policy_template_vars)

  #checkov:skip=CKV_AWS_355:EC2 Describe and Pricing APIs have no resource-level permissions. Region is constrained where the API allows it.
  #checkov:skip=CKV_AWS_290:EC2 Describe and Pricing APIs have no resource-level permissions.
  #checkov:skip=CKV_AWS_287:iam:ListInstanceProfiles cannot be scoped to a single profile.
}

data "aws_iam_policy_document" "node_assume" {
  statement {
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
    actions = ["sts:AssumeRole"]
  }
}

resource "aws_iam_role" "karpenter_node" {
  name               = "${var.cluster_name}-karpenter-node"
  assume_role_policy = data.aws_iam_policy_document.node_assume.json
  tags               = local.tags
}

resource "aws_iam_role_policy_attachment" "karpenter_node_worker" {
  role       = aws_iam_role.karpenter_node.name
  policy_arn = "arn:${data.aws_partition.current.partition}:iam::aws:policy/AmazonEKSWorkerNodePolicy"
}

resource "aws_iam_role_policy_attachment" "karpenter_node_cni" {
  role       = aws_iam_role.karpenter_node.name
  policy_arn = "arn:${data.aws_partition.current.partition}:iam::aws:policy/AmazonEKS_CNI_Policy"
}

resource "aws_iam_role_policy_attachment" "karpenter_node_ecr" {
  role       = aws_iam_role.karpenter_node.name
  policy_arn = "arn:${data.aws_partition.current.partition}:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

resource "aws_iam_role_policy_attachment" "karpenter_node_ssm" {
  role       = aws_iam_role.karpenter_node.name
  policy_arn = "arn:${data.aws_partition.current.partition}:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "karpenter_node" {
  name = "${var.cluster_name}-karpenter-node"
  role = aws_iam_role.karpenter_node.name
  tags = local.tags
}
