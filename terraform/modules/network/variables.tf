variable "name" {
  description = "Name prefix for VPC resources. Also used as the EKS cluster name in subnet tags."
  type        = string
}

variable "vpc_cidr" {
  description = "IPv4 CIDR for the VPC."
  type        = string
}

variable "az_count" {
  description = "Number of availability zones. Use 2 or 3."
  type        = number
  default     = 3

  validation {
    condition     = var.az_count == 2 || var.az_count == 3
    error_message = "az_count must be 2 or 3."
  }
}

variable "single_nat_gateway" {
  description = "Use one NAT gateway for every private subnet. Dev sets this true. Production sets it false so each AZ has its own NAT gateway."
  type        = bool
  default     = false
}

variable "tags" {
  description = "Tags applied to every network resource."
  type        = map(string)
  default     = {}
}
