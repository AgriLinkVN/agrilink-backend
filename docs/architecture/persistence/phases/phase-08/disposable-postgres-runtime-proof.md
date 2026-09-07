# P8-09 Disposable PostgreSQL Runtime Verification Rerun

## Scope and handoff

PR #153 was human-reviewed, passed the Backend Quality Gate, and merged into
`develop` as `2ffe4db08e3e57b252bb714d51a1897ea8f8a881`. Its forward migration
restored `public.cooperative_members`, resolving the schema blocker found by
the first P8-09 attempt. This rerun preserves that first failure as historical
evidence and replaces it as the current runtime result only after executing the
complete canonical plan against two new disposable PostgreSQL databases.

```text
P8_08_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_152
P8_09A_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_153
P8_09A_SCHEMA_PARITY_STATUS=CORRECTED_BY_MERGED_PR_153
V2_MIGRATION_COUNT=6
LATEST_MIGRATION=RestoreCanonicalCooperativeMemberSchema1800000005000
CANONICAL_SEEDED_TABLE_COUNT=14
P8_09_NEW_BUSINESS_SEED_GROUP_COUNT=0
```

## Guarded execution

The opt-in proof uses the existing database-target guard and disposable
database lifecycle helper. Both generated names begin with
`agrilink_persistence_test_p8_09_`, the connection host is loopback, and the
request target is compared with the initialized DataSource target before any
TEST repository is obtained. `DATABASE_URL` is absent and schema
synchronization remains disabled.

Database A proves first-run and second-run convergence. Database B proves
recovery after an intentional stop at a committed SeedGroup boundary. Each
database starts empty, applies all six V2 migrations, has zero pending
migrations, contains `public.cooperative_members`, and passes canonical
migration-head parity before any SeedGroup executes.

```text
TARGET_HOST_ALLOWLIST_VALIDATED=YES
TARGET_DATABASE_DISPOSABLE_NAME_VALIDATED=YES
TEST_OUTPUT_EXECUTOR_REQUEST_TARGET_BOUND=YES
TEST_OUTPUT_EXECUTOR_ACTUAL_DATASOURCE_TARGET_BOUND=YES
GET_REPOSITORY_BEFORE_TARGET_VALIDATION=NO
MIGRATIONS_APPLIED_COUNT=6
MIGRATIONS_APPLIED_TO_HEAD=YES
PENDING_MIGRATION_COUNT=0
SYNCHRONIZE_USED=NO
COOPERATIVE_MEMBERS_PRESENT_AT_HEAD=YES
MISSING_CANONICAL_TABLE_COUNT_AFTER_FIX=0
CANONICAL_SCHEMA_COLUMN_MISMATCH_COUNT_AFTER_FIX=0
CANONICAL_SCHEMA_CONSTRAINT_MISMATCH_COUNT_AFTER_FIX=0
```

## Canonical execution and output stability

The existing DAG and owner factories execute three REFERENCE, five DEV, and
three TEST groups. REFERENCE and DEV use the development classification
contract; TEST uses its separate test-only contract against the same validated
DataSource. The harness copies no fixture payload and introduces no SeedGroup.

Every returned binding is captured as group ID, output kind, stable key, and
persisted ID. Run one and run two each captured 161 bindings. The complete
binding arrays are equal, proving that every output-producing stable identity
resolved to the same persisted primary ID on the second run.

```text
RUNTIME_CANONICAL_GROUP_COUNT=11
FIRST_RUN_EXECUTED_GROUP_COUNT=11
FIRST_RUN_SEED_SUCCESS=YES
SEED_OUTPUT_BINDING_COUNT_RUN1=161
SECOND_RUN_EXECUTED_GROUP_COUNT=11
SECOND_RUN_SEED_SUCCESS=YES
SEED_OUTPUT_BINDING_COUNT_RUN2=161
UNSTABLE_RUNTIME_SEED_OUTPUT_COUNT=0
```

## Managed-table count stability

No truncate, delete-all, reset, database recreation, or migration rollback
occurs between Database A's runs. All 14 canonically managed tables retain
their exact row counts.

| Table | First run | Second run | Delta |
| --- | ---: | ---: | ---: |
| `ad_packages` | 3 | 3 | 0 |
| `provinces` | 34 | 34 | 0 |
| `product_categories` | 37 | 37 | 0 |
| `users` | 19 | 19 | 0 |
| `cooperative_members` | 1 | 1 | 0 |
| `products` | 70 | 70 | 0 |
| `product_images` | 67 | 67 | 0 |
| `product_certifications` | 4 | 4 | 0 |
| `farmer_profiles` | 4 | 4 | 0 |
| `cooperative_profiles` | 3 | 3 | 0 |
| `enterprise_profiles` | 3 | 3 | 0 |
| `supplier_profiles` | 2 | 2 | 0 |
| `reviews` | 9 | 9 | 0 |
| `system_configs` | 1 | 1 | 0 |

```text
SECOND_RUN_MANAGED_TABLE_COUNT_DELTA=0
PRODUCT_COUNT_DELTA=0
PRODUCT_IMAGE_COUNT_DELTA=0
PRODUCT_CERTIFICATION_COUNT_DELTA=0
```

## Identity and declared-state stability

The proof checks package code, province code, category slug, User email and
phone, Product SKU, cooperative/member pair, reviewer/Product pair,
Product/primary-image slot, Product/certificate number, every profile subtype
identity, and system-config key. Both runs have zero duplicate logical
identities. A complete row snapshot excluding only database-managed
`updated_at` is stable between the two runs. Separate equality checks retain
both DEV and TEST password hashes without printing them, plus member
`joined_at` and profile `verified_at` create-only values.

```text
FIRST_RUN_LOGICAL_IDENTITY_DUPLICATE_COUNT=0
SECOND_RUN_LOGICAL_IDENTITY_DUPLICATE_COUNT=0
DECLARED_FIXTURE_STATE_DRIFT_COUNT=0
USERS_DEV_PASSWORD_HASH_CHANGED_ON_SECOND_RUN=NO
USERS_TEST_PASSWORD_HASH_CHANGED_ON_SECOND_RUN=NO
CREATE_ONLY_TIMESTAMP_CHANGED_ON_SECOND_RUN_COUNT=0
DUPLICATE_PRIMARY_IMAGE_IDENTITY_COUNT=0
DUPLICATE_PRODUCT_CERT_IDENTITY_COUNT=0
```

## Interrupted-run retry

Database B first executes the valid four-group prefix through
`users.dev.users`, then stops at that group boundary without reset or cleanup.
Executing the complete canonical plan afterward succeeds with no duplicate
identity. Counts match Database A and a normalized semantic snapshot confirms
the same final declared state while allowing database-generated UUIDs, hashes,
and create-time timestamps to differ between independently created databases.

The Product group has no safe test-only injection point inside its owner-local
multi-table writer, so this slice does not manufacture a partial child state or
redesign production code.

```text
INTERRUPTED_RUN_COMPLETED_GROUP_COUNT=4
INTERRUPTED_RUN_STOP_POINT=AFTER_users.dev.users
INTERRUPTED_RUN_RETRY_SUCCESS=YES
INTERRUPTED_RUN_RETRY_DUPLICATE_COUNT=0
INTERRUPTED_RUN_RETRY_FINAL_STATE_MATCHES_FRESH_RUN=YES
PRODUCT_DEV_PARTIAL_GROUP_RETRY_PROOF=NOT_EXECUTED_NO_SAFE_INJECTION_POINT
```

## Cleanup and current phase handoff

Each proof execution destroyed both initialized DataSources and dropped both
databases it created. The harness was executed once to establish the result and
once after all static gates as final validation, so task-level cleanup accounts
for four created and four dropped databases. No protected, remote, staging,
Railway, or production database was accessed.

```text
PROTECTED_LOCAL_DB_ACCESSED=NO
PRODUCTION_DB_ACCESSED=NO
REMOTE_DATABASE_ACCESSED=NO
PROOF_DATABASES_PER_EXECUTION=2
PROOF_EXECUTION_COUNT=2
DISPOSABLE_DATABASES_CREATED=4
DISPOSABLE_DATABASES_DROPPED=4
P8_09_CLEANUP_STATUS=PASS

P8_09_IMPLEMENTATION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_09_RUNTIME_STATUS=PASS_PENDING_HUMAN_REVIEW
P8_09_BLOCKERS=NONE
IDEMPOTENCY_VERIFIED=YES
SECOND_SEED_RUN_NO_DUPLICATES=YES
DISPOSABLE_DB_SEED_RUN_PASS=YES
P8_10_IMPLEMENTATION_AUTHORIZED=NO_WAITING_FOR_P8_09_MERGE_AND_REVIEW
PHASE_08_COMPLETE=NO
```

## Evidence

- [Guarded P8-09 integration proof](../../../../../test/persistence-phase-8/seed-idempotency-runtime.integration-spec.ts)
- [Opt-in Jest configuration](../../../../../test/jest-persistence-phase-8-runtime.json)
- [P8-09A migration parity correction](canonical-schema-migration-parity.md)
- [P8-08 idempotency readiness](seed-idempotency-readiness.md)
- [Canonical seed inventory](seed-inventory.md)
