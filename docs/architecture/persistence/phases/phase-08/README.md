# Phase 8 - Module-Owned Seeders

- Phase status: `IMPLEMENTATION_IN_PROGRESS`
- Implementation authorized: C2B, C2C, and C2D1 Member ownership are merged;
  Bulk Listing and Harvest retain domain-identity blockers
- Current implementation: scalar-only dependency outputs, dependency-scoped
  lookup, two owner-local REFERENCE groups, ten-record Users DEV, canonical
  63-record Products DEV with four deterministic Certifications, Profiles DEV
  ownership, Reviews DEV ownership, Cooperatives Member DEV ownership, and the
  temporary dependency-scoped central continuation; C1, C2B, C2C, and central
  Member writes are retired
- Implementation base: `develop` at P8-05C3A merge commit
  `5ad0b67c7c45bc3432e3075a6b779df9936ac484` (PR #119)
- Dependency: Phase 7B implementation PR #102, merged with a successful Backend Quality Gate
- Planned implementation branch: `refactor/persistence-phase-8-seed-ownership`
- Kickoff documentation branch: `docs/persistence-phase-8-seed-ownership`

## Objective

Establish the reviewed design and source inventory required to move seed
ownership to the bounded context that owns each canonical writable persistence
mapping. A central runner may remain, but only as an ordering and invocation
mechanism for module-owned seed contracts.

The static inventory is recorded in [seed-inventory.md](seed-inventory.md).
The scalar dependency decision is recorded in
[seed-dependency-contract.md](seed-dependency-contract.md).
The complete central development-service plan is recorded in
[dev-seed-service-decomposition.md](dev-seed-service-decomposition.md).
The C1 User, Address, Profile, Logistics, and Geography decisions are recorded
in [dev-seed-c1-decisions.md](dev-seed-c1-decisions.md).
The Product-dependent C2 fixture audit and decisions are recorded in
[dev-seed-c2-decisions.md](dev-seed-c2-decisions.md).
The Cooperative operation identity audit and decisions are recorded in
[dev-seed-c2d-decisions.md](dev-seed-c2d-decisions.md).
The standalone Admin DEV identity, overlap, and ownership decisions are
recorded in [admin-dev-seed-decisions.md](admin-dev-seed-decisions.md).

## Scope

- Classify executable seed and seed-like sources as `REFERENCE_SEED`,
  `DEV_SEED`, `TEST_SEED`, `BOOTSTRAP_OR_STARTUP_SEED`,
  `MIGRATION_DATA_BACKFILL`, or `UNKNOWN_REQUIRES_REVIEW`.
- Map every inventoried write to the canonical owner in
  `../../entity-ownership.json` where that registry has an applicable table.
- Record current cross-owner imports, raw TypeORM access, startup reachability,
  idempotency evidence, dependencies, and risks.
- Define the target invariants, dependency-DAG rule, entry/exit gates, and
  future implementation order.
- Preserve historical migrations and operational backfills as a separate
  classification from ordinary seeders.

## Non-Goals

- No business seed payload movement, deletion, retirement, or execution.
- Runtime changes remain limited to shared seed contracts, fail-closed safety
  checks, entrypoint hardening, and orchestration foundation.
- No migration generation, execution, rewrite, or reinterpretation as a
  normal seeder.
- No ownership decision changes. The current ownership registry remains
  canonical for Phase 8.
- No database connection, SQL, DDL, DML, schema synchronization, or inspection
  of protected or production environments.
- No approval of any proposed disposition in the inventory.

## Architecture Invariants

### ONE_SEED_OWNER_PER_TABLE

The bounded context that owns the canonical writable mapping owns every
`REFERENCE`, `DEV`, and `TEST` seed contract for that table.

### NO_CROSS_OWNER_ENTITY_OR_REPOSITORY_SEEDING

A module seeder must not import another bounded context's TypeORM entity or
writable repository merely to seed that context's tables. Cross-module seed
dependencies use explicit contracts and scalar identifiers.

### CENTRAL_RUNNER_IS_ORCHESTRATOR_ONLY

A central runner may validate the environment, build the dependency DAG,
determine deterministic ordering, and invoke module contracts. It must not
contain the business-specific persistence writes for every module.

### SEED_CLASSIFICATION_REQUIRED

Every executable seed group is explicitly classified as `REFERENCE`, `DEV`, or
`TEST`. Production-safe reference data must not silently include development,
demo, administrative-dashboard, or test fixture data.

### IDEMPOTENCY_REQUIRED

Running the same approved seeder more than once must not create duplicate
canonical data. Whole-table `count() > 0` guards are not sufficient for
convergent recovery from a partially seeded database.

### DEPENDENCY_DAG_REQUIRED

Every prerequisite is explicit, deterministic, and cycle-checked. Incidental
module import order, object enumeration order, or startup provider order is not
a seed dependency contract.

### DEPENDENCY_OUTPUTS_ARE_SCALAR_AND_SCOPED

Generated identifiers cross SeedGroup boundaries only as validated
`string | number | boolean` bindings. A consumer can read outputs only from
producer group IDs declared in its dependency metadata. The execution-local
registry is in memory and never transports entities, repositories, persistence
adapters, credentials, or secrets.

### NO_PROTECTED_ENVIRONMENT_EXECUTION_DURING_REFACTOR

Implementation and verification use disposable/test environments only. The
protected local `agrilink_db` and Railway production are outside the execution
scope of Phase 8.

### NO_SYNCHRONIZE

The seed refactor must never depend on TypeORM `synchronize`. A migrated schema
is a precondition, and missing schema must fail closed.

## Seed Classifications

| Classification | Contract                                                                                       |
| -------------- | ---------------------------------------------------------------------------------------------- |
| `REFERENCE`    | Stable domain/reference catalog approved for an explicitly allowed environment.                |
| `DEV`          | Demo, sandbox, dashboard, or developer-convenience data; never production-safe by implication. |
| `TEST`         | Deterministic fixture data scoped to disposable automated-test databases.                      |

`BOOTSTRAP_OR_STARTUP_SEED` identifies an execution path and must delegate to
one or more of the three data classifications above. `MIGRATION_DATA_BACKFILL`
remains migration-governed and is not converted into a seeder.
`UNKNOWN_REQUIRES_REVIEW` blocks execution approval until a human assigns an
explicit classification.

## Ownership Rule

The canonical table owner in `../../entity-ownership.json` owns the seed
contract and the write adapter for that table. A foreign module may express a
dependency on the resulting stable key, but it does not obtain the owner's
entity or repository. Migration-only mappings and historical backfills retain
their migration ownership and review model.

## Dependency DAG Rule

The runner consumes declared seed-group metadata containing a stable group ID,
classification, owner, dependencies, and execution contract. It must reject
duplicate group IDs, missing dependencies, cycles, and classification mixing
that is not explicitly authorized for the target environment.

The kickoff inventory provides evidence for these main dependency families:

```text
Users ---------------------> Profiles
  |------------------------> Products
  |------------------------> Forum / Reviews / Ads / Cooperatives
  `------------------------> Audit Logs / Notifications

Product Categories --------> Products --------> Product Images / Certifications
                                  |------------> Reviews / Harvest Schedules

Forum Posts ---------------> Forum Comments / Likes
Ad Packages ---------------> Ad Campaigns
Bulk Listings -------------> Bulk Listing Contributions
```

The Geography-to-profile/address relationship and the fixed seller IDs used by
the product startup seed require review; they are not promoted to approved DAG
edges by the foundation. File-level edge evidence is in the inventory.

## Idempotency Rule

- Reference seeders use stable natural or reviewed canonical keys and converge
  each record independently.
- Development and test seeders declare whether they reconcile, replace, or
  require an empty disposable database.
- A second execution must produce zero duplicate canonical rows.
- Partial failure followed by retry must have a defined result.
- Destructive reset is a separate, explicitly authorized operation and is not
  treated as idempotency.

## Environment Safety

- `PROTECTED_LOCAL_DB_ACCESSED=NO`
- `PRODUCTION_DB_ACCESSED=NO`
- `SQL=0`
- `DDL=0`
- `DML=0`
- `SEEDS_EXECUTED=0`
- `MIGRATIONS_EXECUTED=0`
- `SYNCHRONIZE=NO`

Phase 8 execution must use a database name accepted by the repository's
disposable-target guard and must keep development/test seed flags false in
production. The kickoff inventory recorded that the standalone admin
development seed defaulted to `agrilink_db`; the P8-03 safety foundation removes
that fallback and requires an explicit disposable target before constructing
its `DataSource`.

## Entry Criteria

| Gate                                    | Kickoff evidence                                                                                             |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `PHASE_7B_SOURCE_IMPLEMENTATION_MERGED` | PR #102 is merged into `develop`; merge commit `b59c191b04d4cffd251319b9bffbdb3202fa99ca`.                   |
| `PERSISTENCE_AUDIT_GREEN`               | Static audit passed with zero violations during kickoff validation; no database execution was permitted.     |
| `OWNERSHIP_REGISTRY_AVAILABLE`          | `docs/architecture/persistence/entity-ownership.json` is present and used as the canonical ownership source. |

## Exit Criteria

The P8-03 foundation does not complete the phase-level exit gates. They remain
open until the existing business seed paths are migrated and verified:

- [ ] `ALL_EXECUTABLE_SEEDERS_CLASSIFIED`
- [ ] `ALL_SEEDED_TABLES_HAVE_ONE_OWNER`
- [ ] `NO_CROSS_OWNER_SEED_REPOSITORY_ACCESS`
- [ ] `REFERENCE_DEV_TEST_SEEDS_SEPARATED`
- [ ] `DEPENDENCY_DAG_EXPLICIT`
- [ ] `IDEMPOTENCY_VERIFIED`
- [ ] `DISPOSABLE_DB_SEED_RUN_PASS`
- [ ] `SECOND_SEED_RUN_NO_DUPLICATES`
- [ ] `NO_PRODUCTION_DB_ACCESS`
- [ ] `NO_PROTECTED_LOCAL_DB_MUTATION`
- [ ] `CENTRAL_SEEDER_ORCHESTRATION_ONLY`

## Implementation Plan

This sequence remains the Phase 8 planning contract. The merged kickoff PR
approved the inventory boundary; this first implementation change establishes
only the P8-03 runway. Per-source ownership migration remains subject to human
review.

| Step  | Planned outcome                                                                  | Status                                                 |
| ----- | -------------------------------------------------------------------------------- | ------------------------------------------------------ |
| P8-01 | Approve the static seed inventory and its inclusion boundary.                    | `APPROVED_BY_MERGED_KICKOFF_PR`                        |
| P8-02 | Approve one seed owner and classification for every seeded table/group.          | `INVENTORY_ACCEPTED_PENDING_PER_SOURCE_IMPLEMENTATION` |
| P8-03 | Define owner-local seed contracts and runner metadata.                           | `IMPLEMENTED_BY_MERGED_PR_105`                         |
| P8-04 | Move/rewrite approved reference seeds under their owners.                        | `IMPLEMENTED_BY_MERGED_PR_106`                         |
| P8-05 | Move/rewrite development seeds under their owners.                               | `IN_PROGRESS`                                          |
| P8-06 | Isolate reusable test fixtures from production/development seeds.                | `NOT_STARTED`                                          |
| P8-07 | Migrate existing business seed paths into module-owned DAG orchestration.        | `NOT_STARTED`                                          |
| P8-08 | Verify per-record convergence, retry behavior, and second-run idempotency.       | `NOT_STARTED`                                          |
| P8-09 | Run clean and repeated seed verification on disposable databases only.           | `NOT_STARTED`                                          |
| P8-10 | Retire superseded central writes and keep any central runner orchestration-only. | `NOT_STARTED`                                          |

## Implementation Status

```text
PHASE_8_STATUS=IMPLEMENTATION_IN_PROGRESS
P8_01_INVENTORY_STATUS=APPROVED_BY_MERGED_KICKOFF_PR
P8_02_OWNERSHIP_STATUS=INVENTORY_ACCEPTED_PENDING_PER_SOURCE_IMPLEMENTATION
P8_03_SEED_FOUNDATION_STATUS=IMPLEMENTED_BY_MERGED_PR_105

SEED_CONTRACTS_IMPLEMENTED=YES
SEED_CLASSIFICATION_IMPLEMENTED=YES
SEED_DAG_VALIDATOR_IMPLEMENTED=YES
DAG_VALIDATION_FOUNDATION=IMPLEMENTED
SEED_ENVIRONMENT_GUARD_IMPLEMENTED=YES
VERIFIED_TARGET_PROPAGATED_TO_SEED_GROUP=YES
PROTECTED_LOCAL_SEED_EXECUTION_BLOCKED=YES
PRODUCTION_SEED_EXECUTION_BLOCKED=YES

P8_04_REFERENCE_SEEDS_STATUS=IMPLEMENTED_BY_MERGED_PR_106
P8_05_DEV_SEEDS_STATUS=IN_PROGRESS
P8_05A_GEOGRAPHY_USERS_DEV_STATUS=IMPLEMENTED_BY_MERGED_PR_107
P8_05B0_DEPENDENCY_OUTPUT_CONTRACT_STATUS=IMPLEMENTED_BY_MERGED_PR_108
P8_05B_PRODUCTS_DEV_STATUS=IMPLEMENTED_BY_MERGED_PR_109
P8_05C0_DEVSEEDSERVICE_PLAN_STATUS=IMPLEMENTED_BY_MERGED_PR_110
P8_05C_DEVSEEDSERVICE_DECOMPOSITION_STATUS=IN_PROGRESS
P8_05C1A_USER_GEOGRAPHY_DECISION_STATUS=IMPLEMENTED_BY_MERGED_PR_111
P8_05C1_IMPLEMENTATION_AUTHORIZED=YES
P8_05C1_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_112
P8_05C2A_PRODUCT_DEPENDENT_DECISION_STATUS=IMPLEMENTED_BY_MERGED_PR_113
HUMAN_PRODUCT_DECISION_STATUS=RESOLVED
P8_05C2B_IMPLEMENTATION_AUTHORIZED=YES
P8_05C2B_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_114
P8_05C2C_DECISION_STATUS=RESOLVED
P8_05C2C_IMPLEMENTATION_AUTHORIZED=YES
P8_05C2C_IMPLEMENTATION_AUTHORIZATION_STATUS=AUTHORIZED_AFTER_PR_114_MERGE
P8_05C2C_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_115
P8_05C2D0_IDENTITY_DECISION_STATUS=IMPLEMENTED_BY_MERGED_PR_116
P8_05C2D_IMPLEMENTATION_AUTHORIZED=NO
P8_05C2D_IMPLEMENTATION_AUTHORIZATION_STATUS=NO_BULK_LISTING_AND_HARVEST_DOMAIN_IDENTITIES
P8_05C2D1_MEMBERS_IMPLEMENTATION_AUTHORIZED=YES_AFTER_PR_116_MERGE
P8_05C2D1_MEMBERS_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_117
P8_05C2D2_BULK_OPERATIONS_IMPLEMENTATION_AUTHORIZED=NO
P8_05C2D2_BULK_OPERATIONS_IMPLEMENTATION_STATUS=NOT_STARTED
P8_05C2D3_HARVEST_IMPLEMENTATION_AUTHORIZED=NO
P8_05C2D3_HARVEST_IMPLEMENTATION_STATUS=NOT_STARTED
P8_05C2D_IMPLEMENTATION_STATUS=IN_PROGRESS
P8_05C2_IMPLEMENTATION_AUTHORIZED=NO
P8_05C2_IMPLEMENTATION_STATUS=IN_PROGRESS
P8_05C3A_FORUM_ADS_DECISION_STATUS=IMPLEMENTED_BY_MERGED_PR_119
P8_05C3_IMPLEMENTATION_STATUS=NOT_STARTED
P8_05C4_IMPLEMENTATION_STATUS=NOT_STARTED
P8_05D_ADMIN_DEV_STATUS=NOT_STARTED
P8_06_TEST_FIXTURE_STATUS=NOT_STARTED
P8_07_ORCHESTRATOR_MIGRATION_STATUS=NOT_STARTED
P8_08_IDEMPOTENCY_STATUS=NOT_STARTED
P8_09_DISPOSABLE_DB_VERIFICATION_STATUS=NOT_STARTED
P8_10_CENTRAL_WRITE_RETIREMENT_STATUS=NOT_STARTED

GEOGRAPHY_REFERENCE_SEED_OWNER=geography
PRODUCTS_REFERENCE_SEED_OWNER=products
REFERENCE_SEED_GROUPS=2
USERS_DEV_SEED_OWNER=users
USERS_DEV_SEED_GROUP=users.dev.users
GEOGRAPHY_DEV_PROVINCE_SEED=RETIRED_REDUNDANT
```

The comprehensive development service and admin development seed still contain
business writes. They are guarded by the shared fail-closed target safety model
and remain scheduled for per-owner migration or retirement in later P8-05
slices, P8-07, and P8-10. P8-05C0 has now audited all 23 central-service tables,
assigned their 10 canonical owners, defined the scalar dependency DAG, and
split implementation into four blocked, reviewable slices. That plan does not
authorize business-code changes. The central CLI delegates its explicit
REFERENCE and DEV selections to owner-local Geography, Products, and Users
groups. Products development now runs as the owner-local
`products.dev.products` group after its
Users and Product Category dependencies. Its legacy Product/Seller sources are
retired, and its old Geography-name behavior is not migrated because the
canonical payload stores no location identifier. The comprehensive central
development service remains P8-05C debt; startup skips only its overlapping
Product/category/image write section after canonical Products DEV has run. The
orchestration-only phase exit criterion is still open, and P8-08 remains
`NOT_STARTED` until runtime and disposable-database idempotency verification is
authorized. The standalone admin development source remains explicitly deferred
to P8-05D.

P8-05C1A resolved the C1 entry decisions without changing seed behavior. PR
#112 then implemented the ten-identity Users DEV payload and owner-local
Profiles DEV group, retired the deferred Address and Logistics central writes,
and retained `legacy.dev.remaining` as temporary C2/C3/C4 compatibility
scaffolding. Numeric Address/Profile/Logistics Geography-looking fields remain
opaque legacy owner metadata, so the C1 DAG has no speculative Geography edge.

P8-05C2A was merged by PR #113. PR #114 then implemented C2B: it preserves the
original 54 Product SKUs, adds the nine approved fixtures, publishes all 63
reconciled UUIDs by SKU, and owns four deterministic Product Certifications.
Central Product/category/image/certification and violation-Product writes are
retired.
C2C now owns all nine Product Review fixtures in
`reviews.dev.product-feedback`, using dependency-scoped User and Product UUIDs
and the schema-backed reviewer/Product pair. Central Review writes, queries,
imports, reset targeting, and positional Product aliases are retired. The
temporary continuation consumes only the Xoài UUID still needed by central
Harvest and performs no Product repository query or positional selection.
The C2D0 static audit reconfirms schema-unique Member identity. Human review
accepts the Git-history conclusion that BLC-02 is an accidental duplicate and
approves its retirement, resolving Contribution by listing/Farmer. The same
review rejects the mutable expected-harvest date as stable identity: it
distinguishes the three payloads but changes when a schedule is rescheduled.
Bulk Listing and Harvest therefore remain the exact C2D blockers, and whole-C2
implementation is still in progress rather than complete.

## P8-05C2D0 Pre-Human-Review Decision Overlay

PR #115 merged C2C into `develop` at
`c2304b0afb1e6022d7deae4dff49c0e5589ca542`. The C2D0 audit reads the current
Cooperative entities, migration, ports, repositories, tests, seed declarations,
and Git history without executing any runtime persistence path. Full evidence
and candidate analysis are in
[dev-seed-c2d-decisions.md](dev-seed-c2d-decisions.md).

```text
P8_05C2C_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_115
P8_05C2D0_IDENTITY_DECISION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW

COOPERATIVE_MEMBER_IDENTITY_STATUS=RESOLVED_SCHEMA_UNIQUE
COOPERATIVE_MEMBER_STABLE_KEY=cooperative User ID + farmer User ID
BULK_LISTING_IDENTITY_STATUS=UNRESOLVED
BULK_LISTING_STABLE_KEY=NONE_PROVEN
CONTRIBUTION_ORIGINAL_INTENT=ACCIDENTAL_DUPLICATE_FIXTURE
BLC_02_DECISION=RETIRE_DUPLICATE_FIXTURE
BLC_02_DECISION_STATUS=PENDING_HUMAN_REVIEW
CONTRIBUTION_STABLE_KEY=listing ID + farmer User ID
CONTRIBUTION_IDENTITY_STATUS=RESOLVED_BY_DUPLICATE_RETIREMENT_PENDING_HUMAN_REVIEW
HARVEST_SCHEDULE_STABLE_KEY=user ID + product ID + expected harvest date
HARVEST_IDENTITY_STATUS=RESOLVED_SEED_LEVEL_PERSISTED_BUSINESS_KEY

C2D_GROUPING_DECISION=SPLIT_OWNER_LOCALLY_BY_MEMBER_BULK_WORKFLOW_AND_HARVEST
COOPERATIVE_DEV_OUTPUT_COUNT=0
BULK_LISTING_PRODUCT_DEPENDENCY=NONE
HARVEST_PRODUCT_DEPENDENCY=products.dev.products/product.id.by-sku
C2D_EXPLICIT_ANY_COUNT=5
C2D_RESET_TARGET_COUNT=4

P8_05C2D_IMPLEMENTATION_AUTHORIZED=NO
P8_05C2D_BLOCKERS=BULK_LISTING_DOMAIN_IDENTITY_UNRESOLVED
P8_05C2D1_MEMBER_HARVEST_AUTHORIZED=YES_AFTER_C2D0_MERGE
P8_05C2D2_BULK_OPERATIONS_AUTHORIZED=NO
P8_05C2D_IMPLEMENTATION_STATUS=NOT_STARTED
P8_05C2_IMPLEMENTATION_STATUS=IN_PROGRESS
P8_05C3_IMPLEMENTATION_STATUS=NOT_STARTED
P8_05C4_IMPLEMENTATION_STATUS=NOT_STARTED
```

The overlay above records the original PR #116 proposal and is superseded by
the human-review correction below. In particular, its pending Contribution
status and combined Member/Harvest authorization are not current.

## P8-05C2D0 Human-Review Correction Overlay

Human review accepts the Contribution history verdict and BLC-02 retirement.
It rejects the proposed Harvest date tuple because rescheduling mutates the
lookup components and can make one business schedule appear to be a new row.
The conceptual owner-local group split remains, but only Members becomes
authorized after PR #116 merges.

```text
P8_05C2D0_IDENTITY_DECISION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW

BLC_02_DECISION=RETIRE_DUPLICATE_FIXTURE
BLC_02_DECISION_STATUS=HUMAN_APPROVED
BLC_02_RETIREMENT_QUANTITY_IMPACT_KG=-2000
CONTRIBUTION_STABLE_KEY=listing ID + farmer User ID
CONTRIBUTION_IDENTITY_STATUS=RESOLVED_BY_APPROVED_DUPLICATE_RETIREMENT
CONTRIBUTION_SCHEMA_UNIQUE=NO_CURRENT_SCHEMA;YES_HISTORICAL_UNMERGED_DOMAIN
CONTRIBUTION_SEED_LEVEL_KEY=YES
CONTRIBUTION_HUMAN_DECISION_REQUIRED=NO
CONTRIBUTION_SCHEMA_CHANGE_REQUIRED=NO
CONTRIBUTION_DUPLICATE_POLICY=FAIL_CLOSED

HARVEST_PRODUCT_MAPPING_STATUS=RESOLVED
HARVEST_PERSISTENCE_IDENTITY_STATUS=UNRESOLVED
HARVEST_SCHEDULE_STABLE_KEY=NONE_PROVEN
HARVEST_IDENTITY_STATUS=UNRESOLVED_MUTABLE_DATE_NOT_STABLE_IDENTITY
HARVEST_SCHEMA_UNIQUE=NO
HARVEST_SEED_LEVEL_KEY=NO
HARVEST_HUMAN_DECISION_REQUIRED=YES
HARVEST_SCHEMA_CHANGE_REQUIRED=NO_YET_DOMAIN_IDENTITY_DECISION_FIRST

P8_05C2D1_MEMBERS_IMPLEMENTATION_AUTHORIZED=YES_AFTER_PR_116_MERGE
P8_05C2D2_BULK_OPERATIONS_IMPLEMENTATION_AUTHORIZED=NO
P8_05C2D2_BLOCKERS=BULK_LISTING_DOMAIN_IDENTITY_UNRESOLVED
P8_05C2D3_HARVEST_IMPLEMENTATION_AUTHORIZED=NO
P8_05C2D3_BLOCKERS=HARVEST_DOMAIN_IDENTITY_UNRESOLVED
P8_05C2D_IMPLEMENTATION_AUTHORIZED=NO
P8_05C2D_BLOCKERS=BULK_LISTING_DOMAIN_IDENTITY_UNRESOLVED;HARVEST_DOMAIN_IDENTITY_UNRESOLVED
P8_05C2D_IMPLEMENTATION_STATUS=NOT_STARTED
P8_05C2_IMPLEMENTATION_STATUS=IN_PROGRESS
```

## P8-05C2D1 Cooperative Member Ownership Overlay

PR #116 merged the C2D0 human-reviewed identity decisions into `develop` at
`429852a930e1f76951f6529e25dc356c83eaa2a8`. C2D1 implements only the approved
Member slice as `cooperatives.dev.members`. It consumes the two actor UUIDs
through dependency-scoped User outputs, reconciles the schema-unique
cooperative/Farmer pair, and publishes no Member output.

Create preserves the prior execution-time `joinedAt` behavior. Reconcile
updates only `status` and `role`, preserving identity and the stored
`joinedAt`. Central Bulk Listing, Contribution, and Harvest fixtures remain
unchanged and continue to use the temporary actor/Product bridge.

```text
P8_05C2D0_IDENTITY_DECISION_STATUS=IMPLEMENTED_BY_MERGED_PR_116
P8_05C2D1_MEMBERS_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_117

COOPERATIVES_DEV_MEMBERS_GROUP_ID=cooperatives.dev.members
COOPERATIVES_DEV_MEMBERS_GROUP_COUNT=1
COOPERATIVE_MEMBER_DEV_RECORD_COUNT=1
COOPERATIVE_MEMBER_DEV_DEPENDENCIES=users.dev.users
COOPERATIVE_MEMBER_STABLE_KEY=cooperative User ID + farmer User ID
COOPERATIVE_MEMBER_IDEMPOTENCY=PER_RECORD_BY_COOPERATIVE_ID_AND_FARMER_ID
COOPERATIVE_MEMBER_PREFLIGHT=ALL_DECLARED_IDENTITIES_BEFORE_FIRST_WRITE
COOPERATIVE_MEMBER_JOINED_AT_CREATE_POLICY=CURRENT_EXECUTION_TIME_ON_CREATE
COOPERATIVE_MEMBER_JOINED_AT_RECONCILE_POLICY=PRESERVE_EXISTING_VALUE
SECOND_RUN_JOINED_AT_DRIFT=0
COOPERATIVE_MEMBER_DEV_OUTPUT_COUNT=0

CENTRAL_COOPERATIVE_MEMBER_BUSINESS_WRITES=0
CENTRAL_COOPERATIVE_MEMBER_REPOSITORY_QUERIES=0
CENTRAL_COOPERATIVE_MEMBER_ENTITY_IMPORTS_FOR_DEV_SEED=0
P8_05C2D_IMPLEMENTATION_AUTHORIZED=NO
P8_05C2D_IMPLEMENTATION_AUTHORIZATION_STATUS=NO_BULK_LISTING_AND_HARVEST_DOMAIN_IDENTITIES
P8_05C2D1_MEMBERS_IMPLEMENTATION_AUTHORIZED=YES_AFTER_PR_116_MERGE
P8_05C2D1_MEMBERS_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_117
P8_05C2D2_BULK_OPERATIONS_IMPLEMENTATION_AUTHORIZED=NO
P8_05C2D2_BULK_OPERATIONS_IMPLEMENTATION_STATUS=NOT_STARTED
P8_05C2D3_HARVEST_IMPLEMENTATION_AUTHORIZED=NO
P8_05C2D3_HARVEST_IMPLEMENTATION_STATUS=NOT_STARTED
P8_05C2D_IMPLEMENTATION_STATUS=IN_PROGRESS
P8_05C2_IMPLEMENTATION_AUTHORIZED=NO
P8_05C2_IMPLEMENTATION_STATUS=IN_PROGRESS
P8_05C3A_FORUM_ADS_DECISION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_05C3_IMPLEMENTATION_STATUS=NOT_STARTED
P8_05C4_IMPLEMENTATION_STATUS=NOT_STARTED
P8_05D_ADMIN_DEV_STATUS=NOT_STARTED
P8_06_TEST_FIXTURE_STATUS=NOT_STARTED
P8_07_ORCHESTRATOR_MIGRATION_STATUS=NOT_STARTED
P8_08_IDEMPOTENCY_STATUS=NOT_STARTED
P8_09_DISPOSABLE_DB_VERIFICATION_STATUS=NOT_STARTED
P8_10_CENTRAL_WRITE_RETIREMENT_STATUS=NOT_STARTED

GEOGRAPHY_REFERENCE_SEED_OWNER=geography
PRODUCTS_REFERENCE_SEED_OWNER=products
REFERENCE_SEED_GROUPS=2
USERS_DEV_SEED_OWNER=users
USERS_DEV_SEED_GROUP=users.dev.users
GEOGRAPHY_DEV_PROVINCE_SEED=RETIRED_REDUNDANT
```

The comprehensive development service and admin development seed still contain
business writes. They are guarded by the shared fail-closed target safety model
and remain scheduled for per-owner migration or retirement in later P8-05
slices, P8-07, and P8-10. P8-05C0 has now audited all 23 central-service tables,
assigned their 10 canonical owners, defined the scalar dependency DAG, and
split implementation into four blocked, reviewable slices. That plan does not
authorize business-code changes. The central CLI delegates its explicit
REFERENCE and DEV selections to owner-local Geography, Products, and Users
groups. Products development now runs as the owner-local
`products.dev.products` group after its
Users and Product Category dependencies. Its legacy Product/Seller sources are
retired, and its old Geography-name behavior is not migrated because the
canonical payload stores no location identifier. The comprehensive central
development service remains P8-05C debt; startup skips only its overlapping
Product/category/image write section after canonical Products DEV has run. The
orchestration-only phase exit criterion is still open, and P8-08 remains
`NOT_STARTED` until runtime and disposable-database idempotency verification is
authorized. The standalone admin development source remains explicitly deferred
to P8-05D.

P8-05C1A resolved the C1 entry decisions without changing seed behavior. PR
#112 then implemented the ten-identity Users DEV payload and owner-local
Profiles DEV group, retired the deferred Address and Logistics central writes,
and retained `legacy.dev.remaining` as temporary C2/C3/C4 compatibility
scaffolding. Numeric Address/Profile/Logistics Geography-looking fields remain
opaque legacy owner metadata, so the C1 DAG has no speculative Geography edge.

P8-05C2A was merged by PR #113. PR #114 then implemented C2B: it preserves the
original 54 Product SKUs, adds the nine approved fixtures, publishes all 63
reconciled UUIDs by SKU, and owns four deterministic Product Certifications.
Central Product/category/image/certification and violation-Product writes are
retired.
C2C now owns all nine Product Review fixtures in
`reviews.dev.product-feedback`, using dependency-scoped User and Product UUIDs
and the schema-backed reviewer/Product pair. Central Review writes, queries,
imports, reset targeting, and positional Product aliases are retired. The
temporary continuation consumes only the Xoài UUID still needed by central
Harvest and performs no Product repository query or positional selection.
The C2D0 static audit reconfirms schema-unique Member identity. Human review
accepts the Git-history conclusion that BLC-02 is an accidental duplicate and
approves its retirement, resolving Contribution by listing/Farmer. The same
review rejects the mutable expected-harvest date as stable identity: it
distinguishes the three payloads but changes when a schedule is rescheduled.
Bulk Listing and Harvest therefore remain the exact C2D blockers, and whole-C2
implementation is still in progress rather than complete.

## P8-05C2D0 Pre-Human-Review Decision Overlay

PR #115 merged C2C into `develop` at
`c2304b0afb1e6022d7deae4dff49c0e5589ca542`. The C2D0 audit reads the current
Cooperative entities, migration, ports, repositories, tests, seed declarations,
and Git history without executing any runtime persistence path. Full evidence
and candidate analysis are in
[dev-seed-c2d-decisions.md](dev-seed-c2d-decisions.md).

```text
P8_05C2C_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_115
P8_05C2D0_IDENTITY_DECISION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW

COOPERATIVE_MEMBER_IDENTITY_STATUS=RESOLVED_SCHEMA_UNIQUE
COOPERATIVE_MEMBER_STABLE_KEY=cooperative User ID + farmer User ID
BULK_LISTING_IDENTITY_STATUS=UNRESOLVED
BULK_LISTING_STABLE_KEY=NONE_PROVEN
CONTRIBUTION_ORIGINAL_INTENT=ACCIDENTAL_DUPLICATE_FIXTURE
BLC_02_DECISION=RETIRE_DUPLICATE_FIXTURE
BLC_02_DECISION_STATUS=PENDING_HUMAN_REVIEW
CONTRIBUTION_STABLE_KEY=listing ID + farmer User ID
CONTRIBUTION_IDENTITY_STATUS=RESOLVED_BY_DUPLICATE_RETIREMENT_PENDING_HUMAN_REVIEW
HARVEST_SCHEDULE_STABLE_KEY=user ID + product ID + expected harvest date
HARVEST_IDENTITY_STATUS=RESOLVED_SEED_LEVEL_PERSISTED_BUSINESS_KEY

C2D_GROUPING_DECISION=SPLIT_OWNER_LOCALLY_BY_MEMBER_BULK_WORKFLOW_AND_HARVEST
COOPERATIVE_DEV_OUTPUT_COUNT=0
BULK_LISTING_PRODUCT_DEPENDENCY=NONE
HARVEST_PRODUCT_DEPENDENCY=products.dev.products/product.id.by-sku
C2D_EXPLICIT_ANY_COUNT=5
C2D_RESET_TARGET_COUNT=4

P8_05C2D_IMPLEMENTATION_AUTHORIZED=NO
P8_05C2D_BLOCKERS=BULK_LISTING_DOMAIN_IDENTITY_UNRESOLVED
P8_05C2D1_MEMBER_HARVEST_AUTHORIZED=YES_AFTER_C2D0_MERGE
P8_05C2D2_BULK_OPERATIONS_AUTHORIZED=NO
P8_05C2D_IMPLEMENTATION_STATUS=NOT_STARTED
P8_05C2_IMPLEMENTATION_STATUS=IN_PROGRESS
P8_05C3_IMPLEMENTATION_STATUS=NOT_STARTED
P8_05C4_IMPLEMENTATION_STATUS=NOT_STARTED
```

The overlay above records the original PR #116 proposal and is superseded by
the human-review correction below. In particular, its pending Contribution
status and combined Member/Harvest authorization are not current.

## P8-05C2D0 Human-Review Correction Overlay

Human review accepts the Contribution history verdict and BLC-02 retirement.
It rejects the proposed Harvest date tuple because rescheduling mutates the
lookup components and can make one business schedule appear to be a new row.
The conceptual owner-local group split remains, but only Members becomes
authorized after PR #116 merges.

```text
P8_05C2D0_IDENTITY_DECISION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW

BLC_02_DECISION=RETIRE_DUPLICATE_FIXTURE
BLC_02_DECISION_STATUS=HUMAN_APPROVED
BLC_02_RETIREMENT_QUANTITY_IMPACT_KG=-2000
CONTRIBUTION_STABLE_KEY=listing ID + farmer User ID
CONTRIBUTION_IDENTITY_STATUS=RESOLVED_BY_APPROVED_DUPLICATE_RETIREMENT
CONTRIBUTION_SCHEMA_UNIQUE=NO_CURRENT_SCHEMA;YES_HISTORICAL_UNMERGED_DOMAIN
CONTRIBUTION_SEED_LEVEL_KEY=YES
CONTRIBUTION_HUMAN_DECISION_REQUIRED=NO
CONTRIBUTION_SCHEMA_CHANGE_REQUIRED=NO
CONTRIBUTION_DUPLICATE_POLICY=FAIL_CLOSED

HARVEST_PRODUCT_MAPPING_STATUS=RESOLVED
HARVEST_PERSISTENCE_IDENTITY_STATUS=UNRESOLVED
HARVEST_SCHEDULE_STABLE_KEY=NONE_PROVEN
HARVEST_IDENTITY_STATUS=UNRESOLVED_MUTABLE_DATE_NOT_STABLE_IDENTITY
HARVEST_SCHEMA_UNIQUE=NO
HARVEST_SEED_LEVEL_KEY=NO
HARVEST_HUMAN_DECISION_REQUIRED=YES
HARVEST_SCHEMA_CHANGE_REQUIRED=NO_YET_DOMAIN_IDENTITY_DECISION_FIRST

P8_05C2D1_MEMBERS_IMPLEMENTATION_AUTHORIZED=YES_AFTER_PR_116_MERGE
P8_05C2D2_BULK_OPERATIONS_IMPLEMENTATION_AUTHORIZED=NO
P8_05C2D2_BLOCKERS=BULK_LISTING_DOMAIN_IDENTITY_UNRESOLVED
P8_05C2D3_HARVEST_IMPLEMENTATION_AUTHORIZED=NO
P8_05C2D3_BLOCKERS=HARVEST_DOMAIN_IDENTITY_UNRESOLVED
P8_05C2D_IMPLEMENTATION_AUTHORIZED=NO
P8_05C2D_BLOCKERS=BULK_LISTING_DOMAIN_IDENTITY_UNRESOLVED;HARVEST_DOMAIN_IDENTITY_UNRESOLVED
P8_05C2D_IMPLEMENTATION_STATUS=NOT_STARTED
P8_05C2_IMPLEMENTATION_STATUS=IN_PROGRESS
```

## P8-05C2D1 Cooperative Member Ownership Overlay

PR #116 merged the C2D0 human-reviewed identity decisions into `develop` at
`429852a930e1f76951f6529e25dc356c83eaa2a8`. C2D1 implements only the approved
Member slice as `cooperatives.dev.members`. It consumes the two actor UUIDs
through dependency-scoped User outputs, reconciles the schema-unique
cooperative/Farmer pair, and publishes no Member output.

Create preserves the prior execution-time `joinedAt` behavior. Reconcile
updates only `status` and `role`, preserving identity and the stored
`joinedAt`. Central Bulk Listing, Contribution, and Harvest fixtures remain
unchanged and continue to use the temporary actor/Product bridge.

```text
P8_05C2D0_IDENTITY_DECISION_STATUS=IMPLEMENTED_BY_MERGED_PR_116
P8_05C2D1_MEMBERS_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_117

COOPERATIVES_DEV_MEMBERS_GROUP_ID=cooperatives.dev.members
COOPERATIVES_DEV_MEMBERS_GROUP_COUNT=1
COOPERATIVE_MEMBER_DEV_RECORD_COUNT=1
COOPERATIVE_MEMBER_DEV_DEPENDENCIES=users.dev.users
COOPERATIVE_MEMBER_STABLE_KEY=cooperative User ID + farmer User ID
COOPERATIVE_MEMBER_IDEMPOTENCY=PER_RECORD_BY_COOPERATIVE_ID_AND_FARMER_ID
COOPERATIVE_MEMBER_PREFLIGHT=ALL_DECLARED_IDENTITIES_BEFORE_FIRST_WRITE
COOPERATIVE_MEMBER_JOINED_AT_CREATE_POLICY=CURRENT_EXECUTION_TIME_ON_CREATE
COOPERATIVE_MEMBER_JOINED_AT_RECONCILE_POLICY=PRESERVE_EXISTING_VALUE
SECOND_RUN_JOINED_AT_DRIFT=0
COOPERATIVE_MEMBER_DEV_OUTPUT_COUNT=0

CENTRAL_COOPERATIVE_MEMBER_BUSINESS_WRITES=0
CENTRAL_COOPERATIVE_MEMBER_REPOSITORY_QUERIES=0
CENTRAL_COOPERATIVE_MEMBER_ENTITY_IMPORTS_FOR_DEV_SEED=0
CENTRAL_RESET_COOPERATIVE_MEMBER_TARGETS=0
CENTRAL_DOWNSTREAM_MEMBER_ROW_ID_CONSUMERS=0
C2D_EXPLICIT_ANY_COUNT_AFTER_C2D1=4
C2D_REMAINING_RESET_TARGETS=bulk_listings,bulk_listing_contributions,harvest_schedules

P8_05C2D2_BULK_OPERATIONS_IMPLEMENTATION_STATUS=NOT_STARTED
P8_05C2D2_BULK_OPERATIONS_IMPLEMENTATION_AUTHORIZED=NO
P8_05C2D3_HARVEST_IMPLEMENTATION_AUTHORIZED=NO
P8_05C2D3_HARVEST_IMPLEMENTATION_STATUS=NOT_STARTED
P8_05C2D_IMPLEMENTATION_AUTHORIZED=NO
P8_05C2D_IMPLEMENTATION_STATUS=IN_PROGRESS
P8_05C2_IMPLEMENTATION_STATUS=IN_PROGRESS
```

## P8-05C3A Forum And Ads Identity Decision Overlay

Full evidence and candidate analysis are recorded in [dev-seed-c3-decisions.md](dev-seed-c3-decisions.md).

```text
P8_05C2D1_MEMBERS_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_117
P8_05C3A_FORUM_ADS_DECISION_STATUS=IMPLEMENTED_BY_MERGED_PR_119

C3_FORUM_GROUPING_DECISION=forum.dev.discussions
FORUM_DEV_OUTPUT_COUNT=0
FORUM_POST_STABLE_KEY=NONE_PROVEN
FORUM_POST_IDENTITY_STATUS=UNRESOLVED
FORUM_COMMENT_STABLE_KEY=NONE_PROVEN
FORUM_COMMENT_IDENTITY_STATUS=UNRESOLVED
FORUM_LIKE_STABLE_KEY=user ID + post ID
FORUM_LIKE_IDENTITY_STATUS=RESOLVED_SCHEMA_UNIQUE
FORUM_LIKE_NONDETERMINISTIC_BEHAVIOR_DECISION=RETIRE_NONDETERMINISTIC_DEMO_BEHAVIOR
FORUM_LIKE_FIXTURE_SET_STATUS=NO_APPROVED_DETERMINISTIC_FIXTURE_SET
FORUM_LIKE_IDENTITY_BLOCKER=NO
FORUM_RANDOM_BEHAVIOR_TARGET=RETIRED_WHEN_FORUM_OWNER_MIGRATION_IS_EVENTUALLY_AUTHORIZED
FORUM_RANDOM_BEHAVIOR_COUNT=1
FORUM_POSITIONAL_DEPENDENCY_COUNT=2

C3_ADS_GROUPING_DECISION=ads.dev.catalog-and-campaigns
ADS_DEV_OUTPUT_REQUIREMENT=0
AD_PACKAGE_STABLE_KEY=NONE_PROVEN
AD_PACKAGE_IDENTITY_STATUS=UNRESOLVED
AD_CAMPAIGN_STABLE_KEY=NONE_PROVEN
AD_CAMPAIGN_IDENTITY_STATUS=UNRESOLVED
AD_CAMPAIGN_PACKAGE_POSITIONAL_DEPENDENCIES=4
AD_CAMPAIGN_DATE_POLICY=CREATE_ONLY_EXECUTION_RELATIVE_PAYLOAD_PRESERVE_ON_RECONCILE
AD_CAMPAIGN_DATE_IDENTITY_COMPONENT=NO
SECOND_RUN_CAMPAIGN_DATE_DRIFT=0

FORUM_REQUIRED_USER_EMAILS=farmer@sandbox.com,cooperative@sandbox.com,buyer@agrilink.vn
ADS_REQUIRED_USER_EMAILS=supplier@agrilink.vn,admin@agrilink.vn

C3_EXECUTION_TIME_DEPENDENT_FIELDS=ad_campaigns.start_date,ad_campaigns.end_date,ORM created_at/updated_at
C3_RANDOM_FIELDS=Math.random() in seedForum likes
C3_RESET_TARGETS=forum_posts,forum_comments,forum_likes,ad_packages,ad_campaigns,ad_events
C3_STALE_RESET_TARGETS=ad_events

P8_05C3B_FORUM_IMPLEMENTATION_AUTHORIZED=NO
P8_05C3B_FORUM_BLOCKERS=FORUM_POST_DOMAIN_IDENTITY_UNRESOLVED;FORUM_COMMENT_DOMAIN_IDENTITY_UNRESOLVED
P8_05C3C_ADS_IMPLEMENTATION_AUTHORIZED=NO
P8_05C3C_ADS_BLOCKERS=AD_PACKAGE_DOMAIN_IDENTITY_UNRESOLVED;AD_CAMPAIGN_DOMAIN_IDENTITY_UNRESOLVED
P8_05C3_IMPLEMENTATION_AUTHORIZED=NO
P8_05C3_IMPLEMENTATION_STATUS=NOT_STARTED
```

## P8-05C4A Audit Log And Notification Identity Decision Overlay

Full evidence and candidate analysis are recorded in [dev-seed-c4-decisions.md](dev-seed-c4-decisions.md).

```text
P8_05C3A_FORUM_ADS_DECISION_STATUS=IMPLEMENTED_BY_MERGED_PR_119
P8_05C4A_AUDIT_LOG_NOTIFICATION_DECISION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW

AUDIT_LOG_FIXTURE_COUNT=7
AUDIT_LOG_STABLE_KEY=NONE_PROVEN
AUDIT_LOG_IDENTITY_STATUS=UNRESOLVED
AUDIT_LOG_DEV_FIXTURE_DISPOSITION=RETIRE_FROM_ORDINARY_DEV_SEED
AUDIT_LOG_OWNER_LOCAL_SEED_REQUIRED=NO
P8_05C4B_AUDIT_LOG_RETIREMENT_AUTHORIZED=YES_AFTER_PR_120_MERGE
P8_05C4B_TARGET_DISPOSITION=RETIRE_CENTRAL_SYNTHETIC_EVENT_HISTORY

NOTIFICATION_FIXTURE_COUNT=12
NOTIFICATION_STABLE_KEY=NONE_PROVEN
NOTIFICATION_IDENTITY_STATUS=UNRESOLVED
NOTIFICATION_DEV_FIXTURE_DISPOSITION=RETIRE_FROM_ORDINARY_DEV_SEED
NOTIFICATION_OWNER_LOCAL_SEED_REQUIRED=NO
P8_05C4C_NOTIFICATION_RETIREMENT_AUTHORIZED=YES_AFTER_PR_120_MERGE
P8_05C4C_TARGET_DISPOSITION=RETIRE_CENTRAL_SYNTHETIC_INBOX_EVENTS

C4A_SUPERSEDES_C0_AUDIT_LOG_TARGET_GROUP=YES
C4A_SUPERSEDES_C0_NOTIFICATION_TARGET_GROUP=YES
AUDIT_LOG_EXECUTABLE_DEV_SEEDGROUP_CREATED=NO
NOTIFICATION_EXECUTABLE_DEV_SEEDGROUP_CREATED=NO
CURRENT_C4_EXECUTABLE_LEAF_DEV_GROUP_COUNT=0

HARDCODED_UUID_AS_C4_SEED_IDENTITY=REJECTED
AUDIT_LOG_NOTIFICATION_DEMO_DATA_FUTURE_BOUNDARY=P8_06_TEST_FIXTURES_OR_SEPARATE_DEMO_DATA_DECISION

P8_05C4D_CENTRAL_RETIREMENT_AUTHORIZED=NO

CURRENT_CENTRAL_NORMAL_WRITE_METHODS_REMAINING=7
CURRENT_CENTRAL_DESTRUCTIVE_METHODS_REMAINING=1
CURRENT_CENTRAL_PERSISTENCE_CAPABLE_METHODS_REMAINING=8
CURRENT_CENTRAL_BUSINESS_TABLES_REMAINING=10
CENTRAL_RESET_TARGETS=harvest_schedules,bulk_listing_contributions,bulk_listings,forum_likes,forum_comments,forum_posts,ad_campaigns,ad_packages,ad_events,notifications,audit_logs

EXPECTED_AFTER_C4B_C_RETIREMENT_NORMAL_METHODS=5
EXPECTED_AFTER_C4B_C_RETIREMENT_BUSINESS_TABLES=8

P8_05C4_IMPLEMENTATION_AUTHORIZED=NO
P8_05C4_IMPLEMENTATION_STATUS=NOT_STARTED
```

## P8-05C4BC Audit Log And Notification Retirement Overlay

PR #120 was human-reviewed and merged into `develop`, activating the narrow
C4B/C retirement authorization recorded above. This implementation removes the
two synthetic event-history fixture paths and their central reset targets. It
does not create replacement DEV SeedGroups and does not authorize C4D. The C0
planning evidence and C4A decision record above remain historical evidence.

```text
P8_05C4A_AUDIT_LOG_NOTIFICATION_DECISION_STATUS=IMPLEMENTED_BY_MERGED_PR_120
P8_05C4B_AUDIT_LOG_RETIREMENT_STATUS=IMPLEMENTED_BY_MERGED_PR_121
P8_05C4C_NOTIFICATION_RETIREMENT_STATUS=IMPLEMENTED_BY_MERGED_PR_121

AUDIT_LOG_DEV_FIXTURE_DISPOSITION=RETIRED_FROM_ORDINARY_DEV_SEED
NOTIFICATION_DEV_FIXTURE_DISPOSITION=RETIRED_FROM_ORDINARY_DEV_SEED

AUDIT_LOG_EXECUTABLE_DEV_SEEDGROUP_CREATED=NO
NOTIFICATION_EXECUTABLE_DEV_SEEDGROUP_CREATED=NO
CURRENT_C4_EXECUTABLE_LEAF_DEV_GROUP_COUNT=0

CENTRAL_AUDIT_LOG_BUSINESS_WRITES=0
CENTRAL_NOTIFICATION_BUSINESS_WRITES=0
CENTRAL_RESET_AUDIT_LOG_TARGETS=0
CENTRAL_RESET_NOTIFICATION_TARGETS=0

CENTRAL_NORMAL_WRITE_METHODS_REMAINING=5
CENTRAL_NORMAL_WRITE_METHODS=seedForum;seedAdPackages;seedAdCampaigns;seedBulkListings;seedHarvestSchedules
CENTRAL_DESTRUCTIVE_METHODS_REMAINING=1
CENTRAL_PERSISTENCE_CAPABLE_METHODS_REMAINING=6
CENTRAL_BUSINESS_TABLES_REMAINING=8
CENTRAL_RESET_TARGET_COUNT=9
CENTRAL_RESET_TARGETS=harvest_schedules,bulk_listing_contributions,bulk_listings,forum_likes,forum_comments,forum_posts,ad_campaigns,ad_packages,ad_events

TEMPORARY_LEGACY_CONTINUATION=YES
HARVEST_PRODUCT_BRIDGE_RETAINED=YES
P8_05C4D_CENTRAL_RETIREMENT_AUTHORIZED=NO
P8_05C4_IMPLEMENTATION_STATUS=IN_PROGRESS
```

## P8-05D0 Admin DEV Static Audit And Decision Overlay

The complete current-source audit is recorded in
[admin-dev-seed-decisions.md](admin-dev-seed-decisions.md). The standalone
source is a guarded direct DEV CLI, has no npm-script or application-startup
reachability, and spans Users, Profiles, and Products ownership. This overlay
does not implement any fixture disposition.

```text
P8_05C4B_AUDIT_LOG_RETIREMENT_STATUS=IMPLEMENTED_BY_MERGED_PR_121
P8_05C4C_NOTIFICATION_RETIREMENT_STATUS=IMPLEMENTED_BY_MERGED_PR_121
P8_05C4D_CENTRAL_RETIREMENT_AUTHORIZED=NO

P8_05D0_ADMIN_DEV_DECISION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_05D_IMPLEMENTATION_STATUS=NOT_STARTED
ADMIN_DEV_CLASSIFICATION=DEV
ADMIN_DEV_TARGET_STRATEGY=PARTIAL_MAP_PARTIAL_RETIRE_WITH_BLOCKERS

P8_05D1_USERS_IMPLEMENTATION_AUTHORIZED=YES_AFTER_P8_05D0_MERGE
P8_05D2_PROFILES_IMPLEMENTATION_AUTHORIZED=NO
P8_05D3_PRODUCTS_IMPLEMENTATION_AUTHORIZED=NO
P8_05D4_STANDALONE_ENTRYPOINT_RETIREMENT_AUTHORIZED=NO
P8_05D_IMPLEMENTATION_AUTHORIZED=NO

BUSINESS_IMPLEMENTATION_CHANGES=0
ADMIN_DEV_RUNTIME_CHANGES=0
SCHEMA_CHANGES=0
MIGRATIONS_CREATED=0
TEST_FIXTURE_IMPLEMENTATION_CHANGES=0
```
