# Entity Ownership And Persistence Boundaries Roadmap

## Mandatory Workflow

Only one phase may be active. Before a phase, verify the previous PR is
`MERGED`, fetch/pull `develop`, confirm a clean worktree and equality with
`origin/develop`, then create the exact branch. After focused and full gates,
commit, push, open a PR to `develop`, report handoff, and stop. Never self-merge
or start the next phase.

Track `ready to merge`, `merged`, and `deployed` separately.

## Phase 0: Ownership Contract

- Branch: `docs/persistence-phase-0-ownership-contract`
- Scope: source inventory, ownership matrix, duplicate/dependency/composition
  audit, ADRs, exception baseline, architecture tests, final roadmap.
- Out: entity moves, runtime behavior, API changes, schema changes.
- Tests: source-to-registry parity, duplicate baseline, expired exceptions,
  new central entities/import edges, application TypeORM imports.
- Migration: none.
- Rollback: documentation/test-only revert.
- Gate: 100% mapping coverage and all known violations assigned to phase.
- Risk: low. Dependency: Storage Phase 9 merged.

## Phase 1: Composition And Schema Baseline

- Branch: `fix/persistence-phase-1-typeorm-composition`
- Scope: canonical registry module, one root/CLI/test metadata source, correct
  TypeORM CLI DataSource, safe booleans, production sync guard, remove seed
  synchronize, PostgreSQL schema snapshot and migration-ledger strategy.
- Verified input: the local live database has 33 tables and no ledger; all 11
  migrations load through a guarded DataSource, but a clean database fails at
  migration one because `provinces` is absent. The production glob also loads a
  migration spec file. See
  `phases/phase-00/evidence/postgresql-schema-verification.md`.
- Key correction: implement a reviewed v2 baseline lineage for new databases
  and fingerprint-gated ledger onboarding/reconciliation for existing
  environments. Do not append a baseline after the failing legacy chain and do
  not edit historical migrations.
- Tests: config matrix, clean DB migration, no pending migration on second run,
  schema log diff, guarded existing-schema onboarding, OpenAPI baseline,
  query-count baseline.
- Migration: hybrid strategy: new canonical baseline for fresh databases plus
  reviewed schema reconciliation and controlled baseline registration for
  approved existing environments.
- Rollback: keep previous DataSource available for one release; additive schema
  only.
- Gate: runtime/CLI/test metadata equal; test files excluded from metadata
  globs; clean DB can be built; second run is empty; approved local snapshot
  onboarding is deterministic; canonical parity diff is zero.
- Risk: critical. Dependency: Phase 0.

Implementation contract:

- ADR 0004 makes canonical PostgreSQL catalog parity authoritative.
- TypeORM raw zero-diff is temporarily replaced by zero unreviewed diff; every
  reviewed operation must match the exact compatibility manifest.
- Compatibility entries are owned and must be retired in Phase 4 or Phase 5.
- The v2 baseline contains exactly the 26 reviewed Group A/B tables. Group C/D
  remain preserved extras during existing-environment verification.
- `agrilink_db` is a read-only reconciliation fixture and is never an
  onboarding apply target.
- Clean-v2 runtime, query-count and OpenAPI baselines are versioned under
  `docs/architecture/persistence/baselines`.

## Phase 2: Low-Risk Consolidation Pattern

- Branch: `refactor/persistence-phase-2-low-risk-entities`
- Scope: Ads, Geography, Notifications, SystemConfig/Audit ownership,
  MarketPrices only if Phase 1 schema proves safe.
- Geography preserves canonical baseline fields and fields with active runtime
  or deployed-schema evidence. Legacy-only fields must not be restored merely
  because they occur in a duplicate entity.
- Tests: per-table repository, API, schema parity and query-count regression.
- Migration: only for proven physical schema differences.
- Rollback: compatibility re-export and registry switch per table.
- Gate: no scoped duplicate mapping or new legacy import.
- Risk: medium-high. Dependency: Phase 1.
- Result: Geography, Notifications, Ads, System Config, and Audit Logs have one
  canonical owner mapping. Market Prices remains deferred outside baseline v2.

## Phase 3: Users And Auth

- Branch: `refactor/persistence-phase-3-users-auth`
- Scope: Users owns users/addresses/account lifecycle; Auth owns
  tokens/OTP/revocation. Remove exported TypeOrmModule.
- Tests: deactivate/anonymize, revoke-all, expiration, concurrency and retention.
- Migration: scalar FK/delete-policy changes only when live schema requires it.
- Rollback: ports coexist with legacy service for one phase.
- Gate: no outside writable User/Auth repository access.
- Risk: critical. Dependency: Phase 2.
- Result: Users owns the canonical `users` mapping and typed account ports;
  Auth owns canonical refresh-token and OTP mappings, atomic rotation/consume,
  revoke-all, and retention. `UsersModule` no longer exports TypeORM. Admin
  uses Users/Auth ports and Reviews no longer registers User. User Addresses
  and phone-first registration are evidence-based deferred decisions. No
  physical migration is required.

## Phase 4: Profiles And Admin Read Model

- Branch: `refactor/persistence-phase-4-profiles-admin`
- Scope: move the central runtime profile schema into Profiles; retire the four
  incompatible local mappings; replace Admin writes/queries with verification
  capability and read-only projections.
- Tests: Storage compensation, KYC access, stale reviewer conflict, conditional
  transition, query count.
- Migration: merge only live-proven fields; no migration for class relocation.
- Rollback: compatibility import plus old query adapter.
- Gate: Admin registers no User/Profile writable entity.
- Risk: critical. Dependency: Phase 3.

## Phase 5: Products, Wishlist, Certifications And Reviews

- Branch: `refactor/persistence-phase-5-products-reviews`
- Scope: resolve product schema duplicates, `product_wishlist` vs `wishlists`,
  Category ownership, scalar Review IDs, eligibility/query ports.
- Tests: product/review API, certification lifecycle, N+1, concurrent wishlist,
  unique review constraints.
- Migration: explicit rename/data-copy only after production row inventory.
- Rollback: dual-read only when documented; no dual-write without reconciliation.
- Gate: Reviews imports no Product/User persistence.
- Risk: critical. Dependency: Phase 4.

## Phase 6: Commerce And Transaction Boundaries

- Branch: `refactor/persistence-phase-6-commerce`
- Scope: Orders, items/history, Payments, Contracts, PurchaseRequests,
  transaction coordinator, saga/outbox and operation keys.
- Tests: atomic failure paths, callback/order/contract idempotency, outbox
  deduplication, compensation and concurrent commands.
- Migration: new owner tables/constraints and idempotency keys as required.
- Rollback: cohort/feature flag plus outbox drain and reconciliation.
- Gate: same operation key cannot duplicate state; no TypeORM boundary leakage.
- Risk: critical. Dependency: Phase 5.

## Phase 7A: Operations

- Branch: `refactor/persistence-phase-7a-operations`
- Scope: Logistics, Messaging, Notifications boundaries and retention.
- Tests: state transitions, WebSocket contracts, retries, idempotency,
  concurrency and message query count.
- Migration: owner/FK/index changes only.
- Rollback: adapter compatibility and queue drain.
- Gate: no cross-owner repository access.
- Risk: high. Dependency: Phase 6.

## Phase 7B: Compliance And Traceability

- Branch: `refactor/persistence-phase-7b-compliance`
- Scope: Incidents, Disputes, Quality Certificates, Audit evidence and
  Traceability schema conflict.
- Tests: immutable evidence, permissions, revocation and retention.
- Migration: likely required for traceability; use additive/copy/verify/finalize.
- Rollback: preserve evidence and old columns until verification.
- Gate: no cascade deletes violating retention.
- Risk: critical. Dependency: Phase 7A.

## Phase 8: Module-Owned Seeders

- Branch: `refactor/persistence-phase-8-seed-ownership`
- Scope: reference/dev/test seed split, module seed contracts, dependency DAG,
  idempotency, central orchestrator only.
- Tests: clean seed and repeated seed; cycle detection.
- Migration: none.
- Rollback: retain old orchestrator command temporarily.
- Gate: no seed uses synchronize or production seed for integration tests.
- Risk: medium. Dependency: Phase 7B.

## Phase 9: Final Retirement

- Branch: `chore/persistence-phase-9-retire-central-entities`
- Scope: remove compatibility re-exports and `src/database/entities`; close all
  exceptions; final schema/API/query-count parity.
- Tests: full migration chain, second run no pending, supported revert then up,
  direct repeated-up tests for explicitly idempotent SQL, full CI.
- Migration: no class-move migration; only unresolved physical changes.
- Rollback: revert code while retaining additive schema and metadata.
- Gate: one writable mapping per schema.table, no forbidden edge, no expired
  exception, parity zero.
- Risk: high. Dependency: Phase 8.
