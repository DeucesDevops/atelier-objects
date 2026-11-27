variable "aws_region" {
  description = "Region for the state bucket."
  type        = string
  default     = "us-east-1"
}

variable "state_bucket_name" {
  description = "Globally unique name for the Terraform state bucket. Set this in terraform.tfvars. Do not commit that file."
  type        = string
}

variable "force_destroy" {
  description = "Allow bucket deletion when objects remain. Leave false outside disposable experiments."
  type        = bool
  default     = false
}

variable "tags" {
  description = "Extra tags applied to bootstrap resources."
  type        = map(string)
  default     = {}
}
