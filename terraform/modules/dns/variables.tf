variable "domain" {
  description = "Public DNS zone name. Set this in terraform.tfvars. The example value is example.com."
  type        = string
}

variable "tags" {
  description = "Tags applied to DNS resources."
  type        = map(string)
  default     = {}
}
