# ECR

One immutable repository per commerce service, encrypted with a customer-managed key, scanned on push, and trimmed to the last 30 images.

Repository names are `<repository_prefix><service>`. The default prefix is `atelier-`, which matches `helm/atelier` `namePrefix`. Dev uses `atelier-dev-` so two environments can share an account.

Images are pushed by the build workflow as the git SHA. Do not push a moving tag such as `latest`; immutable tags reject it.
