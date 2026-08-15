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
