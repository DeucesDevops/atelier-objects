# DNS

Public Route 53 zone for `var.domain` and a DNS-validated ACM certificate covering the apex and `*.domain`. The certificate is regional, which is what an ALB in the same region needs.

`domain` has no default. `terraform.tfvars.example` uses `example.com` only as a placeholder. After apply, delegate the registrar to `name_servers` or validation never completes.

external-dns later writes shop, api, and argocd records in this zone. It does not create the zone.
