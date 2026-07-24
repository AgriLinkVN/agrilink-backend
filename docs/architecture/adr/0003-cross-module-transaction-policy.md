# ADR 0003: Cross-Module Transaction Policy

## Status

Proposed. Accept when the Phase 0 pull request is merged.

## Context

Separating persistence ownership must not turn an atomic workflow into partial
state. AgriLink has same-database workflows, storage/provider side effects,
payment callbacks, notifications, and retryable background work.

## Decision

Use one of three explicit coordination modes:

1. **Transaction coordinator / Unit of Work**
   - Use when all writes are in the same PostgreSQL database and must commit
     atomically.
   - The application coordinator owns the boundary.
   - Participating ports receive a capability-scoped transaction context, not
     a raw TypeORM `Repository`, `EntityManager`, or `QueryRunner`.
2. **Saga with compensation**
   - Use when an external provider or separately committed operation prevents
     one transaction.
   - Define forward steps, compensation, reconciliation, correlation ID, and
     observable consistency failures.
3. **Transactional outbox**
   - Use for reliable event delivery after a database commit.
   - Consumers are idempotent and deduplicate by event/operation key.

## Critical Workflow Gates

- Failure-path and compensation tests.
- Concurrent command or optimistic-lock tests.
- Retry with the same operation key does not duplicate domain state.
- Outbox pending age, retry count, dead-letter count, compensation failures,
  and idempotency conflicts are measurable.

## Ownership

The module owning the orchestration use case chooses the coordination mode.
Infrastructure adapters implement it without exposing TypeORM across module
boundaries.

## Consequences

Ports require explicit transaction semantics. A simple read query does not gain
a transaction abstraction unless one is needed. External side effects are
never treated as transactionally committed merely because the database write
succeeded.
