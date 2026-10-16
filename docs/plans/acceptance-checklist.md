# Acceptance and evidence checklist

Record date, source commit, image digests, environment, exact check, result and an evidence location for each item. All boxes are intentionally unmarked: this documentation task reviewed configuration and rendered diagrams, but did not rerun the application or provision AWS.

| Stage | Acceptance evidence to collect |
| --- | --- |
| 1 · Baseline | [ ] All nine health routes; registration/login; catalog; normal checkout; event consumers observed through broker-backed behavior |
| 2 · Images | [ ] Nine build outputs and runtime identities; source labels; target CPU verified; graceful stop; same tested/published digests |
| 3 · Local | [ ] Decline releases inventory; cancellation/refund; six database stores survive recreation; broker/notification restart limitations recorded |
| 4 · Foundation | [ ] Terraform apply and stable second plan; private data services; six roles/databases; outputs consumed without copying; budget and teardown plan |
| 5 · Cluster | [ ] kOps validation; node health; state ownership; runner network/RBAC access; etcd backup artifact |
| 6 · Helm | [ ] Dev/prod render from one chart; secret resolution; dependency readiness; HTTPS routes; PVC storage; distinct environment data and Kafka groups |
| 7 · CI | [ ] Successful hosted run URL; Node/Java/Python test reports; scan policy; deliberately broken check prevents release |
| 8 · Delivery | [ ] Nine-image release manifest; automated dev rollout; same digests in second env; secret refresh/restart; recorded successful rollback |
| 9 · Visibility | [ ] Queries/dashboard evidence; HTTP/dependency failures; consumer lag; controlled fault raises and clears a useful alert |
| 10 · Recovery | [ ] Isolated restore of six databases; cross-store reconciliation; broker recovery/replay; cluster-state rehearsal; measured recovery objectives |

## Demonstration script

1. Show the architecture and the image digests/source commit actually running.
2. Register, browse, check out successfully and observe notification/analytics events.
3. Demonstrate a declined payment, released stock, then cancellation/refund on another order.
4. Recreate an application pod and show PostgreSQL data persists.
5. Rotate one credential and restart affected workloads without rebuilding images.
6. Promote an unchanged release manifest into the next environment.
7. Deploy a controlled bad revision, show failed rollout checks and recover with rollback.
8. Restore a database backup into an isolated target, verifying business records rather than only container health.
9. Show one alert, the supporting logs/metrics, resolution, and the cleanup inventory.

Do not claim exactly-once event delivery, persistent notification history, complete readiness checks, an outbox or high availability unless those capabilities have been implemented and demonstrated. Current application limitations are documented in the [architecture guide](../architecture/README.md).
