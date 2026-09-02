# P8-06 Test Fixture Ownership And Classification Audit

## Decision Status

```text
AUDIT_ID=P8_06_TEST_FIXTURE_OWNERSHIP_AND_CLASSIFICATION_AUDIT
P8_05C3C4_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_142
P8_05C3C_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_142
P8_05C4D_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_143
P8_05_CENTRAL_DEV_SEED_DECOMPOSITION_STATUS=IMPLEMENTED_BY_MERGED_PR_143
P8_06_TEST_FIXTURE_AUDIT_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_06_IMPLEMENTATION_STATUS=NOT_STARTED
P8_06_IMPLEMENTATION_AUTHORIZED=NO
P8_06_BLOCKERS=HUMAN_REVIEW_PENDING;TEST_CLASSIFICATION_CONTRACT_NOT_IMPLEMENTED;TEST_PRODUCTION_REACHABILITY_GUARD_GAPS;PRODUCT_TEST_SKU_IDENTITY_UNRESOLVED

CENTRAL_DEVSEEDSERVICE_RETIRED=YES
LEGACY_DEV_REMAINING_EXISTS=NO
CENTRAL_NORMAL_WRITE_METHOD_COUNT=0
CENTRAL_DESTRUCTIVE_RESET_METHOD_COUNT=0
CENTRAL_PERSISTENCE_CAPABLE_METHOD_COUNT=0

IDEMPOTENCY_VERIFIED=NOT_YET_VERIFIED
DISPOSABLE_DB_SEED_RUN_PASS=NOT_YET_VERIFIED
SECOND_SEED_RUN_NO_DUPLICATES=NOT_YET_VERIFIED
PHASE_08_COMPLETE=NO
```

## P8-06C Clean-v2 Owner Provider Split Implementation Overlay

PR #147 merged the two P8-06B shared TEST identity groups into `develop` at
`594d03feb04b146d6b4649e8f2e1f1ba4c7d815f` after human review and a
successful Backend Quality Gate. P8-06C re-read current TF-02 source rather
than adopting the broad #144 proposal. The exact machine-readable action
inventory is in `clean-v2-write-inventory.ts` and is verified without database
execution.

### Current Clean-v2 Persistence Action Inventory

`P` is prerequisite fixture, `W` is workflow action, and `C` is migration or
parity control.

| Write ID | Table/control | Owner | Mechanism | P | W | C | Stable identity | Current disposition |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `CV2-F01` | `users` | Users | raw SQL insert | YES | NO | NO | email | `KEEP_HARNESS_LOCAL_SYNTHETIC_FIXTURE` |
| `CV2-F02` | `farmer_profiles` | Profiles | raw SQL insert | YES | NO | NO | CCCD | `KEEP_HARNESS_LOCAL_SYNTHETIC_FIXTURE` |
| `CV2-F03` | `product_categories` | Products | raw SQL insert | YES | NO | NO | slug | `KEEP_HARNESS_LOCAL_SYNTHETIC_FIXTURE` |
| `CV2-F04` | `products` | Products | raw SQL insert | YES | NO | NO | NO SKU | `KEEP_HARNESS_LOCAL_SYNTHETIC_FIXTURE` |
| `CV2-F05` | `reviews` | Reviews | raw SQL insert | YES | NO | NO | reviewer + Product | `KEEP_HARNESS_LOCAL_SYNTHETIC_FIXTURE` |
| `CV2-F06` | `notifications` | Notifications | raw SQL insert | YES | NO | NO | NO | `KEEP_HARNESS_LOCAL_SYNTHETIC_FIXTURE` |
| `CV2-F07` | `provinces` | Geography | raw SQL insert | YES | NO | NO | code | `KEEP_HARNESS_LOCAL_SYNTHETIC_FIXTURE` |
| `CV2-F08` | `districts` | Geography | raw SQL insert | YES | NO | NO | NO schema-unique code | `KEEP_HARNESS_LOCAL_SYNTHETIC_FIXTURE` |
| `CV2-F09` | `stored_files` | Storage | raw SQL insert | YES | NO | NO | object key | `KEEP_HARNESS_LOCAL_SYNTHETIC_FIXTURE` |
| `CV2-F10` | `ad_packages` | Ads | raw SQL insert | YES | NO | NO | no declared package code | `KEEP_HARNESS_LOCAL_SYNTHETIC_FIXTURE` |
| `CV2-F11` | `ad_campaigns` | Ads | raw SQL insert | YES | NO | NO | NO | `KEEP_HARNESS_LOCAL_SYNTHETIC_FIXTURE` |
| `CV2-F12` | `forum_posts` | Forum | raw SQL insert | YES | NO | NO | NO | `KEEP_HARNESS_LOCAL_SYNTHETIC_FIXTURE` |
| `CV2-F13` | `system_configs` | Admin | owner TEST reconciliation | YES | NO | NO | unique key | `MOVE_TO_OWNER_LOCAL_TEST_PROVIDER` |
| `CV2-F14` | `audit_logs` | Admin | raw SQL insert | YES | NO | NO | NO | `KEEP_HARNESS_LOCAL_SYNTHETIC_FIXTURE` |
| `CV2-F15` | `incident_reports` | Compliance | raw SQL insert | YES | NO | NO | NO | `KEEP_HARNESS_LOCAL_SYNTHETIC_FIXTURE` |
| `CV2-W01` | `wishlists` | Products | repository `addIfAbsent` twice | NO | YES | NO | User + Product | `KEEP_HARNESS_LOCAL_WORKFLOW_ACTION` |
| `CV2-W02` | `products` | Products | repository `viewCount` increment | NO | YES | NO | NO SKU | `KEEP_HARNESS_LOCAL_WORKFLOW_ACTION` |
| `CV2-C01` | disposable database | Persistence harness | create database | NO | NO | YES | n/a | `KEEP_HARNESS_CONTROL` |
| `CV2-C02` | schema | Persistence harness | first migration up | NO | NO | YES | n/a | `KEEP_HARNESS_CONTROL` |
| `CV2-C03` | schema | Persistence harness | second-run no-op verification | NO | NO | YES | n/a | `KEEP_HARNESS_CONTROL` |
| `CV2-C04` | schema | Persistence harness | migration down cycle | NO | NO | YES | n/a | `KEEP_HARNESS_CONTROL` |
| `CV2-C05` | schema | Persistence harness | migration rerun | NO | NO | YES | n/a | `KEEP_HARNESS_CONTROL` |
| `CV2-C06` | baseline artifacts | Persistence harness | verify or explicitly write baselines | NO | NO | YES | n/a | `KEEP_HARNESS_CONTROL` |
| `CV2-C07` | `migrations_v2` | Persistence harness | drop lineage table | NO | NO | YES | n/a | `KEEP_HARNESS_CONTROL` |
| `CV2-C08` | schema lineage | Persistence harness | existing-schema onboarding | NO | NO | YES | n/a | `KEEP_HARNESS_CONTROL` |
| `CV2-C09` | disposable database | Persistence harness | drop database | NO | NO | YES | n/a | `KEEP_HARNESS_CONTROL` |

```text
CLEAN_V2_WRITE_COUNT=26
CLEAN_V2_PREREQUISITE_FIXTURE_COUNT=15
CLEAN_V2_WORKFLOW_ACTION_COUNT=2
CLEAN_V2_HARNESS_CONTROL_COUNT=9
```

### Eligibility And Owner Split

Only `system_configs` satisfies all six eligibility gates. Admin owns the
table; `key` is schema-unique; the declaration uses no test-only schema
identity or cross-owner persistence; it is not a migration compatibility row;
and it supports the Admin list baseline, smoke result, and the retained audit
row's entity reference. The provider reconciles by `key`, creates when absent,
updates only `value`, fails closed on ambiguous matches, and publishes the
persisted UUID. Its historical UUID remains create payload, not lookup
identity; the retained audit insert resolves the persisted reference by key.

```text
GROUP_ID=admin.test.system-configs
OWNER=ADMIN
CLASSIFICATION=TEST
STABLE_KEY=key
DEPENDENCIES=NONE
TABLES=system_configs
OUTPUTS=system-config.id.by-key
SOURCE_FIXTURES=TF-02_CV2-F13
```

The Phase One User is source-local to TF-02. Moving it would broaden P8-06B
identity authority, so it stays local without triggering a new identity
decision. Profiles, Reviews, Notifications, Storage, Ads Campaign, Forum,
Audit, and Incident rows consequently either retain local parents or lack an
approved stable key. The Category and Product remain explicitly local. The
Product detail view-count increment and Wishlist concurrency call remain the
Products-owned workflow assertions.

### Reference Duplicate Decisions

| Reference duplicate | Canonical exact match | Decision |
| --- | --- | --- |
| `phase-one-category` | NO | keep synthetic category and Product local |
| Province `P1` / District `D1` | NO; canonical Provinces contain no `P1`, and no canonical District declaration matches `D1` | keep compatibility-specific Geography rows local |
| `Phase One Package` | NO; it declares no canonical `packageCode` | keep the generated-ID Ads compatibility pair local |

No new TEST reference catalog or REFERENCE payload was created.

### Orchestration, Raw SQL, And Preservation

The existing P8-06A guard remains immediately before runtime capture. Inside
the existing fixture transaction, clean-v2 explicitly invokes a
`SeedOrchestrator` over only `admin.test.system-configs`. Normal application
startup and the normal DEV/REFERENCE CLI still import no TEST registry. There
are no cross-owner group dependencies in this slice.

The raw SQL prerequisite count falls from 15 to 14 solely because the direct
`system_configs` insert moved. Remaining writes are justified by: the local
Phase One identity dependency cluster; the explicitly retained Product and
Category; synthetic Geography and Ads compatibility shapes with no canonical
mapping; or rows without an approved non-generated reconciliation identity.

```text
P8_06_TEST_FIXTURE_AUDIT_STATUS=IMPLEMENTED_BY_MERGED_PR_144
P8_06A_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_145
P8_06B0_PRODUCT_TEST_IDENTITY_STATUS=IMPLEMENTED_BY_MERGED_PR_146
P8_06B_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_147
P8_06C_IMPLEMENTATION_AUTHORIZED=YES_AFTER_P8_06B_PR_147_MERGE

CLEAN_V2_PHASE_ONE_PRODUCT_PROVIDER_DECISION=KEEP_HARNESS_LOCAL_DUE_NO_CANONICAL_CATEGORY_MAPPING
CLEAN_V2_PHASE_ONE_CATEGORY_REMAINS_LOCAL=YES
CLEAN_V2_PHASE_ONE_PRODUCT_REMAINS_LOCAL=YES
CLEAN_V2_PHASE_ONE_PRODUCT_RUNTIME_PAYLOAD_CHANGES=0
CLEAN_V2_WISHLIST_WORKFLOW_REMAINS_HARNESS_LOCAL=YES
PRODUCTS_TEST_WISHLIST_PRESEED_COUNT=0
WISHLIST_TEST_SEED_GROUP_CREATED=NO
CLEAN_V2_DIRECT_BUSINESS_FIXTURE_WRITE_REMOVED=YES
CLEAN_V2_TEST_GROUP_EXECUTION_EXPLICIT=YES_IF_USED

P8_06C_NEW_GROUP_COUNT=1
P8_06C_NEW_GROUP_IDS=admin.test.system-configs
P8_06C_TOTAL_TEST_GROUP_COUNT=3
P8_06C_DEV_DEPENDENCY_COUNT=0
P8_06C_MISSING_DEPENDENCY_COUNT=0
P8_06C_DUPLICATE_GROUP_ID_COUNT=0
P8_06C_DEPENDENCY_CYCLE_COUNT=0
CROSS_OWNER_TEST_REPOSITORY_ACCESS_ADDED=0
CROSS_OWNER_TEST_ENTITY_ACCESS_ADDED=0

CLEAN_V2_RAW_SQL_BUSINESS_FIXTURE_WRITE_COUNT_BEFORE=15
CLEAN_V2_RAW_SQL_BUSINESS_FIXTURE_WRITE_COUNT_AFTER=14
MOVED_FIXTURE_TABLES=system_configs
REMAINING_HARNESS_LOCAL_FIXTURE_TABLES=users;farmer_profiles;product_categories;products;reviews;notifications;provinces;districts;stored_files;ad_packages;ad_campaigns;forum_posts;audit_logs;incident_reports

USERS_TEST_PROVIDER_RUNTIME_CHANGES=0
PRODUCTS_TEST_PROVIDER_RUNTIME_CHANGES=0
TF04_RUNTIME_FIXTURE_CHANGES=0
TF05_RUNTIME_FIXTURE_CHANGES=0
TF08_RUNTIME_FIXTURE_CHANGES=0
TF08_PRODUCTS_MOVED_TO_TEST_PROVIDER=NO
CLEAN_V2_RUNTIME_ASSERTION_COUNT_REDUCED=NO
CLEAN_V2_OPENAPI_BASELINE_PURPOSE_CHANGED=NO
CLEAN_V2_SCHEMA_PARITY_PURPOSE_CHANGED=NO
CLEAN_V2_WISHLIST_IDEMPOTENCY_ASSERTION_PRESERVED=YES
NORMAL_APPLICATION_TEST_REGISTRATION_ADDED=NO
NORMAL_DEV_REFERENCE_CLI_TEST_REGISTRATION_ADDED=NO
SCHEMA_CHANGES=0
MIGRATIONS_CREATED=0
REFERENCE_DEV_SEED_PAYLOAD_CHANGES=0

P8_06C_IMPLEMENTATION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_06C_BLOCKERS=NONE
P8_06D_IMPLEMENTATION_AUTHORIZED=NO_WAITING_FOR_P8_06C_MERGE_AND_REVIEW
IDEMPOTENCY_VERIFIED=NOT_YET_VERIFIED
DISPOSABLE_DB_SEED_RUN_PASS=NOT_YET_VERIFIED
SECOND_SEED_RUN_NO_DUPLICATES=NOT_YET_VERIFIED
PHASE_08_COMPLETE=NO
```

## P8-06A Test Execution Safety And Metadata Boundary Implementation Overlay

PR #144 merged this audit into `develop` at
`a8f1541ff4babfe10f35c50367f18e3e46ab7a49`. P8-06A implements only its
shared execution-safety and classification boundary. The historical source,
ownership, raw-SQL, and proposed-group matrices above remain the P8-06 audit
baseline; no business fixture has moved owners.

### Merged Authority And Slice Status

```text
P8_05C4D_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_143
P8_06_TEST_FIXTURE_AUDIT_STATUS=IMPLEMENTED_BY_MERGED_PR_144
P8_06A_IMPLEMENTATION_AUTHORIZED=YES_AFTER_P8_06_AUDIT_PR_144_MERGE
P8_06A_IMPLEMENTATION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_06A_BLOCKERS=NONE

P8_06_IMPLEMENTATION_AUTHORIZED=NO
P8_06_IMPLEMENTATION_STATUS=IMPLEMENTATION_IN_PROGRESS
P8_06B_IMPLEMENTATION_AUTHORIZED=NO_WAITING_FOR_P8_06A_MERGE_AND_PRODUCT_TEST_IDENTITY_REVIEW
PRODUCT_TEST_SKU_IDENTITY_UNRESOLVED=YES
```

### Shared Contract

`database-target.guard.ts` now supplies a framework-neutral persistence TEST
target contract. Business fixtures use `SeedClassification.TEST`; non-SeedGroup
migration, inspection, and infrastructure harnesses additionally declare one
explicit `PersistenceTestPurpose`. Every request declares an operation class:
`READ_ONLY_INSPECTION`, `DISPOSABLE_DATABASE_LIFECYCLE`,
`MIGRATION_VERIFICATION`, `FIXTURE_WRITE`, or `DESTRUCTIVE_CLEANUP`.

The positive host allowlist is derived from current CI and local integration
source: `localhost`, `127.0.0.1`, and `::1` (including bracket-normalized IPv6).
No container service name or remote host was invented. Known dedicated test
databases (`agrilink_test`, `agrilink_migration_test`, and
`agrilink_p3_phase1_verify`) remain supported on allowed local hosts alongside
the existing disposable prefixes. `agrilink_db` remains protected. A safe
database-looking name on an unknown host fails closed.

```text
TEST_CLASSIFICATION_CONTRACT_EXISTS=YES
TEST_BUSINESS_FIXTURE_CLASSIFICATION=TEST
MIGRATION_TEST_HARNESS_CLASSIFICATION_EXPLICIT=YES
TEST_TARGET_HOST_ALLOWLIST_REQUIRED=YES
TEST_TARGET_REMOTE_HOST_DEFAULT=DENY
TEST_TARGET_UNKNOWN_HOST_POLICY=FAIL_CLOSED
PROTECTED_DATABASE_TARGET_POLICY=FAIL_CLOSED
DISPOSABLE_DATABASE_NAME_REQUIRED=YES
DESTRUCTIVE_OPERATION_ACKNOWLEDGEMENT_REQUIRED=YES
READ_ONLY_TEST_HARNESS_WRITE_CAPABILITY_ADDED=NO
```

Database lifecycle, migration verification, and destructive cleanup require
an acknowledgement exactly equal to the database name. Read-only inspection
does not acquire destructive semantics or require an unnecessary destructive
acknowledgement. Ambiguous `DATABASE_URL` versus discrete `DB_HOST`/`DB_NAME`
targets fail before DataSource construction or initialization.

### Post-A 15-Source Safety Matrix

`INHERITED` identifies the source through which the shared guard executes
before the source can open a connection. TF-02 also exports explicit TEST
business-fixture metadata without changing `seedRuntimeFixture`.

| Source | Classification explicit | Direct shared guard | Inherited shared guard | Read-only | Explicit purpose | Production reachable after A |
| --- | --- | --- | --- | --- | --- | --- |
| TF-01 | YES | NO | TF-03 before admin construction; direct fixture-write recheck before TF-02 | NO | `MIGRATION_TEST_HARNESS` | NO |
| TF-02 | YES | NO | TF-01 fixture-write check and TF-03 lifecycle boundary | NO | `BUSINESS_FIXTURE` | NO |
| TF-03 | YES | YES | NONE | NO | caller-declared TEST purpose | NO |
| TF-04 | YES | NO | TF-03 | NO | `BUSINESS_FIXTURE` | NO |
| TF-05 | YES | NO | TF-03 | NO | `BUSINESS_FIXTURE` | NO |
| TF-06 | YES | NO | TF-03 | NO | `BUSINESS_FIXTURE` | NO |
| TF-07 | YES | YES | NONE | NO | `BUSINESS_FIXTURE` | NO |
| TF-08 | YES | YES | NONE | NO | `MIGRATION_TEST_HARNESS` | NO |
| TF-09 | YES | YES | NONE | NO | `MIGRATION_TEST_HARNESS` | NO |
| TF-10 | YES | NO | TF-03 | NO | `MIGRATION_TEST_HARNESS` | NO |
| TF-11 | YES | YES | NONE | YES | `READ_ONLY_TEST_HARNESS` | NO |
| TF-12 | YES | YES | NONE | YES | `READ_ONLY_TEST_HARNESS` | NO |
| TF-13 | YES | YES | NONE | YES | `READ_ONLY_TEST_HARNESS` | NO |
| TF-14 | YES | YES | NONE | YES | `READ_ONLY_TEST_HARNESS` | NO |
| TF-15 | YES | YES before configuration and again in overridden `initialize` | NONE | NO | `MIGRATION_TEST_HARNESS` | NO |

```text
TEST_PERSISTENCE_SOURCE_COUNT=15
ALL_DATABASE_CAPABLE_TEST_SOURCES_HAVE_EXPLICIT_PURPOSE=YES
ALL_DATABASE_CAPABLE_TEST_SOURCES_HAVE_SAFE_TARGET_BOUNDARY=YES
TEST_FIXTURE_CLASSIFICATION_EXPLICIT=YES
TEST_FIXTURE_NORMAL_STARTUP_REACHABLE=NO
TEST_FIXTURE_PRODUCTION_REACHABLE=NO

TF03_SHARED_TARGET_GUARD=YES
TF03_DATABASE_NAME_GUARD=YES
TF03_HOST_CLUSTER_GUARD=YES
TF03_PROTECTED_TARGET_GUARD=YES

TF08_EXPLICIT_OPT_IN_REMAINS=YES
TF08_SHARED_TARGET_GUARD=YES
TF08_ARBITRARY_REMOTE_TARGET_REACHABLE=NO

TF15_SAFE_TARGET_REQUIRED_BEFORE_INITIALIZE=YES
```

### Ownership And Payload Preservation

P8-06A adds metadata to TF-02 and safety calls around it, but changes none of
its 15 raw inserts, Wishlist reconciliation, Product UUID/SKU behavior,
REFERENCE duplication, or positional Ad Package behavior. No proposed TEST
business group is implemented.

```text
CLEAN_V2_BUSINESS_FIXTURE_CHANGES=0
CLEAN_V2_OWNER_SPLIT_IMPLEMENTED=NO
NEW_BUSINESS_TEST_SEED_GROUP_COUNT=0
PRODUCT_TEST_SKU_IDENTITY_UNRESOLVED=YES
PRODUCTS_TEST_GROUP_CREATED=NO
P8_06B_IMPLEMENTATION_AUTHORIZED=NO_WAITING_FOR_P8_06A_MERGE_AND_PRODUCT_TEST_IDENTITY_REVIEW

OWNER_LOCAL_RUNTIME_SEED_CHANGES=0
REFERENCE_GROUP_RUNTIME_PAYLOAD_CHANGES=0
DEV_GROUP_RUNTIME_PAYLOAD_CHANGES=0
SCHEMA_CHANGES=0
MIGRATIONS_CREATED=0
```

### Remaining Phase Gates

```text
IDEMPOTENCY_VERIFIED=NOT_YET_VERIFIED
DISPOSABLE_DB_SEED_RUN_PASS=NOT_YET_VERIFIED
SECOND_SEED_RUN_NO_DUPLICATES=NOT_YET_VERIFIED
PHASE_08_COMPLETE=NO
```

This audit is static authority only. It classifies current database-capable
test sources, assigns each business fixture table to a proposed owner, and
defines later implementation slices. It does not execute or change any test
fixture, seed, migration, DataSource, SQL, schema, or runtime seed payload.

## Scope And Counting Contract

`TEST_PERSISTENCE_SOURCE_COUNT` counts a source file when it declares business
test data, invokes a database-backed verification workflow, or directly
provides database lifecycle/configuration infrastructure to such a workflow.
Ordinary unit-test repository mocks, SQL-text assertions, and static command
contract specs are false positives and are not counted. They are
`STATIC_TEST_ONLY`, `DATABASE_CAPABLE=NO` if considered individually.

`TEST_RAW_SQL_WRITE_COUNT` counts source-level raw SQL statements that change
database or session state in the inventoried sources. It excludes SQL hidden
inside the migration classes under test and repository implementations. The 52
writes comprise 29 business fixture DML statements, 17 schema/migration
assertion statements, and 6 harness-control statements. Multi-row statements
count once, not once per row.

```text
TEST_PERSISTENCE_SOURCE_COUNT=15
TEST_EXECUTABLE_FIXTURE_SOURCE_COUNT=6
TEST_DATABASE_CAPABLE_SOURCE_COUNT=15
TEST_RAW_SQL_WRITE_SOURCE_COUNT=8
TEST_RAW_SQL_WRITE_COUNT=52
TEST_RAW_SQL_BUSINESS_FIXTURE_WRITE_COUNT=29
```

## Complete Source Classification

`EXECUTABLE=CALLER_ONLY` means an exported helper contains executable database
operations but has no independent CLI entrypoint.

| ID | Path | Executable | Database capable | Classification | Tables touched | Write mechanism | Current owner | Environment / disposable guard | Cross-owner | Raw SQL | Status / disposition |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TF-01 | `src/scripts/persistence-verify-clean-v2.ts` | YES | YES | `MIGRATION_TEST_HARNESS` | full V2 schema; delegates 16 fixture tables to TF-02 | migrations, reconciliation functions | persistence harness | generated `agrilink_persistence_test_*`; target-name guard; no host allowlist | YES through TF-02 | NO direct fixture SQL | `SPLIT` |
| TF-02 | `src/database/reconciliation/clean-v2-runtime-baseline.ts` | CALLER_ONLY | YES | `TEST` | `users`, `farmer_profiles`, `product_categories`, `products`, `reviews`, `notifications`, `provinces`, `districts`, `stored_files`, `ad_packages`, `ad_campaigns`, `forum_posts`, `system_configs`, `audit_logs`, `incident_reports`, `wishlists` | transaction raw SQL plus Products repository | central test fixture | caller-dependent; TF-01 supplies guarded disposable name | YES, 11 domain owners | YES | `SPLIT` |
| TF-03 | `src/database/reconciliation/disposable-database.ts` | CALLER_ONLY | YES | `NON_FIXTURE_TEST_INFRASTRUCTURE` | PostgreSQL database catalog only | create database, terminate sessions, drop database | persistence harness | strict generated-name/prefix guard and protected-name rejection; no host allowlist | NO business table | YES | `KEEP_AS_TEST_HARNESS`; add host/cluster policy |
| TF-04 | `test/commerce.e2e-spec.ts` | YES | YES | `TEST` | `users`, `products`, `orders`, `order_items`, `order_status_history`, `commerce_operations`, `payments`, `purchase_requests`, `contracts`, `reviews` | two raw reference inserts plus owner repositories/use cases | Commerce E2E harness | generated disposable name; no host allowlist | YES | YES | `SPLIT` reusable Users/Product fixtures from workflow harness |
| TF-05 | `test/persistence-phase-6/repository-concurrency.integration.spec.ts` | YES | YES | `TEST` | `users`, `products`, `orders`, `order_items`, `order_status_history`, `commerce_operations`, `payments`, `purchase_requests`, `contracts` | two raw reference inserts plus owner repositories | Commerce concurrency harness | generated disposable name; no host allowlist | YES | YES | `SPLIT` reusable Users/Product fixtures from workflow harness |
| TF-06 | `test/persistence-phase-7a/notifications-concurrency.integration.spec.ts` | YES | YES | `TEST` | `notifications` | raw insert/delete plus Notifications repository | notifications test harness | generated disposable name; no host allowlist | NO | YES | `KEEP_AS_TEST_HARNESS`; already owner-bounded |
| TF-07 | `test/persistence-phase-7b/traceability-postgres.integration-spec.ts` | YES | YES | `TEST` | `traceability_batches`, `traceability_events` | Traceability service/repositories; raw cleanup and negative insert | traceability test harness | disposable prefix, exact acknowledgement, localhost allowlist | NO | YES | `KEEP_AS_TEST_HARNESS` |
| TF-08 | `test/storage-phase9-migration.integration-spec.ts` | YES when `STORAGE_MIGRATION_TESTS=true` | YES | `MIGRATION_TEST_HARNESS` | `stored_files`, `products`, `product_certifications`, legacy `quality_certificates`, `farmer_profiles`, `cooperative_profiles`, `enterprise_profiles`, `supplier_profiles` | raw legacy schema/data plus migration `up`/`down` | storage migration harness | random schema and explicit opt-in only; arbitrary database/host remains possible | YES, migration compatibility boundary | YES | `KEEP_AS_TEST_HARNESS`, blocked on target guard |
| TF-09 | `src/scripts/verify-p3-phase-1-migration.ts` | YES | YES | `MIGRATION_TEST_HARNESS` | schema-only `users`, `products`, `provinces`, `cooperative_members`, `bulk_listings`, `bulk_listing_contributions` | raw legacy schema plus migration `up`/`down` | cooperative migration harness | exact database `agrilink_p3_phase1_verify`; no host allowlist | YES schema compatibility only | YES | `KEEP_AS_TEST_HARNESS`; add host policy |
| TF-10 | `src/scripts/persistence-write-phase-6-catalog.ts` | YES with `--write` | YES | `MIGRATION_TEST_HARNESS` | full V2 migration catalog; no business fixtures | migrations and catalog reads; writes manifest file | persistence harness | generated disposable name; no host allowlist | NO business fixture | indirect only | `KEEP_AS_TEST_HARNESS`; add host policy |
| TF-11 | `src/scripts/persistence-schema-parity.ts` | YES | YES | `NON_FIXTURE_TEST_INFRASTRUCTURE` | catalog/schema metadata only | read-only parity inspection | persistence harness | disposable-name guard; no host allowlist | NO | NO | `KEEP_AS_TEST_HARNESS`; add host policy |
| TF-12 | `src/scripts/persistence-typeorm-compatibility-parity.ts` | YES | YES | `NON_FIXTURE_TEST_INFRASTRUCTURE` | catalog/schema metadata only | read-only parity inspection | persistence harness | disposable-name guard; no host allowlist | NO | NO | `KEEP_AS_TEST_HARNESS`; add host policy |
| TF-13 | `src/scripts/persistence-print-baseline-schema.ts` | YES | YES | `NON_FIXTURE_TEST_INFRASTRUCTURE` | schema-builder metadata only | TypeORM schema log, not applied | persistence harness | disposable-name guard; no host allowlist | NO | NO | `KEEP_AS_TEST_HARNESS`; add host policy |
| TF-14 | `src/scripts/persistence-write-baseline-manifests.ts` | YES | YES | `NON_FIXTURE_TEST_INFRASTRUCTURE` | catalog/schema metadata only | read-only catalog/schema log; writes files only | persistence harness | disposable-name guard; no host allowlist | NO | NO | `KEEP_AS_TEST_HARNESS`; add host policy |
| TF-15 | `src/scripts/persistence-migration-verification-data-source.ts` | YES through TypeORM CLI | YES | `MIGRATION_TEST_HARNESS` | configured migration chain; no business fixtures | exports migration-only DataSource | migration verification harness | exact database `agrilink_migration_test`; `synchronize=false`; no host allowlist | NO fixture | NO | `KEEP_AS_TEST_HARNESS`; add host policy |

```text
ALL_TEST_PERSISTENCE_SOURCES_CLASSIFIED=YES
UNKNOWN_TEST_SOURCE_COUNT=0
```

Excluded static false positives include
`src/scripts/persistence-architecture-audit.spec.ts`,
`src/scripts/persistence-parity-commands.spec.ts`,
`src/scripts/storage-phase9-rollout.spec.ts`, static migration SQL assertion
specs, and repository unit specs whose TypeORM methods are Jest mocks. The
operational existing-schema, protected Phase 7A evidence, and Storage rollout
scripts are also excluded: they are real operational tools, not TEST fixtures
or test harnesses.

## clean-v2 Special Audit

The current authority is split between TF-01, which owns lifecycle and parity
orchestration, and TF-02, which owns the cross-domain business fixture payload.

```text
CLEAN_V2_SOURCE_EXISTS=YES
CLEAN_V2_EXECUTABLE=YES
CLEAN_V2_DATABASE_CAPABLE=YES
CLEAN_V2_CLASSIFICATION=MIGRATION_TEST_HARNESS
CLEAN_V2_TABLE_COUNT=16
CLEAN_V2_TABLES=users;farmer_profiles;product_categories;products;reviews;notifications;provinces;districts;stored_files;ad_packages;ad_campaigns;forum_posts;system_configs;audit_logs;incident_reports;wishlists
CLEAN_V2_WRITE_MECHANISMS=TRANSACTIONAL_RAW_SQL;PRODUCTS_REPOSITORY
CLEAN_V2_RAW_SQL_TABLE_COUNT=15
CLEAN_V2_REPOSITORY_TABLE_COUNT=1
CLEAN_V2_DISPOSABLE_DB_GUARD=YES_DATABASE_NAME
CLEAN_V2_PRODUCTION_GUARD=NO_HOST_OR_CLUSTER_ALLOWLIST
CLEAN_V2_PROTECTED_LOCAL_DB_GUARD=YES
CLEAN_V2_CROSS_OWNER_TABLE_ACCESS=YES
CLEAN_V2_ARCHITECTURAL_ROLE=SPLIT_HARNESS_FROM_OWNER_LOCAL_FIXTURES
```

The fixture is not a DEV seed and is not reachable from normal application
startup. It is a mixture: the migration/parity workflow is a valid bounded
test harness, while `seedRuntimeFixture` is a legacy central multi-owner test
fixture. P8-06 must retain orchestration in the harness and move only reusable
business fixture declarations behind owner-local TEST contracts.

Two current clean-v2 identities require correction during implementation:

- `ad_campaigns.package_id=1` depends on empty-database sequence position. It
  must consume `ads.reference.packages` output by package code.
- The Product has a fixed UUID but no repository-proven persisted SKU. A human
  must approve its TEST SKU before an owner-local Products TEST group is built.

## One TEST Owner Per Business Fixture Table

`WRITER_COUNT` counts source declarations that directly insert, delete, or
invoke repository business writes. A migration class under test is not a
second fixture writer.

| Table | Domain owner | Test writer sources | Writer count | Owner-local now | Cross-owner now | Proposed authority |
| --- | --- | --- | ---: | --- | --- | --- |
| `users` | users | TF-02, TF-04, TF-05 | 3 | NO | YES | `users.test.identities` |
| `farmer_profiles` | profiles | TF-02, TF-08 | 2 | NO | YES | `profiles.test.participants`; TF-08 stays migration-local |
| `cooperative_profiles` | profiles | TF-08 | 1 | NO | YES | TF-08 migration-local; reusable rows belong to Profiles |
| `enterprise_profiles` | profiles | TF-08 | 1 | NO | YES | TF-08 migration-local; reusable rows belong to Profiles |
| `supplier_profiles` | profiles | TF-08 | 1 | NO | YES | TF-08 migration-local; reusable rows belong to Profiles |
| `product_categories` | products | TF-02 | 1 | NO | YES | reuse `products.reference.categories` |
| `products` | products | TF-02, TF-04, TF-05, TF-08 | 4 | NO | YES | `products.test.catalog`; TF-08 keeps minimal migration parents |
| `product_certifications` | products | TF-08 | 1 | NO | YES | migration-local; reusable rows belong to Products |
| `quality_certificates` | compliance legacy | TF-08 | 1 | NO | YES | migration compatibility only; do not recreate canonical table |
| `wishlists` | products | TF-02 | 1 | NO | YES | `products.test.catalog` |
| `reviews` | reviews | TF-02, TF-04 | 2 | PARTIAL | YES | `reviews.test.feedback` |
| `notifications` | notifications | TF-02, TF-06 | 2 | PARTIAL | YES | `notifications.test.notifications` |
| `provinces` | geography | TF-02 | 1 | NO | YES | reuse `geography.reference.provinces` |
| `districts` | geography | TF-02 | 1 | NO | YES | reuse Geography REFERENCE output by code |
| `stored_files` | storage | TF-02, TF-08 result | 2 | NO | YES | `storage.test.files`; TF-08 result remains migration-local |
| `ad_packages` | ads | TF-02 | 1 | NO | YES | reuse `ads.reference.packages` |
| `ad_campaigns` | ads | TF-02 | 1 | NO | YES | `ads.test.campaigns` |
| `forum_posts` | forum | TF-02 | 1 | NO | YES | `forum.test.posts` |
| `system_configs` | admin | TF-02 | 1 | NO | YES | `admin.test.system-and-audit` |
| `audit_logs` | admin | TF-02 | 1 | NO | YES | `admin.test.system-and-audit` |
| `incident_reports` | compliance | TF-02 | 1 | NO | YES | `compliance.test.incidents` |
| `orders` | orders | TF-04, TF-05 | 2 | YES through owner repositories | NO after reference split | `orders.test.orders` |
| `order_items` | orders | TF-04, TF-05 | 2 | YES | NO | `orders.test.orders` |
| `order_status_history` | orders | TF-04, TF-05 | 2 | YES | NO | `orders.test.orders` |
| `commerce_operations` | commerce | TF-04, TF-05 | 2 | YES | NO | `commerce.test.operations` |
| `payments` | payments | TF-04, TF-05 | 2 | YES | NO | `payments.test.payments` |
| `purchase_requests` | contracts | TF-04, TF-05 | 2 | YES | NO | `contracts.test.contracts` |
| `contracts` | contracts | TF-04, TF-05 | 2 | YES | NO | `contracts.test.contracts` |
| `traceability_batches` | traceability | TF-07 | 1 | YES | NO | `traceability.test.lifecycle` |
| `traceability_events` | traceability | TF-07 | 1 | YES | NO | `traceability.test.lifecycle` |

```text
TEST_BUSINESS_FIXTURE_TABLE_COUNT=30
ALL_TEST_BUSINESS_FIXTURE_TABLES_HAVE_PROPOSED_OWNER=YES
NO_UNRESOLVED_TEST_CROSS_OWNER_WRITES=YES
```

`quality_certificates` has a compatibility owner, not approval as a canonical
table. TF-08 may retain a synthetic legacy table only because it verifies a
conditional migration path.

## Raw SQL Classification

| Sources | Count | Classification | Decision |
| --- | ---: | --- | --- |
| TF-02 | 15 | `BUSINESS_FIXTURE_INSERT` | split behind owner TEST providers or REFERENCE outputs |
| TF-04 | 2 | `BUSINESS_FIXTURE_INSERT` | move Users/Product declarations behind owner providers |
| TF-05 | 2 | `BUSINESS_FIXTURE_INSERT` | consume the same providers as TF-04 |
| TF-06 | 1 | `BUSINESS_FIXTURE_INSERT` | keep owner-bounded or wrap in Notifications TEST contract |
| TF-06 | 1 | `TEST_HARNESS_CONTROL` | owner-local `DELETE` on a disposable database |
| TF-07 | 1 | `BUSINESS_FIXTURE_INSERT` | negative constraint case; keep in owner harness |
| TF-07 | 2 | `TEST_HARNESS_CONTROL` | isolated owner-table `DELETE` cleanup |
| TF-08 | 8 | `BUSINESS_FIXTURE_INSERT` | keep migration-specific legacy payload in harness |
| TF-03 | 3 | `TEST_HARNESS_CONTROL` | create database, terminate sessions, drop database |
| TF-08 | 11 | `SCHEMA_OR_MIGRATION_ASSERTION` | extension/schema/eight legacy tables/drop schema |
| TF-09 | 6 | `SCHEMA_OR_MIGRATION_ASSERTION` | extension and minimal legacy table shapes |

The TF-06 and TF-07 deletes are included once in the 52 total but are not part
of the 29 business fixture payload writes.

## Classification And Reachability Contract

```text
TEST_FIXTURE_CLASSIFICATION_EXPLICIT=PARTIAL
TEST_FIXTURE_NORMAL_STARTUP_REACHABLE=NO
TEST_FIXTURE_PRODUCTION_REACHABLE=YES
```

The TEST nature is explicit in Jest paths, environment flags, command names,
and disposable names, but the sources do not execute through a shared
`SeedClassification.TEST` contract. Production reachability is conservatively
`YES`: TF-08 accepts an arbitrary configured database/host, and the shared
disposable helper can create a correctly prefixed database on an unrestricted
host. This is a static guard gap, not evidence that production was accessed.

TF-07 is the current guard model: exact disposable name acknowledgement plus a
localhost allowlist. P8-06A must define a shared equivalent policy.

## Proposed Owner-Local TEST Groups

These are metadata proposals only. Migration-specific legacy rows in TF-08 and
TF-09 remain harness-local and are not forced into SeedGroups.

| Group ID | Owner | Dependencies | Tables | Stable keys | Outputs | Idempotency expectation |
| --- | --- | --- | --- | --- | --- | --- |
| `users.test.identities` | users | none | `users` | email | `user.id.by-email` | reconcile each email |
| `profiles.test.participants` | profiles | `users.test.identities` | four profile tables | User ID; CCCD where applicable | profile IDs by user/type | one role profile per user |
| `products.test.catalog` | products | Users TEST; Categories REFERENCE | `products`, `wishlists`, reusable certifications | Product SKU **unresolved**; wishlist User + Product | `product.id.by-sku` | blocked until TEST SKUs approved |
| `reviews.test.feedback` | reviews | Users TEST; Products TEST | `reviews` | reviewer + Product for scenario | none unless proven | converge reviewed pairs |
| `notifications.test.notifications` | notifications | Users TEST | `notifications` | no persisted operation key proven | none | empty-disposable/owner cleanup |
| `storage.test.files` | storage | Users TEST | `stored_files` | `object_key` | stored-file ID by object key | reconcile object key |
| `ads.test.campaigns` | ads | Users TEST; Ad Packages REFERENCE | `ad_campaigns` | campaign TEST identity to approve | optional campaign ID | package by code, never position |
| `forum.test.posts` | forum | Users TEST | `forum_posts` | harness-scoped fixed UUID | none | bounded disposable fixture |
| `admin.test.system-and-audit` | admin | Users TEST | `system_configs`, `audit_logs` | config key; audit UUID | none | config reconcile; bounded audit |
| `compliance.test.incidents` | compliance | Users TEST | `incident_reports` | harness-scoped fixed UUID | none | bounded disposable fixture |
| `orders.test.orders` | orders | Users TEST; Products TEST | three Order tables | operation/idempotency keys | Order IDs | repository convergence |
| `commerce.test.operations` | commerce | Orders TEST | `commerce_operations` | operation key | harness result binding | unique operation key |
| `payments.test.payments` | payments | Orders TEST | `payments` | order/payment operation key | Payment ID | repository convergence |
| `contracts.test.contracts` | contracts | Users TEST; Products TEST | `purchase_requests`, `contracts` | request/contract operation keys | request/Contract IDs | repository convergence |
| `traceability.test.lifecycle` | traceability | Users TEST; Products TEST | two Traceability tables | batch code, QR code, operation key | batch ID | unique keys, append-only events |

```text
PROPOSED_TEST_GROUP_COUNT=15
PROPOSED_TEST_DAG_EDGE_COUNT=20
PROPOSED_TEST_MISSING_DEPENDENCY_COUNT=0
PROPOSED_TEST_DUPLICATE_GROUP_ID_COUNT=0
PROPOSED_TEST_DEPENDENCY_CYCLE_COUNT=0
```

The 20 edges include retained Category and Ad Package REFERENCE dependencies.
Geography needs no TEST group: clean-v2 should consume canonical Geography
REFERENCE outputs for its Province/District scenario.

## REFERENCE And DEV Reuse

| Current duplicate | Canonical authority | Decision |
| --- | --- | --- |
| `Phase One Package` and positional package ID | `ads.reference.packages` by code | consume scalar output |
| `Phase One Province` / District | `geography.reference.provinces` and Geography outputs | consume reviewed code pair |
| `Phase One Category` | `products.reference.categories` by slug | consume scalar output |

```text
REFERENCE_DATA_DUPLICATED_BY_TEST_FIXTURES=ads.reference.packages;geography.reference.provinces;products.reference.categories
TEST_DEPENDS_ON_DEV_GROUP_COUNT=0
TEST_DEPENDS_ON_DEV_GROUPS=NONE
```

No inventoried test source imports DEV payloads or relies on DEV group
execution. Fixed test UUIDs are local test data, not DEV dependencies.

## Cleanup And Reset Semantics

```text
TEST_CLEANUP_STRATEGY=DISPOSABLE_DATABASE_RECREATION;RANDOM_SCHEMA_DROP;OWNER_TABLE_DELETE;EXTERNALLY_PROVISIONED_DISPOSABLE_DATABASE
TEST_CLEANUP_TABLE_OWNERSHIP_CONFLICT=NO
```

- TF-01, TF-04, TF-05, TF-06, and TF-10 create and drop a generated database.
- TF-08 creates and drops one random schema.
- TF-07 deletes only its two owner-local tables in an acknowledged disposable
  local database; lifecycle creation belongs to the external test runner.
- TF-09 expects a dedicated named verification database and reverts its
  migration scenario.

These operations are `TEST_HARNESS_LIFECYCLE`; they do not authorize a new
central DEV/production reset service.

## Human Decision Matrix

| Source | Final disposition | Human-review point |
| --- | --- | --- |
| TF-01 | `SPLIT` | approve harness/provider boundary |
| TF-02 | `SPLIT` | approve owner groups, REFERENCE reuse, Product TEST SKU assignment |
| TF-03 | `KEEP_AS_TEST_HARNESS` | approve shared host/cluster policy |
| TF-04 | `SPLIT` | approve shared Users/Product providers |
| TF-05 | `SPLIT` | consume the same providers as TF-04 |
| TF-06 | `KEEP_AS_TEST_HARNESS` | owner-local fixture remains bounded |
| TF-07 | `KEEP_AS_TEST_HARNESS` | current guard is recommended model |
| TF-08 | `KEEP_AS_TEST_HARNESS` | migration fixtures stay local; guard mandatory |
| TF-09 | `KEEP_AS_TEST_HARNESS` | add host guard; keep compatibility local |
| TF-10 | `KEEP_AS_TEST_HARNESS` | add shared environment policy |
| TF-11 | `KEEP_AS_TEST_HARNESS` | non-fixture catalog reader |
| TF-12 | `KEEP_AS_TEST_HARNESS` | non-fixture catalog reader |
| TF-13 | `KEEP_AS_TEST_HARNESS` | schema log is never applied |
| TF-14 | `KEEP_AS_TEST_HARNESS` | manifest output only |
| TF-15 | `KEEP_AS_TEST_HARNESS` | add host guard; migration DataSource |

```text
ALL_TEST_PERSISTENCE_SOURCES_CLASSIFIED=YES
ALL_TEST_BUSINESS_FIXTURE_TABLES_HAVE_PROPOSED_OWNER=YES
NO_UNRESOLVED_TEST_CROSS_OWNER_WRITES=YES
PRODUCTS_TEST_SKU_DECISION=ASSIGN_REVIEWED_TEST_SKUS_OR_KEEP_PRODUCT_ROWS_HARNESS_LOCAL
PRODUCTS_TEST_SKU_HUMAN_ASSIGNMENT_REQUIRED=YES
```

No SKU candidate is invented by this audit.

## Smallest Safe P8-06 Implementation Sequence

1. `P8_06A_TEST_EXECUTION_SAFETY_AND_METADATA_BOUNDARY`: implement one shared
   TEST selection contract and host/cluster plus database-name guards. Apply it
   first to TF-03 and TF-08, then all database-capable harness entrypoints.
2. `P8_06B_SHARED_REFERENCE_AND_IDENTITY_FIXTURES`: after human SKU assignment,
   add only reusable owner-local Users and Products TEST providers; replace
   duplicated Geography, Category, and Ad Package rows with REFERENCE outputs.
3. `P8_06C_CLEAN_V2_PROVIDER_SPLIT`: make TF-01 orchestrate owner providers;
   retain migrations, parity/baseline capture, and lifecycle in the harness.
4. `P8_06D_COMMERCE_HARNESS_REFERENCE_SPLIT`: make TF-04 and TF-05 consume the
   shared Users/Product providers. Keep workflow writes through owner code.
5. `P8_06E_BOUNDED_HARNESS_CONSISTENCY`: apply shared guard/metadata policy to
   TF-06, TF-07, and TF-09 through TF-15 without converting migration-specific
   legacy rows into ordinary SeedGroups.

No separate owner slice is proposed for a one-file owner-bounded scenario
unless reuse is demonstrated.

## Preservation And Safety

```text
OWNER_LOCAL_RUNTIME_SEED_CHANGES=0
REFERENCE_GROUP_RUNTIME_PAYLOAD_CHANGES=0
DEV_GROUP_RUNTIME_PAYLOAD_CHANGES=0
AD_PACKAGE_REFERENCE_SEED_GROUP_COUNT=1
CENTRAL_PERSISTENCE_CAPABLE_METHOD_COUNT=0
LEGACY_DEV_REMAINING_EXISTS=NO

PROTECTED_LOCAL_DB_ACCESSED=NO
PRODUCTION_DB_ACCESSED=NO
DATABASE_CONNECTIONS=0
DATASOURCE_CONSTRUCTED_FOR_EXECUTION=NO
SQL_EXECUTED=0
DDL_EXECUTED=0
DML_EXECUTED=0
SEEDS_EXECUTED=0
TEST_FIXTURES_EXECUTED=0
MIGRATIONS_EXECUTED=0
```

## Current Phase Handoff

```text
P8_05C4D_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_143
P8_05_CENTRAL_DEV_SEED_DECOMPOSITION_STATUS=IMPLEMENTED_BY_MERGED_PR_143
P8_06_TEST_FIXTURE_AUDIT_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_06_IMPLEMENTATION_STATUS=NOT_STARTED
P8_06_IMPLEMENTATION_AUTHORIZED=NO
IDEMPOTENCY_VERIFIED=NOT_YET_VERIFIED
DISPOSABLE_DB_SEED_RUN_PASS=NOT_YET_VERIFIED
SECOND_SEED_RUN_NO_DUPLICATES=NOT_YET_VERIFIED
PHASE_08_COMPLETE=NO
```

## P8-06A Trailing Merged-Authority Handoff

```text
P8_06_TEST_FIXTURE_AUDIT_STATUS=IMPLEMENTED_BY_MERGED_PR_144
P8_06A_IMPLEMENTATION_AUTHORIZED=YES_AFTER_P8_06_AUDIT_PR_144_MERGE
P8_06A_IMPLEMENTATION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_06A_BLOCKERS=NONE
TEST_FIXTURE_CLASSIFICATION_EXPLICIT=YES
TEST_FIXTURE_NORMAL_STARTUP_REACHABLE=NO
TEST_FIXTURE_PRODUCTION_REACHABLE=NO
P8_06_IMPLEMENTATION_AUTHORIZED=NO
P8_06_IMPLEMENTATION_STATUS=IMPLEMENTATION_IN_PROGRESS
P8_06B_IMPLEMENTATION_AUTHORIZED=NO_WAITING_FOR_P8_06A_MERGE_AND_PRODUCT_TEST_IDENTITY_REVIEW
PRODUCT_TEST_SKU_IDENTITY_UNRESOLVED=YES
IDEMPOTENCY_VERIFIED=NOT_YET_VERIFIED
DISPOSABLE_DB_SEED_RUN_PASS=NOT_YET_VERIFIED
SECOND_SEED_RUN_NO_DUPLICATES=NOT_YET_VERIFIED
PHASE_08_COMPLETE=NO
```

## P8-06B0 Product TEST Identity Decision Audit

PR #145 merged the shared TEST execution boundary into `develop` at
`29ee0b6e8fa0a7f8da60f4f4b9f03e215eb3c494`. This overlay is a static
Product identity and ownership decision only. It creates no TEST group,
changes no fixture, and executes no database-capable path.

```text
P8_06_TEST_FIXTURE_AUDIT_STATUS=IMPLEMENTED_BY_MERGED_PR_144
P8_06A_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_145
TEST_FIXTURE_CLASSIFICATION_EXPLICIT=YES
TEST_FIXTURE_PRODUCTION_REACHABLE=NO
P8_06B0_PRODUCT_TEST_IDENTITY_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
```

### Canonical Product Identity Evidence

| Question | Current authority | Evidence |
| --- | --- | --- |
| Primary key | generated UUID `id` | `Product.id` is a `PrimaryGeneratedColumn('uuid')`; canonical baseline v2 declares `PRIMARY KEY (id)` |
| SKU field | persisted nullable string, maximum 50 | Product entity, application models, create input, and public DTO/response surfaces |
| SKU uniqueness | unique when non-null | Product entity `unique: true`; canonical baseline v2 `UNIQUE (sku)` and unique index |
| SKU immutability | no | `UpdateProductDto` includes optional `sku`; `UpdateProductUseCase` assigns the input onto the Product before save |
| Runtime repository SKU lookup | none | `ProductRepositoryPort` and `TypeOrmProductRepository` use Product UUID for reads and writes |
| Seed reconciliation SKU lookup | yes, DEV-specific | `TypeOrmProductDevSeedWriter.findProductsBySku` and `reconcileProductDevelopmentSeeds` reconcile zero/one match by SKU |
| DEV stable key and output | SKU; `product.id.by-sku` | `products.dev.products` rejects duplicate SKU declarations and emits the reconciled UUID keyed by SKU |

There is no separate Product domain entity after the reviewed Products
persistence split; application models and policies are the domain-facing
authority. They expose `sku` as `string | null`. No current migration in
`src/database/migrations` creates or changes Product SKU; the Product entity
and canonical baseline v2 agree on its persisted nullable unique contract.

```text
PRODUCT_PRIMARY_KEY=id
PRODUCT_PRIMARY_KEY_GENERATION=GENERATED_UUID
PRODUCT_SKU_FIELD_EXISTS=YES
PRODUCT_SKU_PERSISTED=YES
PRODUCT_SKU_NULLABLE=YES
PRODUCT_SKU_UNIQUE=YES
PRODUCT_SKU_IMMUTABLE=NO
PRODUCT_SKU_DOMAIN_VISIBLE=YES
PRODUCT_REPOSITORY_FIND_BY_SKU_EXISTS=NO
PRODUCT_REPOSITORY_FIND_BY_SKU_SCOPE=DEV_SEED_WRITER_ONLY
PRODUCT_REPOSITORY_RECONCILE_BY_SKU_EXISTS=YES_DEV_SEED_PATH
PRODUCT_DEV_SEED_STABLE_KEY=sku
PRODUCT_DEV_SEED_OUTPUT_KIND=product.id.by-sku
IS_SKU_CANONICAL_PRODUCT_DOMAIN_IDENTITY=YES
PRODUCT_SKU_IDENTITY_SCOPE=PERSISTED_ALTERNATE_BUSINESS_KEY
SKU_CANONICAL_FOR_RUNTIME=YES
CURRENT_TEST_FIXTURE_HAS_APPROVED_SKU=NO
```

SKU is therefore a legitimate persisted Product identity for an owner-local
TEST reconciliation contract, even though UUID remains the primary key and
runtime updates do not enforce SKU immutability. A TEST provider must treat
its declared SKU as immutable fixture identity; this audit does not change the
runtime update contract.

### Current Product TEST Fixture Inventory

The TF-04 `FRACTIONAL_PRODUCT` UUID is a Product Commerce reader stub used for
a numeric compatibility case. It is not inserted into `products`, so it is
not counted as a persisted Product fixture.

| Source | Product count | Product ID | Product SKU | SKU explicit | SKU persisted | Fixture purpose | Reusable across harnesses | Migration-local only |
| --- | ---: | --- | --- | --- | --- | --- | --- | --- |
| TF-02 clean-v2 | 1 | `20000000-0000-4000-8000-000000000001` | `NULL` | NO | NO | clean-v2 runtime baseline prerequisite for Product, Review, and Wishlist behavior | YES, if exact SKU is approved | NO |
| TF-04 Commerce E2E | 1 persisted | `66666666-6666-4666-8666-666666666666` | `NULL` | NO | NO | active Commerce `Rice` reference Product | YES with TF-05 after exact shared SKU approval | NO |
| TF-05 repository concurrency | 1 | `44444444-4444-4444-8444-444444444444` | `NULL` | NO | NO | active Commerce `Rice` reference Product | YES with TF-04 after exact shared SKU approval | NO |
| TF-08 Storage migration | 4 | `product-1`; `product-external`; `product-null`; `product-blank` | not represented by legacy schema | NO | NO | minimal legacy parents for certification/document migration cases | NO | YES |

TF-08 deliberately creates a migration-local compatibility table containing
only `id` and `seller_id`. Its four rows cannot establish ordinary Product
TEST identity policy and must remain inside the Storage migration harness.

```text
CLEAN_V2_PRODUCT_ID=20000000-0000-4000-8000-000000000001
CLEAN_V2_PRODUCT_SKU=NULL
CLEAN_V2_PRODUCT_SKU_EXPLICIT=NO
CLEAN_V2_PRODUCT_REPOSITORY_WRITE_PATH=TRANSACTIONAL_RAW_SQL_INSERT
CLEAN_V2_PRODUCT_REUSABLE_IDENTITY_NEEDED=YES_FOR_OWNER_PROVIDER_SPLIT

COMMERCE_E2E_PRODUCT_IDENTITY=FIXED_UUID_66666666-6666-4666-8666-666666666666_WITH_NO_SKU
CONCURRENCY_PRODUCT_IDENTITY=FIXED_UUID_44444444-4444-4444-8444-444444444444_WITH_NO_SKU
TF04_TF05_PRODUCT_CONCEPT_EQUIVALENT=YES
TF04_TF05_PRODUCT_FIXTURE_REUSE_JUSTIFIED=YES_CONDITIONED_ON_ONE_HUMAN_APPROVED_SHARED_SKU
```

TF-04 and TF-05 were introduced together by the same Commerce boundary commit.
They use the same seller UUID and email, seller type, name, price, unit,
quantity, and active status for the same Commerce prerequisite role. That
history and intent, rather than display-name similarity alone, justify a
single future shared Commerce Product declaration. Their different fixed UUIDs
are harness identifiers, not evidence of distinct business Products.

### Identity Options And Value Policy

| Option | Decision | Reason |
| --- | --- | --- |
| `USE_EXISTING_PERSISTED_SKU_AS_TEST_IDENTITY` | unavailable | none of TF-02, TF-04, or TF-05 persists a SKU |
| `ASSIGN_EXPLICIT_HUMAN_APPROVED_TEST_SKU` | recommended | SKU is the existing persisted unique seed identity and reuse is proven, but exact TEST values have no source authority |
| `KEEP_PRODUCT_FIXTURES_HARNESS_LOCAL` | safe fallback | required if human review declines exact SKU assignment or shared provider reuse |
| `USE_ANOTHER_EXISTING_DOMAIN_IDENTITY` | unsupported | generated UUID is the primary key, but no alternative persisted business key or owner reconciliation contract is proven |

```text
PRODUCT_TEST_ONLY_DOMAIN_FIELD_AUTHORIZED=NO
PRODUCT_SCHEMA_CHANGE_REQUIRED_FOR_TEST_IDENTITY=NO
PRODUCT_TEST_IDENTITY_DECISION=HUMAN_APPROVED_TEST_SKU_REQUIRED
PRODUCT_TEST_SKU_POLICY=DETERMINISTIC;EXPLICIT;TEST_RESERVED;UNIQUE_WITHIN_TEST_CATALOG;MAX_50_CHARACTERS;IMMUTABLE_AFTER_FIXTURE_CREATION;NOT_DERIVED_FROM_GENERATED_UUID;NOT_ACCIDENTALLY_REUSED_FROM_DEV
PRODUCT_TEST_SKU_VALUE_DECISION_REQUIRED=YES
PRODUCT_TEST_SKU_VALUE_CANDIDATES_FROM_EXISTING_SOURCE=NONE
PRODUCT_TEST_SKU_EXACT_VALUE_DECISION=REQUIRED_FOR_CLEAN_V2_PHASE_ONE_PRODUCT_AND_SHARED_COMMERCE_RICE_PRODUCT
```

The DTO example and DEV SKUs are not TEST fixture authority and are not value
candidates. This audit intentionally records no proposed or approved TEST SKU
string.

### Provider Feasibility And Reference Reuse

An owner-local `products.test.catalog` provider is technically feasible after
the two exact SKU decisions. It can use the same zero/one SKU reconciliation
shape and scalar Product UUID output already proven by the DEV owner, without
changing Product schema or runtime behavior. Seller IDs must come from
`users.test.identities`; applicable categories must come from
`products.reference.categories` through `category.id.by-slug` rather than be
recreated as TEST reference data.

```text
PRODUCTS_TEST_PROVIDER_FEASIBLE=YES_AFTER_EXACT_SKU_APPROVAL
PROPOSED_PRODUCT_TEST_STABLE_KEY=sku
PROPOSED_PRODUCT_TEST_OUTPUT_KIND=product.id.by-sku
PROPOSED_PRODUCT_TEST_DEPENDENCIES=users.test.identities;products.reference.categories
PRODUCT_TEST_CATEGORY_REFERENCE_REUSE=YES_WHEN_CANONICAL_CATEGORY_APPLIES
```

### Wishlist And Certification Ownership Correction

Products owns `wishlists` and `product_certifications`: both entities,
repository ports, repository implementations, use cases, and module
registrations are Products-local, consistent with ADR 0007.

The clean-v2 Wishlist row is not prerequisite fixture data. The harness calls
`TypeOrmProductRepository.addIfAbsent` twice and asserts one resulting row to
verify the Products-owned concurrency contract. Preseeding that row through
`products.test.catalog` would invalidate the workflow assertion. It therefore
stays in the clean-v2 harness as a Products-owned test action, correcting the
broad #144 provider proposal without changing runtime ownership.

TF-08 certifications are legacy compatibility inputs for a Storage migration.
They remain migration-local. TF-02, TF-04, and TF-05 declare no reusable
Product certification, so P8-06B has no current certification payload to move.

```text
WISHLIST_DOMAIN_OWNER=PRODUCTS
WISHLIST_TEST_FIXTURE_OWNER_DECISION=KEEP_PRODUCTS_OWNED_CLEAN_V2_WORKFLOW_ACTION_OUT_OF_PRODUCTS_TEST_CATALOG_PRESEED
PRODUCT_CERTIFICATION_DOMAIN_OWNER=PRODUCTS
PRODUCT_CERTIFICATION_TEST_PROVIDER_DECISION=NO_CURRENT_REUSABLE_CERTIFICATION_KEEP_TF08_MIGRATION_LOCAL
```

### P8-06B0 Human Decisions Required

```text
CLEAN_V2_PHASE_ONE_PRODUCT_DECISION=ASSIGN_EXACT_HUMAN_APPROVED_TEST_SKU_OR_KEEP_HARNESS_LOCAL
COMMERCE_RICE_PRODUCT_DECISION=ASSIGN_ONE_EXACT_HUMAN_APPROVED_SHARED_TEST_SKU_OR_KEEP_TF04_TF05_HARNESS_LOCAL
SKU_HUMAN_ASSIGNMENT_REQUIRED=YES
```

No exact SKU can be selected from current source. Until both retained reusable
Product declarations have an approved value, P8-06B cannot create or consume a
Products TEST provider.

```text
PRODUCT_TEST_SKU_IDENTITY_UNRESOLVED=YES
PRODUCTS_TEST_GROUP_CREATED=NO
P8_06B_IMPLEMENTATION_AUTHORIZED=NO
P8_06B_BLOCKERS=CLEAN_V2_PRODUCT_TEST_SKU_EXACT_VALUE_NOT_APPROVED;COMMERCE_RICE_PRODUCT_TEST_SKU_EXACT_VALUE_NOT_APPROVED
```

### P8-06B0 Preservation And Current Handoff

```text
RUNTIME_FILES_CHANGED=0
SCHEMA_CHANGES=0
MIGRATIONS_CREATED=0
NEW_BUSINESS_TEST_SEED_GROUP_COUNT=0

PROTECTED_LOCAL_DB_ACCESSED=NO
PRODUCTION_DB_ACCESSED=NO
DATABASE_CONNECTIONS=0
SQL_EXECUTED=0
DML_EXECUTED=0
TEST_FIXTURES_EXECUTED=0
SEEDS_EXECUTED=0
MIGRATIONS_EXECUTED=0

P8_06A_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_145
P8_06B0_PRODUCT_TEST_IDENTITY_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
PRODUCT_TEST_SKU_IDENTITY_UNRESOLVED=YES
PRODUCT_TEST_IDENTITY_DECISION=HUMAN_APPROVED_TEST_SKU_REQUIRED
PRODUCT_TEST_SKU_EXACT_VALUE_DECISION=REQUIRED_FOR_CLEAN_V2_PHASE_ONE_PRODUCT_AND_SHARED_COMMERCE_RICE_PRODUCT
P8_06B_IMPLEMENTATION_AUTHORIZED=NO
P8_06_IMPLEMENTATION_STATUS=IMPLEMENTATION_IN_PROGRESS
IDEMPOTENCY_VERIFIED=NOT_YET_VERIFIED
DISPOSABLE_DB_SEED_RUN_PASS=NOT_YET_VERIFIED
SECOND_SEED_RUN_NO_DUPLICATES=NOT_YET_VERIFIED
PHASE_08_COMPLETE=NO
```

## P8-06B Revised Shared Users And Commerce Product TEST Providers Implementation Overlay

PR #146 merged the B0 identity audit into `develop` at
`579ebb622a4562734abc5d44234ea332923fb716`. Human review then approved
`TEST-COMMERCE-RICE-001` for the shared TF-04/TF-05 Commerce Product and kept
the clean-v2 Phase One Product harness-local because `phase-one-category` has
no canonical reference-category match. The first P8-06B attempt stopped with
`PRODUCT_TEST_CATEGORY_REFERENCE_MAPPING_UNRESOLVED` and made no changes. The
revised scope resolves that blocker by excluding the clean-v2 Product rather
than inventing a category mapping.

The implementation adds exactly two owner-local TEST groups behind an
explicit TEST-only factory. It does not register the groups in application
startup or the normal DEV/REFERENCE CLI, and it does not migrate TF-02,
TF-04, TF-05, or TF-08. TF-04 and TF-05 temporarily retain their duplicate
harness declarations until P8-06D.

| Group | Owner | Stable key | Records | Dependencies | Output |
| --- | --- | --- | ---: | --- | --- |
| `users.test.identities` | Users | email | 1 | none | `user.id.by-email` |
| `products.test.catalog` | Products | SKU | 1 | `users.test.identities` | `product.id.by-sku` |

The Users record is the common `seller@example.test` farmer actor from TF-04
and TF-05. The Products record is their common active `Rice` payload: farmer
seller, price `100`, unit `kg`, available quantity `100`, and no category.
Products resolves the seller UUID exclusively through the Users group output.
Both providers reconcile zero/one match per stable key and fail closed on more
than one match. Product update data excludes SKU.

```text
P8_06_TEST_FIXTURE_AUDIT_STATUS=IMPLEMENTED_BY_MERGED_PR_144
P8_06A_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_145
P8_06B0_PRODUCT_TEST_IDENTITY_STATUS=IMPLEMENTED_BY_MERGED_PR_146

HUMAN_APPROVED_CLEAN_V2_PRODUCT_SKU=TEST-CLEANV2-PHASE-ONE-001
HUMAN_APPROVED_COMMERCE_RICE_PRODUCT_SKU=TEST-COMMERCE-RICE-001
CLEAN_V2_PHASE_ONE_PRODUCT_PROVIDER_DECISION=KEEP_HARNESS_LOCAL_DUE_NO_CANONICAL_CATEGORY_MAPPING
CLEAN_V2_PRODUCT_TEST_PROVIDER_CONSUMED=NO
CLEAN_V2_PRODUCT_REMAINS_HARNESS_LOCAL=YES
PRODUCT_TEST_CATEGORY_REFERENCE_MAPPING_UNRESOLVED=RESOLVED_BY_SCOPE_REDUCTION
PRODUCT_TEST_SKU_IDENTITY_UNRESOLVED=NO
PRODUCT_TEST_SKU_EXACT_VALUE_DECISION=RESOLVED_BY_HUMAN_APPROVAL

USERS_TEST_GROUP_ID=users.test.identities
USERS_TEST_GROUP_OWNER=USERS
USERS_TEST_GROUP_CLASSIFICATION=TEST
USERS_TEST_GROUP_DEPENDENCIES=NONE
USERS_TEST_RECORD_COUNT=1
USERS_TEST_LOOKUP_KEY=email
USERS_TEST_OUTPUT_KIND=user.id.by-email
USERS_TEST_IDEMPOTENCY_MODEL=LOOKUP_EMAIL_CREATE_OR_RECONCILE
USERS_TEST_WHOLE_TABLE_GUARD=NO

PRODUCTS_TEST_GROUP_ID=products.test.catalog
PRODUCTS_TEST_GROUP_OWNER=PRODUCTS
PRODUCTS_TEST_GROUP_CLASSIFICATION=TEST
PRODUCTS_TEST_RECORD_COUNT=1
COMMERCE_RICE_PRODUCT_SKU=TEST-COMMERCE-RICE-001
PRODUCT_TEST_STABLE_KEY=sku
PRODUCTS_TEST_DEPENDENCIES=users.test.identities
PRODUCTS_TEST_OUTPUT_KIND=product.id.by-sku
PRODUCTS_TEST_IDEMPOTENCY_MODEL=LOOKUP_SKU_CREATE_OR_RECONCILE
PRODUCTS_TEST_SKU_MUTATED_DURING_RECONCILIATION=NO
PRODUCTS_TEST_WHOLE_TABLE_GUARD=NO
COMMERCE_PRODUCT_CATEGORY_POLICY=NO_CATEGORY_DEPENDENCY

CLEAN_V2_PRODUCT_IN_PRODUCTS_TEST_GROUP=NO
TF08_PRODUCTS_MOVED_TO_PRODUCTS_TEST_GROUP=NO
PRODUCTS_TEST_WISHLIST_PRESEED_COUNT=0
PRODUCTS_TEST_CERTIFICATION_RECORD_COUNT=0
P8_06B_GROUP_COUNT=2
P8_06B_DEV_DEPENDENCY_COUNT=0
P8_06B_MISSING_DEPENDENCY_COUNT=0
P8_06B_DUPLICATE_GROUP_ID_COUNT=0
P8_06B_DEPENDENCY_CYCLE_COUNT=0
TEST_GROUP_NORMAL_STARTUP_REGISTRATION=NO
TEST_GROUP_NORMAL_CLI_REGISTRATION=NO
TEST_GROUP_EXPLICIT_TEST_REGISTRY_AVAILABLE=YES

TF02_RUNTIME_FIXTURE_CHANGES=0
TF04_RUNTIME_FIXTURE_CHANGES=0
TF05_RUNTIME_FIXTURE_CHANGES=0
OWNER_LOCAL_REFERENCE_DEV_RUNTIME_CHANGES=0
SCHEMA_CHANGES=0
MIGRATIONS_CREATED=0

P8_06B_IMPLEMENTATION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_06B_BLOCKERS=NONE
P8_06C_IMPLEMENTATION_AUTHORIZED=NO_WAITING_FOR_P8_06B_MERGE_AND_REVIEW
P8_06D_IMPLEMENTATION_AUTHORIZED=NO_WAITING_FOR_P8_06C_MERGE_AND_REVIEW
IDEMPOTENCY_VERIFIED=NOT_YET_VERIFIED
DISPOSABLE_DB_SEED_RUN_PASS=NOT_YET_VERIFIED
SECOND_SEED_RUN_NO_DUPLICATES=NOT_YET_VERIFIED
PHASE_08_COMPLETE=NO
```

## P8-06C Trailing Current-Authority Handoff

```text
P8_06B_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_147
P8_06C_IMPLEMENTATION_AUTHORIZED=YES_AFTER_P8_06B_PR_147_MERGE
P8_06C_IMPLEMENTATION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_06C_BLOCKERS=NONE
P8_06C_NEW_GROUP_COUNT=1
P8_06C_NEW_GROUP_IDS=admin.test.system-configs
CLEAN_V2_PHASE_ONE_PRODUCT_PROVIDER_DECISION=KEEP_HARNESS_LOCAL_DUE_NO_CANONICAL_CATEGORY_MAPPING
CLEAN_V2_PHASE_ONE_PRODUCT_REMAINS_LOCAL=YES
CLEAN_V2_WISHLIST_WORKFLOW_REMAINS_HARNESS_LOCAL=YES
P8_06D_IMPLEMENTATION_AUTHORIZED=NO_WAITING_FOR_P8_06C_MERGE_AND_REVIEW
IDEMPOTENCY_VERIFIED=NOT_YET_VERIFIED
DISPOSABLE_DB_SEED_RUN_PASS=NOT_YET_VERIFIED
SECOND_SEED_RUN_NO_DUPLICATES=NOT_YET_VERIFIED
PHASE_08_COMPLETE=NO
```

## P8-06D Commerce Harness Shared Provider Consumption Implementation Overlay

PR #148 was human-reviewed, passed the Backend Quality Gate, and merged into
`develop` at `e00639a6aa7f1b5288aa2ca6b479edc0f1a79615`. Current TF-04 and
TF-05 source reconfirmed one direct persisted `seller@example.test` User and
one direct persisted active `Rice` Product in each harness before this change.
Their historical seller UUID was
`22222222-2222-4222-8222-222222222222`; historical Rice UUIDs were
`66666666-6666-4666-8666-666666666666` in TF-04 and
`44444444-4444-4444-8444-444444444444` in TF-05.

Both harnesses now explicitly execute the existing
`users.test.identities` -> `products.test.catalog` TEST DAG. A minimal
TEST-only adapter runs the existing group implementations, registers each
result with `SeedOutputRegistry`, preserves declared dependency views, and
returns a restricted output view over only those executed groups. The adapter
contains no fixture payload or generated reusable ID, initializes no
DataSource, and does not change the generic `SeedOrchestrator` API.

TF-04 and TF-05 resolve the actual seller UUID using
`user.id.by-email` / `seller@example.test` and the actual Product UUID using
`product.id.by-sku` / `TEST-COMMERCE-RICE-001`. Neither harness imports a User
or Product entity/repository to rediscover IDs. Their local direct SQL now
retains only unrelated actors. Since both harnesses previously seeded directly
through their initialized DataSource without a fixture transaction, provider
execution and remaining local fixture writes retain that same boundary.

TF-04 retains the unpersisted `FRACTIONAL_PRODUCT` compatibility reader stub
and all three test cases and 41 expectation calls. TF-05 retains all five test
cases, 21 expectation calls, six `Promise.all`/`Promise.allSettled` concurrency
sites, and all repository transaction/locking behavior.

```text
P8_06B_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_147
P8_06C_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_148
P8_06D_IMPLEMENTATION_AUTHORIZED=YES_AFTER_P8_06C_PR_148_MERGE

TF04_DIRECT_REUSABLE_USER_FIXTURE_COUNT_BEFORE=1
TF04_DIRECT_REUSABLE_USER_FIXTURE_COUNT_AFTER=0
TF04_DIRECT_REUSABLE_PRODUCT_FIXTURE_COUNT_BEFORE=1
TF04_DIRECT_REUSABLE_PRODUCT_FIXTURE_COUNT_AFTER=0
TF04_SHARED_SELLER_SOURCE=users.test.identities
TF04_SHARED_PRODUCT_SOURCE=products.test.catalog
TF04_SELLER_ID_SOURCE=SEED_OUTPUT_user.id.by-email
TF04_PRODUCT_ID_SOURCE=SEED_OUTPUT_product.id.by-sku
TF04_HISTORICAL_RICE_UUID_USED_AS_REUSABLE_PARENT=NO
TF04_FRACTIONAL_PRODUCT_STUB_PRESERVED=YES
TF04_FRACTIONAL_PRODUCT_PERSISTED_BY_TEST_PROVIDER=NO
TF04_PROVIDER_TRANSACTION_BOUNDARY=SAME_AS_CURRENT_FIXTURE_BOUNDARY
TF04_SHARED_TEST_PROVIDER_EXECUTION=YES

TF05_DIRECT_REUSABLE_USER_FIXTURE_COUNT_BEFORE=1
TF05_DIRECT_REUSABLE_USER_FIXTURE_COUNT_AFTER=0
TF05_DIRECT_REUSABLE_PRODUCT_FIXTURE_COUNT_BEFORE=1
TF05_DIRECT_REUSABLE_PRODUCT_FIXTURE_COUNT_AFTER=0
TF05_SHARED_SELLER_SOURCE=users.test.identities
TF05_SHARED_PRODUCT_SOURCE=products.test.catalog
TF05_SELLER_ID_SOURCE=SEED_OUTPUT_user.id.by-email
TF05_PRODUCT_ID_SOURCE=SEED_OUTPUT_product.id.by-sku
TF05_HISTORICAL_RICE_UUID_USED_AS_REUSABLE_PARENT=NO
TF05_CONCURRENCY_ASSERTION_COUNT_REDUCED=NO
TF05_CONCURRENCY_BEHAVIOR_CHANGED=NO
TF05_TRANSACTION_OR_LOCKING_SEMANTICS_CHANGED=NO
TF05_PROVIDER_TRANSACTION_BOUNDARY=SAME_AS_CURRENT_FIXTURE_BOUNDARY
TF05_SHARED_TEST_PROVIDER_EXECUTION=YES

TF04_DIRECT_BUSINESS_FIXTURE_WRITE_COUNT_BEFORE=2
TF04_DIRECT_BUSINESS_FIXTURE_WRITE_COUNT_AFTER=1
TF05_DIRECT_BUSINESS_FIXTURE_WRITE_COUNT_BEFORE=2
TF05_DIRECT_BUSINESS_FIXTURE_WRITE_COUNT_AFTER=1

TEST_OUTPUT_EXECUTION_ADAPTER_CREATED=YES
TEST_OUTPUT_EXECUTION_ADAPTER_SCOPE=TEST_ONLY_SHARED_USERS_PRODUCTS_DAG_OUTPUT_VIEW
GENERIC_SEED_ORCHESTRATOR_API_CHANGED=NO
P8_06D_NEW_BUSINESS_TEST_GROUP_COUNT=0
CROSS_OWNER_TEST_REPOSITORY_LOOKUP_ADDED=0
CROSS_OWNER_TEST_ENTITY_IMPORT_ADDED=0
NORMAL_APPLICATION_TEST_REGISTRATION_ADDED=NO
NORMAL_DEV_REFERENCE_CLI_TEST_REGISTRATION_ADDED=NO
TF04_P8_06A_TARGET_GUARD_PRESERVED=YES
TF05_P8_06A_TARGET_GUARD_PRESERVED=YES
TEST_FIXTURE_PRODUCTION_REACHABLE=NO

USERS_TEST_PROVIDER_RUNTIME_CHANGES=0
PRODUCTS_TEST_PROVIDER_RUNTIME_CHANGES=0
ADMIN_SYSTEM_CONFIG_TEST_PROVIDER_RUNTIME_CHANGES=0
TF02_RUNTIME_FIXTURE_CHANGES=0
TF08_RUNTIME_FIXTURE_CHANGES=0
TF08_PRODUCTS_MOVED_TO_TEST_PROVIDER=NO
CLEAN_V2_RAW_SQL_BUSINESS_FIXTURE_WRITE_COUNT_AFTER=14
SCHEMA_CHANGES=0
MIGRATIONS_CREATED=0
REFERENCE_DEV_SEED_PAYLOAD_CHANGES=0

P8_06D_IMPLEMENTATION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_06D_BLOCKERS=NONE
P8_06E_IMPLEMENTATION_AUTHORIZED=NO_WAITING_FOR_P8_06D_MERGE_AND_REVIEW
IDEMPOTENCY_VERIFIED=NOT_YET_VERIFIED
DISPOSABLE_DB_SEED_RUN_PASS=NOT_YET_VERIFIED
SECOND_SEED_RUN_NO_DUPLICATES=NOT_YET_VERIFIED
PHASE_08_COMPLETE=NO
```

## P8-06D1 DataSource Target Binding Corrective Audit Overlay

The PR #149 pre-merge review identified a defense-in-depth gap: request seed
safety was established before repository use, but the supplied `DataSource`
target was not independently bound to that request. P8-06D1 retains the
request guard, derives the actual target solely from `DataSource.options`, and
passes split or URL-based PostgreSQL values through the existing P8-06A target
guard. Exact validated database and normalized-host equality is then required
before `createSharedTestIdentitySeedGroups` can obtain a repository.

Database-free tests prove protected and different databases, unauthorized and
mismatched hosts, missing and ambiguous actual options, URL mismatches, and
unknown non-PostgreSQL targets all reject before `getRepository`. A matching
safe local target proceeds through mocked repositories and still returns the
declared Users and Products outputs.

```text
P8_06D_PRE_MERGE_SAFETY_REVIEW=BLOCKED_DATASOURCE_TARGET_NOT_BOUND
P8_06D1_DATASOURCE_TARGET_BINDING=IMPLEMENTED_PENDING_HUMAN_REVIEW
TEST_OUTPUT_EXECUTOR_REQUEST_TARGET_BOUND=YES
TEST_OUTPUT_EXECUTOR_ACTUAL_DATASOURCE_TARGET_BOUND=YES
REQUEST_DATABASE_EQUALS_DATASOURCE_DATABASE=YES_BEFORE_WRITES
ACTUAL_DATASOURCE_HOST_ALLOWLIST_VALIDATED=YES
REQUEST_DATASOURCE_DATABASE_MISMATCH_POLICY=FAIL_CLOSED
REQUEST_DATASOURCE_HOST_MISMATCH_POLICY=FAIL_CLOSED
UNKNOWN_DATASOURCE_TARGET_POLICY=FAIL_CLOSED
DATASOURCE_TARGET_RESOLUTION_AMBIGUOUS=REJECT
DATASOURCE_TARGET_RESOLUTION_MISSING=REJECT
REMOTE_ACTUAL_DATASOURCE_DEFAULT=DENY
UNKNOWN_ACTUAL_DATASOURCE_HOST=FAIL_CLOSED
SAFE_REQUEST_PLUS_PROTECTED_ACTUAL_DATASOURCE=REJECTED
SAFE_REQUEST_PLUS_DIFFERENT_DISPOSABLE_DATASOURCE=REJECTED
SAFE_REQUEST_PLUS_REMOTE_ACTUAL_DATASOURCE=REJECTED
MATCHING_SAFE_REQUEST_AND_DATASOURCE=PASS
GET_REPOSITORY_CALL_COUNT_AFTER_REJECTION=0
GET_REPOSITORY_BEFORE_TARGET_VALIDATION=NO
DATASOURCE_URL_TARGET_MISMATCH=REJECT

TF04_DIRECT_SHARED_SELLER_FIXTURE_EXISTS=NO
TF04_DIRECT_SHARED_RICE_PRODUCT_FIXTURE_EXISTS=NO
TF05_DIRECT_SHARED_SELLER_FIXTURE_EXISTS=NO
TF05_DIRECT_SHARED_RICE_PRODUCT_FIXTURE_EXISTS=NO
TF04_FRACTIONAL_PRODUCT_STUB_PRESERVED=YES
TF05_CONCURRENCY_ASSERTION_COUNT_REDUCED=NO
TF05_CONCURRENCY_BEHAVIOR_CHANGED=NO
TF05_TRANSACTION_OR_LOCKING_SEMANTICS_CHANGED=NO
TEST_OUTPUT_EXECUTION_ADAPTER_SCOPE=TEST_ONLY_SHARED_USERS_PRODUCTS_DAG_OUTPUT_VIEW
GENERIC_SEED_ORCHESTRATOR_API_CHANGED=NO
P8_06D_NEW_BUSINESS_TEST_GROUP_COUNT=0
USERS_TEST_PROVIDER_RUNTIME_CHANGES=0
PRODUCTS_TEST_PROVIDER_RUNTIME_CHANGES=0
ADMIN_SYSTEM_CONFIG_TEST_PROVIDER_RUNTIME_CHANGES=0
TF02_RUNTIME_FIXTURE_CHANGES=0
TF08_RUNTIME_FIXTURE_CHANGES=0

P8_06D_IMPLEMENTATION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_06D_BLOCKERS=NONE
P8_06E_IMPLEMENTATION_AUTHORIZED=NO_WAITING_FOR_CORRECTED_P8_06D_PR_149_MERGE_AND_REVIEW
IDEMPOTENCY_VERIFIED=NOT_YET_VERIFIED
DISPOSABLE_DB_SEED_RUN_PASS=NOT_YET_VERIFIED
SECOND_SEED_RUN_NO_DUPLICATES=NOT_YET_VERIFIED
PHASE_08_COMPLETE=NO
```
