# Persistence Phase 7A Implementation Report

## A. Capability Decisions

| Capability | Tables | Decision | Evidence |
| --- | --- | --- | --- |
| Logistics | `logistics_profiles`, `shipments`, `shipment_tracking_events` | `DORMANT_DEFER` | No module, controller, repository, runtime/CLI registration, baseline table or protected DB table. The logistics profile has only an opt-in development seed reference. |
| Messaging | `conversations`, `messages` | `DORMANT_DEFER` | No module, API, repository, gateway, runtime/CLI registration, baseline table or protected DB table. |
| Notifications | `notifications` | `ACTIVE_BOUNDARY_ONLY` | Mounted API, repository, canonical registry entry, baseline-v2 table, typed producer port and authenticated Socket.IO gateway. |

Central dormant declarations remain compatibility evidence only. They were
not relocated because no active owner capability exists. No schema or
business behavior was inferred from those declarations.

## B. Ownership And Boundaries

Notifications retains one writable mapping at
`src/modules/notifications/infrastructure/persistence/notification.orm-entity.ts`.
Runtime, CLI and test composition use the same registry. Feature producers in
Products and Ads import `NotificationPublisherPort`; they do not import the
Notification entity or repository. The Notifications module exports only
`NOTIFICATION_PUBLISHER`.

The database development seed's direct entity access is recorded as seed
orchestration and remains Phase 8 scope. No Phase 7A module imports another
owner's persistence infrastructure, registers a foreign entity, or exposes a
TypeORM primitive through a port.

The unmounted `src/modules/notifications/notifications.gateway.ts` duplicate
is now a decorator-free compatibility re-export. This removes its wildcard
CORS, fallback JWT secret, role rooms, sensitive connection logging and
untyped emit methods without changing the canonical mounted gateway.

## C. Lifecycle And Concurrency

| Current | Command | Actor | Next | Result |
| --- | --- | --- | --- | --- |
| unread | mark one read | authenticated owner | read | Conditional update; emits `marked_read` after success. |
| read | mark one read | authenticated owner | read | Idempotent replay; no write and no duplicate event. |
| unread set | mark all read | authenticated owner | read set | One bounded update; emits only when rows changed. |
| missing/foreign | mark one read | non-owner | unchanged | Typed not-found result; no write or event. |

Two concurrent mark-one calls use the conditional `is_read = false` update.
The loser reloads the committed row and returns the winning state, while only
the winner emits. The focused PostgreSQL test uses `Promise.all` and verifies
one persisted row and one realtime event.

Logistics has no approved shipment state machine or actor policy. Messaging
has no approved membership, send, read, archive or delete lifecycle. Both are
deferred rather than invented.

## D. WebSocket Contract

| Event | Direction | Authentication | Room | Payload |
| --- | --- | --- | --- | --- |
| `new_notification` | server to client | JWT required | `user:{sub}` | Notification response DTO without `userId` |
| `marked_read` | server to client | JWT required | `user:{sub}` | `id`, ISO `readAt` |
| `all_notifications_read` | server to client | JWT required | `user:{sub}` | `updated`, ISO `readAt` |

Missing or invalid tokens disconnect before room join. The gateway accepts no
client mutation events, so malformed inbound payload and acknowledgement
contracts are not applicable. Existing event names and payloads are unchanged.
Realtime publish runs only after persistence. A synchronous gateway failure is
reported with event name and error class only; it cannot turn an already
committed database operation into an API failure or expose notification data.

## E. Retry And Idempotency

- Mark-one and mark-all reads are deterministic and idempotent.
- Socket delivery has no durable acknowledgement/retry contract; delivery is
  best effort after persistence.
- Notification creation has no proven operation identity or idempotency key.
  Duplicate producer retries therefore remain `BLOCKED_MISSING_CONTRACT`; no
  process-local map, column or unique constraint was invented.
- Logistics tracking ingestion and Messaging send operations do not exist at
  runtime, so retry contracts remain part of their deferred product design.

## F. Query Counts

Notification list uses one bounded TypeORM query for N=1 and N=20 in the
focused PostgreSQL suite. The count does not grow with result size. Ordering is
`created_at DESC, id DESC`, providing a deterministic tie-breaker without
relation hydration or per-row user/profile queries.

Conversation, message, shipment and tracking query-count baselines cannot be
measured because those capabilities are not implemented. This is recorded as
`DORMANT_DEFER`, not hidden by a synthetic baseline.

## G. Retention

No repository policy, scheduler, environment variable, legal requirement or
approved duration exists for any scoped table. The decision is
`RETENTION_POLICY_DEFERRED` for all six tables. Phase 7A adds no delete,
cascade, archive, purge or cleanup behavior. Unread notifications and dormant
history declarations retain their current behavior.

## H. Schema And Database Safety

Migration: `NONE`. Canonical baseline v2 and the Phase 6 migration are
unchanged. Clean-v2 remains 33 tables and 644 catalog objects with zero catalog
diff, zero unexpected TypeORM operations and zero stale manifest entries.

The local protected database `agrilink_db` was inspected only inside read-only
transactions. Before and after fingerprints are
`2e8fee7ecf69c92a8ae7d8964d27be6a66957774758629fe1a289856bf5772e4`;
both snapshots contain 33 public tables and no migration ledger. Only
`notifications` exists among the six candidates and it has zero rows. No DDL,
DML, migration, seed, onboarding apply or Railway access occurred.

## I. Rollback And Deferred Work

Rollback is a source revert: the entity registry and schema did not change.
There is no queue to drain. Existing typed producer and Socket.IO contracts
remain compatible.

Deferred work requires new reviewed product evidence: Logistics state and
actor contracts, Messaging membership/send contracts, durable notification
creation identity, delivery acknowledgement/retry, and retention periods.
Phase 7B is not part of this implementation.
