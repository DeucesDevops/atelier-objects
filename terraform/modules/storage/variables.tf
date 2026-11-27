variable "name_prefix" {
  description = "Prefix for bucket names. The account id is appended so names stay unique."
  type        = string
}

variable "force_destroy" {
  description = "Allow bucket deletion when objects remain."
  type        = bool
  default     = false
}

variable "tags" {
  description = "Tags applied to buckets and keys."
  type        = map(string)
  default     = {}
}
