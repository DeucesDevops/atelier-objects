# Deploy

1. Confirm the image tag exists in ECR. Tags are the git SHA from the build workflow.
2. Run the Deploy workflow and enter that tag. The `production` environment must approve the job before it writes the tag into `helm/atelier/values-production.yaml`.
3. Argo CD syncs `helm/atelier` from `dev` with `values.yaml` and `values-production.yaml`. HorizontalPodAutoscaler owns replica counts, so Argo CD ignores `/spec/replicas`.
4. Watch the Application:

```bash
kubectl -n argocd get application atelier
kubectl -n commerce get deploy,pods,ingress
```

5. Run the smoke check against the public origins:

```bash
BASE_URL=https://api.example.com WEB_URL=https://shop.example.com ./tests/smoke/health.sh
```

Replace the hosts with the real domain. Both services answer `GET /health`.

Dev does not use the production value file. Build images into the `atelier-dev-` repositories and let Argo CD on the dev cluster use `values.yaml`, or install the chart with Helm for a one-off.
