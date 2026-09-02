# Phase 8 - Module-Owned Seeders

- Phase status: `IMPLEMENTATION_IN_PROGRESS`
- Current authority: P8-05 central DEV decomposition is implemented by merged
  PR #143; P8-06 TEST fixture implementation is not started
- Current implementation: owner-local REFERENCE/DEV groups remain in place;
  the central `DevSeedService`, `legacy.dev.remaining`, its actor dependency,
  and central destructive reset path are retired
- Implementation base for P8-06 audit: `develop` at PR #143 merge commit
  `eda098233eba081099c87f38c96db7a545d5a7cf`
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
The current TEST persistence inventory, ownership design, and guard gaps are
recorded in [test-fixture-ownership-audit.md](test-fixture-ownership-audit.md).

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
reachability, and spans Users, Profiles, and Products ownership. Human review
reuses the P8-05C1 opaque legacy geography policy for Admin DEV Profile payload
metadata. This overlay does not implement any fixture disposition.

```text
P8_05C4B_AUDIT_LOG_RETIREMENT_STATUS=IMPLEMENTED_BY_MERGED_PR_121
P8_05C4C_NOTIFICATION_RETIREMENT_STATUS=IMPLEMENTED_BY_MERGED_PR_121
P8_05C4D_CENTRAL_RETIREMENT_AUTHORIZED=NO

P8_05D0_ADMIN_DEV_DECISION_STATUS=IMPLEMENTED_BY_MERGED_PR_122
P8_05D_IMPLEMENTATION_STATUS=IN_PROGRESS
ADMIN_DEV_CLASSIFICATION=DEV
ADMIN_DEV_TARGET_STRATEGY=PARTIAL_MAP_PARTIAL_RETIRE_WITH_BLOCKERS

P8_05D1_USERS_IMPLEMENTATION_AUTHORIZED=YES_AFTER_P8_05D0_MERGE
P8_05D1_USERS_BLOCKERS=NONE
P8_05D2_PROFILES_IMPLEMENTATION_AUTHORIZED=YES_AFTER_P8_05D0_MERGE
P8_05D2_PROFILES_BLOCKERS=NONE
P8_05D3_PRODUCTS_IMPLEMENTATION_AUTHORIZED=NO
P8_05D3_PRODUCTS_BLOCKERS=ADMIN_DEV_PRODUCT_SKUS_UNRESOLVED;ADMIN_DEV_PRODUCT_IMAGE_PARENT_IDENTITIES_UNRESOLVED
P8_05D4_STANDALONE_ENTRYPOINT_RETIREMENT_AUTHORIZED=NO
P8_05D4_BLOCKERS=P8_05D2_PROFILES_NOT_IMPLEMENTED;P8_05D3_PRODUCTS_NOT_IMPLEMENTED
P8_05D_IMPLEMENTATION_AUTHORIZED=NO

ADMIN_DEV_PROFILE_GEOGRAPHY_POLICY=REUSE_P8_05C1_OPAQUE_LEGACY_OWNER_METADATA
ADMIN_DEV_PROFILE_GEOGRAPHY_SCALAR_STATUS=RESOLVED_AS_OPAQUE_NONRELATIONAL_METADATA
ADMIN_DEV_GEOGRAPHY_DEPENDENCY_EDGE=NONE
ADMIN_DEV_PROFILE_GEOGRAPHY_SCALAR_MAPPING_TO_CANONICAL_GEOGRAPHY=NONE
ADMIN_DEV_PROFILE_GEOGRAPHY_VALUES_PRESERVED_AS_SOURCE_PAYLOAD=YES

P8_05D0_VALIDATION_DEVIATION=ACCEPTED_NON_MATERIAL_UNRELATED_UNINITIALIZED_DATASOURCE_CONSTRUCTION
P8_05D0_VALIDATION_DEVIATION_HUMAN_REVIEW=ACCEPTED
ADMIN_DEV_DATASOURCE_CONSTRUCTED=NO
UNRELATED_UNINITIALIZED_DATASOURCE_CONSTRUCTIONS=1
DATASOURCE_INITIALIZE_CALLS=0
DATABASE_CONNECTIONS=0
SQL=0
DDL=0
DML=0
SEEDS_EXECUTED=0
MIGRATIONS_EXECUTED=0

BUSINESS_IMPLEMENTATION_CHANGES=0
ADMIN_DEV_RUNTIME_CHANGES=0
SCHEMA_CHANGES=0
MIGRATIONS_CREATED=0
TEST_FIXTURE_IMPLEMENTATION_CHANGES=0
```

## P8-05D1 Admin DEV Users Owner Migration Overlay

Merged PR #122 authorizes the independent D1 slice. The existing
`users.dev.users` owner group now contains the eight distinct Admin dashboard
actors in addition to its ten prior fixtures. The duplicate standalone Admin
maps to the canonical email output and its standalone phone does not replace
the canonical owner payload. The remaining Admin DEV code consumes only
`user.id.by-email` values and performs no User repository write.

```text
P8_05D0_ADMIN_DEV_DECISION_STATUS=IMPLEMENTED_BY_MERGED_PR_122
P8_05D1_USERS_IMPLEMENTATION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_05D2_PROFILES_IMPLEMENTATION_AUTHORIZED=YES_AFTER_P8_05D0_MERGE
P8_05D2_PROFILES_IMPLEMENTATION_STATUS=NOT_STARTED
P8_05D3_PRODUCTS_IMPLEMENTATION_AUTHORIZED=NO
P8_05D4_STANDALONE_ENTRYPOINT_RETIREMENT_AUTHORIZED=NO
P8_05D4_BLOCKERS=P8_05D2_PROFILES_NOT_IMPLEMENTED;P8_05D3_PRODUCTS_NOT_IMPLEMENTED
P8_05D_IMPLEMENTATION_AUTHORIZED=NO
P8_05D_IMPLEMENTATION_STATUS=IN_PROGRESS

USERS_DEV_PRE_D1_RECORD_COUNT=10
USERS_DEV_D1_ADDITION_COUNT=8
USERS_DEV_POST_D1_RECORD_COUNT=18
USERS_DEV_OUTPUT_COUNT=18
USERS_DEV_OUTPUT_DUPLICATE_KEYS=0

ADMIN_DEV_ADMIN_NEW_USER_CREATED=NO
ADMIN_DEV_ADMIN_MAPPING=users.dev.users/user.id.by-email/admin@agrilink.vn
ADMIN_DEV_STANDALONE_USER_BUSINESS_WRITES=0
ADMIN_DEV_STANDALONE_USER_REPOSITORY_WRITES=0
ADMIN_DEV_CROSS_OWNER_USER_REPOSITORY_ACCESS=0
D2_REQUIRED_USER_EMAIL_COUNT=8
D2_REQUIRED_USER_OUTPUTS_AVAILABLE=YES

ADMIN_DEV_STANDALONE_PROFILE_WRITES_REMAINING=8
ADMIN_DEV_STANDALONE_PRODUCT_WRITES_REMAINING=10
ADMIN_DEV_STANDALONE_PRODUCT_IMAGE_WRITES_REMAINING=10
ONE_SEED_OWNER_PER_USERS_TABLE=YES
NEW_SEEDGROUPS=0
NEW_SEED_OUTPUT_KINDS=0
SCHEMA_CHANGES=0
MIGRATIONS_CREATED=0
```

## P8-05D2 Admin DEV Profiles Owner Migration Overlay

Merged PR #123 completes the D1 handoff. The eight approved Admin DEV Profile
fixtures now extend the existing `profiles.dev.role-profiles` owner group,
which depends only on `users.dev.users` and consumes dependency-scoped
`user.id.by-email` values. All twelve Profile identities are preflighted before
the first write, and the owner group continues to publish no outputs.

The standalone CLI invokes the Users group followed by the Profiles group, then
retains only its unchanged Product and Product Image write sections. Its four
Profile entity registrations remain temporary D4 transition wiring, not direct
Profile business access. Numeric province and district values remain the exact
opaque source payloads approved in D0.

```text
P8_05D0_ADMIN_DEV_DECISION_STATUS=IMPLEMENTED_BY_MERGED_PR_122
P8_05D1_USERS_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_123
P8_05D2_PROFILES_IMPLEMENTATION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_05D3_PRODUCTS_IMPLEMENTATION_AUTHORIZED=NO
P8_05D3_PRODUCTS_BLOCKERS=ADMIN_DEV_PRODUCT_SKUS_UNRESOLVED;ADMIN_DEV_PRODUCT_IMAGE_PARENT_IDENTITIES_UNRESOLVED
P8_05D4_STANDALONE_ENTRYPOINT_RETIREMENT_AUTHORIZED=NO
P8_05D4_BLOCKERS=P8_05D3_PRODUCTS_NOT_IMPLEMENTED
P8_05D_IMPLEMENTATION_STATUS=IN_PROGRESS

PROFILE_DEV_GROUP_ID=profiles.dev.role-profiles
PROFILES_DEV_PRE_D2_RECORD_COUNT=4
ADMIN_DEV_D2_ADDITION_COUNT=8
PROFILES_DEV_POST_D2_RECORD_COUNT=12
PROFILES_DEV_POST_D2_FARMER_COUNT=4
PROFILES_DEV_POST_D2_COOPERATIVE_COUNT=3
PROFILES_DEV_POST_D2_ENTERPRISE_COUNT=3
PROFILES_DEV_POST_D2_SUPPLIER_COUNT=2
PROFILE_DEV_OUTPUT_COUNT=0

ADMIN_DEV_PROFILE_GEOGRAPHY_POLICY=REUSE_P8_05C1_OPAQUE_LEGACY_OWNER_METADATA
ADMIN_DEV_PROFILE_GEOGRAPHY_SCALAR_STATUS=RESOLVED_AS_OPAQUE_NONRELATIONAL_METADATA
ADMIN_DEV_GEOGRAPHY_DEPENDENCY_EDGE=NONE
ADMIN_DEV_PROFILE_GEOGRAPHY_SCALAR_MAPPING_TO_CANONICAL_GEOGRAPHY=NONE
ADMIN_DEV_PROFILE_GEOGRAPHY_VALUES_PRESERVED_AS_SOURCE_PAYLOAD=YES

ADMIN_DEV_PROFILE_PREFLIGHT=ALL_EIGHT_IDENTITIES_BEFORE_FIRST_WRITE
ADMIN_DEV_PROFILE_SPLIT_IDENTITY_POLICY=FAIL_CLOSED
D2_REQUIRED_USER_EMAIL_COUNT=8
D2_REQUIRED_USER_OUTPUTS_AVAILABLE=YES
PROFILE_DEV_USER_REPOSITORY_ACCESS=0
PROFILE_DEV_CROSS_OWNER_USER_ENTITY_IMPORTS=0

ADMIN_DEV_STANDALONE_PROFILE_BUSINESS_WRITES=0
ADMIN_DEV_STANDALONE_PROFILE_REPOSITORY_WRITES=0
ADMIN_DEV_PROFILE_DIRECT_ENTITY_ACCESS=0
ADMIN_DEV_PROFILE_DIRECT_REPOSITORY_ACCESS=0
ADMIN_DEV_PROFILE_DATASOURCE_REGISTRATION_REFS=4
ADMIN_DEV_WRITE_SECTION_COUNT=2
ADMIN_DEV_TABLE_COUNT=2
ADMIN_DEV_OWNER_COUNT=1
ADMIN_DEV_STANDALONE_PRODUCT_WRITES_REMAINING=10
ADMIN_DEV_STANDALONE_PRODUCT_IMAGE_WRITES_REMAINING=10

ADMIN_DEV_PROFILE_EXPLICIT_ANY_PRE_D2=1
ADMIN_DEV_PROFILE_EXPLICIT_ANY_POST_D2=0
ADMIN_DEV_PRODUCT_IMAGE_EXPLICIT_ANY_UNCHANGED=YES
ONE_SEED_OWNER_PER_PROFILE_TABLE=YES
NEW_PROFILE_SEEDGROUPS=0
NEW_SEEDGROUPS=0
NEW_SEED_OUTPUT_KINDS=0
NEW_CROSS_OWNER_REPOSITORY_ACCESS=0
PROFILE_DEV_CROSS_OWNER_USER_REPOSITORY_ACCESS=0
FRAMEWORK_CONTRACT_TYPEORM_IMPORTS=0
P8_05D3_BUSINESS_IMPLEMENTATION_CHANGES=0
C2D_BUSINESS_IMPLEMENTATION_CHANGES=0
C3_BUSINESS_IMPLEMENTATION_CHANGES=0
C4D_BUSINESS_IMPLEMENTATION_CHANGES=0
SCHEMA_CHANGES=0
MIGRATIONS_CREATED=0
```

## P8-05D3A Admin DEV Product Identity Decision Overlay

The complete static Product and Product Image audit is recorded in
[admin-dev-product-decisions.md](admin-dev-product-decisions.md). Current
source still contains ten SKU-less standalone Products and ten Images. Six
Products have semantic candidates whose sellers or payloads materially differ;
four are supported as distinct business fixtures but require human-assigned
SKUs. No persisted Admin Product identity is proven, so all ten Image parents
remain unresolved and D3 implementation remains unauthorized.

```text
P8_05D1_USERS_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_123
P8_05D2_PROFILES_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_124
P8_05D3A_PRODUCT_IDENTITY_DECISION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_05D3_PRODUCTS_IMPLEMENTATION_STATUS=NOT_STARTED
P8_05D3_PRODUCTS_IMPLEMENTATION_AUTHORIZED=NO
P8_05D3_PRODUCTS_BLOCKERS=SEE_ADMIN_DEV_PRODUCT_DECISIONS_EXACT_20_ITEM_BLOCKER_LIST
P8_05D4_STANDALONE_ENTRYPOINT_RETIREMENT_AUTHORIZED=NO
P8_05D4_BLOCKERS=P8_05D3_PRODUCTS_NOT_IMPLEMENTED
P8_05D_IMPLEMENTATION_STATUS=IN_PROGRESS

ADMIN_DEV_WRITE_SECTION_COUNT=2
ADMIN_DEV_TABLE_COUNT=2
ADMIN_DEV_OWNER_COUNT=1
ADMIN_DEV_PRODUCT_FIXTURE_COUNT=10
ADMIN_DEV_PRODUCT_IMAGE_FIXTURE_COUNT=10
ADMIN_DEV_PRODUCT_SKU_DECLARATION_COUNT=0
ADMIN_DEV_PRODUCT_CURRENT_LOOKUP_KEY=name + sellerId
ADMIN_DEV_PRODUCT_IMAGE_CURRENT_LOOKUP_KEY=productId + any image slot
ADMIN_DEV_PRODUCT_REPOSITORY_WRITE_COUNT=1
ADMIN_DEV_PRODUCT_IMAGE_REPOSITORY_WRITE_COUNT=1

PRODUCTS_DEV_CURRENT_RECORD_COUNT=63
PRODUCTS_DEV_CURRENT_SKU_COUNT=63
PRODUCTS_DEV_DUPLICATE_SKU_COUNT=0
PRODUCTS_DEV_CANONICAL_STABLE_KEY=sku

PROPOSED_PRODUCTS_DEV_MAP_COUNT=0
PROPOSED_PRODUCTS_DEV_ADDITION_COUNT=4
PROPOSED_PRODUCTS_DEV_RETIRE_COUNT=0
PRODUCT_DECISION_UNRESOLVED_COUNT=6
PRODUCT_HUMAN_DECISION_REQUIRED_COUNT=10
ADMIN_DEV_PRODUCT_IDENTITIES_RESOLVED=NO

PRODUCT_IMAGE_MAP_EXISTING_COUNT=0
PRODUCT_IMAGE_ADD_PRIMARY_COUNT=0
PRODUCT_IMAGE_RETIRE_COUNT=0
PRODUCT_IMAGE_REPLACE_REQUIRES_HUMAN_COUNT=0
PRODUCT_IMAGE_UNRESOLVED_PARENT_COUNT=10
ADMIN_DEV_PRODUCT_IMAGE_IDENTITIES_RESOLVED=NO

PRODUCT_RUNTIME_CHANGES=0
PRODUCT_IMAGE_RUNTIME_CHANGES=0
ADMIN_DEV_RUNTIME_CHANGES=0
C2D_BUSINESS_IMPLEMENTATION_CHANGES=0
C3_BUSINESS_IMPLEMENTATION_CHANGES=0
C4D_BUSINESS_IMPLEMENTATION_CHANGES=0
SCHEMA_CHANGES=0
MIGRATIONS_CREATED=0
```

## P8-05D3A Human Review Decision Overlay

Human review finalizes the decisions recorded in
[admin-dev-product-decisions.md](admin-dev-product-decisions.md). Semantic
similarity is rejected as identity because seller ownership is material. Eight
distinct Products and their primary Images are approved with collision-free,
human-assigned SKUs; ADP-09 and ADP-10 retire with their Images because their
source omits required non-null farming type and invented payload is not allowed.
This remains documentation only.

```text
P8_05D3A_PRODUCT_IDENTITY_DECISION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_05D3_PRODUCTS_IMPLEMENTATION_AUTHORIZED=YES_AFTER_P8_05D3A_PR_125_MERGE
P8_05D3_PRODUCTS_BLOCKERS=NONE
P8_05D3_PRODUCTS_IMPLEMENTATION_STATUS=NOT_STARTED
P8_05D4_STANDALONE_ENTRYPOINT_RETIREMENT_AUTHORIZED=NO
P8_05D4_BLOCKERS=P8_05D3_PRODUCTS_NOT_IMPLEMENTED
P8_05D_IMPLEMENTATION_STATUS=IN_PROGRESS

APPROVED_D3_PRODUCT_SKUS=DEV-XOAI-HOA-LOC-HUNG-001;DEV-XA-LACH-THUY-CANH-MAI-001;DEV-DUA-LUOI-NHAT-TUAN-001;DEV-GAO-ST25-HTX-DALAT-001;DEV-CAI-BO-XOI-HUU-CO-HTX-DALAT-001;DEV-BUOI-DA-XANH-HTX-TIEN-GIANG-001;DEV-GAO-LUT-HUU-CO-XNK-MEKONG-001;DEV-CA-PHE-ROBUSTA-AGRI-TECH-001
SKU_COLLISION_CHECK=PASS_8_UNIQUE_AGAINST_63

ADP_07_APPROVED_SELLER_EMAIL=xnk.mekong@ent.vn
ADP_07_APPROVED_SELLER_TYPE=ENTERPRISE
ADP_08_APPROVED_SELLER_EMAIL=agri.tech@ent.vn
ADP_08_APPROVED_SELLER_TYPE=ENTERPRISE
INVENTED_FARMING_TYPE_ALLOWED=NO

ADMIN_DEV_PRODUCT_CATEGORY_POLICY=PRESERVE_SOURCE_ABSENCE_AS_NULL_CATEGORY
ADMIN_DEV_PRODUCT_CATEGORY_INVENTED_MAPPING=NO
ADMIN_DEV_PRODUCT_CATEGORY_DEPENDENCY_REQUIRED_FOR_D3_ADDITIONS=NO
PRODUCTS_DEV_EXISTING_CATEGORY_REFERENCE_DEPENDENCY_RETAINED=YES
PRODUCT_DEV_VARIETY_POLICY=EXTEND_OWNER_SEED_WRITE_CONTRACT_TO_PRESERVE_SOURCE_BACKED_VARIETY
PRODUCT_DEV_VARIETY_SCHEMA_CHANGE=NO
PRODUCT_DEV_VARIETY_INVENTED_VALUES=0

APPROVED_PRODUCTS_DEV_MAP_COUNT=0
APPROVED_PRODUCTS_DEV_ADDITION_COUNT=8
APPROVED_PRODUCTS_DEV_RETIRE_COUNT=2
PRODUCT_DECISION_UNRESOLVED_COUNT=0
PRODUCT_HUMAN_DECISION_REQUIRED_COUNT=0
ADMIN_DEV_PRODUCT_IDENTITIES_RESOLVED=YES

PRODUCT_IMAGE_MAP_EXISTING_COUNT=0
PRODUCT_IMAGE_ADD_PRIMARY_COUNT=8
PRODUCT_IMAGE_RETIRE_COUNT=2
PRODUCT_IMAGE_REPLACE_REQUIRES_HUMAN_COUNT=0
PRODUCT_IMAGE_UNRESOLVED_PARENT_COUNT=0
ADMIN_DEV_PRODUCT_IMAGE_IDENTITIES_RESOLVED=YES
EXISTING_CANONICAL_PRIMARY_IMAGES_REPLACED=0

PRODUCTS_DEV_CURRENT_RECORD_COUNT=63
PRODUCTS_DEV_CURRENT_SKU_COUNT=63
PRODUCTS_DEV_CURRENT_MANAGED_PRIMARY_IMAGE_COUNT=61
PRODUCTS_DEV_EXPECTED_POST_D3_RECORD_COUNT=71
PRODUCTS_DEV_EXPECTED_POST_D3_SKU_COUNT=71
PRODUCTS_DEV_EXPECTED_POST_D3_MANAGED_PRIMARY_IMAGE_COUNT=69

P8_05C2D2_IMPLEMENTATION_AUTHORIZED=NO
P8_05C2D3_IMPLEMENTATION_AUTHORIZED=NO
P8_05C3B_IMPLEMENTATION_AUTHORIZED=NO
P8_05C3C_IMPLEMENTATION_AUTHORIZED=NO
P8_05C4D_CENTRAL_RETIREMENT_AUTHORIZED=NO

PRODUCT_RUNTIME_CHANGES=0
PRODUCT_IMAGE_RUNTIME_CHANGES=0
ADMIN_DEV_RUNTIME_CHANGES=0
C2D_BUSINESS_IMPLEMENTATION_CHANGES=0
C3_BUSINESS_IMPLEMENTATION_CHANGES=0
C4D_BUSINESS_IMPLEMENTATION_CHANGES=0
SCHEMA_CHANGES=0
MIGRATIONS_CREATED=0
```

## P8-05D3A1 Current Seller Contract Decision Overlay

The authoritative correction is detailed in
[admin-dev-product-decisions.md](admin-dev-product-decisions.md). Current
source proves that ADP-07 and ADP-08 belong to Enterprise Users while the
Product SellerType and runtime seller policy support only FARMER, COOPERATIVE,
and SUPPLIER. Human review rejects Product contract expansion, unsupported
casts, policy bypasses, and seller substitution. The PR #125 ADP-07/08
add/ENTERPRISE decisions remain historical evidence but are superseded by this
section.

The current D3 target is six Products and six primary Images. ADP-07 through
ADP-10 and their Images retire. Runtime source remains unchanged in this
documentation-only corrective decision.

~~~text
P8_05D3A_PR_125_ADP_07_DECISION_STATUS=SUPERSEDED
P8_05D3A_PR_125_ADP_08_DECISION_STATUS=SUPERSEDED
CURRENT_ADP_07_DECISION=RETIRE
CURRENT_ADP_08_DECISION=RETIRE

ADP_07_USER_ROLE=ENTERPRISE
ADP_08_USER_ROLE=ENTERPRISE
SELLER_TYPE_ENUM_VALUES=FARMER(farmer);COOPERATIVE(cooperative);SUPPLIER(supplier)
PRODUCT_SELLER_TYPE_ENTERPRISE_SUPPORTED=NO
PRODUCT_RUNTIME_ENTERPRISE_SELLER_SUPPORTED=NO
D3_ENTERPRISE_SELLER_CONTRACT_EXPANSION_AUTHORIZED=NO
D3_UNSUPPORTED_SELLER_CAST_AUTHORIZED=NO
D3_SELLER_IDENTITY_SUBSTITUTION_AUTHORIZED=NO

ADP_07_DECISION=RETIRE
ADP_07_RETIRE_REASON=CANONICAL_SELLER_USER_ROLE_ENTERPRISE_IS_UNSUPPORTED_BY_CURRENT_PRODUCT_SELLER_CONTRACT_AND_HUMAN_REVIEW_REJECTS_CONTRACT_EXPANSION_OR_SELLER_SUBSTITUTION
ADP_07_PREVIOUS_APPROVED_SKU=DEV-GAO-LUT-HUU-CO-XNK-MEKONG-001
ADP_07_PREVIOUS_APPROVED_SKU_STATUS=SUPERSEDED_NOT_IMPLEMENTED
ADP_07_IMAGE_DECISION=RETIRE_WITH_PARENT_PRODUCT
ADP_08_DECISION=RETIRE
ADP_08_RETIRE_REASON=CANONICAL_SELLER_USER_ROLE_ENTERPRISE_IS_UNSUPPORTED_BY_CURRENT_PRODUCT_SELLER_CONTRACT_AND_HUMAN_REVIEW_REJECTS_CONTRACT_EXPANSION_OR_SELLER_SUBSTITUTION
ADP_08_PREVIOUS_APPROVED_SKU=DEV-CA-PHE-ROBUSTA-AGRI-TECH-001
ADP_08_PREVIOUS_APPROVED_SKU_STATUS=SUPERSEDED_NOT_IMPLEMENTED
ADP_08_IMAGE_DECISION=RETIRE_WITH_PARENT_PRODUCT

APPROVED_D3_PRODUCT_SKUS=DEV-XOAI-HOA-LOC-HUNG-001;DEV-XA-LACH-THUY-CANH-MAI-001;DEV-DUA-LUOI-NHAT-TUAN-001;DEV-GAO-ST25-HTX-DALAT-001;DEV-CAI-BO-XOI-HUU-CO-HTX-DALAT-001;DEV-BUOI-DA-XANH-HTX-TIEN-GIANG-001
SUPERSEDED_D3_PRODUCT_SKUS=DEV-GAO-LUT-HUU-CO-XNK-MEKONG-001;DEV-CA-PHE-ROBUSTA-AGRI-TECH-001
ACTIVE_D3_SKU_COLLISION_CHECK=PASS_6_UNIQUE_AGAINST_63

APPROVED_PRODUCTS_DEV_MAP_COUNT=0
APPROVED_PRODUCTS_DEV_ADDITION_COUNT=6
APPROVED_PRODUCTS_DEV_RETIRE_COUNT=4
PRODUCT_DECISION_UNRESOLVED_COUNT=0
PRODUCT_HUMAN_DECISION_REQUIRED_COUNT=0
ADMIN_DEV_PRODUCT_IDENTITIES_RESOLVED=YES
PRODUCT_IMAGE_MAP_EXISTING_COUNT=0
PRODUCT_IMAGE_ADD_PRIMARY_COUNT=6
PRODUCT_IMAGE_RETIRE_COUNT=4
PRODUCT_IMAGE_REPLACE_REQUIRES_HUMAN_COUNT=0
PRODUCT_IMAGE_UNRESOLVED_PARENT_COUNT=0
ADMIN_DEV_PRODUCT_IMAGE_IDENTITIES_RESOLVED=YES

PRODUCTS_DEV_CURRENT_RECORD_COUNT=63
PRODUCTS_DEV_CURRENT_SKU_COUNT=63
PRODUCTS_DEV_CURRENT_MANAGED_PRIMARY_IMAGE_COUNT=61
PRODUCTS_DEV_EXPECTED_POST_D3_RECORD_COUNT=69
PRODUCTS_DEV_EXPECTED_POST_D3_SKU_COUNT=69
PRODUCTS_DEV_EXPECTED_POST_D3_MANAGED_PRIMARY_IMAGE_COUNT=67

ADMIN_DEV_PRODUCT_CATEGORY_POLICY=PRESERVE_SOURCE_ABSENCE_AS_NULL_CATEGORY
ADMIN_DEV_PRODUCT_CATEGORY_INVENTED_MAPPING=NO
PRODUCT_DEV_VARIETY_POLICY=EXTEND_OWNER_SEED_WRITE_CONTRACT_TO_PRESERVE_SOURCE_BACKED_VARIETY
PRODUCT_DEV_VARIETY_SCHEMA_CHANGE=NO
PRODUCT_DEV_VARIETY_INVENTED_VALUES=0

P8_05D3A_PRODUCT_IDENTITY_DECISION_STATUS=IMPLEMENTED_BY_MERGED_PR_125
P8_05D3A1_PRODUCT_SELLER_CONTRACT_DECISION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_05D3_PRODUCTS_IMPLEMENTATION_STATUS=NOT_STARTED
P8_05D3_PRODUCTS_IMPLEMENTATION_AUTHORIZED=YES_AFTER_P8_05D3A1_MERGE
P8_05D3_PRODUCTS_BLOCKERS=NONE
P8_05D4_STANDALONE_ENTRYPOINT_RETIREMENT_AUTHORIZED=NO
P8_05D4_BLOCKERS=P8_05D3_PRODUCTS_NOT_IMPLEMENTED
P8_05D_IMPLEMENTATION_STATUS=IN_PROGRESS

P8_05C2D2_IMPLEMENTATION_AUTHORIZED=NO
P8_05C2D3_IMPLEMENTATION_AUTHORIZED=NO
P8_05C3B_IMPLEMENTATION_AUTHORIZED=NO
P8_05C3C_IMPLEMENTATION_AUTHORIZED=NO
P8_05C4D_CENTRAL_RETIREMENT_AUTHORIZED=NO

RUNTIME_FILES_CHANGED=0
PRODUCT_RUNTIME_CHANGES=0
PRODUCT_IMAGE_RUNTIME_CHANGES=0
ADMIN_DEV_RUNTIME_CHANGES=0
C2D_BUSINESS_IMPLEMENTATION_CHANGES=0
C3_BUSINESS_IMPLEMENTATION_CHANGES=0
C4D_BUSINESS_IMPLEMENTATION_CHANGES=0
SCHEMA_CHANGES=0
MIGRATIONS_CREATED=0
~~~

## P8-05C3C1 Ads Identity And Fixture Policy Audit

Merged PR #135 is the current Forum implementation authority. The final two
central ordinary DEV writers declare three Ad Packages and four Ad Campaigns.
Neither table has a persisted business key or schema uniqueness beyond its
generated primary key. Campaigns additionally select required Package parents
by position from an unordered query. The Package rows are reference-like
normal application configuration, but their source history identifies the
exact declarations as screenshot demo content, so classification also requires
human review.

`ad_events` has one normal runtime repository writer and no ordinary DEV or
data-backfill writer. Its continued presence in `resetAll` is reset-only Phase
8 debt. Full fixtures, composite-key evidence, and exact review questions are
in the [C3C1 Ads audit](dev-seed-c3-decisions.md#20-p8-05c3c1-ads-identity-and-fixture-policy-audit).

~~~text
P8_05C3B_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_135
CENTRAL_NORMAL_WRITE_METHOD_COUNT=2
CENTRAL_NORMAL_WRITE_METHODS=seedAdPackages;seedAdCampaigns
CENTRAL_BUSINESS_TABLE_COUNT=2
CENTRAL_BUSINESS_TABLES=ad_packages;ad_campaigns

AD_PACKAGE_FIXTURE_COUNT=3
AD_PACKAGE_PERSISTED_BUSINESS_ID_FIELD=NONE_PROVEN
AD_PACKAGE_IDENTITY_DECISION=IDENTITY_REMAINS_UNRESOLVED
AD_PACKAGE_IDENTITIES_RESOLVED=NO
AD_PACKAGE_CURRENT_CLASSIFICATION_JUSTIFIED=RECLASSIFICATION_REQUIRES_HUMAN_DECISION
AD_PACKAGE_CLASSIFICATION_RESOLVED=NO

AD_CAMPAIGN_FIXTURE_COUNT=4
AD_CAMPAIGN_PERSISTED_BUSINESS_ID_FIELD=NONE_PROVEN
AD_CAMPAIGN_PACKAGE_FIELD=packageId
AD_CAMPAIGN_PARENT_PACKAGE_IDENTITY_RESOLVED=NO
AD_CAMPAIGN_IDENTITY_DECISION=IDENTITY_REMAINS_UNRESOLVED
AD_CAMPAIGN_IDENTITIES_RESOLVED=NO

ADS_REQUIRED_USER_IDENTITIES=supplier@agrilink.vn
ADS_REQUIRED_UNIQUE_USER_EMAIL_COUNT=1
LEGACY_ACTOR_ADMIN_CURRENT_CONSUMER_COUNT=0
LEGACY_ACTOR_ADMIN_CURRENT_ARGUMENT_PASS_COUNT=1
LEGACY_ACTOR_SUPPLIER_CURRENT_CONSUMER_COUNT=1

AD_EVENTS_NORMAL_DEV_WRITE_SOURCE_COUNT=0
AD_EVENTS_RUNTIME_WRITE_SOURCE_COUNT=1
AD_EVENTS_PHASE8_CLASSIFICATION=RESET_ONLY_LEGACY_DEBT
CURRENT_ADS_RESET_TARGETS=ad_campaigns;ad_packages;ad_events
NORMAL_WRITER_RESET_TARGETS=ad_campaigns;ad_packages
RESET_ONLY_DEBT_TARGETS=ad_events

P8_05C3C1_ADS_DECISION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_05C3C_IMPLEMENTATION_STATUS=NOT_STARTED
P8_05C3C_IMPLEMENTATION_AUTHORIZED=NO
P8_05C3C_BLOCKERS=AD_PACKAGE_CLASSIFICATION_DECISION_REQUIRED;AD_PACKAGE_IDENTITY_POLICY_DECISION_REQUIRED;AP_01_DECISION_REQUIRED;AP_02_DECISION_REQUIRED;AP_03_DECISION_REQUIRED;AD_CAMPAIGN_IDENTITY_POLICY_DECISION_REQUIRED;AD_CAMPAIGN_PACKAGE_PARENT_IDENTITY_UNRESOLVED;AD_CAMPAIGN_PACKAGE_PARENT_MAPPING_DECISION_REQUIRED;AC_01_DECISION_REQUIRED;AC_02_DECISION_REQUIRED;AC_03_DECISION_REQUIRED;AC_04_DECISION_REQUIRED
EXPECTED_POST_C3C_CENTRAL_NORMAL_WRITE_METHOD_COUNT=0
P8_05C4D_CENTRAL_RETIREMENT_AUTHORIZED=NO
ADS_BUSINESS_IMPLEMENTATION_CHANGES=0
RUNTIME_FILES_CHANGED=0
SCHEMA_CHANGES=0
MIGRATIONS_CREATED=0
~~~

## P8-05C2D3A Harvest Schedule Identity Decision Overlay

Merged PR #130 (`911cab2a671933c5a8ddc04fb6edc6b3a9976296`) leaves four
central methods and makes `seedHarvestSchedules` the only remaining
Cooperatives ordinary DEV writer. This static audit preserves all three
Harvest declarations and the `harvest_schedules` reset target unchanged.

The three screenshot/demo timeline rows resolve their User and Product scalar
dependencies, but current entity, repository, migration, application, and Git
history prove no business identifier, unique composite, immutable planned date,
or cardinality rule. Human review must decide policy and each fixture's
disposition before implementation can begin.

~~~text
P8_05C2D2_BULK_OPERATIONS_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_130

CENTRAL_NORMAL_WRITE_METHOD_COUNT=4
CENTRAL_NORMAL_WRITE_METHODS=seedForum;seedAdPackages;seedAdCampaigns;seedHarvestSchedules
CENTRAL_HARVEST_WRITE_METHOD_COUNT=1
LEGACY_DEV_REMAINING_EXISTS=YES

HARVEST_FIXTURE_COUNT=3
HARVEST_OWNER_FIELD=userId;user_id
HARVEST_OWNER_DOMAIN_TYPE=USER_ID
HARVEST_PRODUCT_RELATION_EXISTS=YES_SCALAR_UUID_REFERENCE;NO_TYPEORM_RELATION;NO_DATABASE_FK
HARVEST_PRODUCT_ID_FIELD=productId;product_id
HARVEST_PERSISTED_BUSINESS_ID_FIELD=NONE_PROVEN
HARVEST_TABLE_UNIQUE_CONSTRAINT_COUNT=0
HARVEST_TABLE_SECONDARY_INDEX_COUNT=1
HARVEST_WHOLE_TABLE_GUARD_COUNT=1
HARVEST_GENERATED_UUID_IDENTITY_USAGE=YES_PRIMARY_KEY_ONLY;NOT_DETERMINISTIC_SEED_IDENTITY

HARVEST_OWNER_SEED_OUTPUT=users.dev.users/user.id.by-email:farmer@sandbox.com
HARVEST_PRODUCT_SEED_OUTPUT=products.dev.products/product.id.by-sku:DEV-XOAI-HOA-LOC-001
NEW_SCALAR_OUTPUT_DECISION_REQUIRED=NO
HARVEST_SEED_OWNER=COOPERATIVES
HARVEST_PROPOSED_DEPENDENCIES=users.dev.users/user.id.by-email;products.dev.products/product.id.by-sku

HARVEST_EXPECTED_DATE_MUTABLE=YES_AT_PERSISTENCE_CONTRACT;NO_IMMUTABILITY_RULE
HARVEST_QUANTITY_IDENTITY_ELIGIBLE=NO_MUTABLE_PAYLOAD
HARVEST_STATUS_IDENTITY_ELIGIBLE=NO_STATUS_FIELD_NOT_PERSISTED
HARVEST_DOMAIN_CARDINALITY_RULE=NONE_PROVEN;MULTIPLE_SCHEDULES_PER_USER_PRODUCT_DEMONSTRATED
HARVEST_ORIGINAL_FIXTURE_INTENT=SYNTHETIC_DEV_TIMELINE_DATA
SYNTHETIC_HARVEST_SEED_IDENTITY_APPROVED=NO

HARVEST_IDENTITY_DECISION=HARVEST_IDENTITY_REMAINS_UNRESOLVED
HARVEST_IDENTITIES_RESOLVED=NO
HARVEST_DOWNSTREAM_SEED_ID_CONSUMER_COUNT=0
HARVEST_OUTPUT_REQUIRED=NO
HARVEST_RESET_TARGET_EXISTS=YES

P8_05C2D3A_HARVEST_IDENTITY_DECISION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_05C2D3_HARVEST_IMPLEMENTATION_STATUS=NOT_STARTED
P8_05C2D3_HARVEST_IMPLEMENTATION_AUTHORIZED=NO
P8_05C2D3_BLOCKERS=HARVEST_PERSISTED_BUSINESS_ID_NONE_PROVEN;HARVEST_IMMUTABLE_COMPOSITE_NONE_PROVEN;HARVEST_DOMAIN_CARDINALITY_RULE_NONE_PROVEN;HARVEST_IDENTITY_POLICY_DECISION_REQUIRED;HS_01_DECISION_REQUIRED;HS_02_DECISION_REQUIRED;HS_03_DECISION_REQUIRED
P8_05C3B_IMPLEMENTATION_AUTHORIZED=NO
P8_05C3C_IMPLEMENTATION_AUTHORIZED=NO
P8_05C4D_CENTRAL_RETIREMENT_AUTHORIZED=NO

HARVEST_BUSINESS_IMPLEMENTATION_CHANGES=0
CENTRAL_DEVSEEDSERVICE_RUNTIME_CHANGES=0
C3_BUSINESS_IMPLEMENTATION_CHANGES=0
SCHEMA_CHANGES=0
MIGRATIONS_CREATED=0
RUNTIME_FILES_CHANGED=0
~~~

## P8-05D3 Corrected Product Owner Migration Overlay

Merged PR #126 is the current seller-contract authority. This implementation
adds only ADP-01 through ADP-06 and their six source primary Images to the
existing products.dev.products owner. ADP-07 through ADP-10 and all four of
their Images are absent. The superseded PR #125 Enterprise SKUs remain
unimplemented.

The owner resolves five unique seller IDs from users.dev.users scalar outputs,
preserves null category and source-backed variety, preflights every declared
SKU before Product writes, and continues to publish product.id.by-sku. The
standalone Admin DEV source now performs owner-group orchestration only; its
guarded CLI, temporary DataSource, and nine entity registrations remain as D4
cleanup debt.

~~~text
P8_05D3A_PRODUCT_IDENTITY_DECISION_STATUS=IMPLEMENTED_BY_MERGED_PR_125
P8_05D3A1_PRODUCT_SELLER_CONTRACT_DECISION_STATUS=IMPLEMENTED_BY_MERGED_PR_126
P8_05D3_PRODUCTS_IMPLEMENTATION_AUTHORIZED=YES_AFTER_P8_05D3A1_MERGE
P8_05D3_PRODUCTS_BLOCKERS=NONE
P8_05D3_PRODUCTS_IMPLEMENTATION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW

APPROVED_D3_PRODUCT_SKUS=DEV-XOAI-HOA-LOC-HUNG-001;DEV-XA-LACH-THUY-CANH-MAI-001;DEV-DUA-LUOI-NHAT-TUAN-001;DEV-GAO-ST25-HTX-DALAT-001;DEV-CAI-BO-XOI-HUU-CO-HTX-DALAT-001;DEV-BUOI-DA-XANH-HTX-TIEN-GIANG-001
SUPERSEDED_D3_PRODUCT_SKUS_ABSENT=YES
ACTIVE_D3_SKU_COLLISION_CHECK=PASS_6_UNIQUE_AGAINST_63

ADP_07_OWNER_PRODUCT_CREATED=NO
ADP_08_OWNER_PRODUCT_CREATED=NO
ADP_09_OWNER_PRODUCT_CREATED=NO
ADP_10_OWNER_PRODUCT_CREATED=NO
ADP_07_OWNER_IMAGE_CREATED=NO
ADP_08_OWNER_IMAGE_CREATED=NO
ADP_09_OWNER_IMAGE_CREATED=NO
ADP_10_OWNER_IMAGE_CREATED=NO

PRODUCTS_DEV_PRE_D3_RECORD_COUNT=63
PRODUCTS_DEV_D3_ADDITION_COUNT=6
PRODUCTS_DEV_POST_D3_RECORD_COUNT=69
PRODUCTS_DEV_POST_D3_SKU_COUNT=69
PRODUCTS_DEV_DUPLICATE_SKU_COUNT=0

D3_PRODUCT_SELLER_REFERENCE_COUNT=6
D3_REQUIRED_UNIQUE_SELLER_EMAIL_COUNT=5
D3_REQUIRED_SELLER_OUTPUTS_AVAILABLE=YES
PRODUCT_SELLER_CONTRACT_CHANGES=0
SELLER_TYPE_ENUM_EXPANSION=0
SELLER_TYPE_CAST_WORKAROUNDS=0
SELLER_POLICY_BYPASSES=0

ADMIN_DEV_PRODUCT_CATEGORY_POLICY=PRESERVE_SOURCE_ABSENCE_AS_NULL_CATEGORY
D3_PRODUCT_CATEGORY_LOOKUPS=0
D3_PRODUCT_CATEGORY_IDS_NULL=6
PRODUCTS_DEV_EXISTING_CATEGORY_REFERENCE_DEPENDENCY_RETAINED=YES
PRODUCT_DEV_VARIETY_POLICY=EXTEND_OWNER_SEED_WRITE_CONTRACT_TO_PRESERVE_SOURCE_BACKED_VARIETY
PRODUCT_DEV_VARIETY_SCHEMA_CHANGE=NO
PRODUCT_DEV_VARIETY_INVENTED_VALUES=0

PRODUCTS_DEV_PRE_D3_MANAGED_PRIMARY_IMAGE_COUNT=61
PRODUCTS_DEV_D3_PRIMARY_IMAGE_ADDITION_COUNT=6
PRODUCTS_DEV_POST_D3_MANAGED_PRIMARY_IMAGE_COUNT=67
EXISTING_CANONICAL_PRIMARY_IMAGES_REPLACED=0
ORPHAN_IMAGE_FIXTURES_CREATED=0

PRODUCTS_DEV_OUTPUT_COUNT=69
PRODUCTS_DEV_OUTPUT_DUPLICATE_KEYS=0
NEW_SEED_OUTPUT_KINDS=0

ADMIN_DEV_STANDALONE_PRODUCT_BUSINESS_WRITES=0
ADMIN_DEV_STANDALONE_PRODUCT_REPOSITORY_WRITES=0
ADMIN_DEV_PRODUCT_CURRENT_LOOKUP_KEY=RETIRED
ADMIN_DEV_STANDALONE_PRODUCT_IMAGE_BUSINESS_WRITES=0
ADMIN_DEV_STANDALONE_PRODUCT_IMAGE_REPOSITORY_WRITES=0
ADMIN_DEV_PRODUCT_IMAGE_CURRENT_LOOKUP_KEY=RETIRED
ADMIN_DEV_PRODUCT_IMAGE_EXPLICIT_ANY_POST_D3=0
ADMIN_DEV_DIRECT_BUSINESS_WRITE_COUNT=0
ADMIN_DEV_DIRECT_BUSINESS_WRITE_TABLE_COUNT=0
ADMIN_DEV_DIRECT_BUSINESS_WRITE_OWNER_COUNT=0

ADMIN_DEV_TRANSITION_ENTITY_REGISTRATION_COUNT=9
ADMIN_DEV_USER_ENTITY_REGISTRATION_REFS=1
ADMIN_DEV_PROFILE_ENTITY_REGISTRATION_REFS=4
ADMIN_DEV_PRODUCT_ENTITY_REGISTRATION_REFS=1
ADMIN_DEV_PRODUCT_IMAGE_ENTITY_REGISTRATION_REFS=1
ADMIN_DEV_CATEGORY_ENTITY_REGISTRATION_REFS=1

ONE_SEED_OWNER_PER_PRODUCTS_TABLE=YES
NEW_PRODUCT_SEEDGROUPS=0
NEW_SEEDGROUPS=0
NEW_CROSS_OWNER_REPOSITORY_ACCESS=0
PRODUCT_DEV_CROSS_OWNER_USER_REPOSITORY_ACCESS=0
FRAMEWORK_CONTRACT_TYPEORM_IMPORTS=0

P8_05D4_STANDALONE_ENTRYPOINT_RETIREMENT_AUTHORIZED=YES_AFTER_P8_05D3_MERGE
P8_05D4_BLOCKERS=NONE
P8_05D_IMPLEMENTATION_STATUS=IN_PROGRESS

P8_05C2D2_IMPLEMENTATION_AUTHORIZED=NO
P8_05C2D3_IMPLEMENTATION_AUTHORIZED=NO
P8_05C3B_IMPLEMENTATION_AUTHORIZED=NO
P8_05C3C_IMPLEMENTATION_AUTHORIZED=NO
P8_05C4D_CENTRAL_RETIREMENT_AUTHORIZED=NO

PRODUCT_RUNTIME_CHANGES=6_OWNER_FIXTURES
PRODUCT_IMAGE_RUNTIME_CHANGES=6_OWNER_PRIMARY_IMAGES
ADMIN_DEV_RUNTIME_CHANGES=DIRECT_PRODUCT_AND_IMAGE_PERSISTENCE_RETIRED
C2D_BUSINESS_IMPLEMENTATION_CHANGES=0
C3_BUSINESS_IMPLEMENTATION_CHANGES=0
C4D_BUSINESS_IMPLEMENTATION_CHANGES=0
SCHEMA_CHANGES=0
MIGRATIONS_CREATED=0
~~~

## P8-05D4 Standalone Admin DEV Retirement Overlay

Merged PR #127 is the current D3 authority. At base
`a42453d9ffba2678a11632d08043791784658685`, the standalone source had zero
direct business writes and no runtime consumer other than its guarded
`require.main` CLI. It was not imported by repository source, package scripts,
or application startup. Its two test references were static source tests.

D4 deletes that standalone source and its transition-only static spec. This
retires its CLI, private DataSource lifecycle, SeedOutputRegistry, actor
resolution, duplicate owner-group orchestration, and all nine transition entity
registrations. The existing database-free `seed-entrypoints.spec.ts` now proves
the file is absent, no non-test TypeScript source references the retired
entrypoint or its orchestration functions, package/startup remain free of it,
the canonical owner groups and `legacy.dev.remaining` remain present, and the
central blocked methods remain intact.

All earlier mentions of `admin-dev.seed.ts`, its standalone CLI command, and
its transition registrations in this document are `HISTORICAL_EVIDENCE`.
This overlay is the current instruction: the file and CLI no longer exist and
must not be run. The audit found no separate `STALE_RUNTIME_GUIDANCE` outside
the preserved historical Phase 8 record.

The Products factory added by PR #127 had no consumer after the standalone file
was removed, was introduced solely for that CLI, and was deleted. The Users,
Profiles, and Categories factories remain canonical composition APIs with two,
one, and two current consumers respectively. No owner fixture, output contract,
SeedGroup metadata, schema, migration, central DevSeedService runtime, or
`legacy.dev.remaining` behavior changed.

The current executable inventory is derived from the P8-01 inclusion rule,
not from its historical total: two REFERENCE sources, eleven DEV sources, two
bootstrap/startup composition sources, one TEST fixture source, and two
migration/rollout backfills. The eleven DEV sources comprise the Users group;
Profiles group and adapter; Products group and adapter; Reviews group and
adapter; Cooperative Members group and adapter; `DevSeedService`; and its
`legacy.dev.remaining` SeedGroup adapter. Framework contracts and static
specs are excluded.

~~~text
P8_05D1_USERS_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_123
P8_05D2_PROFILES_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_124
P8_05D3A_PRODUCT_IDENTITY_DECISION_STATUS=IMPLEMENTED_BY_MERGED_PR_125
P8_05D3A1_PRODUCT_SELLER_CONTRACT_DECISION_STATUS=IMPLEMENTED_BY_MERGED_PR_126
P8_05D3_PRODUCTS_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_127

ADMIN_DEV_SOURCE_IMPORT_COUNT_PRE_D4=0
ADMIN_DEV_SOURCE_NPM_SCRIPT_COUNT_PRE_D4=0
ADMIN_DEV_SOURCE_STARTUP_REFERENCE_COUNT_PRE_D4=0
ADMIN_DEV_SOURCE_TEST_REFERENCE_COUNT_PRE_D4=2
ADMIN_DEV_DIRECT_CLI_REACHABILITY_PRE_D4=YES

ADMIN_DEV_SOURCE_FILE_EXISTS=NO
ADMIN_DEV_DIRECT_CLI_EXISTS=NO
ADMIN_DEV_PRIVATE_DATASOURCE_EXISTS=NO
ADMIN_DEV_PRIVATE_DATASOURCE_INITIALIZE_PATH_EXISTS=NO
ADMIN_DEV_STANDALONE_ORCHESTRATION_EXISTS=NO

ADMIN_DEV_TRANSITION_ENTITY_REGISTRATION_COUNT=0
ADMIN_DEV_USER_ENTITY_REGISTRATION_REFS=0
ADMIN_DEV_PROFILE_ENTITY_REGISTRATION_REFS=0
ADMIN_DEV_PRODUCT_ENTITY_REGISTRATION_REFS=0
ADMIN_DEV_PRODUCT_IMAGE_ENTITY_REGISTRATION_REFS=0
ADMIN_DEV_CATEGORY_ENTITY_REGISTRATION_REFS=0
ADMIN_DEV_PRODUCT_CERTIFICATION_ENTITY_REGISTRATION_REFS=0

ADMIN_DEV_DIRECT_BUSINESS_WRITE_COUNT=0
ADMIN_DEV_DIRECT_BUSINESS_WRITE_TABLE_COUNT=0
ADMIN_DEV_DIRECT_BUSINESS_WRITE_OWNER_COUNT=0
ADMIN_DEV_STANDALONE_USER_WRITES=0
ADMIN_DEV_STANDALONE_PROFILE_WRITES=0
ADMIN_DEV_STANDALONE_PRODUCT_WRITES=0
ADMIN_DEV_STANDALONE_PRODUCT_IMAGE_WRITES=0

USERS_DEV_RECORD_COUNT=18
PROFILES_DEV_RECORD_COUNT=12
PRODUCTS_DEV_RECORD_COUNT=69
PRODUCTS_DEV_SKU_COUNT=69
PRODUCTS_DEV_MANAGED_PRIMARY_IMAGE_COUNT=67
USER_ID_BY_EMAIL_OUTPUT_RETAINED=YES
PRODUCT_ID_BY_SKU_OUTPUT_RETAINED=YES

USERS_DEV_GROUP_FACTORY_CONSUMER_COUNT=2
PROFILES_DEV_GROUP_FACTORY_CONSUMER_COUNT=1
CATEGORIES_REFERENCE_GROUP_FACTORY_CONSUMER_COUNT=2
PRODUCTS_DEV_GROUP_FACTORY_CONSUMER_COUNT=0
OWNER_FACTORIES_REMOVED=createProductDevelopmentSeedGroup

PRE_D4_ADMIN_DEV_EXECUTABLE_SOURCE_COUNT=1
POST_D4_ADMIN_DEV_EXECUTABLE_SOURCE_COUNT=0
POST_D4_REFERENCE_SEED_SOURCE_COUNT=2
POST_D4_DEV_SEED_SOURCE_COUNT=11
POST_D4_BOOTSTRAP_OR_STARTUP_SEED_SOURCE_COUNT=2
POST_D4_TEST_SEED_SOURCE_COUNT=1
POST_D4_MIGRATION_DATA_BACKFILL_SOURCE_COUNT=2
POST_D4_EXECUTABLE_SEED_SOURCE_COUNT=18

P8_05D4_STANDALONE_ENTRYPOINT_RETIREMENT_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_05D4_STANDALONE_ENTRYPOINT_RETIREMENT_AUTHORIZED=YES
P8_05D4_BLOCKERS=NONE
P8_05D_IMPLEMENTATION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW

P8_05C2D2_IMPLEMENTATION_AUTHORIZED=NO
P8_05C2D3_IMPLEMENTATION_AUTHORIZED=NO
P8_05C3B_IMPLEMENTATION_AUTHORIZED=NO
P8_05C3C_IMPLEMENTATION_AUTHORIZED=NO
P8_05C4D_CENTRAL_RETIREMENT_AUTHORIZED=NO

CENTRAL_DEVSEEDSERVICE_RUNTIME_CHANGES=0
LEGACY_DEV_REMAINING_CHANGES=0
CENTRAL_BLOCKED_BUSINESS_WRITER_CHANGES=0
C2D_BUSINESS_IMPLEMENTATION_CHANGES=0
C3_BUSINESS_IMPLEMENTATION_CHANGES=0
PACKAGE_JSON_CHANGES=0
SCHEMA_CHANGES=0
MIGRATIONS_CREATED=0
~~~

## P8-05C2D2A Bulk Listing Identity Decision Overlay

The current static audit is recorded in
[the C2D decision record](dev-seed-c2d-decisions.md#20-p8-05c2d2a-bulk-listing-identity-decision-overlay).
At merged-PR-#128 base
`d39052254124b59250dfaa06d0b9d5d90cea8af6`, current source still declares
two Bulk Listings behind one whole-table count guard. Each receives the
`cooperative@sandbox.com` User ID, omits nullable Product Category, has no
Product relation or location field, and receives a generated UUID.

No persisted business-code field exists. The Listing table has zero business
unique constraints and one non-unique secondary index on
`(cooperative_id, is_open)`. Current and historical APIs use UUID route IDs;
supporting history allows title and other payload edits and proves no listing
cardinality. All examined natural tuples contain mutable payload, collide for
the current declarations, introduce a nonexistent Product relation, or lack
domain/schema support. Therefore the audit chooses the unresolved evidence
outcome and does not invent a seed-only key.

The approved C2D0 Contribution policy remains unchanged: retire duplicate
BLC-02, retain Bulk Listing ID + Farmer User ID for BLC-01, and fail closed on
duplicates. That pair cannot be reconciled until the parent Bulk Listing has an
approved persisted identity. Harvest, Forum, Ads, and central C4D remain
outside this audit.

Human review must choose an exact Bulk Listing identity policy
(existing persisted field, explicitly approved current composite, new domain
listing code in a separately authorized schema decision, fixture retirement,
or deferral) and independently retain, retire, or defer BL-01 and BL-02.

~~~text
P8_05D1_USERS_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_123
P8_05D2_PROFILES_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_124
P8_05D3_PRODUCTS_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_127
P8_05D4_STANDALONE_ENTRYPOINT_RETIREMENT_STATUS=IMPLEMENTED_BY_MERGED_PR_128
P8_05D_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_128
ADMIN_DEV_SOURCE_FILE_EXISTS=NO
ADMIN_DEV_DIRECT_BUSINESS_WRITE_COUNT=0

CENTRAL_NORMAL_WRITE_METHOD_COUNT=5
LEGACY_DEV_REMAINING_EXISTS=YES

BULK_LISTING_FIXTURE_COUNT=2
BULK_LISTING_OWNER_FIELD=cooperativeId
BULK_LISTING_OWNER_DOMAIN_TYPE=COOPERATIVE_ROLE_USER_ID
BULK_LISTING_PERSISTED_BUSINESS_ID_FIELD=NONE_PROVEN
BULK_LISTING_PRODUCT_RELATION_EXISTS=NO
BULK_LISTING_PRODUCT_SEED_DEPENDENCY_REQUIRED=NO
BULK_LISTING_TABLE_UNIQUE_CONSTRAINT_COUNT=0
BULK_LISTING_WHOLE_TABLE_GUARD_COUNT=1
BULK_LISTING_GENERATED_UUID_IDENTITY_USAGE=YES_PRIMARY_KEY_ONLY;NOT_DETERMINISTIC_SEED_IDENTITY

BULK_LISTING_IDENTITY_DECISION=BULK_LISTING_IDENTITY_REMAINS_UNRESOLVED
BULK_LISTING_IDENTITIES_RESOLVED=NO
SYNTHETIC_SEED_ONLY_IDENTITY_APPROVED=NO
NEW_SCALAR_OUTPUT_DECISION_REQUIRED=NO_FOR_BULK_LISTING_OWNER

CONTRIBUTION_ORIGINAL_INTENT=ACCIDENTAL_DUPLICATE_FIXTURE
BLC_02_DECISION=RETIRE_DUPLICATE_FIXTURE
BLC_02_DECISION_STATUS=HUMAN_APPROVED
CONTRIBUTION_STABLE_KEY=Bulk Listing ID + Farmer User ID
CONTRIBUTION_DUPLICATE_POLICY=FAIL_CLOSED
CONTRIBUTION_PARENT_OUTPUT_REQUIRED=YES_LOGICAL_PARENT_ID_AFTER_BULK_LISTING_IDENTITY_APPROVAL
CONTRIBUTION_PARENT_OUTPUT_KIND_CANDIDATE=bulk-listing.id.by-<approved-business-key>;UNAPPROVED_PLACEHOLDER
CONTRIBUTION_PARENT_IDENTITY_RESOLVED=NO

P8_05C2D2A_BULK_LISTING_IDENTITY_DECISION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_05C2D2_BULK_OPERATIONS_IMPLEMENTATION_STATUS=NOT_STARTED
P8_05C2D2_BULK_OPERATIONS_IMPLEMENTATION_AUTHORIZED=NO
P8_05C2D2_BLOCKERS=BULK_LISTING_PERSISTED_BUSINESS_ID_NONE_PROVEN;BULK_LISTING_COMPOSITE_KEY_NONE_PROVEN;BL_01_IDENTITY_DECISION_REQUIRED;BL_02_IDENTITY_DECISION_REQUIRED;CONTRIBUTION_PARENT_BULK_LISTING_IDENTITY_UNRESOLVED

P8_05C2D3_HARVEST_IMPLEMENTATION_AUTHORIZED=NO
HARVEST_SCHEDULE_STABLE_KEY=NONE_PROVEN
P8_05C3B_IMPLEMENTATION_AUTHORIZED=NO
P8_05C3C_IMPLEMENTATION_AUTHORIZED=NO
P8_05C4D_CENTRAL_RETIREMENT_AUTHORIZED=NO

BUSINESS_IMPLEMENTATION_CHANGES=0
CENTRAL_DEVSEEDSERVICE_RUNTIME_CHANGES=0
COOPERATIVES_RUNTIME_CHANGES=0
C3_BUSINESS_IMPLEMENTATION_CHANGES=0
C4D_BUSINESS_IMPLEMENTATION_CHANGES=0
SCHEMA_CHANGES=0
MIGRATIONS_CREATED=0
~~~

## P8-05C2D2A Human Review Decision Overlay

Human review accepts the unresolved-identity audit and resolves fixture
disposition without claiming that a Bulk Listing identity was found. Because
current source and history prove no business identifier, immutable composite,
or cardinality rule, human review rejects adding a domain listing code,
synthetic UUID, or seed-only key merely to preserve legacy DEV data.

`BL-01` and `BL-02` label Bulk Listings; both will retire from ordinary DEV
seeding in a future retirement-only C2D2 implementation. `BLC-01` and
`BLC-02` label their two Contribution declarations. BLC-01 now retires with
its parent, superseding only its prior provisional retention. BLC-02 preserves
the C2D0 human-approved accidental-duplicate retirement decision.

This PR changes documentation only. After merge, a separate implementation may
remove `seedBulkListings`, its Listing and Contribution writes, and the
`bulk_listings` / `bulk_listing_contributions` reset targets. It must not
create a replacement owner-local Bulk Listing SeedGroup. Harvest, Forum, Ads,
and whole-central C4D remain outside that authorization.

~~~text
BULK_LISTING_FIXTURE_COUNT=2
BULK_LISTING_OWNER_FIELD=cooperativeId
BULK_LISTING_OWNER_DOMAIN_TYPE=COOPERATIVE_ROLE_USER_ID
BULK_LISTING_PERSISTED_BUSINESS_ID_FIELD=NONE_PROVEN
BULK_LISTING_PRODUCT_RELATION_EXISTS=NO
BULK_LISTING_TABLE_UNIQUE_CONSTRAINT_COUNT=0
BULK_LISTING_TABLE_SECONDARY_INDEX_COUNT=1
BULK_LISTING_WHOLE_TABLE_GUARD_COUNT=1
BULK_LISTING_GENERATED_UUID_IDENTITY_USAGE=YES_PRIMARY_KEY_ONLY;NOT_DETERMINISTIC_SEED_IDENTITY
PROVEN_CANDIDATE_COUNT=0
SYNTHETIC_SEED_ONLY_IDENTITY_APPROVED=NO

BULK_LISTING_IDENTITY_POLICY_DECISION=RETIRE_CURRENT_DEV_FIXTURES
BULK_LISTING_NEW_DOMAIN_LISTING_CODE_AUTHORIZED=NO
BULK_LISTING_EXISTING_COMPOSITE_IDENTITY_APPROVED=NO
BULK_LISTING_SYNTHETIC_UUID_IDENTITY_APPROVED=NO
BULK_LISTING_SEED_ONLY_KEY_APPROVED=NO

BL_01_IDENTITY_DECISION=RETIRE
BL_01_DEV_FIXTURE_DISPOSITION=RETIRE_FROM_ORDINARY_DEV_SEED
BL_02_IDENTITY_DECISION=RETIRE
BL_02_DEV_FIXTURE_DISPOSITION=RETIRE_FROM_ORDINARY_DEV_SEED
BULK_LISTING_DEV_FIXTURE_DISPOSITION=RETIRE_FROM_ORDINARY_DEV_SEED
BULK_LISTING_APPROVED_RETAIN_COUNT=0
BULK_LISTING_APPROVED_RETIRE_COUNT=2
BULK_LISTING_IDENTITIES_RESOLVED=NOT_REQUIRED_FIXTURES_RETIRED
BULK_LISTING_OWNER_LOCAL_DEV_SEED_REQUIRED=NO
BULK_LISTING_NEW_SEEDGROUP_REQUIRED=NO
BULK_LISTING_NEW_SCALAR_OUTPUT_REQUIRED=NO

CONTRIBUTION_ORIGINAL_INTENT=ACCIDENTAL_DUPLICATE_FIXTURE
BLC_02_DECISION=RETIRE_DUPLICATE_FIXTURE
BLC_02_DECISION_STATUS=HUMAN_APPROVED
CONTRIBUTION_DEV_FIXTURE_DISPOSITION=RETIRE_WITH_PARENT_BULK_LISTING
BLC_01_CURRENT_DECISION=RETIRE_WITH_PARENT_BULK_LISTING
BLC_01_PREVIOUS_RETENTION_STATUS=SUPERSEDED_BY_P8_05C2D2A_PARENT_RETIREMENT
BLC_02_CURRENT_DECISION=RETIRE_DUPLICATE_FIXTURE
BLC_02_PREVIOUS_DUPLICATE_DECISION_STATUS=PRESERVED
CONTRIBUTION_SOURCE_DECLARATION_COUNT=2
CONTRIBUTION_APPROVED_RETAIN_COUNT=0
CONTRIBUTION_APPROVED_RETIRE_COUNT=2
CONTRIBUTION_PARENT_OUTPUT_REQUIRED=NO
CONTRIBUTION_PARENT_OUTPUT_KIND_CANDIDATE=NONE
CONTRIBUTION_PARENT_IDENTITY_RESOLVED=NOT_REQUIRED_PARENT_FIXTURES_RETIRED

CURRENT_CENTRAL_NORMAL_WRITE_METHOD_COUNT=5
POST_C2D2_CENTRAL_NORMAL_WRITE_METHOD_COUNT=4
CURRENT_CENTRAL_BUSINESS_TABLE_COUNT=8
POST_C2D2_CENTRAL_BUSINESS_TABLE_COUNT=6
CURRENT_C2D2_RESET_TARGETS=bulk_listings;bulk_listing_contributions
EXPECTED_POST_C2D2_BULK_RESET_TARGET_COUNT=0

P8_05C2D2A_BULK_LISTING_IDENTITY_DECISION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_05C2D2_BULK_OPERATIONS_IMPLEMENTATION_AUTHORIZED=YES_AFTER_P8_05C2D2A_PR_129_MERGE
P8_05C2D2_BLOCKERS=NONE
P8_05C2D2_IMPLEMENTATION_STRATEGY=RETIRE_LEGACY_BULK_LISTING_AND_CONTRIBUTION_DEV_FIXTURES
P8_05C2D2_BULK_OPERATIONS_IMPLEMENTATION_STATUS=NOT_STARTED

P8_05C2D3_HARVEST_IMPLEMENTATION_AUTHORIZED=NO
HARVEST_SCHEDULE_STABLE_KEY=NONE_PROVEN
P8_05C3B_IMPLEMENTATION_AUTHORIZED=NO
P8_05C3C_IMPLEMENTATION_AUTHORIZED=NO
P8_05C4D_CENTRAL_RETIREMENT_AUTHORIZED=NO

BUSINESS_IMPLEMENTATION_CHANGES=0
CENTRAL_DEVSEEDSERVICE_RUNTIME_CHANGES=0
COOPERATIVES_RUNTIME_CHANGES=0
SCHEMA_CHANGES=0
MIGRATIONS_CREATED=0
RUNTIME_FILES_CHANGED=0
~~~

## P8-05C2D2 Bulk Operations Retirement Implementation Overlay

Merged PR #129 (`2c458a0989db572ab5391e43ef26da4940fad19e`) is the human-reviewed
authority for retirement of the legacy Bulk Listing and Contribution ordinary
DEV fixtures. The prior audit and decision overlays remain historical. This
implementation removes `seedBulkListings`, both repository write paths, all
four executable declarations, and exactly the `bulk_listings` and
`bulk_listing_contributions` reset targets. It creates no replacement group,
output, identity, schema change, or migration.

Forum, Ads, Harvest, `resetAll`, and `legacy.dev.remaining` remain. Harvest,
C3, and whole-central C4D authorization do not change.

~~~text
PRE_C2D2_CENTRAL_NORMAL_WRITE_METHOD_COUNT=5
POST_C2D2_CENTRAL_NORMAL_WRITE_METHOD_COUNT=4
POST_C2D2_CENTRAL_NORMAL_WRITE_METHODS=seedForum;seedAdPackages;seedAdCampaigns;seedHarvestSchedules
PRE_C2D2_CENTRAL_BUSINESS_TABLE_COUNT=8
POST_C2D2_CENTRAL_BUSINESS_TABLE_COUNT=6
POST_C2D2_CENTRAL_BUSINESS_TABLES=forum_posts;forum_comments;forum_likes;ad_packages;ad_campaigns;harvest_schedules

CENTRAL_SEED_BULK_LISTINGS_METHOD_EXISTS=NO
CENTRAL_BULK_LISTING_WRITE_CALLS=0
CENTRAL_BULK_LISTING_CONTRIBUTION_WRITE_CALLS=0
BL_01_EXECUTABLE_FIXTURE_EXISTS=NO
BL_02_EXECUTABLE_FIXTURE_EXISTS=NO
BLC_01_EXECUTABLE_FIXTURE_EXISTS=NO
BLC_02_EXECUTABLE_FIXTURE_EXISTS=NO
PRE_C2D2_BULK_RESET_TARGET_COUNT=2
POST_C2D2_BULK_RESET_TARGET_COUNT=0

NEW_BULK_LISTING_SEEDGROUPS=0
NEW_CONTRIBUTION_SEEDGROUPS=0
NEW_SEEDGROUPS=0
NEW_SEED_OUTPUT_KINDS=0

P8_05C2D2A_BULK_LISTING_IDENTITY_DECISION_STATUS=IMPLEMENTED_BY_MERGED_PR_129
P8_05C2D2_BULK_OPERATIONS_IMPLEMENTATION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_05C2D2_BULK_OPERATIONS_IMPLEMENTATION_AUTHORIZED=YES
P8_05C2D2_BLOCKERS=NONE
P8_05C2D2_IMPLEMENTATION_STRATEGY=RETIRE_LEGACY_BULK_LISTING_AND_CONTRIBUTION_DEV_FIXTURES
P8_05C2D3_HARVEST_IMPLEMENTATION_AUTHORIZED=NO
HARVEST_SCHEDULE_STABLE_KEY=NONE_PROVEN
P8_05C3B_IMPLEMENTATION_AUTHORIZED=NO
P8_05C3C_IMPLEMENTATION_AUTHORIZED=NO
P8_05C4D_CENTRAL_RETIREMENT_AUTHORIZED=NO

HARVEST_BUSINESS_IMPLEMENTATION_CHANGES=0
C3_BUSINESS_IMPLEMENTATION_CHANGES=0
CENTRAL_DEVSEEDSERVICE_RETIRED=NO
LEGACY_DEV_REMAINING_EXISTS=YES
COOPERATIVES_DOMAIN_RUNTIME_CHANGES=0
SCHEMA_CHANGES=0
MIGRATIONS_CREATED=0
~~~

## P8-05C2D3A Final Current Authority

Merged PR #130 supersedes the historical C2D2 pending-review block immediately
above. The [C2D3A Harvest decision overlay](dev-seed-c2d-decisions.md#23-p8-05c2d3a-harvest-schedule-identity-decision-overlay)
is the current evidence record.

~~~text
P8_05C2D2_BULK_OPERATIONS_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_130
P8_05C2D3A_HARVEST_IDENTITY_DECISION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_05C2D3_HARVEST_IMPLEMENTATION_STATUS=NOT_STARTED
P8_05C2D3_HARVEST_IMPLEMENTATION_AUTHORIZED=NO
P8_05C2D3_BLOCKERS=HARVEST_PERSISTED_BUSINESS_ID_NONE_PROVEN;HARVEST_IMMUTABLE_COMPOSITE_NONE_PROVEN;HARVEST_DOMAIN_CARDINALITY_RULE_NONE_PROVEN;HARVEST_IDENTITY_POLICY_DECISION_REQUIRED;HS_01_DECISION_REQUIRED;HS_02_DECISION_REQUIRED;HS_03_DECISION_REQUIRED
P8_05C3B_IMPLEMENTATION_AUTHORIZED=NO
P8_05C3C_IMPLEMENTATION_AUTHORIZED=NO
P8_05C4D_CENTRAL_RETIREMENT_AUTHORIZED=NO
~~~
+



## P8-05C2D3A1 Human Decision Corrective Overlay

Merged PR #131 is the historical unresolved Harvest audit; it did not contain
the human fixture decision. Human review now accepts that audit and selects
retirement of all three synthetic timeline fixtures. The detailed current
authority is in the [C2D3A1 corrective decision overlay](dev-seed-c2d-decisions.md#25-p8-05c2d3a1-human-decision-corrective-overlay).

~~~text
P8_05C2D3A_PR_131_AUDIT_STATUS=MERGED_AUDIT_HISTORICAL_AUTHORITY
P8_05C2D3A_HARVEST_IDENTITY_DECISION_STATUS=IMPLEMENTED_BY_MERGED_PR_131
HISTORICAL_AUTHORITY_LABEL=HISTORICAL_AS_OF_MERGED_PR_131_AUDIT
HISTORICAL_HARVEST_IDENTITY_DECISION=HARVEST_IDENTITY_REMAINS_UNRESOLVED
HISTORICAL_P8_05C2D3_HARVEST_IMPLEMENTATION_AUTHORIZED=NO

P8_05C2D3A1_HUMAN_DECISION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
CURRENT_HARVEST_IDENTITY_POLICY_DECISION=RETIRE_CURRENT_DEV_FIXTURES
HARVEST_IDENTITY_POLICY_DECISION=RETIRE_CURRENT_DEV_FIXTURES
HARVEST_DEV_FIXTURE_DISPOSITION=RETIRE_FROM_ORDINARY_DEV_SEED
HARVEST_APPROVED_RETAIN_COUNT=0
HARVEST_APPROVED_RETIRE_COUNT=3
HARVEST_IDENTITIES_RESOLVED=NOT_REQUIRED_FIXTURES_RETIRED
HS_01_DECISION=RETIRE
HS_02_DECISION=RETIRE
HS_03_DECISION=RETIRE
HARVEST_NEW_DOMAIN_CODE_AUTHORIZED=NO
SYNTHETIC_HARVEST_SEED_IDENTITY_APPROVED=NO
HARVEST_SEED_ONLY_KEY_APPROVED=NO
HARVEST_OWNER_LOCAL_DEV_SEED_REQUIRED=NO
HARVEST_NEW_SEEDGROUP_REQUIRED=NO
HARVEST_OUTPUT_REQUIRED=NO
FUTURE_HARVEST_OWNER_SEED_DEPENDENCIES=NONE_FIXTURES_RETIRED

CURRENT_P8_05C2D3_HARVEST_IMPLEMENTATION_AUTHORIZED=YES_AFTER_P8_05C2D3A1_MERGE
P8_05C2D3_HARVEST_IMPLEMENTATION_AUTHORIZED=YES_AFTER_P8_05C2D3A1_MERGE
P8_05C2D3_BLOCKERS=NONE
P8_05C2D3_IMPLEMENTATION_STRATEGY=RETIRE_LEGACY_HARVEST_SCHEDULE_DEV_FIXTURES
P8_05C2D3_HARVEST_IMPLEMENTATION_STATUS=NOT_STARTED

CURRENT_CENTRAL_NORMAL_WRITE_METHOD_COUNT=4
POST_C2D3_CENTRAL_NORMAL_WRITE_METHOD_COUNT=3
CURRENT_CENTRAL_BUSINESS_TABLE_COUNT=6
POST_C2D3_CENTRAL_BUSINESS_TABLE_COUNT=5
HARVEST_RESET_TARGET_EXISTS=YES
EXPECTED_POST_C2D3_HARVEST_RESET_TARGET_COUNT=0

P8_05C3B_IMPLEMENTATION_AUTHORIZED=NO
P8_05C3C_IMPLEMENTATION_AUTHORIZED=NO
P8_05C4D_CENTRAL_RETIREMENT_AUTHORIZED=NO
RUNTIME_FILES_CHANGED=0
SCHEMA_CHANGES=0
MIGRATIONS_CREATED=0
~~~

## P8-05C3B Forum Retirement Implementation Overlay

Merged PR #134 authorized retirement of the legacy Forum DEV fixtures. The
central Forum writer, all executable Forum fixtures, its random Like behavior,
and Forum reset targets are now removed without creating replacement owner
groups or outputs. `ADMIN` and `SUPPLIER` keep the Users dependency alive for
Ads. Full evidence is in the
[C3B implementation overlay](dev-seed-c3-decisions.md#19-p8-05c3b-forum-retirement-implementation-overlay).

~~~text
P8_05C3B1_FORUM_DECISION_STATUS=IMPLEMENTED_BY_MERGED_PR_134
P8_05C3B_IMPLEMENTATION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_05C3B_IMPLEMENTATION_AUTHORIZED=YES
P8_05C3B_BLOCKERS=NONE
P8_05C3B_IMPLEMENTATION_STRATEGY=RETIRE_LEGACY_FORUM_DEV_FIXTURES
CENTRAL_SEED_FORUM_METHOD_EXISTS=NO
FORUM_POST_EXECUTABLE_FIXTURE_COUNT=0
FORUM_COMMENT_EXECUTABLE_FIXTURE_COUNT=0
FORUM_RANDOM_LIKE_GENERATOR_EXISTS=NO
PRE_C3B_CENTRAL_NORMAL_WRITE_METHOD_COUNT=3
POST_C3B_CENTRAL_NORMAL_WRITE_METHOD_COUNT=2
PRE_C3B_CENTRAL_BUSINESS_TABLE_COUNT=5
POST_C3B_CENTRAL_BUSINESS_TABLE_COUNT=2
PRE_C3B_FORUM_RESET_TARGET_COUNT=3
POST_C3B_FORUM_RESET_TARGET_COUNT=0
FORUM_ONLY_LEGACY_ACTOR_PLUMBING_REMOVED=YES_FARMER_BUYER_COOP
LEGACY_USERS_DEPENDENCY_POST_C3B_REQUIRED=YES
NEW_FORUM_SEEDGROUPS=0
NEW_SEED_OUTPUT_KINDS=0
FORUM_DOMAIN_RUNTIME_CHANGES=0
ADS_BUSINESS_IMPLEMENTATION_CHANGES=0
P8_05C3C_IMPLEMENTATION_AUTHORIZED=NO
P8_05C4D_CENTRAL_RETIREMENT_AUTHORIZED=NO
SCHEMA_CHANGES=0
MIGRATIONS_CREATED=0
~~~

## P8-05C2D3 Harvest Retirement Implementation Overlay

Merged PR #132 authorized retirement of all three legacy Harvest Schedule DEV
fixtures. The central writer, repository access, executable declarations,
reset target, and now-dead Xoài Product scalar bridge are removed. The farmer
User scalar remains because Forum consumes it. Full implementation evidence is
in the [C2D3 implementation overlay](dev-seed-c2d-decisions.md#26-p8-05c2d3-harvest-retirement-implementation-overlay).

~~~text
P8_05C2D3A_HARVEST_IDENTITY_DECISION_STATUS=IMPLEMENTED_BY_MERGED_PR_131
P8_05C2D3A1_HUMAN_DECISION_STATUS=IMPLEMENTED_BY_MERGED_PR_132
HARVEST_IDENTITY_POLICY_DECISION=RETIRE_CURRENT_DEV_FIXTURES
P8_05C2D3_HARVEST_IMPLEMENTATION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_05C2D3_HARVEST_IMPLEMENTATION_AUTHORIZED=YES
P8_05C2D3_BLOCKERS=NONE
P8_05C2D3_IMPLEMENTATION_STRATEGY=RETIRE_LEGACY_HARVEST_SCHEDULE_DEV_FIXTURES

CENTRAL_SEED_HARVEST_SCHEDULES_METHOD_EXISTS=NO
CENTRAL_HARVEST_REPOSITORY_ACCESS=0
CENTRAL_HARVEST_WRITE_CALLS=0
HS_01_EXECUTABLE_FIXTURE_EXISTS=NO
HS_02_EXECUTABLE_FIXTURE_EXISTS=NO
HS_03_EXECUTABLE_FIXTURE_EXISTS=NO
HARVEST_RESET_TARGET_EXISTS=NO

LEGACY_FARMER_SCALAR_POST_C2D3_CONSUMER_COUNT=1
LEGACY_XOAI_PRODUCT_SCALAR_POST_C2D3_CONSUMER_COUNT=0
HARVEST_ONLY_LEGACY_PLUMBING_REMOVED=YES_PRODUCT_ARGUMENT_ALIAS_RESOLVER_LOOKUP_AND_DEPENDENCY

PRE_C2D3_CENTRAL_NORMAL_WRITE_METHOD_COUNT=4
POST_C2D3_CENTRAL_NORMAL_WRITE_METHOD_COUNT=3
POST_C2D3_CENTRAL_NORMAL_WRITE_METHODS=seedForum;seedAdPackages;seedAdCampaigns
PRE_C2D3_CENTRAL_BUSINESS_TABLE_COUNT=6
POST_C2D3_CENTRAL_BUSINESS_TABLE_COUNT=5
POST_C2D3_CENTRAL_BUSINESS_TABLES=forum_posts;forum_comments;forum_likes;ad_packages;ad_campaigns
PRE_C2D3_HARVEST_RESET_TARGET_COUNT=1
POST_C2D3_HARVEST_RESET_TARGET_COUNT=0

NEW_HARVEST_SEEDGROUPS=0
NEW_SEEDGROUPS=0
NEW_SEED_OUTPUT_KINDS=0
CENTRAL_HARVEST_TABLE_WRITE_OWNERS=0

HARVEST_DOMAIN_RUNTIME_CHANGES=0
FORUM_BUSINESS_IMPLEMENTATION_CHANGES=0
ADS_BUSINESS_IMPLEMENTATION_CHANGES=0
CENTRAL_DEVSEEDSERVICE_RETIRED=NO
LEGACY_DEV_REMAINING_EXISTS=YES
P8_05C3B_IMPLEMENTATION_AUTHORIZED=NO
P8_05C3C_IMPLEMENTATION_AUTHORIZED=NO
P8_05C4D_CENTRAL_RETIREMENT_AUTHORIZED=NO
SCHEMA_CHANGES=0
MIGRATIONS_CREATED=0
~~~

## P8-05C3B1 Forum Identity And Fixture Policy Audit

Merged PR #133 completed the reviewed Harvest retirement. The remaining
central Forum writer was then audited from current source, schema, domain
contracts, and Git history. Forum Posts and Comments have generated UUID
primary keys but no deterministic persisted business identity; Comments also
depend on unresolved Post parents. Forum Likes have a schema-backed
`postId + userId` row identity, but the legacy writer randomly selects from 15
candidate pairs and therefore has no approved deterministic fixture set.

No Forum implementation is authorized until human review supplies the exact
Post, Comment, and Like dispositions recorded in the
[C3B1 Forum audit](dev-seed-c3-decisions.md#17-p8-05c3b1-forum-identity-and-fixture-policy-audit).

~~~text
P8_05C2D3_HARVEST_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_133
CENTRAL_NORMAL_WRITE_METHOD_COUNT=3
CENTRAL_NORMAL_WRITE_METHODS=seedForum;seedAdPackages;seedAdCampaigns
CENTRAL_BUSINESS_TABLE_COUNT=5
CENTRAL_BUSINESS_TABLES=forum_posts;forum_comments;forum_likes;ad_packages;ad_campaigns

P8_05C3B1_FORUM_DECISION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_05C3B_IMPLEMENTATION_STATUS=NOT_STARTED
FORUM_POST_IDENTITIES_RESOLVED=NO
FORUM_COMMENT_IDENTITIES_RESOLVED=NO
FORUM_LIKE_ROW_IDENTITY_RESOLVED=YES
FORUM_LIKE_POLICY_RESOLVED=NO
P8_05C3B_IMPLEMENTATION_AUTHORIZED=NO
P8_05C3B_BLOCKERS=FORUM_POST_IDENTITY_POLICY_DECISION_REQUIRED;FP_01_DECISION_REQUIRED;FP_02_DECISION_REQUIRED;FP_03_DECISION_REQUIRED;FP_04_DECISION_REQUIRED;FP_05_DECISION_REQUIRED;FORUM_COMMENT_PARENT_POST_IDENTITY_UNRESOLVED;FORUM_COMMENT_IDENTITY_POLICY_DECISION_REQUIRED;FC_01_DECISION_REQUIRED;FC_02_DECISION_REQUIRED;FC_03_DECISION_REQUIRED;FC_04_DECISION_REQUIRED;FC_05_DECISION_REQUIRED;FC_06_DECISION_REQUIRED;FC_07_DECISION_REQUIRED;FORUM_LIKE_FIXTURE_POLICY_DECISION_REQUIRED

P8_05C3C_IMPLEMENTATION_AUTHORIZED=NO
P8_05C4D_CENTRAL_RETIREMENT_AUTHORIZED=NO
FORUM_BUSINESS_IMPLEMENTATION_CHANGES=0
ADS_BUSINESS_IMPLEMENTATION_CHANGES=0
RUNTIME_FILES_CHANGED=0
SCHEMA_CHANGES=0
MIGRATIONS_CREATED=0
~~~

## P8-05C3B1 Human Review Decision Overlay

Human review accepts the preceding Forum audit and retires all five Posts, all
seven Comments, and the random Like generator from future ordinary DEV seed
ownership. No replacement identifiers, fixed Like pairs, owner group, or seed
outputs are approved. This documentation PR authorizes only a future C3B
retirement after PR #134 merges; current runtime remains unchanged. See the
[complete human decision](dev-seed-c3-decisions.md#18-p8-05c3b1-human-review-decision-overlay).

~~~text
P8_05C3B1_FORUM_DECISION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
FORUM_POST_IDENTITY_POLICY_DECISION=RETIRE_CURRENT_DEV_FIXTURES
FORUM_COMMENT_IDENTITY_POLICY_DECISION=RETIRE_CURRENT_DEV_FIXTURES
FORUM_LIKE_FIXTURE_POLICY_DECISION=RETIRE_CURRENT_DEV_FIXTURES
FORUM_POST_IDENTITIES_RESOLVED=NOT_REQUIRED_FIXTURES_RETIRED
FORUM_COMMENT_IDENTITIES_RESOLVED=NOT_REQUIRED_FIXTURES_RETIRED
FORUM_COMMENT_PARENT_IDENTITY_RESOLVED=NOT_REQUIRED_PARENT_FIXTURES_RETIRED
FORUM_LIKE_ROW_IDENTITY_RESOLVED=YES
FORUM_LIKE_POLICY_RESOLVED=YES
P8_05C3B_IMPLEMENTATION_AUTHORIZED=YES_AFTER_P8_05C3B1_PR_134_MERGE
P8_05C3B_BLOCKERS=NONE
P8_05C3B_IMPLEMENTATION_STRATEGY=RETIRE_LEGACY_FORUM_DEV_FIXTURES
P8_05C3B_IMPLEMENTATION_STATUS=NOT_STARTED
CURRENT_CENTRAL_NORMAL_WRITE_METHOD_COUNT=3
POST_C3B_CENTRAL_NORMAL_WRITE_METHOD_COUNT=2
CURRENT_CENTRAL_BUSINESS_TABLE_COUNT=5
POST_C3B_CENTRAL_BUSINESS_TABLE_COUNT=2
CURRENT_FORUM_RESET_TARGETS=forum_likes;forum_comments;forum_posts
EXPECTED_POST_C3B_FORUM_RESET_TARGET_COUNT=0
P8_05C3C_IMPLEMENTATION_AUTHORIZED=NO
P8_05C4D_CENTRAL_RETIREMENT_AUTHORIZED=NO
RUNTIME_FILES_CHANGED=0
SCHEMA_CHANGES=0
MIGRATIONS_CREATED=0
~~~

## P8-05C3B Forum Retirement Current Authority

~~~text
P8_05C3B1_FORUM_DECISION_STATUS=IMPLEMENTED_BY_MERGED_PR_134
P8_05C3B_IMPLEMENTATION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_05C3B_IMPLEMENTATION_AUTHORIZED=YES
P8_05C3B_BLOCKERS=NONE
P8_05C3B_IMPLEMENTATION_STRATEGY=RETIRE_LEGACY_FORUM_DEV_FIXTURES
POST_C3B_CENTRAL_NORMAL_WRITE_METHOD_COUNT=2
POST_C3B_CENTRAL_BUSINESS_TABLE_COUNT=2
POST_C3B_FORUM_RESET_TARGET_COUNT=0
P8_05C3C_IMPLEMENTATION_AUTHORIZED=NO
P8_05C4D_CENTRAL_RETIREMENT_AUTHORIZED=NO
SCHEMA_CHANGES=0
MIGRATIONS_CREATED=0
~~~

## P8-05C3C1 Current Ads Decision Authority

The [C3C1 Ads audit](dev-seed-c3-decisions.md#20-p8-05c3c1-ads-identity-and-fixture-policy-audit)
is the current trailing decision authority.

~~~text
P8_05C3B_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_135
CENTRAL_NORMAL_WRITE_METHOD_COUNT=2
CENTRAL_BUSINESS_TABLE_COUNT=2
AD_PACKAGE_IDENTITIES_RESOLVED=NO
AD_CAMPAIGN_IDENTITIES_RESOLVED=NO
AD_CAMPAIGN_PARENT_IDENTITY_RESOLVED=NO
AD_PACKAGE_CLASSIFICATION_RESOLVED=NO
AD_EVENTS_PHASE8_CLASSIFICATION=RESET_ONLY_LEGACY_DEBT
P8_05C3C1_ADS_DECISION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_05C3C_IMPLEMENTATION_STATUS=NOT_STARTED
P8_05C3C_IMPLEMENTATION_AUTHORIZED=NO
P8_05C4D_CENTRAL_RETIREMENT_AUTHORIZED=NO
~~~

## P8-05C3C1 Human Review Decision Overlay

Human review accepts the C3C1 audit and distinguishes Package origin from
current runtime purpose. All three Package concepts are retained for future
Ads-owned REFERENCE migration, but no existing composite, generated ID, or
seed-only key is approved. A separate C3C2 decision must define a real domain
identifier and exact retained values. All four screenshot/demo Campaigns are
approved for retirement, so their positional Package mappings and supplier
dependency are not required after retirement implementation.

`ad_events` remains an Ads runtime table and reset-only Phase 8 debt. No
runtime, schema, migration, SeedGroup, reset, or alias change is made. Full
current authority is in the
[C3C1 human review overlay](dev-seed-c3-decisions.md#21-p8-05c3c1-human-review-decision-overlay).

~~~text
AD_PACKAGE_CLASSIFICATION_DECISION=RECLASSIFY_AS_REFERENCE
AD_PACKAGE_CURRENT_CLASSIFICATION_DECISION=DEV_CLASSIFICATION_TO_BE_RETIRED_AFTER_REFERENCE_MIGRATION
AD_PACKAGE_REFERENCE_CLASSIFICATION_APPROVED=YES
AD_PACKAGE_RETIRE_WITHOUT_REPLACEMENT_AUTHORIZED=NO
AD_PACKAGE_IDENTITY_POLICY_DECISION=ADD_DOMAIN_PACKAGE_IDENTIFIER
AD_PACKAGE_IDENTITIES_RESOLVED=PENDING_DOMAIN_PACKAGE_IDENTIFIER_DECISION
AP_01_DECISION=RETAIN_PENDING_APPROVED_REFERENCE_IDENTITY
AP_02_DECISION=RETAIN_PENDING_APPROVED_REFERENCE_IDENTITY
AP_03_DECISION=RETAIN_PENDING_APPROVED_REFERENCE_IDENTITY
AD_PACKAGE_APPROVED_RETAIN_COUNT=3
AD_PACKAGE_APPROVED_RETIRE_COUNT=0
AD_PACKAGE_DEV_FIXTURE_DISPOSITION=MIGRATE_TO_REFERENCE_AFTER_DOMAIN_IDENTITY_APPROVAL

AD_CAMPAIGN_IDENTITY_POLICY_DECISION=RETIRE_CURRENT_DEV_FIXTURES
AC_01_DECISION=RETIRE
AC_02_DECISION=RETIRE
AC_03_DECISION=RETIRE
AC_04_DECISION=RETIRE
AD_CAMPAIGN_APPROVED_RETAIN_COUNT=0
AD_CAMPAIGN_APPROVED_RETIRE_COUNT=4
AD_CAMPAIGN_IDENTITIES_RESOLVED=NOT_REQUIRED_FIXTURES_RETIRED
AD_CAMPAIGN_PACKAGE_PARENT_MAPPING_DECISION=NOT_REQUIRED_CAMPAIGN_FIXTURES_RETIRED
AD_CAMPAIGN_PARENT_IDENTITY_RESOLVED=NOT_REQUIRED_CAMPAIGN_FIXTURES_RETIRED
ADS_CAMPAIGN_USER_DEPENDENCY_REQUIRED=NO

AD_EVENTS_PHASE8_CLASSIFICATION=RESET_ONLY_LEGACY_DEBT
AD_CAMPAIGN_RETIREMENT_DECISION_RESOLVED=YES
AD_PACKAGE_REFERENCE_MIGRATION_DECISION_RESOLVED=NO
NEXT_DECISION_SLICE=P8_05C3C2_AD_PACKAGE_REFERENCE_IDENTITY_DECISION
P8_05C3C_IMPLEMENTATION_AUTHORIZED=NO
P8_05C3C_BLOCKERS=AD_PACKAGE_DOMAIN_IDENTIFIER_DECISION_REQUIRED;AD_PACKAGE_IDENTIFIER_ASSIGNMENT_AUTHORITY_DECISION_REQUIRED;AD_PACKAGE_IDENTIFIER_IMMUTABILITY_DECISION_REQUIRED;AD_PACKAGE_IDENTIFIER_UNIQUENESS_SCOPE_DECISION_REQUIRED;AP_01_REFERENCE_IDENTIFIER_VALUE_REQUIRED;AP_02_REFERENCE_IDENTIFIER_VALUE_REQUIRED;AP_03_REFERENCE_IDENTIFIER_VALUE_REQUIRED
P8_05C4D_CENTRAL_RETIREMENT_AUTHORIZED=NO
RUNTIME_FILES_CHANGED=0
SCHEMA_CHANGES=0
MIGRATIONS_CREATED=0
~~~

## P8-05C3C2 Ad Package Reference Identity Decision

Merged PR #136 finalized the C3C1 human decisions. Static domain-contract,
schema, API, reference-seed, and Git-history evidence now supports a complete
human-review recommendation: retain numeric `AdPackage.id` and the Campaign
`packageId` FK, add a separate immutable globally unique `packageCode`, and use
it as the stable identity of future `ads.reference.packages` reconciliation.

The proposed exact codes are `HOMEPAGE_CAROUSEL`, `FEATURED_PRODUCT`, and
`SPOTLIGHT_PLACEMENT`. They preserve the three approved Package concepts
without encoding localization, price, duration, serial IDs, or one-Package-per-
`AdType` cardinality. This PR does not add the field, migrate rows, expose it
through runtime DTOs, create the group, or retire Campaigns. Full evidence is
in the [C3C2 decision](dev-seed-c3-decisions.md#22-p8-05c3c2-ad-package-reference-identity-decision).

~~~text
P8_05C3C1_ADS_HUMAN_REVIEW_STATUS=FINALIZED_BY_MERGED_PR_136
P8_05C3C1_ADS_DECISION_STATUS=IMPLEMENTED_BY_MERGED_PR_136
AD_PACKAGE_CLASSIFICATION_DECISION=RECLASSIFY_AS_REFERENCE
AD_PACKAGE_IDENTITY_POLICY_DECISION=ADD_DOMAIN_PACKAGE_IDENTIFIER
AD_PACKAGE_IDENTIFIER_FIELD_NAME_DECISION=packageCode
AD_PACKAGE_IDENTIFIER_SEMANTICS=IMMUTABLE_ADVERTISING_PACKAGE_REFERENCE_CATALOG_CODE
AD_PACKAGE_IDENTIFIER_ASSIGNMENT_AUTHORITY_DECISION=SYSTEM_DEFINED_REFERENCE_CATALOG
AD_PACKAGE_IDENTIFIER_IMMUTABILITY_DECISION=IMMUTABLE_AFTER_CREATION
AD_PACKAGE_IDENTIFIER_UNIQUENESS_SCOPE_DECISION=GLOBAL_UNIQUE
AD_PACKAGE_IDENTIFIER_NULLABILITY_POLICY=TRANSITIONAL_NULLABLE_THEN_NOT_NULL
AD_PACKAGE_IDENTIFIER_IS_DOMAIN_OR_CONFIGURATION_IDENTITY=YES
AP_01_REFERENCE_IDENTIFIER_VALUE_DECISION=HOMEPAGE_CAROUSEL
AP_02_REFERENCE_IDENTIFIER_VALUE_DECISION=FEATURED_PRODUCT
AP_03_REFERENCE_IDENTIFIER_VALUE_DECISION=SPOTLIGHT_PLACEMENT
AD_PACKAGE_NUMERIC_PRIMARY_KEY_DECISION=RETAIN_INTERNAL_SURROGATE_PRIMARY_KEY
AD_CAMPAIGN_PACKAGE_FK_DECISION=RETAIN_NUMERIC_PACKAGE_ID_FOREIGN_KEY
AD_CAMPAIGN_PACKAGE_FK_SCHEMA_CHANGE_REQUIRED=NO
AD_PACKAGE_VERSIONING_MODEL=SINGLE_IMMUTABLE_REFERENCE_PER_CODE_WITH_MUTABLE_PAYLOAD
AD_PACKAGE_IDENTIFIER_API_EXPOSURE=PUBLIC_READ_ONLY_FIELD
AD_PACKAGE_SCHEMA_CHANGE_REQUIRED=YES
AD_PACKAGE_EXISTING_ROW_MIGRATION_POLICY=BACKFILL_ONLY_MATCHED_CANONICAL_ROWS_FAIL_CLOSED_ON_AMBIGUITY
P8_05C3C2_AD_PACKAGE_REFERENCE_IDENTITY_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
AD_PACKAGE_DOMAIN_IDENTIFIER_DECISION_RESOLVED=NO_PENDING_HUMAN_REVIEW
AD_PACKAGE_REFERENCE_MIGRATION_DECISION_RESOLVED=NO_IMPLEMENTATION_NOT_STARTED
P8_05C3C2_IMPLEMENTATION_AUTHORIZED=NO_PENDING_HUMAN_REVIEW_AND_SEPARATE_SCHEMA_SLICE
P8_05C3C_IMPLEMENTATION_AUTHORIZED=NO
P8_05C4D_CENTRAL_RETIREMENT_AUTHORIZED=NO
RUNTIME_FILES_CHANGED=0
SCHEMA_CHANGES=0
MIGRATIONS_CREATED=0
~~~

## P8-05C3C2 Human Review Decision Overlay

Human review approves `packageCode`, all three exact catalog codes, numeric
PK/FK preservation, and the future Ads REFERENCE group. The approved
transitional nullability is now explicitly split: A1 adds a nullable globally
unique code without guessing existing rows; A2 performs bounded fail-closed
backfill and enforces NOT NULL only after every row is valid. The original
C3C2 recommendation remains historical pre-review evidence. See the
[complete human decision](dev-seed-c3-decisions.md#23-p8-05c3c2-human-review-decision-overlay).

~~~text
AD_PACKAGE_IDENTIFIER_FIELD_NAME_DECISION=packageCode
AD_PACKAGE_IDENTIFIER_SEMANTICS=IMMUTABLE_ADVERTISING_PACKAGE_REFERENCE_CATALOG_CODE
AD_PACKAGE_IDENTIFIER_ASSIGNMENT_AUTHORITY_DECISION=SYSTEM_DEFINED_REFERENCE_CATALOG
AD_PACKAGE_IDENTIFIER_IMMUTABILITY_DECISION=IMMUTABLE_AFTER_CREATION
AD_PACKAGE_IDENTIFIER_UNIQUENESS_SCOPE_DECISION=GLOBAL_UNIQUE
AD_PACKAGE_IDENTIFIER_NULLABILITY_POLICY=TRANSITIONAL_NULLABLE_THEN_NOT_NULL
AD_PACKAGE_DOMAIN_IDENTIFIER_DECISION_RESOLVED=YES
AP_01_REFERENCE_IDENTIFIER_VALUE_DECISION=HOMEPAGE_CAROUSEL
AP_02_REFERENCE_IDENTIFIER_VALUE_DECISION=FEATURED_PRODUCT
AP_03_REFERENCE_IDENTIFIER_VALUE_DECISION=SPOTLIGHT_PLACEMENT
AD_PACKAGE_NUMERIC_PRIMARY_KEY_DECISION=RETAIN_INTERNAL_SURROGATE_PRIMARY_KEY
AD_CAMPAIGN_PACKAGE_FK_DECISION=RETAIN_NUMERIC_PACKAGE_ID_FOREIGN_KEY
AD_CAMPAIGN_PACKAGE_FK_SCHEMA_CHANGE_REQUIRED=NO
PACKAGE_CODE_FINAL_NULLABILITY=NOT_NULL
AD_PACKAGE_EXISTING_ROW_MIGRATION_POLICY=BACKFILL_ONLY_MATCHED_CANONICAL_ROWS_FAIL_CLOSED_ON_AMBIGUITY
C3C2A1_PACKAGE_CODE_NULLABILITY=NULLABLE_TRANSITIONAL
C3C2A1_EXISTING_ROW_AUTOMATIC_GUESSING=PROHIBITED
C3C2A2_AMBIGUOUS_ROW_POLICY=FAIL_CLOSED
C3C2A2_UNKNOWN_CUSTOM_ROW_POLICY=REQUIRE_EXPLICIT_HUMAN_MAPPING_BEFORE_NOT_NULL
C3C2A2_FINAL_PACKAGE_CODE_NULLABILITY=NOT_NULL
AD_PACKAGE_BACKFILL_MATCHING_IS_DOMAIN_IDENTITY=NO
AD_PACKAGE_CANONICAL_DOMAIN_IDENTITY=packageCode
P8_05C3C2_AD_PACKAGE_REFERENCE_IDENTITY_STATUS=IMPLEMENTED_PENDING_HUMAN_MERGE
P8_05C3C2_DECISION_BLOCKERS=NONE
AD_PACKAGE_REFERENCE_MIGRATION_DECISION_RESOLVED=YES_DESIGN_APPROVED_IMPLEMENTATION_NOT_STARTED
P8_05C3C2A1_IMPLEMENTATION_AUTHORIZED=YES_AFTER_P8_05C3C2_PR_137_MERGE
P8_05C3C2A2_IMPLEMENTATION_AUTHORIZED=NO_WAITING_FOR_C3C2A1_MERGE_AND_REVIEW
P8_05C3C2B_IMPLEMENTATION_AUTHORIZED=NO_WAITING_FOR_C3C2A2_MERGE_AND_REVIEW
P8_05C3C_IMPLEMENTATION_AUTHORIZED=NO
P8_05C4D_CENTRAL_RETIREMENT_AUTHORIZED=NO
RUNTIME_FILES_CHANGED=0
SCHEMA_CHANGES=0
MIGRATIONS_CREATED=0
NEW_SEEDGROUPS=0
~~~

## P8-05C3C2A1 Ad Package Identifier Schema Expand Implementation Overlay

The merged PR #137 decision is now implemented through its nullable A1 expand
only. The Ads entity maps nullable `packageCode` to `package_code varchar(64)`
with the named global unique constraint `UQ_ad_packages_package_code`; one
ordered V2 migration adds and reverses only that column and constraint. See
the [complete A1 implementation overlay](dev-seed-c3-decisions.md#24-p8-05c3c2a1-ad-package-identifier-schema-expand-implementation-overlay).

No Package row was updated, no canonical code was assigned, and NOT NULL is
still reserved for A2. The numeric Package PK and Campaign FK, public API,
central Ads writers, reset targets, fixtures, and `ad_events` behavior remain
unchanged.

~~~text
P8_05C3C2_AD_PACKAGE_REFERENCE_IDENTITY_STATUS=IMPLEMENTED_BY_MERGED_PR_137
P8_05C3C2A1_IMPLEMENTATION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_05C3C2A1_BLOCKERS=NONE
C3C2A1_PACKAGE_CODE_NULLABILITY=NULLABLE_TRANSITIONAL
C3C2A1_EXISTING_ROW_AUTOMATIC_GUESSING=PROHIBITED
AD_PACKAGE_ENTITY_PACKAGE_CODE_EXISTS=YES
AD_PACKAGE_ENTITY_PACKAGE_CODE_COLUMN=package_code
AD_PACKAGE_ENTITY_PACKAGE_CODE_TYPE=varchar
AD_PACKAGE_ENTITY_PACKAGE_CODE_LENGTH=64
AD_PACKAGE_ENTITY_PACKAGE_CODE_NULLABLE=YES
AD_PACKAGE_ENTITY_PACKAGE_CODE_UNIQUE=YES
AD_PACKAGE_PRIMARY_KEY_CHANGED=NO
AD_CAMPAIGN_PACKAGE_FK_CHANGED=NO
AD_PACKAGE_PUBLIC_API_PACKAGE_CODE_EXPOSED=NO
NEW_PACKAGE_CODE_MUTATION_PATHS=0
MIGRATION_UPDATE_STATEMENTS=0
MIGRATION_BACKFILL_STATEMENTS=0
MIGRATION_PACKAGE_CODE_NOT_NULL_ENFORCEMENT=NO
EXISTING_PACKAGE_ROWS_MODIFIED=0
NEW_AD_PACKAGE_REFERENCE_SEEDGROUPS=0
NEW_SEEDGROUPS=0
NEW_SEED_OUTPUT_KINDS=0
CENTRAL_NORMAL_WRITE_METHOD_COUNT=2
CENTRAL_NORMAL_WRITE_METHODS=seedAdPackages;seedAdCampaigns
AD_EVENTS_PHASE8_CLASSIFICATION=RESET_ONLY_LEGACY_DEBT
AD_EVENTS_RESET_TARGET_EXISTS=YES
SCHEMA_CHANGES=1
MIGRATIONS_CREATED=1
P8_05C3C2A2_IMPLEMENTATION_AUTHORIZED=NO_WAITING_FOR_C3C2A1_MERGE_AND_REVIEW
P8_05C3C2B_IMPLEMENTATION_AUTHORIZED=NO_WAITING_FOR_C3C2A2_MERGE_AND_REVIEW
P8_05C3C_IMPLEMENTATION_AUTHORIZED=NO
P8_05C4D_CENTRAL_RETIREMENT_AUTHORIZED=NO
~~~

## P8-05C3C2A2 Ad Package Identifier Backfill And Contract Implementation Overlay

The merged PR #138 A1 expand is now followed by one fail-closed A2 migration.
It preflights full legacy fingerprints and existing codes, performs three
NULL-only bounded assignments, rejects every unresolved or unapproved row,
and sets `package_code` NOT NULL only after validation. Its DOWN path restores
A1 nullability without deleting identities. See the
[complete A2 implementation overlay](dev-seed-c3-decisions.md#25-p8-05c3c2a2-ad-package-identifier-backfill-and-contract-implementation-overlay).

~~~text
P8_05C3C2A1_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_138
P8_05C3C2A2_IMPLEMENTATION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_05C3C2A2_BLOCKERS=NONE
AD_PACKAGE_REFERENCE_MIGRATION_DECISION_RESOLVED=YES_A1_A2_IMPLEMENTED_PENDING_HUMAN_REVIEW
C3C2A2_AMBIGUOUS_ROW_POLICY=FAIL_CLOSED
C3C2A2_UNKNOWN_CUSTOM_ROW_POLICY=REQUIRE_EXPLICIT_HUMAN_MAPPING_BEFORE_NOT_NULL
C3C2A2_FINAL_PACKAGE_CODE_NULLABILITY=NOT_NULL
UNEXPECTED_EXISTING_PACKAGE_CODE_POLICY=FAIL_CLOSED
UNKNOWN_OR_CUSTOM_NULL_ROW_POLICY=FAIL_CLOSED_REQUIRE_EXPLICIT_HUMAN_MAPPING
AP_01_ZERO_MATCH_POLICY=ALLOWED
AP_02_ZERO_MATCH_POLICY=ALLOWED
AP_03_ZERO_MATCH_POLICY=ALLOWED
MIGRATION_BOUNDED_UPDATE_STATEMENTS=3
MIGRATION_SET_NOT_NULL=YES_AFTER_VALIDATION
A2_DOWN_DROPS_NOT_NULL=YES
A2_DOWN_PRESERVES_PACKAGE_CODE_VALUES=YES
AD_PACKAGE_ENTITY_PACKAGE_CODE_NULLABLE=NO
AD_PACKAGE_PRIMARY_KEY_CHANGED=NO
AD_CAMPAIGN_PACKAGE_FK_CHANGED=NO
AD_PACKAGE_PUBLIC_API_PACKAGE_CODE_EXPOSED=NO
NEW_AD_PACKAGE_REFERENCE_SEEDGROUPS=0
CENTRAL_NORMAL_WRITE_METHOD_COUNT=2
CENTRAL_NORMAL_WRITE_METHODS=seedAdPackages;seedAdCampaigns
AD_EVENTS_PHASE8_CLASSIFICATION=RESET_ONLY_LEGACY_DEBT
AD_EVENTS_RESET_TARGET_EXISTS=YES
SCHEMA_CHANGES=1
MIGRATIONS_CREATED=1
P8_05C3C2B_IMPLEMENTATION_AUTHORIZED=NO_WAITING_FOR_C3C2A2_MERGE_AND_REVIEW
P8_05C3C_IMPLEMENTATION_AUTHORIZED=NO
P8_05C4D_CENTRAL_RETIREMENT_AUTHORIZED=NO
~~~

## P8-05C3C2A2 Corrective Compatibility Review Overlay

Review corrected fresh-database compatibility and approved-code payload
binding in the same A2 PR. The three retained Package fixtures now declare
their approved codes, while the migration rejects approved codes on the wrong
fingerprint and unknown/custom NULL rows before its first UPDATE. The bridge
is transitional and does not move final REFERENCE ownership.

~~~text
A2_REVIEW_BLOCKER_FOUND=LEGACY_PACKAGE_WRITER_INCOMPATIBLE_WITH_NOT_NULL_ON_EMPTY_DATABASE
A2_REVIEW_BLOCKER_RESOLVED=YES_TRANSITIONAL_CANONICAL_PACKAGE_CODES_ADDED_TO_LEGACY_WRITER
A2_APPROVED_CODE_PAYLOAD_BINDING_GAP_FOUND=YES
A2_APPROVED_CODE_PAYLOAD_BINDING_GAP_RESOLVED=YES_FAIL_CLOSED_CODE_TO_FINGERPRINT_PREFLIGHT
TRANSITIONAL_LEGACY_PACKAGE_CODE_BRIDGE=YES
TRANSITIONAL_LEGACY_PACKAGE_WRITER_FINAL_AUTHORITY=NO
AD_PACKAGE_FINAL_SEED_OWNER=ADS
AD_PACKAGE_FINAL_SEED_CLASSIFICATION=REFERENCE
AD_PACKAGE_FINAL_SEED_GROUP_ID=ads.reference.packages
CENTRAL_AD_PACKAGE_FIXTURE_COUNT=3
CENTRAL_AD_PACKAGE_PACKAGE_CODE_ASSIGNMENT_COUNT=3
CENTRAL_AD_PACKAGE_NON_IDENTITY_PAYLOAD_CHANGES=0
POST_A2_CURRENT_SEED_MISSING_PACKAGE_CODE_FIXTURES=0
FRESH_DB_A2_THEN_LEGACY_PACKAGE_SEED_STATIC_COMPATIBILITY=PASS
APPROVED_CODE_FINGERPRINT_PREFLIGHT_COUNT=3
UNKNOWN_CUSTOM_NULL_PREFLIGHT_BEFORE_FIRST_UPDATE=YES
PRE_UPDATE_FAIL_CLOSED_VALIDATION_COMPLETE=YES
MIGRATION_BOUNDED_UPDATE_STATEMENTS=3
MIGRATION_SET_NOT_NULL=YES_AFTER_ALL_VALIDATION
NEW_AD_PACKAGE_REFERENCE_SEEDGROUPS=0
CENTRAL_NORMAL_WRITE_METHOD_COUNT=2
CENTRAL_NORMAL_WRITE_METHODS=seedAdPackages;seedAdCampaigns
AD_CAMPAIGN_FIXTURE_CHANGES=0
RESET_ALL_CHANGES=0
P8_05C3C2A2_IMPLEMENTATION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_05C3C2A2_BLOCKERS=NONE
P8_05C3C2B_IMPLEMENTATION_AUTHORIZED=NO_WAITING_FOR_C3C2A2_MERGE_AND_REVIEW
P8_05C3C_IMPLEMENTATION_AUTHORIZED=NO
P8_05C4D_CENTRAL_RETIREMENT_AUTHORIZED=NO
~~~


## P8-05C3C2A2 Merged Status Authority Overlay

PR #139 merged the reviewed A2 identity contract into `develop`. This
trailing overlay advances only current authority; all earlier pending-review
and waiting states remain historical evidence.

~~~text
P8_05C3C2A1_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_138
P8_05C3C2A2_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_139
AD_PACKAGE_DOMAIN_IDENTIFIER_DECISION_RESOLVED=YES
AD_PACKAGE_CANONICAL_DOMAIN_IDENTITY=packageCode
C3C2A2_FINAL_PACKAGE_CODE_NULLABILITY=NOT_NULL
AD_PACKAGE_APPROVED_CODES=HOMEPAGE_CAROUSEL;FEATURED_PRODUCT;SPOTLIGHT_PLACEMENT
AD_PACKAGE_REFERENCE_SEED_GROUP_ID=ads.reference.packages
AD_PACKAGE_REFERENCE_SEED_OWNER=ADS
AD_PACKAGE_REFERENCE_SEED_CLASSIFICATION=REFERENCE
AD_PACKAGE_REFERENCE_SEED_DEPENDENCIES=NONE
AD_PACKAGE_REFERENCE_STABLE_KEY=packageCode
P8_05C3C2B_IMPLEMENTATION_AUTHORIZED=YES_AFTER_P8_05C3C2A2_PR_139_MERGE
~~~

## P8-05C3C2B Ads Reference Package Seed Implementation Overlay

The Ads owner now provides the single final REFERENCE writer for the three
canonical Packages. It performs per-record lookup by `packageCode`, creates
missing records, and reconciles only mutable approved payload on existing
records. It returns no scalar outputs. The same-payload central Package writer
and positional Campaign writer remain transitional until their separately
approved retirement slices.

~~~text
P8_05C3C2A2_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_139
P8_05C3C2B_IMPLEMENTATION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_05C3C2B_BLOCKERS=NONE

AD_PACKAGE_REFERENCE_SEED_GROUP_COUNT=1
AD_PACKAGE_REFERENCE_SEED_GROUP_ID=ads.reference.packages
AD_PACKAGE_REFERENCE_SEED_OWNER=ADS
AD_PACKAGE_REFERENCE_SEED_CLASSIFICATION=REFERENCE
AD_PACKAGE_REFERENCE_SEED_DEPENDENCY_COUNT=0
AD_PACKAGE_REFERENCE_RECORD_COUNT=3
AD_PACKAGE_REFERENCE_LOOKUP_KEY=packageCode
AD_PACKAGE_REFERENCE_WRITER_OWNER=ADS

REFERENCE_SEED_PER_RECORD_RECONCILIATION=YES
REFERENCE_SEED_CREATE_IF_ABSENT=YES
REFERENCE_SEED_RECONCILE_IF_PRESENT=YES
REFERENCE_SEED_WHOLE_TABLE_SHORT_CIRCUIT=NO
REFERENCE_SEED_NUMERIC_PK_REPLACEMENT=NO
PACKAGE_CODE_MUTATED_DURING_RECONCILIATION=NO
WHOLE_TABLE_GUARD_USED=NO
GENERATED_NUMERIC_ID_USED_AS_LOOKUP=NO
NAME_USED_AS_LOOKUP=NO
AD_TYPE_USED_AS_LOOKUP=NO

NEW_AD_PACKAGE_REFERENCE_SEED_OUTPUT_KINDS=0
REFERENCE_GROUP_DISCOVERABLE_BY_ORCHESTRATOR=YES
CENTRAL_RUNNER_PACKAGE_TABLE_WRITES_ADDED=0
CROSS_OWNER_ENTITY_IMPORTS=0
CROSS_OWNER_REPOSITORY_ACCESS=0

LEGACY_SEED_AD_PACKAGES_EXISTS=YES
TRANSITIONAL_LEGACY_PACKAGE_CODE_BRIDGE=YES
LEGACY_REFERENCE_PACKAGE_CODE_PARITY=PASS
LEGACY_REFERENCE_PACKAGE_PAYLOAD_PARITY=PASS
FINAL_PACKAGE_SEED_OWNER_COUNT=1
FINAL_PACKAGE_SEED_OWNER=ADS
TRANSITIONAL_LEGACY_WRITER_PENDING_RETIREMENT=YES

AD_CAMPAIGN_FIXTURE_CHANGES=0
AD_CAMPAIGN_SEEDGROUPS_CREATED=0
LEGACY_CAMPAIGN_PACKAGE_SELECTION_CHANGED=NO
RESET_ALL_CHANGES=0
AD_EVENTS_PHASE8_CLASSIFICATION=RESET_ONLY_LEGACY_DEBT
AD_EVENTS_RESET_TARGET_EXISTS=YES
AD_PACKAGE_PUBLIC_API_PACKAGE_CODE_EXPOSED=NO
SCHEMA_CHANGES=0
MIGRATIONS_CREATED=0

P8_05C3C3_IMPLEMENTATION_AUTHORIZED=NO_WAITING_FOR_C3C2B_MERGE_AND_REVIEW
P8_05C3C4_IMPLEMENTATION_AUTHORIZED=NO_WAITING_FOR_C3C3_MERGE_AND_REVIEW
P8_05C3C_IMPLEMENTATION_AUTHORIZED=NO
P8_05C4D_CENTRAL_RETIREMENT_AUTHORIZED=NO
~~~


## P8-05C3C2B Merged Status Authority Overlay

PR #140 merged the reviewed Ads-owned Package REFERENCE seed into
`develop`. This trailing overlay advances current C3C3 authority while all
earlier pending-review and waiting states remain historical evidence.

~~~text
P8_05C3C2A2_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_139
P8_05C3C2B_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_140
AD_PACKAGE_REFERENCE_SEED_GROUP_ID=ads.reference.packages
AD_PACKAGE_REFERENCE_SEED_OWNER=ADS
AD_PACKAGE_REFERENCE_SEED_CLASSIFICATION=REFERENCE
AD_CAMPAIGN_IDENTITY_POLICY_DECISION=RETIRE_CURRENT_DEV_FIXTURES
AC_01_DECISION=RETIRE
AC_02_DECISION=RETIRE
AC_03_DECISION=RETIRE
AC_04_DECISION=RETIRE
AD_CAMPAIGN_APPROVED_RETAIN_COUNT=0
AD_CAMPAIGN_APPROVED_RETIRE_COUNT=4
AD_CAMPAIGN_IDENTITIES_RESOLVED=NOT_REQUIRED_FIXTURES_RETIRED
AD_CAMPAIGN_PARENT_IDENTITY_RESOLVED=NOT_REQUIRED_CAMPAIGN_FIXTURES_RETIRED
P8_05C3C3_IMPLEMENTATION_AUTHORIZED=YES_AFTER_P8_05C3C2B_PR_140_MERGE
~~~

## P8-05C3C3 Campaign DEV Fixture Retirement Implementation Overlay

The four approved legacy Campaign DEV fixtures and their central writer are
retired without replacement. Their positional Package-parent dependency and
the `ad_campaigns` reset target retire with them. Normal Campaign domain
persistence remains unchanged. The central Package writer, Package/Event reset
debt, Ads-owned Package REFERENCE group, legacy actor map, and Users dependency
remain for their separately bounded follow-up slices.

~~~text
P8_05C3C2B_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_140
P8_05C3C3_IMPLEMENTATION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_05C3C3_BLOCKERS=NONE

CENTRAL_SEED_AD_CAMPAIGNS_METHOD_EXISTS=NO
CENTRAL_AD_CAMPAIGN_REPOSITORY_ACCESS=0
CENTRAL_AD_CAMPAIGN_WRITE_CALLS=0
AD_CAMPAIGN_EXECUTABLE_FIXTURE_COUNT=0
AC_01_EXECUTABLE_FIXTURE_EXISTS=NO
AC_02_EXECUTABLE_FIXTURE_EXISTS=NO
AC_03_EXECUTABLE_FIXTURE_EXISTS=NO
AC_04_EXECUTABLE_FIXTURE_EXISTS=NO
LEGACY_CAMPAIGN_PACKAGE_POSITIONAL_SELECTION_EXISTS=NO
CENTRAL_PACKAGES_ARRAY_USED_FOR_CAMPAIGN_PARENT_SELECTION=NO

NEW_AD_CAMPAIGN_SEEDGROUPS=0
NEW_AD_CAMPAIGN_SEED_OUTPUT_KINDS=0
AD_CAMPAIGN_FINAL_DEV_FIXTURE_DISPOSITION=RETIRED_NO_REPLACEMENT

LEGACY_SEED_AD_PACKAGES_EXISTS=YES
CENTRAL_AD_PACKAGE_FIXTURE_COUNT=3
CENTRAL_AD_PACKAGE_PACKAGE_CODE_ASSIGNMENT_COUNT=3
CENTRAL_AD_PACKAGE_NON_IDENTITY_PAYLOAD_CHANGES=0
TRANSITIONAL_LEGACY_PACKAGE_CODE_BRIDGE=YES
REFERENCE_PACKAGE_SEED_CHANGES=0
REFERENCE_PACKAGE_PAYLOAD_CHANGES=0
AD_PACKAGE_REFERENCE_SEED_GROUP_COUNT=1
AD_PACKAGE_REFERENCE_SEED_GROUP_ID=ads.reference.packages
AD_PACKAGE_REFERENCE_RECORD_COUNT=3
FINAL_PACKAGE_SEED_OWNER=ADS

CAMPAIGN_LEGACY_USER_ALIAS_CONSUMERS=SUPPLIER_BUSINESS_ID;ADMIN_UNUSED_PARAMETER_PLUMBING
CAMPAIGN_USERS_OUTPUT_CONSUMER_COUNT_PRE_C3C3=2
CAMPAIGN_BUSINESS_USER_ID_CONSUMER_COUNT_PRE_C3C3=1
POST_C3C3_BUSINESS_USER_ID_CONSUMER_COUNT=0
C4D_LEGACY_ACTOR_OR_DEPENDENCY_DEBT=LEGACY_ACTOR_MAP_AND_USERS_DEPENDENCY_REMAIN_STRUCTURALLY_PRESENT

AD_CAMPAIGN_RESET_TARGET_EXISTS=NO
AD_PACKAGE_RESET_TARGET_EXISTS=YES
AD_EVENTS_RESET_TARGET_EXISTS=YES
AD_EVENTS_PHASE8_CLASSIFICATION=RESET_ONLY_LEGACY_DEBT

CENTRAL_NORMAL_WRITE_METHOD_COUNT=1
CENTRAL_NORMAL_WRITE_METHODS=seedAdPackages
CENTRAL_BUSINESS_TABLE_COUNT=1
CENTRAL_BUSINESS_TABLES=ad_packages
CENTRAL_AD_CAMPAIGN_TABLE_WRITE_OWNERS=0

AD_CAMPAIGN_DOMAIN_RUNTIME_CHANGES=0
AD_CAMPAIGN_SCHEMA_CHANGES=0
AD_CAMPAIGN_PACKAGE_FK_CHANGED=NO
SCHEMA_CHANGES=0
MIGRATIONS_CREATED=0

P8_05C3C4_IMPLEMENTATION_AUTHORIZED=NO_WAITING_FOR_C3C3_MERGE_AND_REVIEW
P8_05C3C_IMPLEMENTATION_AUTHORIZED=NO
P8_05C4D_CENTRAL_RETIREMENT_AUTHORIZED=NO
~~~

## P8-05C3C3 Merged Status Authority Overlay

PR #141 merged the reviewed Campaign DEV fixture retirement into `develop`.
This trailing overlay authorizes C3C4; all earlier pending-review and waiting
states remain historical evidence.

~~~text
P8_05C3C2B_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_140
P8_05C3C3_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_141
P8_05C3C4_IMPLEMENTATION_AUTHORIZED=YES_AFTER_P8_05C3C3_PR_141_MERGE
AD_PACKAGE_REFERENCE_SEED_GROUP_ID=ads.reference.packages
AD_PACKAGE_REFERENCE_SEED_OWNER=ADS
AD_PACKAGE_REFERENCE_SEED_CLASSIFICATION=REFERENCE
AD_PACKAGE_REFERENCE_RECORD_COUNT=3
CENTRAL_NORMAL_WRITE_METHOD_COUNT=1
CENTRAL_NORMAL_WRITE_METHODS=seedAdPackages
CENTRAL_BUSINESS_TABLE_COUNT=1
CENTRAL_BUSINESS_TABLES=ad_packages
CENTRAL_SEED_AD_CAMPAIGNS_METHOD_EXISTS=NO
AD_CAMPAIGN_EXECUTABLE_FIXTURE_COUNT=0
~~~

## P8-05C3C4 Legacy Package DEV Writer Retirement Implementation Overlay

The final central normal writer and its transitional Package-code bridge are
retired. The Ads-owned REFERENCE group remains the only executable seed writer
for `ad_packages`. `DevSeedService`, `legacy.dev.remaining`, its Users
dependency and actor map, `resetAll`, and the `ad_events` reset-only target
remain as the exact C4D structural debt.

~~~text
P8_05C3C3_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_141
P8_05C3C4_IMPLEMENTATION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_05C3C4_BLOCKERS=NONE

CENTRAL_SEED_AD_PACKAGES_METHOD_EXISTS=NO
CENTRAL_AD_PACKAGE_REPOSITORY_ACCESS=0
CENTRAL_AD_PACKAGE_WRITE_CALLS=0
CENTRAL_AD_PACKAGE_EXECUTABLE_FIXTURE_COUNT=0
TRANSITIONAL_LEGACY_PACKAGE_CODE_BRIDGE_EXISTS=NO
TRANSITIONAL_LEGACY_WRITER_PENDING_RETIREMENT=NO

REFERENCE_PACKAGE_SEED_RUNTIME_CHANGES=0
REFERENCE_PACKAGE_PAYLOAD_CHANGES=0
REFERENCE_PACKAGE_IDENTITY_CHANGES=0
AD_PACKAGE_REFERENCE_SEED_GROUP_COUNT=1
AD_PACKAGE_REFERENCE_SEED_GROUP_ID=ads.reference.packages
AD_PACKAGE_REFERENCE_SEED_OWNER=ADS
AD_PACKAGE_REFERENCE_SEED_CLASSIFICATION=REFERENCE
AD_PACKAGE_REFERENCE_RECORD_COUNT=3
AD_PACKAGE_REFERENCE_LOOKUP_KEY=packageCode
NEW_AD_PACKAGE_REFERENCE_SEED_OUTPUT_KINDS=0
REFERENCE_PACKAGE_FINAL_OWNER_READY=YES
FINAL_PACKAGE_SEED_OWNER_COUNT=1
FINAL_PACKAGE_SEED_OWNER=ADS
AD_PACKAGE_EXECUTABLE_SEED_WRITER_COUNT=1
AD_PACKAGE_EXECUTABLE_SEED_WRITER=ads.reference.packages
LEGACY_AD_PACKAGE_EXECUTABLE_WRITER_COUNT=0

CENTRAL_SEED_AD_CAMPAIGNS_METHOD_EXISTS=NO
AD_CAMPAIGN_EXECUTABLE_FIXTURE_COUNT=0
NEW_AD_CAMPAIGN_SEEDGROUPS=0

AD_PACKAGE_RESET_TARGET_EXISTS=NO
AD_CAMPAIGN_RESET_TARGET_EXISTS=NO
AD_EVENTS_RESET_TARGET_EXISTS=YES
AD_EVENTS_PHASE8_CLASSIFICATION=RESET_ONLY_LEGACY_DEBT

CENTRAL_NORMAL_WRITE_METHOD_COUNT=0
CENTRAL_NORMAL_WRITE_METHODS=NONE
CENTRAL_BUSINESS_TABLE_COUNT=0
CENTRAL_BUSINESS_TABLES=NONE
CENTRAL_ORDINARY_BUSINESS_WRITES=0

CENTRAL_DEVSEEDSERVICE_RETIRED=NO
LEGACY_DEV_REMAINING_EXISTS=YES
LEGACY_USERS_DEPENDENCY_EXISTS=YES
POST_C3C4_BUSINESS_USER_ID_CONSUMER_COUNT=0
C4D_LEGACY_ACTOR_OR_DEPENDENCY_DEBT=LEGACY_ACTOR_MAP_AND_USERS_DEPENDENCY_REMAIN_STRUCTURALLY_PRESENT
C4D_REMAINING_DEBT=DEVSEEDSERVICE;LEGACY_DEV_REMAINING;LEGACY_USERS_DEPENDENCY;LEGACY_ACTOR_MAP;RESET_ALL;AD_EVENTS_RESET_TARGET

ADS_DOMAIN_RUNTIME_CHANGES=0
AD_PACKAGE_SCHEMA_CHANGES=0
AD_CAMPAIGN_SCHEMA_CHANGES=0
SCHEMA_CHANGES=0
MIGRATIONS_CREATED=0

AD_PACKAGE_REFERENCE_STARTUP_REGISTRATION=YES
AD_PACKAGE_REFERENCE_CLI_REGISTRATION=YES
CENTRAL_RUNNER_PACKAGE_TABLE_WRITES=0

P8_05C3C_IMPLEMENTATION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_05C4D_CENTRAL_RETIREMENT_AUTHORIZED=NO_WAITING_FOR_C3C4_MERGE_AND_REVIEW
~~~

## P8-05C3C4 Merged Status Authority Overlay

PR #142 merged the reviewed final central Package DEV writer retirement into
`develop`. This trailing overlay advances C4D authority while preserving every
earlier pending-review and waiting state as historical evidence.

~~~text
P8_05C3C3_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_141
P8_05C3C4_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_142
P8_05C3C_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_142
P8_05C4D_IMPLEMENTATION_AUTHORIZED=YES_AFTER_P8_05C3C4_PR_142_MERGE
CENTRAL_NORMAL_WRITE_METHOD_COUNT=0
CENTRAL_NORMAL_WRITE_METHODS=NONE
CENTRAL_BUSINESS_TABLE_COUNT=0
CENTRAL_BUSINESS_TABLES=NONE
CENTRAL_ORDINARY_BUSINESS_WRITES=0
AD_PACKAGE_EXECUTABLE_SEED_WRITER_COUNT=1
AD_PACKAGE_EXECUTABLE_SEED_WRITER=ads.reference.packages
POST_C3C4_BUSINESS_USER_ID_CONSUMER_COUNT=0
C4D_REMAINING_DEBT=DEVSEEDSERVICE;LEGACY_DEV_REMAINING;LEGACY_USERS_DEPENDENCY;LEGACY_ACTOR_MAP;RESET_ALL;AD_EVENTS_RESET_TARGET
~~~

## P8-05C4D Central Continuation And Reset Debt Retirement Implementation Overlay

The transition-only central service, its legacy SeedGroup adapter, obsolete
Users-output dependency and actor resolver, and the last central destructive
reset target are retired without replacement. Canonical owner-local groups and
the seed safety guard remain. The Ads-owned `ad_events` entity, repository,
recording use case, controller path, registry entry, and schema remain normal
runtime persistence outside seed ownership.

~~~text
P8_05C3C4_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_142
P8_05C3C_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_142
P8_05C4D_IMPLEMENTATION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_05C4D_BLOCKERS=NONE

DEVSEEDSERVICE_SOURCE_EXISTS=NO
DEVSEEDSERVICE_RUNTIME_REFERENCE_COUNT=0
DEVSEEDSERVICE_PROVIDER_REGISTRATION_COUNT=0
CENTRAL_DEVSEEDSERVICE_RETIRED=YES
CENTRAL_RESET_ALL_METHOD_EXISTS=NO

LEGACY_DEV_REMAINING_EXISTS=NO
LEGACY_DEV_REMAINING_RUNTIME_REFERENCE_COUNT=0
LEGACY_GROUP_METADATA_COUNT=0
LEGACY_ACTOR_MAP_EXISTS=NO
LEGACY_ACTOR_RESOLVER_EXISTS=NO
LEGACY_CONTINUATION_INTERFACE_EXISTS=NO
LEGACY_USERS_DEPENDENCY_EXISTS=NO
LEGACY_USER_ID_OUTPUT_LOOKUP_COUNT=0

USERS_DEV_SEED_GROUP_REMOVED=NO
USERS_DEV_SEED_RUNTIME_CHANGES=0
USERS_DEV_OUTPUT_CONTRACT_CHANGES=0

AD_EVENTS_RESET_TARGET_EXISTS=NO
CENTRAL_DESTRUCTIVE_RESET_METHOD_COUNT=0
CENTRAL_DESTRUCTIVE_RESET_TARGET_COUNT=0
AD_EVENTS_RUNTIME_TABLE_RETIRED=NO
AD_EVENTS_RUNTIME_PERSISTENCE_CHANGED=NO
AD_EVENTS_SCHEMA_CHANGED=NO

CENTRAL_NORMAL_WRITE_METHOD_COUNT=0
CENTRAL_NORMAL_WRITE_METHODS=NONE
CENTRAL_DESTRUCTIVE_RESET_METHOD_COUNT=0
CENTRAL_PERSISTENCE_CAPABLE_METHOD_COUNT=0
CENTRAL_BUSINESS_TABLE_COUNT=0
CENTRAL_BUSINESS_TABLES=NONE
CENTRAL_RESET_TARGET_COUNT=0

OWNER_LOCAL_SEED_GROUP_METADATA_COUNT=8
MISSING_DEPENDENCY_COUNT=0
DUPLICATE_SEED_GROUP_ID_COUNT=0
DEPENDENCY_CYCLE_COUNT=0

AD_PACKAGE_REFERENCE_SEED_GROUP_COUNT=1
AD_PACKAGE_REFERENCE_RECORD_COUNT=3
AD_PACKAGE_REFERENCE_LOOKUP_KEY=packageCode
REFERENCE_PACKAGE_SEED_RUNTIME_CHANGES=0
REFERENCE_PACKAGE_PAYLOAD_CHANGES=0
REFERENCE_PACKAGE_IDENTITY_CHANGES=0
AD_CAMPAIGN_EXECUTABLE_FIXTURE_COUNT=0

CANONICAL_SEED_ORCHESTRATOR_REMAINS=YES
SEED_ENVIRONMENT_GUARD_REMAINS=YES
LEGACY_GROUP_STARTUP_REGISTRATION=NO
LEGACY_GROUP_CLI_REGISTRATION=NO

BUSINESS_DOMAIN_RUNTIME_CHANGES=0
SCHEMA_CHANGES=0
MIGRATIONS_CREATED=0

P8_05_CENTRAL_DEV_SEED_DECOMPOSITION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
IDEMPOTENCY_VERIFIED=NOT_YET_VERIFIED
DISPOSABLE_DB_SEED_RUN_PASS=NOT_YET_VERIFIED
SECOND_SEED_RUN_NO_DUPLICATES=NOT_YET_VERIFIED
PHASE_08_COMPLETE=NO
~~~

## P8-06 Test Fixture Ownership And Classification Audit Overlay

PR #143 is merged into `develop` at
`eda098233eba081099c87f38c96db7a545d5a7cf`. The central DEV continuation and
reset debt are closed authority, while TEST fixture implementation remains a
separate, unexecuted phase. The complete static inventory and design are in
[test-fixture-ownership-audit.md](test-fixture-ownership-audit.md).

```text
P8_05C4D_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_143
P8_05_CENTRAL_DEV_SEED_DECOMPOSITION_STATUS=IMPLEMENTED_BY_MERGED_PR_143
CENTRAL_DEVSEEDSERVICE_RETIRED=YES
LEGACY_DEV_REMAINING_EXISTS=NO
CENTRAL_NORMAL_WRITE_METHOD_COUNT=0
CENTRAL_DESTRUCTIVE_RESET_METHOD_COUNT=0
CENTRAL_PERSISTENCE_CAPABLE_METHOD_COUNT=0

P8_06_TEST_FIXTURE_AUDIT_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_06_IMPLEMENTATION_STATUS=NOT_STARTED
P8_06_IMPLEMENTATION_AUTHORIZED=NO
P8_06_BLOCKERS=HUMAN_REVIEW_PENDING;TEST_CLASSIFICATION_CONTRACT_NOT_IMPLEMENTED;TEST_PRODUCTION_REACHABILITY_GUARD_GAPS;PRODUCT_TEST_SKU_IDENTITY_UNRESOLVED

IDEMPOTENCY_VERIFIED=NOT_YET_VERIFIED
DISPOSABLE_DB_SEED_RUN_PASS=NOT_YET_VERIFIED
SECOND_SEED_RUN_NO_DUPLICATES=NOT_YET_VERIFIED
PHASE_08_COMPLETE=NO
```

## P8-06C Clean-v2 Owner Provider Split Implementation Overlay

PR #147 merged P8-06B into `develop` at
`594d03feb04b146d6b4649e8f2e1f1ba4c7d815f`. The current-source P8-06C audit
moves only the independently keyed `system_configs` prerequisite behind the
Admin-owned `admin.test.system-configs` provider. The exact 26-action
inventory, reference decisions, and retained-row evidence are in
[test-fixture-ownership-audit.md](test-fixture-ownership-audit.md).

The Phase One Category/Product, source-local User dependency cluster,
synthetic Geography and Ads shapes, Product detail view-count behavior, and
Wishlist concurrency assertion remain inside clean-v2. Raw SQL prerequisite
writes fall from 15 to 14 without changing runtime assertions, OpenAPI purpose,
schema parity, schema, or migrations.

```text
P8_06A_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_145
P8_06B0_PRODUCT_TEST_IDENTITY_STATUS=IMPLEMENTED_BY_MERGED_PR_146
P8_06B_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_147
P8_06C_IMPLEMENTATION_AUTHORIZED=YES_AFTER_P8_06B_PR_147_MERGE

P8_06C_NEW_GROUP_COUNT=1
P8_06C_NEW_GROUP_IDS=admin.test.system-configs
P8_06C_TOTAL_TEST_GROUP_COUNT=3
MOVED_FIXTURE_TABLES=system_configs
CLEAN_V2_RAW_SQL_BUSINESS_FIXTURE_WRITE_COUNT_BEFORE=15
CLEAN_V2_RAW_SQL_BUSINESS_FIXTURE_WRITE_COUNT_AFTER=14

CLEAN_V2_PHASE_ONE_PRODUCT_PROVIDER_DECISION=KEEP_HARNESS_LOCAL_DUE_NO_CANONICAL_CATEGORY_MAPPING
CLEAN_V2_PHASE_ONE_CATEGORY_REMAINS_LOCAL=YES
CLEAN_V2_PHASE_ONE_PRODUCT_REMAINS_LOCAL=YES
CLEAN_V2_PHASE_ONE_PRODUCT_RUNTIME_PAYLOAD_CHANGES=0
CLEAN_V2_WISHLIST_WORKFLOW_REMAINS_HARNESS_LOCAL=YES
CLEAN_V2_DIRECT_BUSINESS_FIXTURE_WRITE_REMOVED=YES
CLEAN_V2_TEST_GROUP_EXECUTION_EXPLICIT=YES_IF_USED

USERS_TEST_PROVIDER_RUNTIME_CHANGES=0
PRODUCTS_TEST_PROVIDER_RUNTIME_CHANGES=0
TF04_RUNTIME_FIXTURE_CHANGES=0
TF05_RUNTIME_FIXTURE_CHANGES=0
TF08_RUNTIME_FIXTURE_CHANGES=0
TF08_PRODUCTS_MOVED_TO_TEST_PROVIDER=NO
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

## P8-06B0 Product TEST Identity Decision Audit Overlay

PR #145 merged the P8-06A TEST execution boundary into `develop` at
`29ee0b6e8fa0a7f8da60f4f4b9f03e215eb3c494`. The static B0 audit in
[test-fixture-ownership-audit.md](test-fixture-ownership-audit.md) confirms
that SKU is the existing persisted unique Product seed identity, but every
current reusable TEST Product omits it. Exact values therefore remain a human
decision; no SKU, TEST group, fixture, runtime file, schema, or migration was
changed.

```text
P8_06_TEST_FIXTURE_AUDIT_STATUS=IMPLEMENTED_BY_MERGED_PR_144
P8_06A_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_145
P8_06B0_PRODUCT_TEST_IDENTITY_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW

PRODUCT_PRIMARY_KEY=id
PRODUCT_PRIMARY_KEY_GENERATION=GENERATED_UUID
IS_SKU_CANONICAL_PRODUCT_DOMAIN_IDENTITY=YES
PRODUCT_SKU_IDENTITY_SCOPE=PERSISTED_ALTERNATE_BUSINESS_KEY
PRODUCT_SKU_NULLABLE=YES
PRODUCT_SKU_UNIQUE=YES
PRODUCT_SKU_IMMUTABLE=NO
CURRENT_TEST_FIXTURE_HAS_APPROVED_SKU=NO

PRODUCT_TEST_IDENTITY_DECISION=HUMAN_APPROVED_TEST_SKU_REQUIRED
PRODUCT_TEST_SKU_VALUE_CANDIDATES_FROM_EXISTING_SOURCE=NONE
PRODUCT_TEST_SKU_EXACT_VALUE_DECISION=REQUIRED_FOR_CLEAN_V2_PHASE_ONE_PRODUCT_AND_SHARED_COMMERCE_RICE_PRODUCT
PRODUCT_TEST_SKU_IDENTITY_UNRESOLVED=YES

PRODUCTS_TEST_PROVIDER_FEASIBLE=YES_AFTER_EXACT_SKU_APPROVAL
PROPOSED_PRODUCT_TEST_STABLE_KEY=sku
PROPOSED_PRODUCT_TEST_OUTPUT_KIND=product.id.by-sku
PRODUCT_TEST_CATEGORY_REFERENCE_REUSE=YES_WHEN_CANONICAL_CATEGORY_APPLIES

WISHLIST_TEST_FIXTURE_OWNER_DECISION=KEEP_PRODUCTS_OWNED_CLEAN_V2_WORKFLOW_ACTION_OUT_OF_PRODUCTS_TEST_CATALOG_PRESEED
PRODUCT_CERTIFICATION_TEST_PROVIDER_DECISION=NO_CURRENT_REUSABLE_CERTIFICATION_KEEP_TF08_MIGRATION_LOCAL

P8_06B_IMPLEMENTATION_AUTHORIZED=NO
P8_06B_BLOCKERS=CLEAN_V2_PRODUCT_TEST_SKU_EXACT_VALUE_NOT_APPROVED;COMMERCE_RICE_PRODUCT_TEST_SKU_EXACT_VALUE_NOT_APPROVED
RUNTIME_FILES_CHANGED=0
SCHEMA_CHANGES=0
MIGRATIONS_CREATED=0
NEW_BUSINESS_TEST_SEED_GROUP_COUNT=0

IDEMPOTENCY_VERIFIED=NOT_YET_VERIFIED
DISPOSABLE_DB_SEED_RUN_PASS=NOT_YET_VERIFIED
SECOND_SEED_RUN_NO_DUPLICATES=NOT_YET_VERIFIED
PHASE_08_COMPLETE=NO
```

## P8-06A Test Execution Safety And Metadata Boundary Overlay

PR #144 merged the P8-06 audit. P8-06A now supplies one shared, positive-allow
TEST target guard and explicit TEST-purpose metadata across TF-01 through
TF-15. No TEST business payload or owner has moved. Detailed post-A evidence is
in [test-fixture-ownership-audit.md](test-fixture-ownership-audit.md).

```text
P8_06_TEST_FIXTURE_AUDIT_STATUS=IMPLEMENTED_BY_MERGED_PR_144
P8_06A_IMPLEMENTATION_AUTHORIZED=YES_AFTER_P8_06_AUDIT_PR_144_MERGE
P8_06A_IMPLEMENTATION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_06A_BLOCKERS=NONE

TEST_CLASSIFICATION_CONTRACT_EXISTS=YES
TEST_FIXTURE_CLASSIFICATION_EXPLICIT=YES
TEST_FIXTURE_NORMAL_STARTUP_REACHABLE=NO
TEST_FIXTURE_PRODUCTION_REACHABLE=NO
ALL_DATABASE_CAPABLE_TEST_SOURCES_HAVE_EXPLICIT_PURPOSE=YES
ALL_DATABASE_CAPABLE_TEST_SOURCES_HAVE_SAFE_TARGET_BOUNDARY=YES

P8_06_IMPLEMENTATION_AUTHORIZED=NO
P8_06_IMPLEMENTATION_STATUS=IMPLEMENTATION_IN_PROGRESS
P8_06B_IMPLEMENTATION_AUTHORIZED=NO_WAITING_FOR_P8_06A_MERGE_AND_PRODUCT_TEST_IDENTITY_REVIEW
PRODUCT_TEST_SKU_IDENTITY_UNRESOLVED=YES
NEW_BUSINESS_TEST_SEED_GROUP_COUNT=0

IDEMPOTENCY_VERIFIED=NOT_YET_VERIFIED
DISPOSABLE_DB_SEED_RUN_PASS=NOT_YET_VERIFIED
SECOND_SEED_RUN_NO_DUPLICATES=NOT_YET_VERIFIED
PHASE_08_COMPLETE=NO
```

## P8-06B0 Trailing Current-Authority Handoff

```text
P8_06_TEST_FIXTURE_AUDIT_STATUS=IMPLEMENTED_BY_MERGED_PR_144
P8_06A_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_145
P8_06B0_PRODUCT_TEST_IDENTITY_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
PRODUCT_TEST_SKU_IDENTITY_UNRESOLVED=YES
PRODUCT_TEST_IDENTITY_DECISION=HUMAN_APPROVED_TEST_SKU_REQUIRED
PRODUCT_TEST_SKU_EXACT_VALUE_DECISION=REQUIRED_FOR_CLEAN_V2_PHASE_ONE_PRODUCT_AND_SHARED_COMMERCE_RICE_PRODUCT
P8_06B_IMPLEMENTATION_AUTHORIZED=NO
P8_06B_BLOCKERS=CLEAN_V2_PRODUCT_TEST_SKU_EXACT_VALUE_NOT_APPROVED;COMMERCE_RICE_PRODUCT_TEST_SKU_EXACT_VALUE_NOT_APPROVED
P8_06_IMPLEMENTATION_STATUS=IMPLEMENTATION_IN_PROGRESS
IDEMPOTENCY_VERIFIED=NOT_YET_VERIFIED
DISPOSABLE_DB_SEED_RUN_PASS=NOT_YET_VERIFIED
SECOND_SEED_RUN_NO_DUPLICATES=NOT_YET_VERIFIED
PHASE_08_COMPLETE=NO
```

## P8-06B Revised Shared Users And Commerce Product TEST Providers Overlay

PR #146 merged the B0 Product identity decision at
`579ebb622a4562734abc5d44234ea332923fb716`. The revised human decision keeps
the clean-v2 Phase One Product local because its synthetic category has no
canonical reference mapping, while approving `TEST-COMMERCE-RICE-001` for the
shared TF-04/TF-05 Commerce Product. The detailed provider contract and the
preserved stopped-attempt evidence are in
[test-fixture-ownership-audit.md](test-fixture-ownership-audit.md).

```text
P8_06_TEST_FIXTURE_AUDIT_STATUS=IMPLEMENTED_BY_MERGED_PR_144
P8_06A_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_145
P8_06B0_PRODUCT_TEST_IDENTITY_STATUS=IMPLEMENTED_BY_MERGED_PR_146

HUMAN_APPROVED_CLEAN_V2_PRODUCT_SKU=TEST-CLEANV2-PHASE-ONE-001
HUMAN_APPROVED_COMMERCE_RICE_PRODUCT_SKU=TEST-COMMERCE-RICE-001
CLEAN_V2_PHASE_ONE_PRODUCT_PROVIDER_DECISION=KEEP_HARNESS_LOCAL_DUE_NO_CANONICAL_CATEGORY_MAPPING
PRODUCT_TEST_CATEGORY_REFERENCE_MAPPING_UNRESOLVED=RESOLVED_BY_SCOPE_REDUCTION
PRODUCT_TEST_SKU_IDENTITY_UNRESOLVED=NO

USERS_TEST_GROUP_ID=users.test.identities
PRODUCTS_TEST_GROUP_ID=products.test.catalog
PRODUCTS_TEST_RECORD_COUNT=1
PRODUCTS_TEST_DEPENDENCIES=users.test.identities
COMMERCE_PRODUCT_CATEGORY_POLICY=NO_CATEGORY_DEPENDENCY
CLEAN_V2_PRODUCT_IN_PRODUCTS_TEST_GROUP=NO

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
P8_06C_NEW_GROUP_IDS=admin.test.system-configs
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
`develop` at `e00639a6aa7f1b5288aa2ca6b479edc0f1a79615`. P8-06D now makes
TF-04 and TF-05 explicitly execute the approved `users.test.identities` then
`products.test.catalog` DAG and consume the persisted seller and Product IDs
from `user.id.by-email` and `product.id.by-sku` outputs.

The small TEST-only output adapter reuses current group metadata,
`SeedOutputRegistry`, dependency enforcement, and the existing disposable
target guard. It initializes no DataSource, owns no fixture payload, creates no
group, and leaves the generic `SeedOrchestrator` API unchanged. Both harnesses
retain their existing direct-DataSource fixture boundary and all local actors
and workflow assertions; only the duplicated shared seller and Rice inserts
were removed.

```text
P8_06B_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_147
P8_06C_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_148
P8_06D_IMPLEMENTATION_AUTHORIZED=YES_AFTER_P8_06C_PR_148_MERGE

TF04_SHARED_SELLER_SOURCE=users.test.identities
TF04_SHARED_PRODUCT_SOURCE=products.test.catalog
TF04_DIRECT_SHARED_SELLER_FIXTURE_EXISTS=NO
TF04_DIRECT_SHARED_RICE_PRODUCT_FIXTURE_EXISTS=NO
TF04_FRACTIONAL_PRODUCT_STUB_PRESERVED=YES

TF05_SHARED_SELLER_SOURCE=users.test.identities
TF05_SHARED_PRODUCT_SOURCE=products.test.catalog
TF05_DIRECT_SHARED_SELLER_FIXTURE_EXISTS=NO
TF05_DIRECT_SHARED_RICE_PRODUCT_FIXTURE_EXISTS=NO
TF05_CONCURRENCY_ASSERTION_COUNT_REDUCED=NO
TF05_TRANSACTION_OR_LOCKING_SEMANTICS_CHANGED=NO

TEST_OUTPUT_EXECUTION_ADAPTER_CREATED=YES
TEST_OUTPUT_EXECUTION_ADAPTER_SCOPE=TEST_ONLY_SHARED_USERS_PRODUCTS_DAG_OUTPUT_VIEW
GENERIC_SEED_ORCHESTRATOR_API_CHANGED=NO
P8_06D_NEW_BUSINESS_TEST_GROUP_COUNT=0

USERS_TEST_PROVIDER_RUNTIME_CHANGES=0
PRODUCTS_TEST_PROVIDER_RUNTIME_CHANGES=0
ADMIN_SYSTEM_CONFIG_TEST_PROVIDER_RUNTIME_CHANGES=0
TF02_RUNTIME_FIXTURE_CHANGES=0
TF08_RUNTIME_FIXTURE_CHANGES=0
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
