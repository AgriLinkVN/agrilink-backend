# Final Scope for Persistence Phase 1

This document is an implementation specification, not an implementation.
Phase 1 remains critical-risk and must start only from merged `develop` on
branch `fix/persistence-phase-1-typeorm-composition`.

## Goal

Create one deterministic TypeORM metadata source and a reviewed PostgreSQL
lineage v2 that can:

1. bootstrap a fresh database containing only proven runtime capabilities;
2. verify and safely onboard approved existing databases;
3. preserve current APIs, entity ownership, queries, transactions and Storage
   compensation behavior;
4. reject ambiguous or destructive reconciliation.

## Allowed implementation files

The Phase 1 agent may add or modify only composition, configuration, migration
lineage, verification tooling, focused tests and documentation, expected under:

```text
src/config/database.config.ts
src/database/data-source.ts
src/database/entity-registry.ts
src/database/data-source-options.ts
src/database/migrations-v2/**
src/database/reconciliation/**
src/scripts/persistence-*.ts
test/persistence/**
package.json
.env.example
.github/workflows/backend-quality.yml
docs/architecture/persistence/**
```

Exact helper names may follow repository conventions, but there must be one
canonical registry API. Do not move or edit business entities merely to fit
these suggested paths.

## Explicitly out of scope

- Moving, deleting, consolidating or changing TypeORM business entities.
- Changing module imports, repository ownership or cross-module access.
- Changing API routes, DTOs, response models, guards or roles.
- Fixing Auth OTP semantics, token rotation, raw Product seller queries,
  Review eligibility, notification outbox behavior, or cooperative use cases.
- Creating Group C/D tables in baseline v2.
- Renaming or copying wishlist data.
- Running migration/reconciliation against a shared or production database.
- Editing any of the 11 historical migration files.
- Enabling `synchronize`.

## Canonical metadata composition

**Proposed implementation:**

1. Create an explicit `entity-registry.ts` exporting the exact reviewed entity
   classes needed by runtime and CLI. The registry is a composition root, not a
   business owner.
2. Build runtime Nest options, CLI `DataSource`, migration tests and parity
   checks from the same registry.
3. Remove broad entity and migration globs; test/spec files must be impossible
   to load as production metadata.
4. Make schema, logging, synchronize and seed booleans use strict parsing.
5. Fail startup in production when synchronization or development seed flags
   are enabled.
6. Point TypeORM package scripts to the actual `DataSource`.
7. Retain the previous CLI DataSource behind an explicitly named legacy
   verification path for one release; it must not be the default migration
   command.

The registry may include runtime mappings for Group C capabilities so current
Nest module startup metadata remains unchanged. Baseline inclusion is a
separate decision: registry membership must never automatically create a table.

## Baseline v2 contents

### Group A: confirmed, 18 tables

```text
ad_campaigns
ad_events
ad_packages
audit_logs
districts
forum_comments
forum_likes
forum_posts
incident_reports
notifications
otp_verifications
product_categories
product_images
provinces
refresh_tokens
stored_files
system_configs
wishlists
```

### Group B: include with compatibility, 8 tables

```text
users
farmer_profiles
cooperative_profiles
enterprise_profiles
supplier_profiles
products
product_certifications
reviews
```

The baseline must use the runtime mapping candidate recorded in
`../../../discovery/baseline-inclusion-matrix.json`, then apply reviewed compatibility constraints:

- Profile legacy URL columns and Storage file-ID columns coexist.
- Product certifications retain `document_url` and `stored_file_id`.
- Existing user email nullability is reconciled before adding a stricter
  requirement to an existing environment.
- Reviews require reviewer/product uniqueness for active rows, but existing
  duplicates must be detected before constraint creation.
- Product seller-detail query dependencies must be proven against a clean-v2
  database.

### Excluded from baseline v2

Group C:

```text
bulk_listing_contributions
bulk_listings
contracts
conversations
cooperative_members
cooperative_province_references
disputes
harvest_schedules
logistics_profiles
market_prices
messages
order_items
order_status_history
orders
payments
purchase_requests
quality_certificates
shipment_tracking_events
shipments
traceability_records
user_addresses
```

Group D:

```text
product_wishlist
product_wishlists
```

Exclusion means “do not create in v2 Phase 1,” not “drop from an existing
database.” The existing-environment verifier reports them and leaves them
untouched.

## Migration lineage v2

**Proposed structure:**

1. A new lineage identifier and migration table name distinguish v2 from the
   unusable legacy chain.
2. The first v2 migration creates required extensions/types and all 26 baseline
   tables in dependency order.
3. Follow-up migrations are allowed only when they make compatibility and
   reconciliation review clearer; the clean result must be deterministic.
4. Historical migrations remain byte-for-byte unchanged and are never prepended
   to or silently marked complete.
5. A clean database runs v2 once; a second run reports no pending migration.
6. Supported down/up behavior is tested in a disposable DB. Irreversible
   reconciliation must be explicitly marked and never disguised as reversible.

## Existing-environment verifier

The verifier is read-only by default and must report:

- server/database/schema identity without credentials;
- PostgreSQL version and required extensions;
- migration ledgers and lineage markers;
- tables, columns, types, nullability, defaults, enums/sequences;
- primary, unique, check and foreign-key constraints;
- indexes, including predicates;
- row counts and duplicate/null blockers for Group B;
- Storage legacy URL/file-ID occupancy and orphan references;
- wishlist table existence, row counts, duplicate user/product pairs and FKs;
- Group C/D/E objects as preserved extras, never automatic drop candidates;
- a canonical fingerprint and exact mismatch list.

An apply/onboard command must require:

1. an exact approved fingerprint;
2. an explicit environment/lineage acknowledgement;
3. a generated plan reviewed before execution;
4. a transaction for database-only steps;
5. advisory locking and idempotent preconditions;
6. backup/restore confirmation outside the tool;
7. refusal on unknown objects, destructive changes or changed fingerprint.

Phase 1 may add columns/indexes/FKs needed by included Group B tables after
preflight. It must not copy/rename wishlist data, invent missing future tables,
drop legacy columns, or convert external Storage URLs.

## Required API and query baselines

Run contract/smoke baselines against a clean-v2 disposable database for:

- Auth register/login/refresh/OTP/Firebase adapter boundary.
- User get/update.
- Profile upsert/public read/admin verification with fake Storage.
- Product category/create/list/detail/status/certification.
- Wishlist add/check/list/remove and concurrent duplicate add.
- Review create/list/moderate/reply and duplicate race.
- Notification list/read and WebSocket contract.
- Ads, forum, admin config/incident, geography and Storage smoke flows.

Market Prices and Traceability tests must assert their current partial/TODO
status without requiring baseline tables. Cooperative repository tests stay
valid, but do not become proof that the capability belongs in v2.

Capture query-count baselines for Product list/detail, profile/admin queues,
reviews and notification listing. Phase 1 is not allowed to optimize them; it
only detects accidental metadata/query regressions.

## Required quality gates

```powershell
npm run persistence:audit
npx jest src/scripts/persistence-architecture-audit.spec.ts --runInBand
npm run lint
npm run build
npm test -- --runInBand
npm run test:e2e -- --runInBand
npm run test:storage -- --runInBand
npm run test:storage:e2e -- --runInBand
npm run test:storage:migration -- --runInBand
git diff --check
```

Add focused gates for:

- runtime/CLI/test registry parity;
- no spec file in production metadata;
- strict config matrix and production fail-closed behavior;
- clean-v2 up, second-run empty, supported down/up;
- schema parity against the 26-table matrix;
- verifier refusal and approved-fingerprint onboarding;
- Group C/D exclusion;
- OpenAPI/REST and query-count snapshots.

External-service tests must use fakes unless a contract suite is explicitly
enabled.

## Stop conditions

Stop and report blocked if:

- staging/production fingerprint differs from every reviewed fixture;
- existing rows violate a proposed Group B constraint;
- any profile file ID points to missing `stored_files`;
- wishlist row lineage is needed to proceed;
- clean-v2 API smoke requires a Group C/D table;
- runtime, CLI and test metadata cannot be equal without moving an entity or
  changing a module boundary.

## Changes to the previous Phase 1 prompt

### Keep

- One canonical registry for runtime/CLI/test metadata.
- Correct CLI DataSource, strict booleans and production sync guard.
- Hybrid clean-v2 plus existing-environment onboarding.
- No historical migration edits and additive rollback posture.
- Schema/OpenAPI/query-count regression gates.

### Remove

- Any instruction to baseline all 48 source table keys.
- Any implication that an entity, controller or `forFeature` registration proves
  an implemented capability.
- Any instruction to append a baseline after the legacy migration chain.
- Any automatic ledger insertion, table drop, wishlist rename or destructive
  reconciliation.

### Modify

- Define baseline as exactly Group A plus Group B from the Decision Pack.
- Treat local PostgreSQL as a fixture, not production truth.
- Separate metadata registry membership from baseline table inclusion.
- Keep current cross-module repository access unchanged until owner phases.
- Require dual Storage URL/file-ID compatibility for active owner tables.

### Add

- Source-only table and wishlist decision gates.
- Row-level Group B preflight and fingerprint approval.
- Explicit Group C/D exclusion assertions.
- FPT Vision mock, OTP workflow and verified-purchase limitations as preserved
  behavior, not Phase 1 fixes.
- Clean-v2 critical API smoke and query-count snapshots.
- Stop conditions for unknown deployed schema or unsafe reconciliation.

## Readiness

The repository evidence is sufficient to author the final Phase 1
implementation prompt. Execution remains **blocked for existing deployed
databases** until their read-only fingerprints and Group B row blockers are
collected. Clean-v2 implementation can be developed and tested in disposable
PostgreSQL without that deployed access, but no onboarding/apply step may be
approved.
