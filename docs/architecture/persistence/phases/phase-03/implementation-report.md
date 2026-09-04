# Persistence Phase 3 Implementation Report

## A. Synchronization

- Phase 2 PR: `#81`, merged as
  `a3bbe12995ee08fcb40a9c3cb3e982edd257a586`.
- Phase 3 source develop commit:
  `a3bbe12995ee08fcb40a9c3cb3e982edd257a586`.
- Branch: `refactor/persistence-phase-3-users-auth`.
- Initial worktree: clean.

## B. Evidence Inventory

The deterministic machine-readable inventory is
`evidence/users-auth-evidence.json`.
Local PostgreSQL observations are read-only fixture evidence, not production
truth.

| Table | Baseline v2 | Local fixture | Active persistence | Decision |
| --- | --- | --- | --- | --- |
| `users` | included | 13 rows | Users and Admin repositories | canonical Users owner; Admin migrated to ports |
| `user_addresses` | excluded Group C | absent | none | `USER_ADDRESSES_DEFERRED` |
| `refresh_tokens` | included | 7 rows | Auth token adapter | canonical Auth owner |
| `otp_verifications` | included | 1 row | Auth OTP adapter | canonical Auth owner |

## C. Ownership Results

| Table | Previous mapping | Canonical mapping | Compatibility | Writable mappings |
| --- | --- | --- | --- | ---: |
| `users` | `src/database/entities/user.entity.ts` | `src/modules/users/infrastructure/persistence/entities/user.entity.ts` | central decorator-free re-export | 1 |
| `user_addresses` | central dormant declaration | Users persistence declaration, not runtime registered | central decorator-free re-export | 1 deferred |
| `refresh_tokens` | central entity | `src/modules/auth/infrastructure/persistence/entities/refresh-token.entity.ts` | central decorator-free re-export | 1 |
| `otp_verifications` | central entity | `src/modules/auth/infrastructure/persistence/entities/otp-verification.entity.ts` | central decorator-free re-export | 1 |

The runtime/CLI/test composition registry imports Users/Auth canonical classes.
Refresh-token and OTP repositories use scalar `userId`. Private string-target
relation metadata preserves the existing foreign keys without importing User
infrastructure or exposing relation loading through a port.

## D. Module Boundaries

- `UsersModule` previously exported `UsersService` and `TypeOrmModule`.
- It now exports only typed identity, account, admin-query, and status tokens.
- Outside `Repository<User>` injection: `1` before, `0` after.
- Foreign User `forFeature` registrations: Admin and Reviews removed.
- Outside RefreshToken/OtpVerification repository injection: `0`.
- Auth's typed `LegacyUsersModuleAdapter` delegates through Users ports. It
  contains no `any`, exports no infrastructure, and retires in Phase 4.
- The remaining Review-to-User ORM relation is an existing Phase 5 exception;
  Review ownership was not refactored.

## E. Identity Decision

- Decision: ADR 0005, keep email required for new registration.
- Canonical `users.email`: non-nullable and unique.
- `users.phone`: nullable and unique; new values use `+84xxxxxxxxx`.
- Phone-first registration: deferred.
- Placeholder/empty email: prohibited.
- Existing phone rewrite: none; new seed fixtures are canonicalized.
- Local email-null rows: two canonical-phone legacy identities. One is active
  and Firebase-linked; one is pending phone/password. Both have zero observed
  downstream FK references.
- Existing-environment onboarding remains
  `USERS_IDENTITY_RECONCILIATION_REQUIRED`; no identity migration was created.

## F. Account Lifecycle

- Existing Admin status behavior is lock/unlock, not delete or anonymization.
- Status changes execute inside a Users-owned transaction with a pessimistic
  row lock and protect Admin accounts.
- Lock/reject invokes Auth revoke-all.
- Login and refresh reject `LOCKED`/`REJECTED`, so status is authoritative
  even if revocation must be retried. Existing `pending_verification`
  semantics are preserved.
- Revoke-all is idempotent.
- Hard delete, public deactivation, and anonymization remain deferred because
  no approved product/retention contract exists.

## G. Auth Concurrency And Retention

- Refresh rotation verifies JWT, matches token hash and owner, conditionally
  revokes an unexpired/unrevoked row, and inserts the replacement in one Auth
  transaction. Concurrent reuse has one winner.
- Refresh token TTL is derived from the signed token `exp` when available.
- OTP consumption selects target/code/purpose/unexpired state and uses a
  conditional update. Concurrent consume has one winner.
- Token cleanup removes only old revoked or expired records.
- OTP cleanup removes only old consumed or expired records.
- Raw refresh tokens are hashed before persistence.
- OTP plaintext storage is unchanged because hashing requires a separate
  compatibility migration. Raw OTP and full target logging was removed.

## H. Schema And Migration

- Migration: `NONE`.
- Baseline migration: unchanged.
- Baseline tables: 26.
- Catalog expected/actual: 499/499.
- Catalog diff: 0.
- TypeORM raw/reviewed: 28/28.
- TypeORM unexpected/stale/catalog mismatch: 0/0/0.
- Compatibility manifest: unchanged; no new suppression was needed.
- UserAddress: deferred and absent from runtime/baseline.

## I. API And Query Contracts

OpenAPI remains 88 paths, 99 operations, fingerprint
`5637fed8d1ae886ea9cb8fabc5b9f7813454990c5f52ac5c5cded8fcb0a0157f`.
Registration now persists the already documented optional canonical phone; no
request or response schema changed.

Source-level SQL operation contracts:

| Flow | Before | After | Decision |
| --- | ---: | ---: | --- |
| email login | 4 | 4 | unchanged |
| phone login | 4 | 4 | unchanged; one identity lookup |
| register | 2 | 2 | unchanged |
| refresh | 4 | 6 | reviewed `BEGIN`/`COMMIT` for atomic rotation |
| logout/revoke-all | 1 | 1 | unchanged |
| get current user | 1 | 1 | unchanged |
| update current user | 2 | 2 | unchanged |
| admin user list | 2 | 2 | unchanged |
| admin status update plus audit | 3 | 6 | reviewed lock transaction plus revoke-all |
| OTP send | 3 | 3 | unchanged |
| OTP verify/register | 4 | 4 | conditional consume replaces save |

The two increases are explicit transaction boundaries, not N+1 behavior.
List and identity lookup counts do not grow with result size.

## J. Protected Database Safety

- Protected database: `agrilink_db`.
- Access: read-only PostgreSQL transaction plus schema-only dump.
- Before normalized schema SHA-256:
  `cc9c1ec2cec9d1ad77402b061a2f71fbfa82389cf3c515364ec367a66028f9ba`.
- After normalized schema SHA-256:
  `cc9c1ec2cec9d1ad77402b061a2f71fbfa82389cf3c515364ec367a66028f9ba`.
- Before/after equality: exact.
- Public tables: 33.
- Migration ledgers: none.
- No migration, seed, onboarding apply, DDL, or DML was run.
- Disposable clean-v2 databases are created and removed by the existing
  verifier; remaining disposable databases after verification: 0.

## L. Quality Gates

| Gate | Result | Evidence |
| --- | --- | --- |
| Persistence architecture audit | pass | 58 mappings, 48 tables, 0 violations |
| Architecture regression test | pass | 2 tests |
| Phase 1 persistence | pass | 27 tests |
| Phase 2 persistence | pass | 18 tests |
| Phase 3 persistence | pass | 17 tests |
| Focused Auth login | pass | 10 tests |
| TypeScript | pass | 0 errors |
| Lint | pass | 0 errors, 19 pre-existing warnings |
| Build | pass | Nest build |
| Full unit | pass | 147 passed, 1 existing opt-in skip |
| Full E2E | pass | 98 passed |
| Storage unit | pass | 38 passed, 1 existing opt-in skip |
| Storage E2E | pass | 11 passed |
| Storage migration integration | existing opt-in skip | no new skip |
| Clean-v2 | pass | up/second/down/up and parity |
| Git diff check | pass | no whitespace errors |

## M. Deferred Work

- UserAddress API/schema onboarding.
- Phone-first registration and identity check constraint.
- Existing email-null/legacy-phone data reconciliation.
- OTP hash migration.
- Public deactivation, anonymization, and retention policy.
- Phase 4 Profiles/Admin read-model ownership.
- Phase 5 Product/Review relation ownership.

No Phase 4 or Phase 5 business ownership was implemented.
