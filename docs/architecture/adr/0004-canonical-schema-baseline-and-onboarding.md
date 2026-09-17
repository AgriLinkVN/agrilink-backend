# ADR 0004: Canonical Schema Baseline And Existing-Environment Onboarding

- Status: Accepted
- Date: 2026-07-24
- Owners: Backend architecture and database operations
- Scope: Persistence Phase 1

## Context

The legacy TypeORM migration chain cannot bootstrap an empty PostgreSQL
database. The first migration expects `provinces` to exist, production
migration globs can load a Jest spec, and the inspected local database has no
migration ledger. Runtime metadata also intentionally omits database-only
constraints and compatibility columns needed by current queries.

Treating TypeORM's raw schema log as the sole source of truth would require
dropping valid database constraints or changing business entities during a
composition phase. Neither is acceptable.

## Decision

AgriLink uses a separate migration lineage named `v2`, recorded in
`public.migrations_v2`.

The first v2 migration creates exactly the 26 reviewed Group A/B tables.
Group C/D tables are excluded and are never automatic drop candidates in an
existing environment. The 11 historical migrations remain unchanged and are
available only through the explicitly named legacy DataSource.

Schema parity has two mandatory layers:

1. Canonical PostgreSQL catalog parity is authoritative. It compares schemas,
   extensions, enums, tables, columns, types, nullability, defaults,
   constraints, foreign-key actions, indexes/predicates, sequences and
   triggers. The required diff is zero.
2. TypeORM metadata compatibility parity retains the raw schema log. Every
   proposed operation must map one-to-one to an unexpired exact object in
   `typeorm-compatibility-manifest.json`. Unexpected, stale, ambiguous or
   definition-mismatched entries fail the gate.

Raw TypeORM zero-diff is temporarily replaced by zero unreviewed diff. The
accepted manifest contains 28 objects: the original 25 database constraints
and indexes plus three query-compatibility columns required by Product detail.
Owners must retire these entries in Phase 4 or Phase 5.

Runtime, CLI and test metadata are composed from one explicit registry. Entity
registry membership does not imply baseline table inclusion.

Existing-environment verification is read-only. Baseline registration requires
an exact reviewed fingerprint, a deterministic plan digest, environment and
lineage approval, backup/restore confirmation, an advisory lock, a second
fingerprint check and one database transaction. `agrilink_db` is permanently
protected from apply mode.

## Consequences

- Fresh databases can be built, reverted and rebuilt deterministically.
- Database-only integrity objects remain enforced without premature entity
  refactoring.
- Existing environments with drift are classified as
  `reconciliation-required`; no ledger row is inserted automatically.
- Known Group C/D objects are reported as preserved extras. Unknown objects,
  data blockers and Storage orphans stop onboarding.
- The compatibility manifest is temporary debt, not permission to ignore new
  TypeORM schema operations.

## Rollback

The legacy DataSource remains available for one release. The v2 migration is
self-contained and reversible on disposable databases. Existing-environment
onboarding only creates the v2 ledger and registers the exact baseline after
all guards pass; it does not alter business tables.
