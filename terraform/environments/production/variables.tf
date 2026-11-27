variable "aws_region" {
  description = "AWS region."
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name used in tags."
  type        = string
  default     = "production"
}

variable "cluster_name" {
  description = "EKS cluster name."
  type        = string
  default     = "atelier-production"
}

variable "domain" {
  description = "Public DNS zone. Set this in terraform.tfvars. The example value is example.com."
  type        = string
}

variable "github_repository" {
  description = "GitHub repository allowed to assume CI roles, as OWNER/NAME."
  type        = string
}

variable "state_bucket_arn" {
  description = "ARN of the bootstrap state bucket."
  type        = string
}

variable "vpc_cidr" {
  description = "VPC CIDR."
  type        = string
  default     = "10.0.0.0/16"
}

variable "az_count" {
  description = "Availability zones. Production uses 3."
  type        = number
  default     = 3
}

variable "single_nat_gateway" {
  description = "Use a single NAT gateway. Production uses one per AZ."
  type        = bool
  default     = false
}

variable "cluster_version" {
  description = "EKS Kubernetes version."
  type        = string
  default     = "1.34"
}

variable "endpoint_public_access" {
  description = "Whether the Kubernetes API has a public endpoint."
  type        = bool
  default     = false
}

variable "public_access_cidrs" {
  description = "CIDRs for the public API endpoint."
  type        = list(string)
  default     = ["203.0.113.10/32"]
}

variable "node_instance_types" {
  description = "Baseline node instance types."
  type        = list(string)
  default     = ["m6i.large"]
}

variable "node_desired_size" {
  description = "Baseline node group desired size."
  type        = number
  default     = 3
}

variable "node_min_size" {
  description = "Baseline node group minimum size."
  type        = number
  default     = 2
}

variable "node_max_size" {
  description = "Baseline node group maximum size."
  type        = number
  default     = 6
}

variable "ecr_repository_prefix" {
  description = "Prefix for ECR repository names, including the trailing hyphen."
  type        = string
  default     = "atelier-"
}

variable "admin_principal_arns" {
  description = "Extra IAM principals granted cluster admin."
  type        = list(string)
  default     = []
}

variable "create_github_oidc_provider" {
  description = "Create the account GitHub OIDC provider."
  type        = bool
  default     = true
}

variable "github_oidc_provider_arn" {
  description = "Existing GitHub OIDC provider ARN when this environment does not create one."
  type        = string
  default     = ""
}

variable "prometheus_retention" {
  description = "Prometheus retention."
  type        = string
  default     = "15d"
}

variable "git_repo_url" {
  description = "Repository Argo CD syncs."
  type        = string
  default     = "https://github.com/DeucesDevops/atelier-objects"
}

variable "git_revision" {
  description = "Revision Argo CD tracks."
  type        = string
  default     = "dev"
}
