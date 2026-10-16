# Configuration and secret delivery

This is a configuration map and implementation plan. Existing local defaults make the demonstration approachable; they are not cloud credentials. No secret values belong in tracked files, Docker build arguments, screenshots or public test artifacts.

## Current variables and ownership

| Consumer | Runtime variables | Handling |
| --- | --- | --- |
| Gateway | `PORT`, `AUTH_SERVICE_URL`, `CATALOG_SERVICE_URL`, `ORDER_SERVICE_URL`, `INVENTORY_SERVICE_URL`, `PAYMENT_SERVICE_URL`, `NOTIFICATION_SERVICE_URL`, `ANALYTICS_SERVICE_URL` | Non-secret service DNS/ports in ConfigMaps |
| Auth | `PORT`, `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET` | URLs with credentials and JWT key are secret |
| Catalog | `PORT`, `DATABASE_URL`, `REDIS_URL`, `KAFKA_BROKERS`, `SEED_DEMO` | Credential-bearing URLs secret; demo seeding off outside explicit demo environments |
| Inventory | `PORT`, `DATABASE_URL`, `KAFKA_BROKERS` | Dedicated database user |
| Orders | `PORT`, `DATABASE_URL`, `INVENTORY_SERVICE_URL`, `PAYMENT_SERVICE_URL`, `KAFKA_BROKERS`, `JWT_SECRET` | JWT verification must agree with Auth; dedicated database user |
| Payment | `PORT`, JDBC `DATABASE_URL`, `DATABASE_USER`, `DATABASE_PASSWORD`, `KAFKA_BROKERS` | JDBC URL format differs from Node/Python; password secret |
| Notification | `KAFKA_BROKERS` | Port 8001 is set by its container command; groups/topic are currently hardcoded |
| Analytics | `DATABASE_URL`, `KAFKA_BROKERS` | Dedicated database user; port 8002 set by its container command |
| PostgreSQL containers | `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Initialization variables; changing them does not rotate an existing user's password |
| TypeScript build | `SERVICE` | Build selector, not a credential |
| Web build | `VITE_API_URL` | Public build-time URL, embedded in JavaScript; never a secret |

`SERVICE_NAME` identifies TypeScript services and is used by the shared image entrypoint. Compose currently reuses one database username/password across six isolated PostgreSQL containers. The proposed RDS design changes that to six service users/databases.

## Proposed cloud path

```text
Terraform creates secret resources and scoped IAM
  → securely generated values enter AWS Secrets Manager
  → External Secrets Operator uses its AWS service-account identity
  → per-environment Kubernetes Secrets
  → per-service secret references at process startup
```

The operator identity only needs access to its environment's secret paths. Ordinary workloads should not receive a shared administrative AWS or PostgreSQL identity. Keep Kubernetes Secret access scoped with RBAC and apply control-plane data protection supported by the selected kOps configuration. Base64 encoding is not encryption.

A refresh of a Kubernetes Secret does not update environment variables inside an existing process. Automate a controlled rollout after synchronization and verify connections. Database/cache rotation must update the real backing service as well as the stored value.

## Changes needed before the proposed target works

- Remove environment hostnames from the common web build: use same-origin requests with ALB path routing, or implement a public runtime configuration file. Current behavior requires a rebuild to change `VITE_API_URL`.
- Add and verify TLS/auth settings for managed database and cache clients. A private subnet does not configure client TLS automatically.
- Current Kafka code largely consumes broker addresses only; broker authentication/TLS needs explicit cross-language client configuration if enabled. Do not assume `KAFKA_BROKERS` supplies credentials or a complete security protocol.
- Make Kafka topic/group names configurable for multiple environments. Scope topics, groups, databases, secrets and cache keys/endpoints so dev cannot affect prod.
- Limit public entry to web/gateway through ALB. Most current domain APIs are reachable through the gateway and some have no authorization enforcement; decide and implement access rules before calling the cloud target production-ready.
- Replace automatic schema updates with controlled migrations for predictable upgrade/rollback. Plan credential provisioning and migration identities separately from ordinary application identities.
- Derive image revision/build labels in automation, and record all nine digests. Add an application version endpoint only if it is intentionally implemented; none is assumed by these plans.

## Secret inventory without values

Track owner, environment, secret resource identifier, consuming services, rotation procedure and last verified rotation date. For this target the inventory includes six database credentials, Auth/Orders JWT key, cache authentication, any future broker credentials and any bootstrap/provisioning credentials. CI uses scoped short-lived cloud identity wherever possible. Terraform state may contain secret material and needs equivalent protection.
