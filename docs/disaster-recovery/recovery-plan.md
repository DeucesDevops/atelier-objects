# Backup, recovery and rollback plan

**Not yet rehearsed by this task.** Record results in the [acceptance checklist](../plans/acceptance-checklist.md). Choose recovery-time and data-loss objectives before implementation and replace estimates with measured results. Run restoration exercises against isolated targets rather than overwriting the only working dataset.

## What each recovery source protects

| State | Current behavior | Target protection / verification |
| --- | --- | --- |
| Auth, Catalog, Inventory, Orders, Payment, Analytics | Six named PostgreSQL volumes | RDS backups/snapshots plus isolated restores of databases, roles and permissions; verify business records |
| Redis | No local persistent volume; Auth hints and Catalog cache | Rebuild cache; verify application behavior and JWT assumptions during loss |
| Kafka-compatible broker | Local Redpanda has no volume | EBS PVC, retention and documented broker recovery; record offsets and retained events |
| Notification deliveries | In-process list; lost on restart | Document loss and replay duplicates; add persistence/idempotency if retention is required |
| Analytics read model | Event IDs deduplicate stored events | Database backup or replay only if complete needed events still exist |
| Kubernetes objects / cluster state | No cluster implemented here | Encrypted etcd backups; rehearsed restoration for the pinned kOps release |
| kOps desired configuration / credentials | Proposed private state store | Versioned restricted state backup; separate from public OIDC metadata |
| Terraform resource mappings | Proposed remote state | Versioning, locking and access protection; restore state without confusing it with resource recreation |
| Application release | Existing Dockerfiles and pipeline configuration | Git revision, nine-image digest manifest, chart/values revision and prior Helm release |

## Database restoration exercise

1. Record a known user's identity and known product, stock, order, payment and analytics event IDs. Capture schema and role versions.
2. Create a backup/snapshot using an automated, least-privilege procedure. Store it privately with retention and encryption. Backups include customer data and password hashes.
3. Restore to a new isolated RDS instance or isolated local PostgreSQL targets. Restore database ownership/users and verify access restrictions, not just row counts.
4. Deploy a rehearsal environment with the recorded application digests and restored connection secrets. Use safe isolated broker/topic settings so it cannot create effects in the live environment.
5. Verify login, existing records, order/payment consistency, reservations and analytics. Keep controlled new transactions distinct from recovered records.
6. Record measured recovery duration, backup age and differences. Plan reconciliation for cross-service state. Six independent database dumps do not automatically form one consistent cross-service recovery point.

No distributed transaction coordinates the six stores and the broker. Decide how to quiesce writes or reconcile business state when recovery points differ. A successful restore command alone does not prove a consistent checkout system.

## Broker and consumer exercise

1. Record topic settings, retained offset ranges, consumer offsets and known event IDs.
2. Restart/recreate the broker under the proposed persistent-storage design and verify that records remain. The current local Compose design cannot make this promise after container removal.
3. Restore the broker or replay retained records into an isolated environment. Analytics should ignore duplicate event IDs.
4. Observe Notification separately: its delivery list is volatile and it lacks persisted deduplication. Do not replay real side effects through a future email/payment integration without an idempotency design.
5. Compare order/payment state with events. Publishers currently swallow some broker failures; a backup/replay cannot recover events that were never durably published. An outbox/reconciliation improvement needs implementation and testing.

## Application rollback exercise

Record the current and previous release manifests, all nine digests, chart revision, runtime values and schema compatibility. Introduce a controlled failing release in a rehearsal environment, detect failure using rollout plus application checks, then restore the previous release. Verify checkout, auth and consumers after rollback. Reverting pods does not revert schema, recover missing messages or restore database records.

## Cluster restoration and recreation exercise

Treat restoration of etcd and recreation from declarative definitions as different procedures. Keep kOps state, etcd backups and Terraform state separately protected. Rehearse against a separate learning cluster using the version-specific kOps guidance; document which workloads and external data survive each scenario. [kOps etcd backup and restore guidance](https://kops.sigs.k8s.io/operations/etcd_backup_restore_encryption/)

Redpanda's EBS volume belongs to one AZ. Recovery requires a suitable node in that AZ or a tested snapshot/restore procedure; two worker AZs alone do not create a replicated broker. Use the [cloud delivery sequence](../runbooks/cloud-delivery.md) for ordering and ownership when recreating infrastructure.

## Evidence record

For every rehearsal record: date, operator, environment, source commit, image manifest, recovery source/version, fault introduced, expected result, actual result, measured recovery time/data loss, record-level checks, cleanup and follow-up work. Keep raw dumps and secret-bearing logs outside Git.
