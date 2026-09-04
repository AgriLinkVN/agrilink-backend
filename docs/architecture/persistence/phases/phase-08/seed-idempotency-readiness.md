# P8-08 Seed Idempotency And Retry Readiness

## Scope and authority

PR #151 was human-reviewed, passed the Backend Quality Gate, and merged into
`develop` at `eb25bddebf35be98c9f1a59448016c47fcef47e3`. P8-08 audits the
resulting 11 canonical SeedGroups and applies only bounded owner-local
corrections. This is a static, database-free readiness result. P8-09 retains
authority for first-run, interrupted-run retry, and second-run proof against a
disposable PostgreSQL database.

```text
P8_06_TEST_FIXTURE_OWNERSHIP_STATUS=COMPLETE_BY_MERGED_PR_150
P8_07_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_151
P8_07_CANONICAL_DAG_STATUS=COMPLETE_BY_MERGED_PR_151
DEPENDENCY_DAG_REQUIRED=SATISFIED_BY_MERGED_PR_151
CENTRAL_SEEDER_ORCHESTRATION_ONLY=SATISFIED_BY_MERGED_PR_151
```

## Canonical group readiness matrix

`RECONCILE` means mutable declared state is updated on an existing row.
`PRESERVE` means the existing persisted value is intentionally excluded from
the update payload. Schema-unique `findOne` lookups cannot return multiple rows;
every array-returning lookup explicitly rejects cardinality greater than one.

| Group | Class | Owner | Stable identity fields | Lookup model | Absent | Present | Ambiguity | Identity mutated | Generated/position/count lookup | Nondeterministic declaration fields | Second-run risk | Partial retry | Readiness |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `ads.reference.packages` | REFERENCE | ads | `packageCode` | per-code array lookup | CREATE | RECONCILE mutable package metadata | explicit `> 1` rejection | NO | NO / NO / NO | none | NONE | per-record convergence | READY |
| `geography.reference.provinces` | REFERENCE | geography | `code` | schema-unique code `findOne` | CREATE | RECONCILE name, slug, region, coordinates | database uniqueness | NO | NO / NO / NO | none | NONE | per-record convergence | READY |
| `products.reference.categories` | REFERENCE | products | `slug` | schema-unique slug `findOne` | CREATE | RECONCILE mutable category metadata | database uniqueness | NO | NO / NO / NO | none | NONE | per-record convergence | READY |
| `users.dev.users` | DEV | users | `phone` and `email`, resolving together | two schema-unique `findOne` lookups | CREATE with one lazily generated hash | RECONCILE non-identity account state; PRESERVE password hash | uniqueness plus split/partial identity rejection | NO | NO / NO / NO | `passwordHash` from salted bcrypt | NONE after create-only correction | all identities preflight before writes; per-record convergence | READY |
| `cooperatives.dev.members` | DEV | cooperatives | `cooperativeId`, `farmerId` | exact pair array lookup | CREATE | RECONCILE status and role; PRESERVE `joinedAt` | explicit `> 1` rejection | NO | NO / NO / NO | create-time `joinedAt` | NONE; create-only | per-record convergence | READY |
| `products.dev.products` | DEV | products | Product `sku`; Image `productId` + primary slot; Certification `productId` + `certNumber` | three exact array lookups | CREATE each absent parent/child | RECONCILE mutable parent/child payloads | explicit `> 1` rejection at every level | NO | NO / NO / NO | none; all declared dates are fixed literals | NONE | parent and each child independently converge | READY |
| `profiles.dev.role-profiles` | DEV | profiles | `userId` plus subtype schema-backed unique fields | all unique aliases preflight and must resolve together | CREATE | RECONCILE mutable profile state; PRESERVE create-time `verifiedAt` | database uniqueness plus split/partial identity rejection | NO | NO / NO / NO | create-time `verifiedAt` | NONE after create-only correction | all identities preflight before writes; per-record convergence | READY |
| `reviews.dev.product-feedback` | DEV | reviews | `reviewerId`, `productId` | exact pair array lookup | CREATE | RECONCILE mutable review state | explicit `> 1` rejection | NO | NO / NO / NO | none | NONE | per-record convergence | READY |
| `users.test.identities` | TEST | users | `email` | exact email array lookup | CREATE with fixed declared hash | RECONCILE non-identity account state; PRESERVE password hash | explicit `> 1` rejection | NO | NO / NO / NO | none | NONE | per-record convergence | READY |
| `products.test.catalog` | TEST | products | `sku` | exact SKU array lookup | CREATE | RECONCILE mutable catalog state | explicit `> 1` rejection | NO | NO / NO / NO | none | NONE | per-record convergence | READY |
| `admin.test.system-configs` | TEST | admin | `key` | exact key array lookup | CREATE | RECONCILE value only | explicit `> 1` rejection | NO | NO / NO / NO | none | NONE | per-record convergence | READY |

All groups satisfy duplicate readiness, state readiness, and structural retry
convergence independently. The seven output-producing groups publish IDs from
the row returned by create or the persisted row found during reconciliation;
none publishes a declaration-generated ID, position, or count. Actual output
stability across PostgreSQL executions remains a P8-09 proof obligation.

## Field policy and corrections

| Group | Identity | Mutable reconciled | Create only | Preserve existing | P8-08 correction |
| --- | --- | --- | --- | --- | --- |
| `geography.reference.provinces` | `code` | all other declared fields | generated primary ID | identity | exclude `code` from update type and payload |
| `products.reference.categories` | `slug` | all other declared fields | generated primary ID | identity | exclude `slug` from update type and payload |
| `users.dev.users` | `phone`, `email` | role, status, name, verification flags | salted `passwordHash` | identity and password hash | preflight both identities, reject partial/split matches, hash only when creation is needed, and exclude identity/hash from updates |
| `products.dev.products` | `sku`; child identity tuples | all non-identity Product, Image, and Certification fields | generated primary IDs | all parent/child identity fields | use explicit mutable Product and child payloads |
| `profiles.dev.role-profiles` | `userId` plus subtype unique aliases | non-identity profile fields | runtime `verifiedAt` where declared | identity and existing `verifiedAt` | require all unique aliases to resolve together and exclude identity/create-only timestamp fields from updates |
| `reviews.dev.product-feedback` | `reviewerId`, `productId` | rating, comment, status | generated primary ID | identity pair | exclude the pair from update type and payload |
| `users.test.identities` | `email` | role, status, name, verification flags | fixed declared `passwordHash` | identity and password hash | exclude identity/hash from updates |

The other four groups already had selective owner-local update contracts and
needed no runtime correction. There is no blind complete-object update after
these corrections.

## Nondeterministic value decisions

| Group | Field | Source | Why nondeterministic | Second-run effect | Decision |
| --- | --- | --- | --- | --- | --- |
| `users.dev.users` | `passwordHash` | `bcrypt.hash("demo123", 10)` | bcrypt creates a fresh salt | would produce different bytes if regenerated | `PRESERVE_EXISTING_VALUE`; generate lazily only for absent users |
| `cooperatives.dev.members` | `joinedAt` | injected `now`, defaulting to `new Date()` | wall-clock creation time | none because updates exclude it | `REMOVE_FROM_RECONCILIATION`; create-only |
| `profiles.dev.role-profiles` | `verifiedAt` | fixture builder default `new Date()` | wall-clock fixture construction time | none because updates exclude it | `PRESERVE_EXISTING_VALUE`; create-only |

All Product harvest, expiry, issued, and certification expiry dates are fixed
declared date literals rather than execution-time values. The TEST User hash is
a fixed historical fixture value and is also preserved on reconciliation.

```text
NONDETERMINISTIC_DECLARATION_FIELD_COUNT=3
TIMESTAMP_SECOND_RUN_DRIFT_COUNT=0
USERS_DEV_PASSWORD_HASH_SECOND_RUN_DRIFT=NO
USERS_TEST_PASSWORD_HASH_SECOND_RUN_DRIFT=NO
```

## Products child reconciliation

| Child table | Parent stable key | Child stable identity | Absent | Present | Delete/recreate | Duplicate risk | Partial retry risk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `product_images` | Product `sku`, resolved to persisted Product ID | persisted Product ID + primary slot | create one primary image | update mutable URL, alt text, and order | NO | NONE; `> 1` primary rows fail closed | NONE; rerun resumes after Product reconciliation |
| `product_certifications` | Product `sku`, resolved to persisted Product ID | persisted Product ID + `certNumber` | create certification | update mutable certificate metadata | NO | NONE; `> 1` pair matches fail closed | NONE; rerun resumes per certificate |

## Exit status

```text
CANONICAL_SEED_GROUP_COUNT=11
REFERENCE_GROUP_COUNT=3
DEV_GROUP_COUNT=5
TEST_GROUP_COUNT=3
CURRENT_TEST_GROUP_COUNT=3
ALL_CANONICAL_GROUPS_IDEMPOTENCY_AUDITED=YES
READY_GROUP_COUNT=11
CORRECTION_REQUIRED_GROUP_COUNT=0
BLOCKED_GROUP_COUNT=0

WHOLE_TABLE_IDEMPOTENCY_GUARD_COUNT=0
GENERATED_ID_RECONCILIATION_COUNT=0
POSITIONAL_RECONCILIATION_COUNT=0
IDENTITY_MUTATION_RISK_COUNT=0
COMPOSITE_FIXTURE_IDENTITY_UNRESOLVED_COUNT=0
FULL_OBJECT_BLIND_UPDATE_GROUP_COUNT=0
PRODUCT_DEV_CHILD_DUPLICATE_RISK_COUNT=0
NON_RETRYABLE_CANONICAL_GROUP_COUNT=0
UNSTABLE_SEED_OUTPUT_COUNT=0
AMBIGUOUS_IDENTITY_FAIL_CLOSED_GROUP_COUNT=11

REFERENCE_IDEMPOTENCY_READINESS=YES
P8_08_NEW_TEST_GROUP_COUNT=0
TEST_OUTPUT_EXECUTOR_ACTUAL_DATASOURCE_TARGET_BOUND=YES
CENTRAL_ORCHESTRATOR_IDEMPOTENCY_BUSINESS_LOGIC_ADDED=NO
CENTRAL_ORCHESTRATOR_BUSINESS_WRITE_COUNT=0
CROSS_OWNER_SEED_REPOSITORY_ACCESS_ADDED=NO
CROSS_OWNER_SEED_ENTITY_ACCESS_ADDED=NO
OWNER_LOCAL_SEED_RUNTIME_CORRECTION_COUNT=7
SCHEMA_CHANGES=0
MIGRATIONS_CREATED=0

P8_08_READINESS_AUTHORIZED=YES
P8_08_IMPLEMENTATION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_08_READINESS_STATUS=READY_FOR_DISPOSABLE_DB_VERIFICATION_PENDING_HUMAN_REVIEW
P8_08_BLOCKERS=NONE

IDEMPOTENCY_VERIFIED=NOT_YET_VERIFIED
SECOND_SEED_RUN_NO_DUPLICATES=NOT_YET_VERIFIED
DISPOSABLE_DB_SEED_RUN_PASS=NOT_YET_VERIFIED
P8_09_IMPLEMENTATION_AUTHORIZED=NO_WAITING_FOR_P8_08_MERGE_AND_REVIEW
PHASE_08_COMPLETE=NO
```

## Static evidence

- [P8-08 database-free readiness specification](../../../../../src/database/reconciliation/seed-idempotency-readiness.spec.ts)
- [P8-07 canonical DAG closure specification](../../../../../src/database/reconciliation/canonical-seed-dag-closure.spec.ts)
- [Seed inventory](seed-inventory.md)
- [TEST fixture ownership audit](test-fixture-ownership-audit.md)

No DataSource was initialized, no SeedGroup or TEST fixture was executed, and
no SQL, migration, protected local database, or production database was used
for this audit.

## P8-09A Canonical Schema Migration Parity Correction Overlay

P8-09 remains a failed runtime proof: migration head lacked the
`cooperative_members` table required by `cooperatives.dev.members`. P8-09A
corrects only that migration parity gap; it does not convert the failed seed
proof into idempotency success. See
[canonical-schema-migration-parity.md](canonical-schema-migration-parity.md).

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
