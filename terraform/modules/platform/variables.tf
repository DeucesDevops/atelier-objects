variable "cluster_name" {
  description = "EKS cluster name."
  type        = string
}

variable "aws_region" {
  description = "Region passed to controllers that cannot discover it."
  type        = string
  default     = "us-east-1"
}

variable "vpc_id" {
  description = "VPC id for the AWS Load Balancer Controller."
  type        = string
}

variable "domain" {
  description = "Public domain external-dns and Argo CD publish into."
  type        = string
}

variable "alb_controller_role_arn" {
  description = "IRSA role for the AWS Load Balancer Controller."
  type        = string
}

variable "external_dns_role_arn" {
  description = "IRSA role for external-dns."
  type        = string
}

variable "external_secrets_role_arn" {
  description = "IRSA role for External Secrets."
  type        = string
}

variable "karpenter_controller_role_arn" {
  description = "IRSA role for Karpenter."
  type        = string
}

variable "karpenter_queue_name" {
  description = "Interruption queue name."
  type        = string
}

variable "acm_certificate_arn" {
  description = "ACM certificate for the Argo CD ingress."
  type        = string
}

variable "git_repo_url" {
  description = "Git repository Argo CD syncs."
  type        = string
  default     = "https://github.com/DeucesDevops/atelier-objects"
}

variable "git_revision" {
  description = "Git revision Argo CD tracks."
  type        = string
  default     = "dev"
}

variable "image_registry" {
  description = "ECR registry host, without a repository path."
  type        = string
  default     = ""
}

variable "image_prefix" {
  description = "Repository prefix, including the trailing hyphen."
  type        = string
  default     = "atelier-"
}

variable "helm_value_files" {
  description = "Value files Argo CD passes to the commerce chart. Production adds values-production.yaml. Dev uses values.yaml only."
  type        = list(string)
  default     = ["values.yaml", "values-production.yaml"]
}

variable "enable_monitoring" {
  description = "Install kube-prometheus-stack."
  type        = bool
  default     = true
}

variable "prometheus_retention" {
  description = "Prometheus TSDB retention."
  type        = string
  default     = "10d"
}
