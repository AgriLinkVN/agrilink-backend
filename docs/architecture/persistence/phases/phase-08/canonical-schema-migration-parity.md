# P8-09A Canonical Schema Migration Parity Correction

## Scope and preserved runtime failure

P8-09 applied the complete five-migration V2 chain to an empty disposable
PostgreSQL database. With no pending migrations and without `synchronize`, the
first four canonical groups completed before `cooperatives.dev.members` failed
with PostgreSQL `42P01`: `public.cooperative_members` did not exist.

```text
P8_09_IMPLEMENTATION_STATUS=BLOCKED
P8_09_RUNTIME_STATUS=FAIL_BLOCKED_BY_SCHEMA_PARITY
P8_09_BLOCKERS=V2_MIGRATION_CHAIN_DOES_NOT_CREATE_PUBLIC_COOPERATIVE_MEMBERS
P8_09_RUNTIME_FAILURE_SQLSTATE=42P01
P8_09_RUNTIME_FAILURE_GROUP=cooperatives.dev.members
P8_10_IMPLEMENTATION_AUTHORIZED=NO_P8_09_RUNTIME_PROOF_BLOCKED
```

This correction does not execute canonical seeds and does not change any seed
payload or reconciliation behavior.

## Migration authority

Before P8-09A the current V2 chain contained five migrations:

1. `CreateCanonicalBaselineV21800000000000`
2. `CreateCommerceBoundariesV21800000001000`
3. `CreateTraceabilityEventModelV21800000002000`
4. `ExpandAdPackageReferenceIdentity1800000003000`
5. `BackfillAndContractAdPackageReferenceIdentity1800000004000`

None created `cooperative_members`. P8-09A adds one forward migration:
`RestoreCanonicalCooperativeMemberSchema1800000005000`.

```text
MIGRATION_COUNT_BEFORE=5
MIGRATION_COUNT_AFTER=6
LATEST_MIGRATION=RestoreCanonicalCooperativeMemberSchema1800000005000
HISTORICAL_MIGRATION_FILES_MODIFIED=0
NEW_FORWARD_MIGRATION_COUNT=1
```

## Canonical seeded-table inventory

The table names below are re-derived from the eleven current SeedGroups and
their owner writers. The Review entity maps to `reviews`; the older
`product_reviews` documentation label was stale.

| Table                    | SeedGroup                                        | Owner        | Classification | Entity mapping | Migration-head authority before P8-09A        | Expected at head |
| ------------------------ | ------------------------------------------------ | ------------ | -------------- | -------------- | --------------------------------------------- | ---------------- |
| `ad_packages`            | `ads.reference.packages`                         | ads          | REFERENCE      | yes            | baseline plus A1/A2 alterations               | yes              |
| `provinces`              | `geography.reference.provinces`                  | geography    | REFERENCE      | yes            | baseline                                      | yes              |
| `product_categories`     | `products.reference.categories`                  | products     | REFERENCE      | yes            | baseline                                      | yes              |
| `users`                  | `users.dev.users`; `users.test.identities`       | users        | DEV; TEST      | yes            | baseline                                      | yes              |
| `cooperative_members`    | `cooperatives.dev.members`                       | cooperatives | DEV            | yes            | missing                                       | yes              |
| `products`               | `products.dev.products`; `products.test.catalog` | products     | DEV; TEST      | yes            | baseline                                      | yes              |
| `product_images`         | `products.dev.products`                          | products     | DEV            | yes            | baseline                                      | yes              |
| `product_certifications` | `products.dev.products`                          | products     | DEV            | yes            | baseline                                      | yes              |
| `farmer_profiles`        | `profiles.dev.role-profiles`                     | profiles     | DEV            | yes            | baseline                                      | yes              |
| `cooperative_profiles`   | `profiles.dev.role-profiles`                     | profiles     | DEV            | yes            | baseline                                      | yes              |
| `enterprise_profiles`    | `profiles.dev.role-profiles`                     | profiles     | DEV            | yes            | baseline                                      | yes              |
| `supplier_profiles`      | `profiles.dev.role-profiles`                     | profiles     | DEV            | yes            | baseline                                      | yes              |
| `reviews`                | `reviews.dev.product-feedback`                   | reviews      | DEV            | yes            | baseline plus reviewed unique/check additions | yes              |
| `system_configs`         | `admin.test.system-configs`                      | admin        | TEST           | yes            | baseline                                      | yes              |

```text
CANONICAL_SEEDED_TABLE_COUNT=14
MISSING_CANONICAL_TABLE_COUNT_BEFORE=1
MISSING_CANONICAL_TABLES_BEFORE=cooperative_members
```

## Column, constraint, and index audit

All thirteen previously present canonical tables match their current
migration-head column and constraint authority. The missing table accounts for
the complete mismatch inventory:

| Table                 | Mismatch type     | Expected                                                                                       | Actual before P8-09A | Source authority                               |
| --------------------- | ----------------- | ---------------------------------------------------------------------------------------------- | -------------------- | ---------------------------------------------- |
| `cooperative_members` | table             | table exists                                                                                   | absent               | canonical DAG and owner writer                 |
| `cooperative_members` | columns (8)       | `id`, `cooperative_id`, `farmer_id`, `status`, `role`, `joined_at`, `created_at`, `updated_at` | absent               | entity and legacy P3 migration                 |
| `cooperative_members` | primary key       | UUID `id`                                                                                      | absent               | entity and legacy P3 migration                 |
| `cooperative_members` | status check      | five domain status values                                                                      | absent               | domain union and legacy P3 migration           |
| `cooperative_members` | unique constraint | `cooperative_id`, `farmer_id`                                                                  | absent               | writer stable identity and legacy P3 migration |
| `cooperative_members` | foreign key       | cooperative User, `ON DELETE CASCADE`                                                          | absent               | legacy P3 migration policy                     |
| `cooperative_members` | foreign key       | farmer User, `ON DELETE RESTRICT`                                                              | absent               | legacy P3 migration policy                     |
| `cooperative_members` | secondary index   | `cooperative_id`, `status`                                                                     | absent               | legacy P3 migration query policy               |

```text
CANONICAL_SCHEMA_COLUMN_MISMATCH_COUNT_BEFORE=8
CANONICAL_SCHEMA_CONSTRAINT_MISMATCH_COUNT_BEFORE=5
CANONICAL_SCHEMA_INDEX_MISMATCH_COUNT_BEFORE=1
```

`product_images` and `product_certifications` retain the P8-08 owner-local
fail-closed reconciliation contract. Current entity and migration authority do
not declare an additional database unique constraint for those identities, so
P8-09A does not invent one.

## Cooperative Member authority and registry decision

The cooperatives owner supplies the entity, writer, SeedGroup, module provider,
domain status values, and historical P3 constraint/delete policy. The old
Group C registry reason said no production consumer existed. That reason became
stale when the merged Phase 8 startup DAG began executing
`cooperatives.dev.members`.

```text
COOPERATIVE_MEMBERS_DOMAIN_OWNER=cooperatives
COOPERATIVE_MEMBERS_ENTITY_EXISTS=YES
COOPERATIVE_MEMBERS_RUNTIME_REGISTRATION=YES
COOPERATIVE_MEMBERS_BASELINE_REGISTRATION=YES_BY_P8_09A_METADATA_CORRECTION
COOPERATIVE_MEMBERS_MIGRATION_EXISTS=YES_BY_NEW_FORWARD_MIGRATION
COOPERATIVE_MEMBERS_REGISTRY_DECISION=STALE_GROUP_C_CLASSIFICATION_CORRECTED_AS_SUPPORTED_METADATA
```

The correction creates only `cooperative_members`, its proven constraints, and
its proven lookup index. `down()` drops only that table.

## Disposable migration verification

A new guarded loopback PostgreSQL database was migrated from empty to all six
V2 migrations. Catalog inspection found all 14 canonical seeded tables and no
column or constraint mismatch. Reverting only the corrective migration removed
only `cooperative_members`; applying it again restored the exact migration-head
catalog and left zero pending migrations. Canonical seeds were not executed.

```text
MIGRATION_FROM_EMPTY_DB_PASS=YES
PENDING_MIGRATION_COUNT_AFTER_UP=0
MISSING_CANONICAL_TABLE_COUNT_AFTER_FIX=0
CANONICAL_SCHEMA_COLUMN_MISMATCH_COUNT_AFTER_FIX=0
CANONICAL_SCHEMA_CONSTRAINT_MISMATCH_COUNT_AFTER_FIX=0
CORRECTIVE_MIGRATION_UP_PASS=YES
CORRECTIVE_MIGRATION_DOWN_PASS=YES
CORRECTIVE_MIGRATION_REUP_PASS=YES
SCHEMA_SYNCHRONIZE_USED=NO
DISPOSABLE_DATABASES_CREATED=2
DISPOSABLE_DATABASES_DROPPED=2
P8_09A_CLEANUP_STATUS=PASS
```

## Current handoff

```text
P8_08_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_152
P8_08_READINESS_STATUS=READY_FOR_DISPOSABLE_DB_VERIFICATION_BY_MERGED_PR_152
P8_09_RUNTIME_STATUS=FAIL_BLOCKED_BY_SCHEMA_PARITY
P8_09A_IMPLEMENTATION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_09A_SCHEMA_PARITY_STATUS=CORRECTED_PENDING_HUMAN_REVIEW
P8_09A_BLOCKERS=NONE
IDEMPOTENCY_VERIFIED=NO
SECOND_SEED_RUN_NO_DUPLICATES=NOT_YET_VERIFIED
DISPOSABLE_DB_SEED_RUN_PASS=NO
P8_09_RERUN_AUTHORIZED=NO_WAITING_FOR_P8_09A_MERGE_AND_REVIEW
PHASE_08_COMPLETE=NO
```
