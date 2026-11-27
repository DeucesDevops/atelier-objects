variable "cluster_name" {
  description = "EKS cluster name. Used in role names and Karpenter conditions."
  type        = string
}

variable "oidc_provider_arn" {
  description = "Cluster OIDC provider ARN from the cluster module."
  type        = string
}

variable "oidc_provider_url" {
  description = "Cluster OIDC issuer host path without https://."
  type        = string
}

variable "github_repository" {
  description = "GitHub repository allowed to assume CI roles, as OWNER/NAME."
  type        = string
}

variable "create_github_oidc_provider" {
  description = "Create the account-wide GitHub Actions OIDC provider. Set false when another environment already created it."
  type        = bool
  default     = true
}

variable "github_oidc_provider_arn" {
  description = "Existing GitHub OIDC provider ARN. Used only when create_github_oidc_provider is false."
  type        = string
  default     = ""
}

variable "state_bucket_arn" {
  description = "State bucket ARN the plan role may read and lock. Example: arn:aws:s3:::the-bucket-name."
  type        = string
}

variable "ecr_repository_arns" {
  description = "ECR repository ARNs the push role may write."
  type        = list(string)
}

variable "zone_id" {
  description = "Route 53 zone id external-dns may change."
  type        = string
}

variable "secrets_prefix" {
  description = "Secrets Manager name prefix External Secrets may read. Include the trailing slash."
  type        = string
  default     = "atelier/"
}

variable "tags" {
  description = "Tags applied to identity resources."
  type        = map(string)
  default     = {}
}
