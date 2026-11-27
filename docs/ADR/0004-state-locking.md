# ADR 0004: S3 lockfiles

## Status

Accepted.

## Context

Terraform 1.10 can lock an S3 backend with a lockfile object and conditional writes. Older setups used a DynamoDB table.

## Decision

The bootstrap module creates a versioned, encrypted state bucket and no DynamoDB table. Environment backends set `use_lockfile = true`. The plan workflow passes the same flag.

## Consequences

- Terraform older than 1.10 cannot lock this state.
- Bootstrap state stays local, because the bucket cannot hold the state of its own creation. Keep that local state file, and do not commit it.
