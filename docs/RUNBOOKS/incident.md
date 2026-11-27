# Incident

## API or shop returns 5xx

1. `kubectl -n commerce get pods,ingress`
2. Confirm the Ingress has an address. An empty address means the load balancer controller has not finished, often because the public subnets lost `kubernetes.io/role/elb=1` or the controller role cannot create a load balancer.
3. `kubectl -n commerce describe ingress atelier` and read the events.
4. Check ExternalSecrets: `kubectl -n commerce get externalsecret`. A secret that is not Ready leaves the Deployment waiting. The usual cause is a missing Secrets Manager entry or a role that cannot read `atelier/*`.

## Pods pending

Baseline nodes are the managed group. Extra pods wait for Karpenter. `kubectl describe pod` shows the scheduler reason. `kubectl get nodepool,ec2nodeclass` shows whether the NodePool was applied. The EC2NodeClass role and the `karpenter.sh/discovery` tags come from the apply script. A pending pod after a NodePool failure is an IAM or subnet-tag problem, not an application crash.

## Certificate or DNS

`terraform output name_servers` must match the registrar delegation. ACM stays pending until the validation records resolve. external-dns only writes records inside `domainFilters`, which is the Terraform `domain` variable.

## Control plane unreachable

The API is private unless `endpoint_public_access` is true and `public_access_cidrs` contains your address. `203.0.113.10/32` in the example tfvars is documentation space and will not match a real client. Use `./scripts/update-kubeconfig.sh <env>` after the endpoint is reachable.

## Prometheus

Grafana is inside the cluster. Port-forward it rather than publishing the default admin password:

```bash
kubectl -n monitoring port-forward svc/kube-prometheus-stack-grafana 3000:80
```

The chart stores the generated admin password in a Secret. Read it from the cluster when you need it. Do not copy it into git. Dashboards labeled `grafana_dashboard=1` are loaded by the sidecar. Commerce alerts are the PrometheusRule in `observability/alerts`.
