# Phase 8 - Module-Owned Seeders

- Phase status: `IMPLEMENTATION_IN_PROGRESS`
- Implementation authorized: `P8_05B_PRODUCTS_DEV_SEED_OWNERSHIP`
- Current implementation: scalar-only dependency outputs, dependency-scoped
  lookup, two owner-local REFERENCE groups, Users DEV, and canonical Products
  DEV ownership
- Implementation base: `develop` at P8-05B0 merge commit
  `053426def9471c4b83afd732dd9efb21c87c41ef` (PR #108)
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
P8_05B_PRODUCTS_DEV_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
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
slices, P8-07, and P8-10. The central CLI delegates its explicit REFERENCE and
DEV selections to owner-local Geography, Products, and Users groups. Products
development now runs as the owner-local `products.dev.products` group after its
Users and Product Category dependencies. Its legacy Product/Seller sources are
retired, and its old Geography-name behavior is not migrated because the
canonical payload stores no location identifier. The comprehensive central
development service remains P8-05C debt; startup skips only its overlapping
Product/category/image write section after canonical Products DEV has run. The
orchestration-only phase exit criterion is still open, and P8-08 remains
`NOT_STARTED` until runtime and disposable-database idempotency verification is
authorized.
