variable "cluster_name" {
  description = "EKS cluster name."
  type        = string
}

variable "cluster_version" {
  description = "Kubernetes version for the control plane."
  type        = string
  default     = "1.34"
}

variable "vpc_id" {
  description = "VPC that hosts the cluster."
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnet ids for the control plane and the baseline node group."
  type        = list(string)
}

variable "endpoint_public_access" {
  description = "Expose the Kubernetes API on the public endpoint. Leave false unless public_access_cidrs is a real operator range."
  type        = bool
  default     = false
}

variable "public_access_cidrs" {
  description = "CIDRs allowed to reach the public API endpoint. The example value is TEST-NET documentation space, not an operator network."
  type        = list(string)
  default     = ["203.0.113.10/32"]
}

variable "service_ipv4_cidr" {
  description = "CIDR for Kubernetes service IPs. Must not overlap the VPC."
  type        = string
  default     = "172.20.0.0/16"
}

variable "node_instance_types" {
  description = "Instance types for the baseline managed node group."
  type        = list(string)
  default     = ["m6i.large"]
}

variable "node_desired_size" {
  description = "Desired size of the baseline managed node group."
  type        = number
  default     = 3
}

variable "node_min_size" {
  description = "Minimum size of the baseline managed node group."
  type        = number
  default     = 2
}

variable "node_max_size" {
  description = "Maximum size of the baseline managed node group."
  type        = number
  default     = 6
}

variable "node_disk_size" {
  description = "Root volume size in GiB for baseline nodes."
  type        = number
  default     = 50
}

variable "admin_principal_arns" {
  description = "Additional IAM principals that receive cluster admin access entries. The Terraform caller is granted admin by bootstrap_cluster_creator_admin_permissions."
  type        = list(string)
  default     = []
}

variable "tags" {
  description = "Tags applied to cluster resources."
  type        = map(string)
  default     = {}
}
