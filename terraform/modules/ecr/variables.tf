variable "services" {
  description = "Service names. One repository is created for each."
  type        = list(string)
}

variable "repository_prefix" {
  description = "Prefix prepended to each repository name. Dev and production use different prefixes when they share an account."
  type        = string
  default     = "atelier-"
}

variable "image_count" {
  description = "How many images to keep in each repository."
  type        = number
  default     = 30
}

variable "tags" {
  description = "Tags applied to repositories."
  type        = map(string)
  default     = {}
}
