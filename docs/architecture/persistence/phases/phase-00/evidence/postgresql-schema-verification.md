# PostgreSQL Schema And Migration Verification

## Execution Boundary

- Executed: `2026-07-24T06:55:59-05:00`
- Source commit: `892677712c3e3dd4c3de50e6beff0851aca37756`
- PostgreSQL: `16.14` (`postgres:16-alpine`)
- Original database: `agrilink_db`
- Disposable database: `agrilink_migration_test`
- Runtime applications: not started
- `DB_SYNCHRONIZE`: forced to `false`

No migration, DDL, seed, or application command was run against
`agrilink_db`. A normalized schema dump was captured before verification and
is compared again after all checks. The local evidence dump
`postgres-schema-before-phase1.sql` is not tracked by Git.

## Verification Commands

The following command classes were executed. Environment overrides were
process-local and contained no committed credential:

```powershell
docker compose exec postgres pg_isready -U agrilink -d agrilink_db
docker compose exec -T postgres pg_dump -U agrilink -d agrilink_db `
  --schema-only --no-owner --no-privileges
docker compose exec -T postgres createdb -U agrilink agrilink_migration_test
docker compose exec -T postgres psql -U agrilink `
  -d agrilink_migration_test -c "SELECT current_database(), current_user"

$env:DB_NAME = "agrilink_migration_test"
$env:DB_SYNCHRONIZE = "false"
npx typeorm-ts-node-commonjs migration:show `
  --dataSource .\src\database\data-source.ts
npx typeorm-ts-node-commonjs migration:show `
  --dataSource .\src\scripts\persistence-migration-verification-data-source.ts
npx typeorm-ts-node-commonjs migration:run `
  --dataSource .\src\scripts\persistence-migration-verification-data-source.ts
```

Read-only `information_schema`, `pg_catalog`, constraint, index, enum, trigger,
and ledger queries were run against both database targets. The original schema
was dumped and normalized again after migration testing.

## CLI Diagnosis

`src/database/data-source.ts` exports a valid default `DataSource`, reads
`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, and `DB_NAME`, and defaults the
migration table to `public.migrations`.

Two independent CLI defects were reproduced:

1. With npm 11, this repository's wrapper requires a second `--` before
   DataSource flags. Without it, npm transforms:

   ```text
   npm run typeorm -- migration:show --dataSource <path>
   ```

   into:

   ```text
   typeorm-ts-node-commonjs migration:show <path>
   ```

   and TypeORM reports `Missing required argument: dataSource`.
2. Direct CLI invocation reaches the DataSource, but the migration glob
   `src/database/migrations/*.ts` also loads
   `1783731600000-EstablishCooperativePersistenceBoundaries.spec.ts`.
   Initialization then fails with `ReferenceError: describe is not defined`.

The correct direct CLI syntax is:

```powershell
npx typeorm-ts-node-commonjs migration:show --dataSource <data-source-path>
```

The equivalent npm syntax is:

```powershell
npm run typeorm -- migration:show -- --dataSource <data-source-path>
```

Both remain blocked with the production DataSource until its migration glob
excludes test files. For this evidence run,
`src/scripts/persistence-migration-verification-data-source.ts` provides a
guarded, non-runtime DataSource with the exact 11 production migration classes.
It rejects any database other than `agrilink_migration_test` and rejects
`synchronize !== false`.

The verified DataSource loaded:

| Property | Value |
| --- | --- |
| Host/port | `localhost:5432` |
| Database/schema | `agrilink_migration_test` / `public` |
| Migration table | `migrations` |
| Migrations | 11 |
| Entity metadata | 37 central entities |
| Entity source | `src/database/entities/**/*.entity.ts` |
| Production migration source | `src/database/migrations/*.ts` (unsafe glob) |

## Migration Inventory

All migrations were loaded by the guarded CLI and remained pending after the
failed transaction.

| Migration | File | Before | After | Result |
| --- | --- | --- | --- | --- |
| `AddProvinceMapFields1748665200000` | `1748665200000-AddProvinceMapFields.ts` | `[ ]` | `[ ]` | failed: prerequisite table absent |
| `AddFirebaseUidToUsers1782860400000` | `1782860400000-AddFirebaseUidToUsers.ts` | `[ ]` | `[ ]` | not reached |
| `AddProductStatusChangedNotificationType1783123200000` | `1783123200000-AddProductStatusChangedNotificationType.ts` | `[ ]` | `[ ]` | not reached |
| `AddProductCertificationVerifyFlow1783209600000` | `1783209600000-AddProductCertificationVerifyFlow.ts` | `[ ]` | `[ ]` | not reached |
| `AddP5NotificationTypes1783296000000` | `1783296000000-AddP5NotificationTypes.ts` | `[ ]` | `[ ]` | not reached |
| `AddReviewModerationAndConstraints1783382400000` | `1783382400000-AddReviewModerationAndConstraints.ts` | `[ ]` | `[ ]` | not reached |
| `CreateStoredFiles1783472400000` | `1783472400000-CreateStoredFiles.ts` | `[ ]` | `[ ]` | not reached |
| `AddStoredFileContentValidation1783558800000` | `1783558800000-AddStoredFileContentValidation.ts` | `[ ]` | `[ ]` | not reached |
| `AddStoredFileDeletionRetry1783645200000` | `1783645200000-AddStoredFileDeletionRetry.ts` | `[ ]` | `[ ]` | not reached |
| `EstablishCooperativePersistenceBoundaries1783731600000` | `1783731600000-EstablishCooperativePersistenceBoundaries.ts` | `[ ]` | `[ ]` | not reached |
| `AddStoredFileIdToPrivateDocuments1783818000000` | `1783818000000-AddStoredFileIdToPrivateDocuments.ts` | `[ ]` | `[ ]` | not reached |

## Disposable Migration Result

The disposable database was verified empty before execution. TypeORM created
the `uuid-ossp` extension and an empty `public.migrations` ledger, then started
a transaction.

The first migration failed:

```text
Migration "AddProvinceMapFields1748665200000" failed,
error: Table "provinces" does not exist.
TypeORMError: Table "provinces" does not exist.
```

The failure occurs in TypeORM's table preflight before issuing the `ALTER
TABLE`, so PostgreSQL emitted no SQLSTATE. The missing dependency is
`public.provinces`. TypeORM rolled back the transaction. After failure:

- ledger rows: `0`
- business tables: `0`
- physical tables: only `public.migrations`
- all 11 migrations: still pending

The full chain did not complete, so second-run idempotency, schema dump parity,
and migration revert/up checks are not applicable. No historical migration was
modified and no dependency was fabricated.

## Source, Live, And Migration Table Diff

The ownership registry contains 48 physical table keys. The local live
database contains 33 public base tables. Their intersection is 32.

Source registry tables absent from the local live database:

```text
contracts
conversations
cooperative_province_references
disputes
logistics_profiles
messages
order_items
order_status_history
orders
payments
product_wishlist
purchase_requests
quality_certificates
shipment_tracking_events
shipments
user_addresses
```

Local live tables absent from the source registry:

```text
product_wishlists
```

The migration-built database contains no business table. Consequently, all 48
registry tables are absent from the migration-built schema.

| `schema.table` | Source | Local live | Migration-built | Status / important difference |
| --- | --- | --- | --- | --- |
| `public.users` | yes | yes | no | live `email` is nullable; current entity requires it |
| `public.products` | yes | yes | no | live shape matches module names and `(12,2)` quantities; no migration bootstrap |
| `public.product_categories` | yes | yes | no | module shape, self-FK, timestamps and unique slug are live |
| `public.product_images` | yes | yes | no | live uses `image_url`, module shape, product FK cascade |
| `public.product_certifications` | yes | yes | no | live uses `expiry_date`; `stored_file_id`, FK and index are absent |
| `public.farmer_profiles` | yes | yes | no | central KYC shape; both Storage file-ID columns are absent |
| `public.cooperative_profiles` | yes | yes | no | central verification shape; all five Storage file-ID columns are absent |
| `public.enterprise_profiles` | yes | yes | no | central shape; `business_license_file_id` is absent |
| `public.supplier_profiles` | yes | yes | no | central shape; `business_license_file_id` and a user FK are absent |
| `public.notifications` | yes | yes | no | module shape; body is non-null and enum has all current labels |
| `public.market_prices` | yes | yes | no | module one-price shape with `numeric(12,2)` |
| `public.reviews` | yes | yes | no | columns/FKs exist; partial unique reviewer/product index is absent |
| `public.traceability_records` | yes | yes | no | module trace model is live; no bootstrap migration |
| `public.stored_files` | yes | yes | no | live columns and indexes match Storage entity/migrations |
| `public.product_wishlist` | yes | no | no | source-only singular table |
| `public.product_wishlists` | no | yes | no | live legacy plural table with varchar IDs and no FK/unique pair |
| `public.wishlists` | yes | yes | no | UUID IDs, unique user/product pair, product cascade FK; user FK absent |

No user-defined trigger was found on the inspected high-risk tables. UUID
defaults use `uuid_generate_v4()`; no owned integer sequence was required for
their primary keys. The local schema includes 15 foreign keys in total.

The local evidence file and a new normalized dump were identical:

```text
SHA-256 CC9C1EC2CEC9D1AD77402B061A2F71FBFA82389CF3C515364EC367A66028F9BA
diff lines: 0
```

This fingerprint identifies only this local Docker snapshot. It is not a
production schema fingerprint.

## Provenance Assessment

Observed:

- The local live database has no `migrations`, `typeorm_metadata`, or similarly
  named ledger table.
- Its 33-table schema cannot be produced by the current migration chain.
- Several current entity shapes are present, while expected migration effects
  are mixed: Storage content columns exist, but Storage private file-ID columns
  and the Reviews unique index do not.
- Sparse column ordinals on several tables show that columns were added and/or
  removed over time.

Supported inference:

- The database is partially evolved outside the current migration ledger.
- `synchronize`, a schema import, legacy seed behavior, and manual changes are
  all plausible contributors.
- The current evidence is most consistent with a mixed/unknown provenance, not
  a migration-built database.

Unverified:

- Which mechanism originally created the database.
- Whether `synchronize` was enabled when each change occurred.
- Any deployed or production environment's schema, ledger, or row inventory.

## Phase 1 Strategy

Use a **hybrid baseline and controlled onboarding** strategy.

For new databases:

1. Define the reviewed canonical schema from the ownership registry and live
   evidence.
2. Create a new baseline as the first migration in a v2 migration lineage.
3. Exclude legacy migrations from the v2 DataSource without editing them.
4. Prove clean build, second run with no pending migrations, supported
   revert/up, and zero canonical schema diff in CI.

For existing environments:

1. Capture schema-only dump, catalog inventory, row counts, migration ledger,
   and normalized fingerprint.
2. Fail onboarding unless the environment matches an approved fingerprint and
   all required invariants.
3. Reconcile missing/additional columns, constraints, indexes, and data through
   reviewed additive migrations.
4. Record the v2 baseline only through an approved onboarding command after
   verification. Never insert ledger rows blindly.

A baseline appended after the current 11 migrations is not sufficient: the
first historical migration fails before a newer baseline could run. Recreating
an unknown pre-2015 schema solely to satisfy old deltas is also unsafe.

Rollback keeps the legacy DataSource available for one release, makes schema
changes additive, and does not remove old columns until parity and data
reconciliation pass. The main risks are onboarding the wrong environment,
canonizing local-only drift, and losing legacy data during wishlist/profile
reconciliation.

## Phase 1 Entry Gate

Phase 1 may start, but entity consolidation remains blocked. Phase 1 must
deliver:

- one runtime/CLI/test entity registry;
- a production-safe boolean parser and hard sync guard;
- migration and entity globs that exclude tests;
- a v2 baseline/onboarding ADR and executable verifier;
- reviewed canonical decisions for all 16 source-only tables and
  `product_wishlists`;
- Storage file-ID and Reviews index reconciliation;
- clean-database and approved-existing-database parity tests.

## Quality Gates

| Command | Result |
| --- | --- |
| `npm run persistence:audit` | PASS, 66 mappings / 48 tables / 0 violations |
| focused architecture Jest | PASS, 2 tests |
| `npm run lint` | PASS, 0 errors / 55 pre-existing warnings |
| `npm run build` | PASS |
| `npm test -- --runInBand` | PASS, 117 tests / 1 opt-in skipped |
| `npm run test:e2e -- --runInBand` | PASS, 90 tests |
| guarded production-target rejection | PASS |
| original schema before/after comparison | PASS, 0 diff lines |
| `git diff --check` | PASS |
