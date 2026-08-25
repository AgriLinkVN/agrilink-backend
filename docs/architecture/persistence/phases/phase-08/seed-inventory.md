# Phase 8 Static Seed Inventory

## Evidence Boundary

- Source base: `b59c191b04d4cffd251319b9bffbdb3202fa99ca` on `develop`.
- Ownership source: `docs/architecture/persistence/entity-ownership.json`.
- Method: file-name search, seed/fixture/mock-data text search, TypeORM access
  search, write-primitive search, and static caller/import inspection.
- Database evidence: none. No seed, migration, SQL, application bootstrap, or
  database connection was executed for this inventory.
- Inclusion: seed payloads, write-capable seed functions/adapters, seed runners,
  startup seed hooks, reusable multi-table test fixtures, and business-data
  migration/rollout backfills.
- Exclusion: ordinary one-test Arrange data, mocks that do not persist data,
  schema-only migrations, migration-ledger bookkeeping, and seed unit specs
  that contain no seed payload or database write. These remain source evidence
  but are not counted as executable seed sources.

## Summary

| Metric                                                | Count |
| ----------------------------------------------------- | ----: |
| Seed or seed-like sources                             |    15 |
| `REFERENCE_SEED`                                      |     2 |
| `DEV_SEED`                                            |     8 |
| `TEST_SEED`                                           |     1 |
| `BOOTSTRAP_OR_STARTUP_SEED`                           |     2 |
| `MIGRATION_DATA_BACKFILL`                             |     2 |
| `UNKNOWN_REQUIRES_REVIEW`                             |     0 |
| Cross-owner sources                                   |     7 |
| Central ordinary seed sources writing multiple owners |     3 |

The cross-owner count includes test and migration-only sources because their
current behavior crosses owner tables; their classification determines whether
that crossing is a seed-boundary violation or a separately governed fixture or
backfill. The three central ordinary seed sources are `src/database/seeds/seed.ts`,
`src/database/dev-seed.service.ts`, and
`src/database/seeds/admin-dev.seed.ts`.

## Inventory

| Seed Source                                                                                     | Classification              | Writes                                                                                                                                                                                                                               | Owner(s)                                                                                             | Current Boundary                                               | Idempotent                                                                                                                          | Dependency                                                                                                                                                                          | Risk                                                                                                                                                                                           | Proposed Disposition               |
| ----------------------------------------------------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| `src/modules/geography/infrastructure/seeds/province-reference.seed.ts`                         | `REFERENCE_SEED`            | `provinces`; 34 canonical records                                                                                                                                                                                                    | geography                                                                                            | Owner infrastructure                                           | Per-record convergence by unique province `code`                                                                                    | None                                                                                                                                                                                | Runtime/disposable-database idempotency remains unverified until P8-08/P8-09.                                                                                                                  | `IMPLEMENTED_PENDING_HUMAN_REVIEW` |
| `src/modules/products/infrastructure/database/seeds/product-category.seed.ts`                   | `REFERENCE_SEED`            | `product_categories`; 37 canonical records                                                                                                                                                                                           | products                                                                                             | Owner infrastructure                                           | Per-record convergence by unique category `slug`                                                                                    | No external seed-group dependency; parent-before-child ordering is internal                                                                                                         | Existing Products DEV path temporarily uses the same owner-local reconciliation bridge pending P8-07; no payload copy exists.                                                                  | `IMPLEMENTED_PENDING_HUMAN_REVIEW` |
| `src/modules/geography/seeds/province.seed.ts` (retired in P8-05A)                              | `DEV_SEED`                  | Historical `provinces` 10-record subset                                                                                                                                                                                              | geography                                                                                            | Removed owner source                                           | N/A after retirement                                                                                                                | Zero current consumers                                                                                                                                                              | Human-approved 2025 successor mapping proves the legacy product-demo concepts are represented by the canonical 34-row reference group; old codes are not aliases.                              | `RETIRED_REDUNDANT`                |
| `src/modules/users/infrastructure/database/seeds/user.seed.ts`                                  | `DEV_SEED`                  | `users`; seven declared development accounts                                                                                                                                                                                         | users                                                                                                | Owner infrastructure SeedGroup                                 | Per-record convergence by unique phone/email with fail-closed split-identity detection                                              | No external seed-group dependencies                                                                                                                                                 | Runtime/disposable-database verification remains deferred; existing cross-source `admin@agrilink.vn` overlap is documented without changing central payloads.                                  | `IMPLEMENTED_OWNER_SEEDGROUP`      |
| `src/modules/users/seeds/seller.seed.ts`                                                        | `DEV_SEED`                  | `users`; three historical sellers                                                                                                                                                                                                    | users                                                                                                | Owner module, no executable caller                             | Partial: exactly three matches skip; a partial match attempts to save all three                                                     | Type-only contract consumed by deferred `product.seed.ts`                                                                                                                           | Product DEV owns the remaining dependency; this source must not execute unchanged and is deferred without being marked migrated.                                                               | `DEFERRED_TO_P8_05B`               |
| `src/modules/products/infrastructure/database/seeds/product.seed.ts`                            | `DEV_SEED`                  | `products`, `product_images`; reads `product_categories`, `provinces` and caller-supplied users                                                                                                                                      | products; reads geography and users                                                                  | Products module with foreign Geography entity import           | Partial: any Product row suppresses the entire group                                                                                | Users/sellers + product categories + provinces -> products -> images                                                                                                                | No executable caller found; directly imports a foreign persistence entity and skips missing products when any product exists.                                                                  | `RETIRE_CANDIDATE`                 |
| `src/modules/products/infrastructure/database/seeds/product-development-seed.service.ts`        | `DEV_SEED`                  | Indirectly requests `product_categories`, `products`, `product_images`                                                                                                                                                               | products                                                                                             | Owner application/infrastructure seed service                  | Partial: categories converge, but any Product row suppresses all mock products                                                      | Categories and three pre-existing fixed seller IDs -> products -> images                                                                                                            | The only occurrences of seller IDs `...0001`/`...0002`/`...0003` are in this file; no matching user writer was found. Reset is destructive.                                                    | `REWRITE_REQUIRED`                 |
| `src/modules/products/infrastructure/repositories/typeorm-product.repository.ts` (seed methods) | `DEV_SEED`                  | `product_categories`, `products`, `product_images`; reset clears certifications/images and truncates products                                                                                                                        | products                                                                                             | Seed-specific methods embedded in the general owner repository | No independently: bulk saves have no key guard; caller count guard provides only partial protection                                 | Called by `ProductDevelopmentSeedService`                                                                                                                                           | Seed/reset persistence is coupled to the runtime repository; reset uses `TRUNCATE ... CASCADE`.                                                                                                | `REWRITE_REQUIRED`                 |
| `src/database/dev-seed.service.ts`                                                              | `DEV_SEED`                  | Inserts/updates 23 tables across users, addresses, profiles, products, forum, reviews, ads, cooperatives, audit, and notifications; optional reset also deletes owner tables                                                         | users, profiles, logistics, products, forum, reviews, ads, cooperatives, admin, notifications        | Central database service registered by `AppModule`             | Partial: mixed natural-key and whole-table count guards prevent most exact second-run duplicates but do not converge partial groups | Users first; categories -> products -> images/certifications; users/products -> reviews and other groups; packages -> campaigns; posts -> comments/likes; listings -> contributions | Central multi-owner writes/imports; raw SQL; reset swallows missing-table errors, deletes `review` rather than canonical `reviews`, and includes `ad_events` although it does not seed events. | `REWRITE_REQUIRED`                 |
| `src/database/seeds/admin-dev.seed.ts`                                                          | `DEV_SEED`                  | `users`, four profile tables, `products`, `product_images`                                                                                                                                                                           | users, profiles, products                                                                            | Central standalone/admin development seed                      | Yes for observed natural-key checks                                                                                                 | Users -> profiles/products -> images; geography identifiers require review                                                                                                          | Multi-owner foreign entity imports. Direct CLI mode has no shared seed guard and defaults the database name to protected `agrilink_db`.                                                        | `REWRITE_REQUIRED`                 |
| `src/database/seeds/seed.ts`                                                                    | `BOOTSTRAP_OR_STARTUP_SEED` | Delegates two explicitly selected REFERENCE groups and `users.dev.users` through `SeedOrchestrator`                                                                                                                                  | composition for geography, products, and users                                                       | Central CLI behind `npm run seed`                              | Inherits per-record owner-group convergence                                                                                         | All three groups declare no dependencies; REFERENCE and DEV classifications are selected explicitly                                                                                 | Migrated Geography, Products reference, and Users DEV persistence remains owner-local; unrelated DEV orchestration is unchanged.                                                               | `PARTIALLY_REWRITTEN_P8_05A`       |
| `src/main.ts` (development seed block)                                                          | `BOOTSTRAP_OR_STARTUP_SEED` | Indirectly invokes Products development seed, then central comprehensive development seed                                                                                                                                            | products plus all owners reached by `DevSeedService`                                                 | Application startup composition root                           | Inherits partial guarantees of both invoked groups                                                                                  | `PRODUCT_DEV_SEED=true`; Products seed runs before `DevSeedService`                                                                                                                 | Two overlapping product/category paths run during non-production application bootstrap. Explicit production guard exists, but a non-production protected database is not excluded here.        | `REQUIRES_HUMAN_DECISION`          |
| `src/database/reconciliation/clean-v2-runtime-baseline.ts` (`seedRuntimeFixture`)               | `TEST_SEED`                 | `users`, `farmer_profiles`, `product_categories`, `products`, `reviews`, `notifications`, `provinces`, `districts`, `stored_files`, `ad_packages`, `ad_campaigns`, `forum_posts`, `system_configs`, `audit_logs`, `incident_reports` | users, profiles, products, reviews, notifications, geography, storage, ads, forum, admin, compliance | Central reusable clean-v2 verification fixture                 | No: fixed IDs with plain inserts require an empty database                                                                          | Ordered FK fixture inserts; users/categories precede products; province precedes district; package precedes campaign                                                                | Multi-owner raw SQL is acceptable only as an isolated test fixture. The helper accepts a `DataSource`; disposable targeting is enforced by its current caller, not inside the helper.          | `KEEP_AS_TEST_FIXTURE`             |
| `src/database/migrations/1783818000000-AddStoredFileIdToPrivateDocuments.ts`                    | `MIGRATION_DATA_BACKFILL`   | Inserts `stored_files`; updates product certifications, profile document links, and conditional legacy quality certificates                                                                                                          | storage, products, profiles, conditional compliance                                                  | Historical migration                                           | Yes for duplicate prevention by null predicates and `ON CONFLICT (object_key) DO NOTHING`; migration ledger remains authoritative   | Source product/profile/certificate row -> stored file -> source link                                                                                                                | Multi-owner data movement is migration-governed. It must not be extracted or treated as a normal seed.                                                                                         | `KEEP_AS_MIGRATION_BACKFILL`       |
| `src/scripts/storage-phase9-rollout.ts`                                                         | `MIGRATION_DATA_BACKFILL`   | Inserts/updates `stored_files`; links/finalizes product certification and four profile tables                                                                                                                                        | storage, products, profiles                                                                          | Explicit operational rollout command                           | Partial: linked rows are skipped, but provider upload and database transaction are not one atomic operation                         | Legacy private-document source -> provider object/stored file -> owner-table link -> finalize                                                                                       | Cross-owner operational backfill with external provider side effects; it is not a seed and requires its own rollout controls.                                                                  | `KEEP_AS_MIGRATION_BACKFILL`       |

## Ownership And Execution Detail

| Source group                        | Writes only owner tables                                     | Foreign entity/repository import                                | Raw TypeORM primitive                                               | Production startup reachable                                                                  |
| ----------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Owner-local reference/dev functions | Yes, except `product.seed.ts` reads Geography via its entity | `product.seed.ts` imports `Province`; otherwise owner-local     | `DataSource.getRepository`, repository save/update/count/find       | No direct startup; some are called by runner/service paths                                    |
| Products development service        | Yes                                                          | No foreign entity/repository; uses owner ports                  | Service: no. Adapter: repository methods and raw truncate           | No when `NODE_ENV=production`; reachable in non-production startup when opted in              |
| Central `DevSeedService`            | No                                                           | Imports entities from ten owners                                | `DataSource.getRepository`, raw query/delete/insert                 | No when `NODE_ENV=production`; reachable in non-production startup when opted in              |
| Central admin development seed      | No                                                           | Imports Users, Profiles, and Products entities                  | Direct `DataSource`/repositories                                    | Not from application startup; directly executable as CLI                                      |
| Central CLI runner                  | Owner groups write owner tables                              | No foreign entity/repository import; imports owner factories    | Direct `DataSource` and schema query remain in the composition root | Not application startup; `assertSeedExecutionSafety` rejects production and protected targets |
| Clean-v2 fixture                    | No, intentionally test-wide                                  | Imports entities/repositories across owners                     | Transactional raw SQL and repositories                              | No current production caller; current verification caller creates a guarded disposable DB     |
| Historical/operational backfills    | No, migration/rollout-wide                                   | Migration uses `QueryRunner`; rollout uses central `DataSource` | Raw SQL, `QueryRunner`, external provider API                       | Not application startup; separately executable migration/rollout commands                     |

## Dependency DAG Evidence

Only edges with direct source evidence are accepted. `A -> B` means B requires
rows or stable keys produced by A.

| Edge                                                         | Static evidence                                                                                                                                                     |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Users -> Profiles                                            | Central and admin development seeders create users, then use their IDs for farmer/cooperative/enterprise/supplier/logistics profiles.                               |
| Users -> Products                                            | Product rows use seller IDs. `DevSeedService` resolves seeded users first; the Products startup service instead hard-codes three IDs with no matching writer found. |
| Product Categories -> Products                               | All product seed paths resolve category IDs/slugs before saving products.                                                                                           |
| Provinces -> Products                                        | `product.seed.ts` loads `Province` rows and assigns `provinceId`; this edge applies only to that currently uncalled source.                                         |
| Products -> Product Images                                   | Both Products seed paths save the Product before its primary image.                                                                                                 |
| Products -> Product Certifications                           | `DevSeedService` saves selected certifications after each Product.                                                                                                  |
| Users + Products -> Reviews                                  | `DevSeedService` uses reviewer user IDs and seeded Product IDs.                                                                                                     |
| Users -> Forum Posts; Forum Posts -> Comments/Likes          | Authors are seeded users; comment/like rows use the saved post ID.                                                                                                  |
| Users + Ad Packages -> Ad Campaigns                          | Campaigns use supplier IDs and package IDs loaded after package seeding.                                                                                            |
| Users -> Cooperative Members/Bulk Listings/Harvest Schedules | Cooperative/farmer user IDs are passed into each group.                                                                                                             |
| Bulk Listings -> Bulk Listing Contributions                  | Contributions use the newly saved listing ID.                                                                                                                       |
| Products -> Harvest Schedules                                | The central development seed passes `products[0].id` into schedule rows.                                                                                            |
| Users -> Audit Logs/Notifications                            | Both groups persist seeded user IDs.                                                                                                                                |
| Province -> District                                         | The clean-v2 test fixture inserts its Province before the District referencing it.                                                                                  |
| Source private document -> Stored File -> source-table link  | Migration and rollout backfills create/locate `stored_files` before updating the owning source row. This is a migration DAG, not a seed DAG.                        |

The following dependencies cannot be approved from current static evidence:

- `DEPENDENCY_REQUIRES_REVIEW`: Products startup seed -> fixed seller users.
  The fixed IDs appear only in the Products seed service, while the subsequent
  central development user seed creates generated IDs.
- `DEPENDENCY_REQUIRES_REVIEW`: Geography -> central development addresses and
  profiles. Those sources use numeric province/district literals, while the
  canonical Geography entities use UUID identifiers; no compatible producing
  seed group is proven.
- `DEPENDENCY_REQUIRES_REVIEW`: central CLI order
  `product_categories -> provinces -> users`. Source proves this sequence but
  no dependency among those three groups.
- `DEPENDENCY_REQUIRES_REVIEW`: Product development seed followed by
  `DevSeedService`. Both write categories/products, but the ordering appears to
  be overlap rather than an explicit contract.

## Evidence-Supported Risks

- Central ordinary seed sources write between three and ten bounded contexts.
- Development/demo data is reachable from non-production application startup;
  the standalone admin seed defaults to the protected local database name.
- `count() > 0` group guards avoid some duplicate second runs but silently
  preserve partially seeded groups.
- `seedSellers` can attempt all three inserts after a partial match.
- The Products startup seed uses fixed seller IDs for which no writer exists in
  repository source and runs before the comprehensive user seed.
- Current order is encoded in function calls, not a declared/cycle-checked DAG.
- Central seed code imports foreign entities and uses raw repositories/SQL.
- Seed/reset operations are embedded in the normal Products repository,
  including `TRUNCATE TABLE products CASCADE`.
- Reference, development, bootstrap, test fixture, and migration backfill
  concerns have no common machine-readable classification contract.
- Historical migration and Storage rollout data movement could be mistaken for
  ordinary seed work without the explicit backfill classification.
- No current seed DataSource enables `synchronize`; the Phase 8 invariant must
  preserve that state. The stale `seed-synchronize` exception text in
  `exceptions.json` no longer matches `src/database/seeds/seed.ts` and requires
  separate registry review, not runtime change in this kickoff.

## P8-04 Implementation Overlay

The merged kickoff inventory approved exactly two `REFERENCE_SEED` candidates.
P8-04 implements those candidates as `geography.reference.provinces` and
`products.reference.categories`, each with explicit `REFERENCE` metadata and no
external seed-group dependencies. The central canonical province payload was
removed; Geography now owns the sole copy. Products retains its sole existing
payload under Products infrastructure and exposes it through the Phase 8
contract. This overlay records source state only: no seed, SQL, migration,
application bootstrap, or database connection was executed.

## P8-05A Implementation Overlay

P8-05A retires the uncalled 10-row Geography DEV province source after a
human-approved mapping of all legacy concepts to the canonical 2025
administrative successors. It does not add `Province.code` aliases, alter the
34-row reference payload, or migrate the Products DEV source that still uses
historical province names; that debt is recorded for P8-05B.

The seven-account Users CLI payload is now `users.dev.users`, an owner-local
`DEV` SeedGroup with no external dependencies. It matches unique phone and email
independently, fails closed if those keys resolve to different users, reconciles
each account separately, and preserves the reviewed policy of replacing the
declared DEV credential. The central CLI composes this owner factory alongside
the two P8-04 reference groups and selects both classifications explicitly.

The seller seed remains unmigrated because its type contract is still consumed
by the deferred Product DEV source. Its partial-state defect and exact identity
overlap audit are recorded in `dev-seed-decisions.md`.

## P8-05B0 Dependency Output Overlay

P8-05B0 adds no seed source and changes no business payload. It extends the
owner-neutral SeedGroup boundary so reconciled scalar IDs can be published to
explicit dependents during one in-memory orchestration run:

| Producer group                  | Published stable mapping      | Count |
| ------------------------------- | ----------------------------- | ----: |
| `users.dev.users`               | email -> User ID              |     7 |
| `geography.reference.provinces` | canonical code -> Province ID |    34 |
| `products.reference.categories` | slug -> ProductCategory ID    |    37 |

Outputs contain only `string`, `number`, or `boolean` values. The registry is
not persisted, and consumers cannot access undeclared, unrelated, future, or
self outputs. This focused contract was merged in PR #108 and is the handoff
used by the P8-05B implementation below.

## P8-05B Products DEV Implementation Overlay

P8-05B replaces the startup-reachable Products development implementation with
the single owner-local `products.dev.products` SeedGroup. The group reconciles
54 records independently by explicit `DEV-*` SKU, resolves seller and category
IDs only through the merged dependency-output contract, and returns no outputs.
It has no Geography dependency because the canonical payload does not persist a
location.

| Historical source or concern | Original inventory disposition | Current disposition | Current owner/group |
| ---------------------------- | ------------------------------ | ------------------- | ------------------- |
| `src/modules/products/infrastructure/database/seeds/product.seed.ts` | `RETIRE_CANDIDATE` | `RETIRED_SUPERSEDED` after exact audit of all 16 historical names | products; no surviving group |
| `src/modules/users/seeds/seller.seed.ts` | `DEFERRED_TO_P8_05B` | `RETIRED_WITH_SUPERSEDED_PRODUCT_PATH` after its sole type consumer was retired | users; no new seller group |
| `src/modules/products/infrastructure/database/seeds/product-development-seed.service.ts` | `REWRITE_REQUIRED` | `CANONICAL_PRODUCTS_DEV_SEEDGROUP` | products / `products.dev.products` |
| `src/modules/products/infrastructure/repositories/typeorm-product.repository.ts` seed methods | `REWRITE_REQUIRED` | `MOVED_TO_OWNER_LOCAL_SEED_ADAPTER`; all five seed-only methods removed from the normal repository | products / `products.dev.products` |
| `src/database/dev-seed.service.ts` Product section | `REWRITE_REQUIRED` | P8-05C debt unchanged; startup passes `skipProducts=true` after the canonical group runs | central multi-owner service; no SeedGroup yet |

The dedicated Products seed adapter reconciles one intended primary-image slot
per seeded SKU. Zero primary rows creates the slot, one reconciles it, and more
than one fails closed. It never truncates Products or deletes unrelated rows.
The former Product reset switch is retired and fails before application
bootstrap. The central seed CLI does not gain a Products DEV execution path.

## Static Disposition Boundary

P8-04 dispositions for the two approved reference sources were implemented by
merged PR #106. P8-05A dispositions above are implemented by merged PR #107,
and the dependency-output contract is implemented by merged PR #108. P8-05B
Products dispositions were implemented by merged PR #109.

## P8-05C0 Central DevSeedService Planning Overlay

The complete static audit and decomposition is recorded in
[dev-seed-service-decomposition.md](dev-seed-service-decomposition.md). It maps
all 23 business tables written by `src/database/dev-seed.service.ts` to their
10 canonical owners, records exact overlap with the merged Users, Product
Categories, and Products groups, and defines four implementation slices with
their identity, Geography, dependency, and schema blockers.

```text
CURRENT_DISPOSITION=DECOMPOSITION_PLAN_APPROVED_PENDING_IMPLEMENTATION
CENTRAL_DEV_CLASSIFICATION=DEV
CENTRAL_DEV_TABLES=23
CENTRAL_DEV_TARGET_OWNERS=10
P8_05C_IMPLEMENTATION_CHANGES=0
ADMIN_DEV_TARGET_PHASE=P8_05D
```

The candidate owner groups and dependency DAG are planning decisions only.
No central business write has moved or been retired, no unresolved natural key
has been invented, and no database operation was authorized. Admin DEV
decomposition, TEST fixtures, and migration/backfill dispositions remain
unchanged by P8-05C0.

## P8-05D0 Current Admin DEV Decision Overlay

The kickoff inventory row above is preserved as historical evidence. Current
source no longer defaults to `agrilink_db`: it uses the shared fail-closed DEV
seed guard before `DataSource` construction, requires an explicit disposable
database target, rejects production and `agrilink_db`, and fixes
`synchronize: false`. Its only current reachability is its direct
`require.main` CLI; `npm run seed` and application startup do not reach it.

Full fixture-by-fixture evidence is in
[admin-dev-seed-decisions.md](admin-dev-seed-decisions.md).

```text
P8_05D0_ADMIN_DEV_DECISION_STATUS=IMPLEMENTED_BY_MERGED_PR_122
P8_05D_IMPLEMENTATION_STATUS=IN_PROGRESS

ADMIN_DEV_CLASSIFICATION=DEV
ADMIN_DEV_SOURCE_FILES=src/database/seeds/admin-dev.seed.ts
ADMIN_DEV_ENTRYPOINTS=DIRECT_CLI_REQUIRE_MAIN_ONLY
ADMIN_DEV_NPM_SCRIPTS=NONE
ADMIN_DEV_STARTUP_REACHABILITY=NO
ADMIN_DEV_DEFAULT_DATABASE_TARGET=NONE_EXPLICIT_DB_NAME_OR_DATABASE_URL_REQUIRED
ADMIN_DEV_DISPOSABLE_TARGET_REQUIRED=YES
ADMIN_DEV_PROTECTED_TARGET_BLOCKED=YES

ADMIN_DEV_WRITE_METHOD_COUNT=1
ADMIN_DEV_WRITE_SECTION_COUNT=7
ADMIN_DEV_TABLE_COUNT=7
ADMIN_DEV_OWNER_COUNT=3
ADMIN_DEV_USER_FIXTURE_COUNT=9
ADMIN_DEV_PRODUCT_FIXTURE_COUNT=10
ADMIN_DEV_PRODUCT_IMAGE_FIXTURE_COUNT=10
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

## P8-05D1 Current Admin DEV Users Inventory Overlay

The D0 row and fixture audit remain historical evidence. D1 moves the eight
distinct dashboard User payloads into the existing Users owner group and maps
the duplicate Admin by canonical email. The standalone source retains eight
Profile, ten Product, and ten Product Image fixture writes, but its User write
section and User repository access are now zero.

```text
P8_05D0_ADMIN_DEV_DECISION_STATUS=IMPLEMENTED_BY_MERGED_PR_122
P8_05D1_USERS_IMPLEMENTATION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_05D2_PROFILES_IMPLEMENTATION_STATUS=NOT_STARTED
P8_05D3_PRODUCTS_IMPLEMENTATION_AUTHORIZED=NO
P8_05D4_STANDALONE_ENTRYPOINT_RETIREMENT_AUTHORIZED=NO
P8_05D4_BLOCKERS=P8_05D2_PROFILES_NOT_IMPLEMENTED;P8_05D3_PRODUCTS_NOT_IMPLEMENTED
P8_05D_IMPLEMENTATION_STATUS=IN_PROGRESS

USERS_DEV_PRE_D1_RECORD_COUNT=10
USERS_DEV_D1_ADDITION_COUNT=8
USERS_DEV_POST_D1_RECORD_COUNT=18
USERS_DEV_OUTPUT_COUNT=18

ADMIN_DEV_WRITE_METHOD_COUNT=1
ADMIN_DEV_WRITE_SECTION_COUNT=6
ADMIN_DEV_TABLE_COUNT=6
ADMIN_DEV_OWNER_COUNT=2
ADMIN_DEV_STANDALONE_USER_BUSINESS_WRITES=0
ADMIN_DEV_STANDALONE_USER_REPOSITORY_WRITES=0
ADMIN_DEV_CROSS_OWNER_USER_REPOSITORY_ACCESS=0
ADMIN_DEV_STANDALONE_PROFILE_WRITES_REMAINING=8
ADMIN_DEV_STANDALONE_PRODUCT_WRITES_REMAINING=10
ADMIN_DEV_STANDALONE_PRODUCT_IMAGE_WRITES_REMAINING=10

ONE_SEED_OWNER_PER_USERS_TABLE=YES
NEW_SEEDGROUPS=0
NEW_SEED_OUTPUT_KINDS=0
SCHEMA_CHANGES=0
MIGRATIONS_CREATED=0
```

## P8-05D2 Current Admin DEV Profiles Inventory Overlay

The D0 and D1 inventories remain historical evidence. D2 moves all eight
approved Profile fixtures into the existing Profiles owner group and removes
the four standalone Profile repository sections. The direct standalone
business-write inventory is now two sections, two tables, and one owner:
Products and Product Images only.

The Profiles group contains twelve fixtures after D2 (four Farmers, three
Cooperatives, three Enterprises, and two Suppliers), depends only on Users
scalar outputs, and publishes no outputs. The standalone DataSource continues
to register four Profile entities solely so that owner group can operate; those
registrations are transition debt and are not direct business access.

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

## P8-05C3C1 Ads Inventory Authority

Current source leaves three executable Package declarations and four
executable Campaign declarations in the central continuation. Packages and
Campaigns are ordinary DEV writes with unresolved identity and disposition.
`ad_events` is not a DEV fixture or migration data-backfill target: it is an
Ads runtime table that remains in the central reset list as reset-only legacy
debt. See the complete
[C3C1 Ads audit](dev-seed-c3-decisions.md#20-p8-05c3c1-ads-identity-and-fixture-policy-audit).

~~~text
P8_05C3B_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_135
CENTRAL_NORMAL_WRITE_METHOD_COUNT=2
CENTRAL_NORMAL_WRITE_METHODS=seedAdPackages;seedAdCampaigns
CENTRAL_BUSINESS_TABLE_COUNT=2
CENTRAL_BUSINESS_TABLES=ad_packages;ad_campaigns

AD_PACKAGE_FIXTURE_COUNT=3
AD_PACKAGE_WHOLE_TABLE_GUARD_COUNT=1
AD_PACKAGE_PERSISTED_BUSINESS_ID_FIELD=NONE_PROVEN
AD_PACKAGE_ORIGINAL_FIXTURE_INTENT=SCREENSHOT_DEMO_CONTENT
AD_PACKAGE_CURRENT_CLASSIFICATION_JUSTIFIED=RECLASSIFICATION_REQUIRES_HUMAN_DECISION
AD_PACKAGE_IDENTITIES_RESOLVED=NO

AD_CAMPAIGN_FIXTURE_COUNT=4
AD_CAMPAIGN_WHOLE_TABLE_GUARD_COUNT=1
AD_CAMPAIGN_PERSISTED_BUSINESS_ID_FIELD=NONE_PROVEN
AD_CAMPAIGN_ORIGINAL_FIXTURE_INTENT=SCREENSHOT_DEMO_CONTENT
AD_CAMPAIGN_PARENT_PACKAGE_IDENTITY_RESOLVED=NO
AD_CAMPAIGN_IDENTITIES_RESOLVED=NO

AD_EVENTS_NORMAL_DEV_WRITE_SOURCE_COUNT=0
AD_EVENTS_CURRENT_NORMAL_DEV_WRITER=NONE
AD_EVENTS_MIGRATION_OR_BACKFILL_SOURCE_COUNT=0
AD_EVENTS_RUNTIME_WRITE_SOURCE_COUNT=1
AD_EVENTS_PHASE8_CLASSIFICATION=RESET_ONLY_LEGACY_DEBT
CURRENT_ADS_RESET_TARGETS=ad_campaigns;ad_packages;ad_events
NORMAL_WRITER_RESET_TARGETS=ad_campaigns;ad_packages
RESET_ONLY_DEBT_TARGETS=ad_events

ADS_REQUIRED_USER_IDENTITIES=supplier@agrilink.vn
LEGACY_ACTOR_ADMIN_CURRENT_CONSUMER_COUNT=0
LEGACY_ACTOR_ADMIN_CURRENT_ARGUMENT_PASS_COUNT=1
LEGACY_ACTOR_SUPPLIER_CURRENT_CONSUMER_COUNT=1

P8_05C3C1_ADS_DECISION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_05C3C_IMPLEMENTATION_STATUS=NOT_STARTED
P8_05C3C_IMPLEMENTATION_AUTHORIZED=NO
P8_05C3C_BLOCKERS=AD_PACKAGE_CLASSIFICATION_DECISION_REQUIRED;AD_PACKAGE_IDENTITY_POLICY_DECISION_REQUIRED;AP_01_DECISION_REQUIRED;AP_02_DECISION_REQUIRED;AP_03_DECISION_REQUIRED;AD_CAMPAIGN_IDENTITY_POLICY_DECISION_REQUIRED;AD_CAMPAIGN_PACKAGE_PARENT_IDENTITY_UNRESOLVED;AD_CAMPAIGN_PACKAGE_PARENT_MAPPING_DECISION_REQUIRED;AC_01_DECISION_REQUIRED;AC_02_DECISION_REQUIRED;AC_03_DECISION_REQUIRED;AC_04_DECISION_REQUIRED
P8_05C4D_CENTRAL_RETIREMENT_AUTHORIZED=NO
ADS_BUSINESS_IMPLEMENTATION_CHANGES=0
RUNTIME_FILES_CHANGED=0
SCHEMA_CHANGES=0
MIGRATIONS_CREATED=0
~~~


## P8-05C2D3A Harvest Schedule Identity Decision Overlay

The current inventory retains three synthetic screenshot/demo timeline rows:
HS-01 (`2026-07-15`, 2000 KG, main crop), HS-02 (`2026-07-20`, 1500 KG,
late crop), and HS-03 (`2026-08-01`, 3000 KG, staggered crop). All use
`farmer@sandbox.com` and Product SKU `DEV-XOAI-HOA-LOC-001`. These labels are
documentation-only and are not identities.

~~~text
P8_05C2D2_BULK_OPERATIONS_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_130
CENTRAL_NORMAL_WRITE_METHOD_COUNT=4
CENTRAL_HARVEST_WRITE_METHOD_COUNT=1

HARVEST_FIXTURE_COUNT=3
HARVEST_WHOLE_TABLE_GUARD_COUNT=1
HARVEST_PERSISTED_BUSINESS_ID_FIELD=NONE_PROVEN
HARVEST_TABLE_UNIQUE_CONSTRAINT_COUNT=0
HARVEST_TABLE_SECONDARY_INDEX_COUNT=1
HARVEST_GENERATED_UUID_IDENTITY_USAGE=YES_PRIMARY_KEY_ONLY;NOT_DETERMINISTIC_SEED_IDENTITY
HARVEST_DOMAIN_CARDINALITY_RULE=NONE_PROVEN;MULTIPLE_SCHEDULES_PER_USER_PRODUCT_DEMONSTRATED
HARVEST_ORIGINAL_FIXTURE_INTENT=SYNTHETIC_DEV_TIMELINE_DATA
SYNTHETIC_HARVEST_SEED_IDENTITY_APPROVED=NO

HS_01_FARMER_IDENTITY=farmer@sandbox.com
HS_01_PRODUCT_SKU=DEV-XOAI-HOA-LOC-001
HS_01_EXPECTED_HARVEST_DATE=2026-07-15
HS_01_ESTIMATED_QUANTITY=2000
HS_01_UNIT=KG
HS_01_STATUS=ABSENT_NO_PERSISTED_STATUS_FIELD

HS_02_FARMER_IDENTITY=farmer@sandbox.com
HS_02_PRODUCT_SKU=DEV-XOAI-HOA-LOC-001
HS_02_EXPECTED_HARVEST_DATE=2026-07-20
HS_02_ESTIMATED_QUANTITY=1500
HS_02_UNIT=KG
HS_02_STATUS=ABSENT_NO_PERSISTED_STATUS_FIELD

HS_03_FARMER_IDENTITY=farmer@sandbox.com
HS_03_PRODUCT_SKU=DEV-XOAI-HOA-LOC-001
HS_03_EXPECTED_HARVEST_DATE=2026-08-01
HS_03_ESTIMATED_QUANTITY=3000
HS_03_UNIT=KG
HS_03_STATUS=ABSENT_NO_PERSISTED_STATUS_FIELD

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

| Current executable source | D4 classification |
| --- | --- |
| `src/modules/geography/infrastructure/seeds/province-reference.seed.ts` | `REFERENCE_SEED` |
| `src/modules/products/infrastructure/database/seeds/product-category.seed.ts` | `REFERENCE_SEED` |
| `src/modules/users/infrastructure/database/seeds/user.seed.ts` | `DEV_SEED` |
| `src/modules/profiles/infrastructure/database/seeds/profile-role-development.seed.ts` | `DEV_SEED` |
| `src/modules/profiles/infrastructure/database/seeds/typeorm-profile-role-development-seed.writer.ts` | `DEV_SEED` |
| `src/modules/products/infrastructure/database/seeds/product-development-seed.service.ts` | `DEV_SEED` |
| `src/modules/products/infrastructure/database/seeds/typeorm-product-dev-seed.writer.ts` | `DEV_SEED` |
| `src/modules/reviews/infrastructure/database/seeds/review-development-seed.service.ts` | `DEV_SEED` |
| `src/modules/reviews/infrastructure/database/seeds/typeorm-review-dev-seed.writer.ts` | `DEV_SEED` |
| `src/modules/cooperatives/infrastructure/database/seeds/cooperative-member-development-seed.service.ts` | `DEV_SEED` |
| `src/modules/cooperatives/infrastructure/database/seeds/typeorm-cooperative-member-dev-seed.writer.ts` | `DEV_SEED` |
| `src/database/dev-seed.service.ts` | `DEV_SEED` |
| `src/database/seeds/legacy-remaining-dev-seed.group.ts` | `DEV_SEED` |
| `src/database/seeds/seed.ts` | `BOOTSTRAP_OR_STARTUP_SEED` |
| `src/main.ts` (development seed block) | `BOOTSTRAP_OR_STARTUP_SEED` |
| `src/database/reconciliation/clean-v2-runtime-baseline.ts` (`seedRuntimeFixture`) | `TEST_SEED` |
| `src/database/migrations/1783818000000-AddStoredFileIdToPrivateDocuments.ts` | `MIGRATION_DATA_BACKFILL` |
| `src/scripts/storage-phase9-rollout.ts` | `MIGRATION_DATA_BACKFILL` |

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

The retirement authorized by merged PR #129
(`2c458a0989db572ab5391e43ef26da4940fad19e`) removes the ordinary DEV
inventory rows for BL-01, BL-02, BLC-01, and BLC-02 instead of transferring
them to another owner. No Bulk Listing or Contribution DEV SeedGroup or output
is added. Domain entities, repositories, tables, migrations, and API behavior
remain outside this inventory change.

~~~text
PRE_C2D2_CENTRAL_NORMAL_WRITE_METHOD_COUNT=5
POST_C2D2_CENTRAL_NORMAL_WRITE_METHOD_COUNT=4
POST_C2D2_CENTRAL_NORMAL_WRITE_METHODS=seedForum;seedAdPackages;seedAdCampaigns;seedHarvestSchedules
PRE_C2D2_CENTRAL_BUSINESS_TABLE_COUNT=8
POST_C2D2_CENTRAL_BUSINESS_TABLE_COUNT=6
POST_C2D2_CENTRAL_BUSINESS_TABLES=forum_posts;forum_comments;forum_likes;ad_packages;ad_campaigns;harvest_schedules

CENTRAL_SEED_BULK_LISTINGS_METHOD_EXISTS=NO
BL_01_EXECUTABLE_FIXTURE_EXISTS=NO
BL_02_EXECUTABLE_FIXTURE_EXISTS=NO
BLC_01_EXECUTABLE_FIXTURE_EXISTS=NO
BLC_02_EXECUTABLE_FIXTURE_EXISTS=NO
PRE_C2D2_BULK_RESET_TARGET_COUNT=2
POST_C2D2_BULK_RESET_TARGET_COUNT=0
CENTRAL_BULK_LISTING_TABLE_WRITE_OWNERS=0
CENTRAL_CONTRIBUTION_TABLE_WRITE_OWNERS=0

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


## P8-05C2D3A1 Human Decision Corrective Overlay

The three currently executable Harvest timeline declarations remain present
until a later runtime PR. Human review accepts the merged PR #131 audit and
approves retirement of all three, with no replacement owner group or output.
See the detailed [C2D3A1 corrective decision overlay](dev-seed-c2d-decisions.md#25-p8-05c2d3a1-human-decision-corrective-overlay).

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
HARVEST_NEW_SEEDGROUP_REQUIRED=NO
HARVEST_OUTPUT_REQUIRED=NO
FUTURE_HARVEST_OWNER_SEED_DEPENDENCIES=NONE_FIXTURES_RETIRED

P8_05C2D3_HARVEST_IMPLEMENTATION_AUTHORIZED=YES_AFTER_P8_05C2D3A1_MERGE
CURRENT_P8_05C2D3_HARVEST_IMPLEMENTATION_AUTHORIZED=YES_AFTER_P8_05C2D3A1_MERGE
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

The executable central inventory no longer contains Forum Posts, Comments, or
Likes. Only `ad_packages` and `ad_campaigns` remain normal central write tables;
the three Ads reset targets remain unchanged. See the
[C3B implementation overlay](dev-seed-c3-decisions.md#19-p8-05c3b-forum-retirement-implementation-overlay).

~~~text
P8_05C3B1_FORUM_DECISION_STATUS=IMPLEMENTED_BY_MERGED_PR_134
P8_05C3B_IMPLEMENTATION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_05C3B_IMPLEMENTATION_AUTHORIZED=YES
P8_05C3B_BLOCKERS=NONE
P8_05C3B_IMPLEMENTATION_STRATEGY=RETIRE_LEGACY_FORUM_DEV_FIXTURES
FORUM_POST_EXECUTABLE_FIXTURE_COUNT=0
FORUM_COMMENT_EXECUTABLE_FIXTURE_COUNT=0
FORUM_RANDOM_LIKE_GENERATOR_EXISTS=NO
PRE_C3B_CENTRAL_NORMAL_WRITE_METHOD_COUNT=3
POST_C3B_CENTRAL_NORMAL_WRITE_METHOD_COUNT=2
POST_C3B_CENTRAL_NORMAL_WRITE_METHODS=seedAdPackages;seedAdCampaigns
PRE_C3B_CENTRAL_BUSINESS_TABLE_COUNT=5
POST_C3B_CENTRAL_BUSINESS_TABLE_COUNT=2
POST_C3B_CENTRAL_BUSINESS_TABLES=ad_packages;ad_campaigns
PRE_C3B_FORUM_RESET_TARGET_COUNT=3
POST_C3B_FORUM_RESET_TARGET_COUNT=0
NEW_FORUM_SEEDGROUPS=0
NEW_SEEDGROUPS=0
NEW_SEED_OUTPUT_KINDS=0
CENTRAL_FORUM_POST_TABLE_WRITE_OWNERS=0
CENTRAL_FORUM_COMMENT_TABLE_WRITE_OWNERS=0
CENTRAL_FORUM_LIKE_TABLE_WRITE_OWNERS=0
P8_05C3C_IMPLEMENTATION_AUTHORIZED=NO
P8_05C4D_CENTRAL_RETIREMENT_AUTHORIZED=NO
FORUM_DOMAIN_RUNTIME_CHANGES=0
ADS_BUSINESS_IMPLEMENTATION_CHANGES=0
SCHEMA_CHANGES=0
MIGRATIONS_CREATED=0
~~~

## P8-05C2D3 Harvest Retirement Implementation Overlay

HS-01, HS-02, and HS-03 are no longer executable ordinary DEV declarations.
There is no replacement Harvest group or output, and `harvest_schedules` is
no longer a central reset target. See the detailed
[C2D3 implementation overlay](dev-seed-c2d-decisions.md#26-p8-05c2d3-harvest-retirement-implementation-overlay).

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

## P8-05C3B1 Forum Inventory Authority

The post-PR #133 central inventory has three normal methods and five business
tables. The five Post, seven Comment, and probabilistic Like declarations are
fully enumerated in the
[C3B1 Forum audit](dev-seed-c3-decisions.md#17-p8-05c3b1-forum-identity-and-fixture-policy-audit).

~~~text
P8_05C2D3_HARVEST_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_133
CENTRAL_NORMAL_WRITE_METHOD_COUNT=3
CENTRAL_NORMAL_WRITE_METHODS=seedForum;seedAdPackages;seedAdCampaigns
CENTRAL_BUSINESS_TABLE_COUNT=5
CENTRAL_BUSINESS_TABLES=forum_posts;forum_comments;forum_likes;ad_packages;ad_campaigns
FORUM_POST_FIXTURE_COUNT=5
FORUM_COMMENT_FIXTURE_COUNT=7
FORUM_LIKE_FIXED_PAIR_COUNT=0
FORUM_LIKE_FIXTURE_GENERATION_MODE=PROBABILISTIC_RANDOM_SELECTION_OVER_15_POSITIONAL_CANDIDATE_PAIRS
CURRENT_FORUM_RESET_TARGETS=forum_likes;forum_comments;forum_posts
P8_05C3B1_FORUM_DECISION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_05C3B_IMPLEMENTATION_STATUS=NOT_STARTED
P8_05C3B_IMPLEMENTATION_AUTHORIZED=NO
P8_05C3C_IMPLEMENTATION_AUTHORIZED=NO
P8_05C4D_CENTRAL_RETIREMENT_AUTHORIZED=NO
RUNTIME_FILES_CHANGED=0
SCHEMA_CHANGES=0
MIGRATIONS_CREATED=0
~~~

## P8-05C3B1 Human Review Inventory Overlay

The current executable inventory remains five Posts, seven Comments, and a
random Like selector. Human review approves their future retirement with no
replacement fixtures. See the
[complete human decision](dev-seed-c3-decisions.md#18-p8-05c3b1-human-review-decision-overlay).

~~~text
P8_05C3B1_FORUM_DECISION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
FORUM_POST_IDENTITY_POLICY_DECISION=RETIRE_CURRENT_DEV_FIXTURES
FORUM_COMMENT_IDENTITY_POLICY_DECISION=RETIRE_CURRENT_DEV_FIXTURES
FORUM_LIKE_FIXTURE_POLICY_DECISION=RETIRE_CURRENT_DEV_FIXTURES
FORUM_POST_IDENTITIES_RESOLVED=NOT_REQUIRED_FIXTURES_RETIRED
FORUM_COMMENT_IDENTITIES_RESOLVED=NOT_REQUIRED_FIXTURES_RETIRED
FORUM_COMMENT_PARENT_IDENTITY_RESOLVED=NOT_REQUIRED_PARENT_FIXTURES_RETIRED
FORUM_POST_APPROVED_RETAIN_COUNT=0
FORUM_POST_APPROVED_RETIRE_COUNT=5
FORUM_COMMENT_APPROVED_RETAIN_COUNT=0
FORUM_COMMENT_APPROVED_RETIRE_COUNT=7
FORUM_LIKE_APPROVED_FIXED_PAIR_COUNT=0
FORUM_LIKE_ROW_IDENTITY_RESOLVED=YES
FORUM_LIKE_POLICY_RESOLVED=YES
FORUM_DEV_FIXTURE_DISPOSITION=RETIRE_FROM_ORDINARY_DEV_SEED
FORUM_NEW_OWNER_LOCAL_DEV_SEED_REQUIRED=NO
FORUM_NEW_SEEDGROUP_REQUIRED=NO
FORUM_NEW_SCALAR_OUTPUT_REQUIRED=NO
FORUM_NEW_SEED_OUTPUT_KINDS=0
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
FORUM_POST_EXECUTABLE_FIXTURE_COUNT=0
FORUM_COMMENT_EXECUTABLE_FIXTURE_COUNT=0
POST_C3B_CENTRAL_NORMAL_WRITE_METHOD_COUNT=2
POST_C3B_CENTRAL_BUSINESS_TABLE_COUNT=2
POST_C3B_FORUM_RESET_TARGET_COUNT=0
NEW_FORUM_SEEDGROUPS=0
NEW_SEED_OUTPUT_KINDS=0
P8_05C3C_IMPLEMENTATION_AUTHORIZED=NO
P8_05C4D_CENTRAL_RETIREMENT_AUTHORIZED=NO
SCHEMA_CHANGES=0
MIGRATIONS_CREATED=0
~~~

## P8-05C3C1 Current Ads Inventory Authority

~~~text
P8_05C3B_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_135
CENTRAL_NORMAL_WRITE_METHOD_COUNT=2
CENTRAL_BUSINESS_TABLE_COUNT=2
AD_PACKAGE_FIXTURE_COUNT=3
AD_CAMPAIGN_FIXTURE_COUNT=4
AD_PACKAGE_IDENTITIES_RESOLVED=NO
AD_CAMPAIGN_IDENTITIES_RESOLVED=NO
AD_CAMPAIGN_PARENT_IDENTITY_RESOLVED=NO
AD_PACKAGE_CLASSIFICATION_RESOLVED=NO
AD_EVENTS_NORMAL_DEV_WRITE_SOURCE_COUNT=0
AD_EVENTS_PHASE8_CLASSIFICATION=RESET_ONLY_LEGACY_DEBT
P8_05C3C1_ADS_DECISION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_05C3C_IMPLEMENTATION_STATUS=NOT_STARTED
P8_05C3C_IMPLEMENTATION_AUTHORIZED=NO
P8_05C4D_CENTRAL_RETIREMENT_AUTHORIZED=NO
~~~

## P8-05C3C1 Human Review Inventory Overlay

The executable inventory remains unchanged at three Packages and four
Campaigns. Human review retains all three Package concepts pending a real
REFERENCE identifier and retires all four Campaign concepts from future
ordinary DEV ownership. `ad_events` remains reset-only legacy debt in the
Phase 8 inventory and retains normal runtime ownership.

~~~text
AD_PACKAGE_EXECUTABLE_FIXTURE_COUNT=3
AD_PACKAGE_CLASSIFICATION_DECISION=RECLASSIFY_AS_REFERENCE
AD_PACKAGE_IDENTITY_POLICY_DECISION=ADD_DOMAIN_PACKAGE_IDENTIFIER
AD_PACKAGE_IDENTITIES_RESOLVED=PENDING_DOMAIN_PACKAGE_IDENTIFIER_DECISION
AP_01_DECISION=RETAIN_PENDING_APPROVED_REFERENCE_IDENTITY
AP_02_DECISION=RETAIN_PENDING_APPROVED_REFERENCE_IDENTITY
AP_03_DECISION=RETAIN_PENDING_APPROVED_REFERENCE_IDENTITY
AD_PACKAGE_APPROVED_RETAIN_COUNT=3
AD_PACKAGE_APPROVED_RETIRE_COUNT=0

AD_CAMPAIGN_EXECUTABLE_FIXTURE_COUNT=4
AD_CAMPAIGN_IDENTITY_POLICY_DECISION=RETIRE_CURRENT_DEV_FIXTURES
AC_01_DECISION=RETIRE
AC_02_DECISION=RETIRE
AC_03_DECISION=RETIRE
AC_04_DECISION=RETIRE
AD_CAMPAIGN_APPROVED_RETAIN_COUNT=0
AD_CAMPAIGN_APPROVED_RETIRE_COUNT=4
AD_CAMPAIGN_IDENTITIES_RESOLVED=NOT_REQUIRED_FIXTURES_RETIRED
AD_CAMPAIGN_PARENT_IDENTITY_RESOLVED=NOT_REQUIRED_CAMPAIGN_FIXTURES_RETIRED
ADS_CAMPAIGN_USER_DEPENDENCY_REQUIRED=NO

AD_EVENTS_NORMAL_DEV_WRITE_SOURCE_COUNT=0
AD_EVENTS_RUNTIME_WRITE_SOURCE_COUNT=1
AD_EVENTS_RESET_TARGET_EXISTS=YES
AD_EVENTS_PHASE8_CLASSIFICATION=RESET_ONLY_LEGACY_DEBT

AD_CAMPAIGN_RETIREMENT_DECISION_RESOLVED=YES
AD_PACKAGE_REFERENCE_MIGRATION_DECISION_RESOLVED=NO
NEXT_DECISION_SLICE=P8_05C3C2_AD_PACKAGE_REFERENCE_IDENTITY_DECISION
P8_05C3C_IMPLEMENTATION_AUTHORIZED=NO
P8_05C4D_CENTRAL_RETIREMENT_AUTHORIZED=NO
RUNTIME_FILES_CHANGED=0
SCHEMA_CHANGES=0
MIGRATIONS_CREATED=0
~~~

## P8-05C3C2 Ad Package Reference Identity Inventory Overlay

The executable inventory is unchanged. The proposed future Package inventory
adds one real catalog identity field and one Ads-owned REFERENCE group, subject
to human approval and separate schema/seed implementation. Existing and custom
rows are not inferred from static source.

~~~text
P8_05C3C1_ADS_HUMAN_REVIEW_STATUS=FINALIZED_BY_MERGED_PR_136
P8_05C3C1_ADS_DECISION_STATUS=IMPLEMENTED_BY_MERGED_PR_136
AD_PACKAGE_PRIMARY_KEY_FIELD=id
AD_PACKAGE_PRIMARY_KEY_TYPE=INTEGER
AD_PACKAGE_PRIMARY_KEY_GENERATION=DATABASE_GENERATED_POSTGRESQL_SERIAL
AD_PACKAGE_NUMERIC_ID_ROLE=INTERNAL_SURROGATE_PRIMARY_KEY_WITH_EXISTING_PUBLIC_NUMERIC_REFERENCE
AD_PACKAGE_IDENTIFIER_FIELD_NAME_DECISION=packageCode
PROPOSED_IDENTIFIER_COLUMN=package_code
PROPOSED_IDENTIFIER_TYPE=varchar
PROPOSED_IDENTIFIER_LENGTH=64
PROPOSED_IDENTIFIER_NULLABILITY=TRANSITIONAL_NULLABLE_THEN_NOT_NULL
PROPOSED_IDENTIFIER_UNIQUE_SCOPE=GLOBAL_UNIQUE
PROPOSED_INDEX_OR_CONSTRAINT=UQ_ad_packages_package_code
AP_01_REFERENCE_IDENTIFIER_VALUE_DECISION=HOMEPAGE_CAROUSEL
AP_02_REFERENCE_IDENTIFIER_VALUE_DECISION=FEATURED_PRODUCT
AP_03_REFERENCE_IDENTIFIER_VALUE_DECISION=SPOTLIGHT_PLACEMENT
AD_PACKAGE_EXISTING_ROW_MIGRATION_POLICY=BACKFILL_ONLY_MATCHED_CANONICAL_ROWS_FAIL_CLOSED_ON_AMBIGUITY
AD_PACKAGE_REFERENCE_SEED_GROUP_ID=ads.reference.packages
AD_PACKAGE_REFERENCE_SEED_OWNER=ADS
AD_PACKAGE_REFERENCE_SEED_CLASSIFICATION=REFERENCE
AD_PACKAGE_REFERENCE_SEED_DEPENDENCIES=NONE
AD_PACKAGE_REFERENCE_STABLE_KEY=packageCode
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

## P8-05C3C2 Human Review Inventory Overlay

Current executable inventory remains unchanged. Human review approves the
future `package_code` contract and catalog values, with an explicit nullable
expand followed by validated backfill/NOT-NULL contract. No deployed row is
classified by this static documentation change.

~~~text
AD_PACKAGE_IDENTIFIER_FIELD_NAME_DECISION=packageCode
PROPOSED_IDENTIFIER_COLUMN=package_code
PROPOSED_IDENTIFIER_TYPE=varchar
PROPOSED_IDENTIFIER_LENGTH=64
PROPOSED_IDENTIFIER_UNIQUE_SCOPE=GLOBAL_UNIQUE
PROPOSED_INDEX_OR_CONSTRAINT=UQ_ad_packages_package_code
PACKAGE_CODE_FINAL_NULLABILITY=NOT_NULL
AP_01_REFERENCE_IDENTIFIER_VALUE_DECISION=HOMEPAGE_CAROUSEL
AP_02_REFERENCE_IDENTIFIER_VALUE_DECISION=FEATURED_PRODUCT
AP_03_REFERENCE_IDENTIFIER_VALUE_DECISION=SPOTLIGHT_PLACEMENT
C3C2A1_PACKAGE_CODE_NULLABILITY=NULLABLE_TRANSITIONAL
C3C2A1_EXISTING_ROW_AUTOMATIC_GUESSING=PROHIBITED
C3C2A2_AMBIGUOUS_ROW_POLICY=FAIL_CLOSED
C3C2A2_UNKNOWN_CUSTOM_ROW_POLICY=REQUIRE_EXPLICIT_HUMAN_MAPPING_BEFORE_NOT_NULL
C3C2A2_FINAL_PACKAGE_CODE_NULLABILITY=NOT_NULL
AD_PACKAGE_BACKFILL_MATCHING_IS_DOMAIN_IDENTITY=NO
AD_PACKAGE_CANONICAL_DOMAIN_IDENTITY=packageCode
AD_PACKAGE_REFERENCE_SEED_GROUP_ID=ads.reference.packages
AD_PACKAGE_REFERENCE_SEED_CLASSIFICATION=REFERENCE
AD_PACKAGE_REFERENCE_STABLE_KEY=packageCode
P8_05C3C2_AD_PACKAGE_REFERENCE_IDENTITY_STATUS=IMPLEMENTED_PENDING_HUMAN_MERGE
P8_05C3C2_DECISION_BLOCKERS=NONE
AD_PACKAGE_DOMAIN_IDENTIFIER_DECISION_RESOLVED=YES
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

## P8-05C3C2A1 Ad Package Identifier Schema Expand Inventory Overlay

The executable seed inventory is unchanged. A1 adds only nullable globally
unique Package identifier persistence; it neither identifies existing rows
nor creates the future Ads REFERENCE inventory. All three current Packages
remain unbackfilled and all central Package/Campaign fixtures remain in place.

~~~text
P8_05C3C2_AD_PACKAGE_REFERENCE_IDENTITY_STATUS=IMPLEMENTED_BY_MERGED_PR_137
P8_05C3C2A1_IMPLEMENTATION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_05C3C2A1_BLOCKERS=NONE
C3C2A1_PACKAGE_CODE_NULLABILITY=NULLABLE_TRANSITIONAL
C3C2A1_EXISTING_ROW_AUTOMATIC_GUESSING=PROHIBITED
AD_PACKAGE_ENTITY_PACKAGE_CODE_EXISTS=YES
AD_PACKAGE_ENTITY_PACKAGE_CODE_COLUMN=package_code
AD_PACKAGE_ENTITY_PACKAGE_CODE_LENGTH=64
AD_PACKAGE_ENTITY_PACKAGE_CODE_NULLABLE=YES
AD_PACKAGE_ENTITY_PACKAGE_CODE_UNIQUE=YES
AP_01_ROW_BACKFILLED=NO
AP_02_ROW_BACKFILLED=NO
AP_03_ROW_BACKFILLED=NO
EXISTING_PACKAGE_ROWS_MODIFIED=0
AD_PACKAGE_EXECUTABLE_FIXTURE_COUNT=3
AD_CAMPAIGN_EXECUTABLE_FIXTURE_COUNT=4
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

## P8-05C3C2A2 Ad Package Identifier Backfill And Contract Inventory Overlay

A2 migration source can recognize the three approved legacy Package rows and
assign their approved codes, but no migration was executed and the executable
seed inventory is unchanged. Zero legacy matches are allowed; any existing
unresolved/custom row fails closed before the NOT NULL contract.

~~~text
P8_05C3C2A1_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_138
P8_05C3C2A2_IMPLEMENTATION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_05C3C2A2_BLOCKERS=NONE
AD_PACKAGE_REFERENCE_MIGRATION_DECISION_RESOLVED=YES_A1_A2_IMPLEMENTED_PENDING_HUMAN_REVIEW
C3C2A2_FINAL_PACKAGE_CODE_NULLABILITY=NOT_NULL
AP_01_REFERENCE_IDENTIFIER_VALUE_DECISION=HOMEPAGE_CAROUSEL
AP_02_REFERENCE_IDENTIFIER_VALUE_DECISION=FEATURED_PRODUCT
AP_03_REFERENCE_IDENTIFIER_VALUE_DECISION=SPOTLIGHT_PLACEMENT
AP_01_ZERO_MATCH_POLICY=ALLOWED
AP_02_ZERO_MATCH_POLICY=ALLOWED
AP_03_ZERO_MATCH_POLICY=ALLOWED
UNKNOWN_OR_CUSTOM_NULL_ROW_POLICY=FAIL_CLOSED_REQUIRE_EXPLICIT_HUMAN_MAPPING
MIGRATION_BOUNDED_UPDATE_STATEMENTS=3
AD_PACKAGE_ENTITY_PACKAGE_CODE_NULLABLE=NO
AD_PACKAGE_EXECUTABLE_FIXTURE_COUNT=3
AD_CAMPAIGN_EXECUTABLE_FIXTURE_COUNT=4
NEW_AD_PACKAGE_REFERENCE_SEEDGROUPS=0
NEW_SEEDGROUPS=0
NEW_SEED_OUTPUT_KINDS=0
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

## P8-05C3C2A2 Corrective Compatibility Review Inventory Overlay

The executable count remains three Packages and four Campaigns. Each retained
Package now includes its approved canonical code solely as a transitional A2
schema bridge. No new fixture, REFERENCE group, Campaign change, or reset
change is introduced.

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
CENTRAL_AP_01_PACKAGE_CODE=HOMEPAGE_CAROUSEL
CENTRAL_AP_02_PACKAGE_CODE=FEATURED_PRODUCT
CENTRAL_AP_03_PACKAGE_CODE=SPOTLIGHT_PLACEMENT
CENTRAL_AD_PACKAGE_NON_IDENTITY_PAYLOAD_CHANGES=0
POST_A2_CURRENT_SEED_MISSING_PACKAGE_CODE_FIXTURES=0
FRESH_DB_A2_THEN_LEGACY_PACKAGE_SEED_STATIC_COMPATIBILITY=PASS
APPROVED_CODE_FINGERPRINT_PREFLIGHT_COUNT=3
UNKNOWN_CUSTOM_NULL_PREFLIGHT_BEFORE_FIRST_UPDATE=YES
PRE_UPDATE_FAIL_CLOSED_VALIDATION_COMPLETE=YES
AD_PACKAGE_EXECUTABLE_FIXTURE_COUNT=3
AD_CAMPAIGN_EXECUTABLE_FIXTURE_COUNT=4
NEW_AD_PACKAGE_REFERENCE_SEEDGROUPS=0
NEW_SEEDGROUPS=0
NEW_SEED_OUTPUT_KINDS=0
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
