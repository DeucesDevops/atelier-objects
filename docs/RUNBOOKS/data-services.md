# Data services

Auth, catalog, inventory, order, payment, and analytics each own a Postgres database. Auth and catalog also use Redis. Catalog, inventory, order, payment, notification, and analytics use the Kafka topic `commerce.domain-events`.

These dependencies are not created by Terraform. Connection strings live in Secrets Manager. See [SETUP](../SETUP.md).

## Dev, in cluster

`platform/data/in-cluster.yaml` runs Postgres 16, Redis 7, and Redpanda v24.3.5, the same generations as `compose.yml`. Apply it only after the gp3 StorageClass exists:

```bash
kubectl -n data create secret generic commerce-data \
  --from-literal=POSTGRES_USER='choose-a-user' \
  --from-literal=POSTGRES_PASSWORD='choose-a-password'
APPLY_IN_CLUSTER_DATA=true ./scripts/apply-environment.sh dev
```

The secret is not in git. Postgres creates the `auth`, `catalog`, `inventory`, `orders`, `payments`, and `analytics` databases on first start.

| Service | Value |
| --- | --- |
| Postgres host | `postgres.data.svc.cluster.local:5432` |
| Redis | `redis://redis.data.svc.cluster.local:6379` |
| Kafka | `redpanda.data.svc.cluster.local:9092` |

Redis has no password and is ClusterIP only. Do not expose it. Do not use this manifest in production.

Payment's `DATABASE_URL` is `jdbc:postgresql://postgres.data.svc.cluster.local:5432/payments`. The other services use libpq URLs. Do not reuse the Compose default password.

## Production

Use RDS for Postgres, ElastiCache for Redis, and MSK for Kafka, and put the endpoints in the Secrets Manager JSON from SETUP. One RDS instance can host the six databases; the services still use separate database names. MSK should expose the same topic name, `commerce.domain-events`.

[ADR 0002](../ADR/0002-data-stores.md) explains why those managed services are not modules in this repository.
