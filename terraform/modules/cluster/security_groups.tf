resource "aws_security_group" "cluster" {
  name_prefix = "${var.cluster_name}-cluster-"
  description = "Additional security group for the EKS control plane"
  vpc_id      = var.vpc_id
  tags        = merge(local.tags, { Name = "${var.cluster_name}-cluster" })

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_vpc_security_group_egress_rule" "cluster_https" {
  security_group_id            = aws_security_group.cluster.id
  description                  = "Control plane to nodes over HTTPS"
  ip_protocol                  = "tcp"
  from_port                    = 443
  to_port                      = 443
  referenced_security_group_id = aws_security_group.node.id
}

resource "aws_vpc_security_group_ingress_rule" "cluster_https" {
  security_group_id            = aws_security_group.cluster.id
  description                  = "Nodes to the Kubernetes API"
  ip_protocol                  = "tcp"
  from_port                    = 443
  to_port                      = 443
  referenced_security_group_id = aws_security_group.node.id
}

resource "aws_security_group" "node" {
  name_prefix = "${var.cluster_name}-node-"
  description = "Baseline EKS managed node group"
  vpc_id      = var.vpc_id
  tags = merge(local.tags, {
    Name                     = "${var.cluster_name}-node"
    "karpenter.sh/discovery" = var.cluster_name
  })

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_vpc_security_group_ingress_rule" "node_self" {
  security_group_id            = aws_security_group.node.id
  description                  = "Node to node"
  ip_protocol                  = "-1"
  referenced_security_group_id = aws_security_group.node.id
}

resource "aws_vpc_security_group_ingress_rule" "node_api" {
  #checkov:skip=CKV_AWS_25:The source is the cluster security group. High ports include 3389 because kubelet and webhooks share that range.
  security_group_id            = aws_security_group.node.id
  description                  = "Control plane to kubelet"
  ip_protocol                  = "tcp"
  from_port                    = 1025
  to_port                      = 65535
  referenced_security_group_id = aws_security_group.cluster.id
}

resource "aws_vpc_security_group_ingress_rule" "node_https" {
  security_group_id            = aws_security_group.node.id
  description                  = "Control plane to node HTTPS"
  ip_protocol                  = "tcp"
  from_port                    = 443
  to_port                      = 443
  referenced_security_group_id = aws_security_group.cluster.id
}

resource "aws_vpc_security_group_egress_rule" "node_cluster" {
  security_group_id            = aws_security_group.node.id
  description                  = "Nodes to the Kubernetes API"
  ip_protocol                  = "tcp"
  from_port                    = 443
  to_port                      = 443
  referenced_security_group_id = aws_security_group.cluster.id
}

resource "aws_vpc_security_group_egress_rule" "node_https" {
  #trivy:ignore:AVD-AWS-0104 ECR and the AWS APIs are public HTTPS endpoints. NAT egress has no tighter CIDR.
  security_group_id = aws_security_group.node.id
  description       = "Nodes to ECR and AWS APIs through NAT over HTTPS"
  ip_protocol       = "tcp"
  from_port         = 443
  to_port           = 443
  cidr_ipv4         = "0.0.0.0/0"

  #checkov:skip=CKV_AWS_382:ECR and the AWS APIs are reached over HTTPS through the NAT gateway.
}

resource "aws_ec2_tag" "cluster_sg_karpenter" {
  resource_id = aws_eks_cluster.this.vpc_config[0].cluster_security_group_id
  key         = "karpenter.sh/discovery"
  value       = var.cluster_name
}
