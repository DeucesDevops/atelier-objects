# ADR 0002: Data stores stay outside the modules

## Status

Accepted.

## Context

Compose gives each data-owning service its own Postgres, plus Redis and Redpanda. A production account would normally use RDS, ElastiCache, and MSK. Those three are not small beside the network and cluster modules: six databases need subnet groups, parameter groups, a password that must not land in git, and a bootstrap job that creates the databases. MSK needs a configuration, broker subnets, and a topic. Wiring the endpoints back into External Secrets makes the environment root depend on a data module the rest of the platform does not need in order to boot.

## Decision

Do not add RDS, ElastiCache, or MSK modules. Dev runs Postgres 16, Redis 7, and Redpanda in the cluster from `platform/data/in-cluster.yaml`. Production puts connection strings in Secrets Manager and points the same Helm chart at them. The managed services, when they are created, should be:

- one RDS Postgres instance with the six databases `auth`, `catalog`, `inventory`, `orders`, `payments`, and `analytics`
- ElastiCache Redis with AUTH, used by auth and catalog
- MSK with the topic `commerce.domain-events`

The chart already reads `DATABASE_URL`, `REDIS_URL`, `KAFKA_BROKERS`, and the payment JDBC settings from External Secrets.

## Consequences

- Dev data is not highly available and Redis has no password. It is ClusterIP and is not for production.
- Production data is an operator task, documented in the data-services runbook, not a `terraform apply` side effect.
- Adding a data module later does not require a chart change if the secret keys stay the same.
