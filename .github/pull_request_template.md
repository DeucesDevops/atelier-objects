## Summary

<!-- What changed and why. -->

## Checklist

- [ ] Service ports, environment variables, and dependencies still match `compose.yml`
- [ ] No secret values were added (use `.example` files and Secrets Manager)
- [ ] `terraform fmt -check -recursive` and `terraform validate` pass for every module and root
- [ ] Helm charts lint and render (`helm lint`, `helm template`)
- [ ] Application tests still pass (`make test`)
- [ ] Docs and runbooks updated when the platform behavior changes

## Deploy notes

<!-- Image tags, Terraform plan, or Argo CD sync. Leave blank if this does not ship. -->
