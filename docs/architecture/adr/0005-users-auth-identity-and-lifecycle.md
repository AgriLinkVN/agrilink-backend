# ADR 0005: Users And Auth Identity And Lifecycle

- Status: Accepted
- Date: 2026-07-26
- Owners: Users and Auth capabilities
- Scope: Persistence Phase 3

## Context

The canonical v2 schema requires `users.email`, while the protected local
snapshot contains two email-null users. Both have canonical Vietnamese phone
numbers and password hashes. One is an active Firebase-linked account and one
is a pending phone/password account. Neither has downstream foreign-key
references. This is valid legacy identity evidence, but it is not product
approval for phone-first registration.

`user_addresses` is absent from the canonical baseline and the protected local
snapshot. It has no mounted API, runtime registration, repository consumer, or
business flow. Refresh tokens and OTP records are active Auth-owned tables.

## Decision

1. New registration continues to require email. Phone-first registration is
   deferred. No placeholder email or empty string is permitted.
2. `users.email` remains non-nullable in the canonical entity and baseline.
   The two local email-null rows remain a reconciliation blocker for existing
   environment onboarding; Phase 3 does not mutate them.
3. New phone values use `+84xxxxxxxxx`. Existing protected-database rows are
   not rewritten.
4. `user_addresses` is `USER_ADDRESSES_DEFERRED`. Its declaration is owned by
   Users, but it is not registered at runtime or included in baseline v2.
5. Users owns account state. The existing Admin action is lock/unlock, not
   delete, anonymization, or a new public deactivation contract.
6. Locking or rejecting an account revokes active refresh tokens. Login and
   refresh reject those states, while preserving the existing
   `pending_verification` behavior.
7. Auth owns token rotation, revoke-all, OTP consumption, expiration, and
   retention. Refresh rotation and OTP consumption use conditional writes so
   concurrent requests have at most one winner.
8. OTP plaintext storage is retained for schema compatibility. Raw OTP values
   and full targets must not be logged. Hash migration remains separate
   security debt requiring a compatibility migration.

## Transaction Boundary

User status transitions use a Users-owned PostgreSQL transaction and
pessimistic row lock. Refresh rotation is an Auth-owned PostgreSQL transaction.
The current lock workflow invokes Auth revoke-all after the status commit.
Atomic cross-capability coordination is not required for authorization:
locked/rejected status independently blocks login and refresh. Revocation is
idempotent and retryable defense in depth.

## Consequences

- Ownership changes require no physical migration.
- Canonical catalog and OpenAPI remain unchanged.
- Existing local email-null accounts cannot be onboarded into the canonical
  v2 lineage without an approved reconciliation plan.
- Anonymization, hard delete, phone-first registration, OTP hashing, and
  UserAddress APIs remain deferred.
