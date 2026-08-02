# Persistence Current-State Audit

## Evidence Boundary

Initial source audit commit: `f66be061f1087b6d8436137d6778cbab1727f834`.
PostgreSQL verification source commit:
`892677712c3e3dd4c3de50e6beff0851aca37756`.

The initial audit was source-only. A later read-only verification against the
local PostgreSQL 16.14 Docker database is recorded in
`phases/phase-00/evidence/postgresql-schema-verification.md`. It found 33 public tables, no migration
ledger, and a migration chain that fails on an empty disposable database at
its first migration. These observations describe the local snapshot only, not
production.

## Executive Assessment

The ownership roadmap is directionally correct: module-owned persistence,
scalar cross-module IDs, ports/read models, one composition registry, schema
parity, and phased retirement all address observed code.

Three assumptions needed correction:

1. The old `68 / 40 / 21` baseline is stale. After Phase 5 consolidation,
   current source has 49 writable mappings, 16 central mappings, and 2
   duplicate physical tables.
2. Phase 1 cannot merely unify DataSources. The repository has no bootstrap
   migration for most tables, so a clean migration chain cannot create the
   current schema.
3. Profiles should not adopt the existing module-local classes as canonical.
   Runtime uses the central classes, and those contain the KYC, verification,
   and Storage Phase 9 file-ID fields missing from module-local mappings.

Phases 0 through 4 are merged. Phase 5 now consolidates Product ownership and
the Reviews boundary on top of the guarded v2 baseline/onboarding strategy.
The protected local schema still requires reconciliation before any apply
operation, but it no longer blocks source ownership consolidation.

## Inventory

| Metric                                            | Observed |
| ------------------------------------------------- | -------: |
| Writable `@Entity` mappings                    | 49 |
| `@ViewEntity` mappings                         |  0 |
| Physical `(schema, table)` keys                | 47 |
| Duplicate writable physical tables             |  2 |
| Central mappings under `src/database/entities` | 16 |
| Module-local mappings                          | 33 |
| Central import edges                           |  2 |
| Cross-module infrastructure edges              |  0 |
| Foreign `forFeature` registrations             |  1 |

Runtime, CLI, and persistence tests use the explicit entity registry. The
legacy standalone seed remains a separately tracked Phase 8 exception.

## Ownership Matrix

The complete machine-readable matrix is `entity-ownership.json`. Compact view:

| Tables                                     | Canonical owner       | Status                               | Phase    | Risk          |
| ------------------------------------------ | --------------------- | ------------------------------------ | -------- | ------------- |
| `ad_campaigns`, `ad_events`, `ad_packages` | ads                   | canonical                            | 2        | low           |
| `audit_logs`                               | admin                 | canonical                            | 2        | medium        |
| `system_configs`                           | admin                 | canonical                            | 2        | low           |
| `districts`, `provinces`                   | geography             | canonical                            | 2        | low           |
| `market_prices`                            | market-prices         | deferred duplicate                   | 2        | high          |
| `notifications`                            | notifications         | canonical                            | 2        | low           |
| `users`                                    | users                 | canonical                            | 3        | critical      |
| `user_addresses`                           | users                 | deferred outside baseline/runtime    | 3        | medium        |
| `refresh_tokens`, `otp_verifications`      | auth                  | canonical                            | 3        | high          |
| four role profile tables                   | profiles              | canonical                            | 4        | critical      |
| product/category/image/certification       | products              | canonical                            | 5        | high-critical |
| `wishlists`, legacy wishlist candidates    | products              | canonical plus reconciliation blocker | 5       | high          |
| `reviews`                                  | reviews               | canonical scalar boundary             | 5       | high          |
| order tables                               | orders                | canonical                            | 6        | critical      |
| `payments`                                 | payments              | canonical                            | 6        | critical      |
| `contracts`, `purchase_requests`           | contracts             | canonical                            | 6        | high          |
| `commerce_operations`                     | commerce              | canonical technical support          | 6        | high          |
| logistics tables/profile                   | logistics             | dormant deferred declarations        | 7A       | high          |
| conversations/messages                     | messaging             | dormant deferred declarations        | 7A       | medium        |
| disputes/incidents/certificates            | compliance            | central legacy                       | 7B       | high          |
| `traceability_records`                     | traceability          | duplicate                            | 7B       | critical      |
| cooperative persistence tables             | cooperatives          | canonical                            | complete | low           |
| forum tables                               | forum                 | canonical                            | complete | low           |
| `stored_files`                             | storage               | canonical                            | complete | low           |

## Duplicate Conflict Report

Local-live observations supplement this source comparison. Exact columns,
constraints, indexes, enums, and limitations are recorded in
`phases/phase-00/evidence/postgresql-schema-verification.md`; deployed-schema match remains unverified.

| Physical table           | Material differences                                                                   | Migration evidence                                                     | Recommendation                                                     |
| ------------------------ | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `cooperative_profiles`   | canonical KYC/verification/file IDs; retired local public-profile fields               | baseline v2 includes Storage fields and `member_count`                 | consolidated in Profiles; local-only fields excluded               |
| `enterprise_profiles`    | canonical verification/license fields; retired local website/geography fields          | baseline v2 includes license file ID                                   | consolidated in Profiles; local-only fields excluded               |
| `farmer_profiles`        | canonical KYC/trust/sales plus baseline farm fields                                    | baseline v2 includes KYC file IDs, `farm_name`, and `experience_years` | consolidated in Profiles                                           |
| `market_prices`          | central min/max/avg; local one price/product/reporting model                           | no bootstrap                                                           | likely two concepts sharing one table; redesign/migration required |
| `product_categories`     | retired central declaration differed from canonical runtime/baseline                   | canonical baseline v2                                                   | consolidated under Products; no migration                          |
| `product_certifications` | retired central declaration used incompatible date and document fields                 | baseline includes legacy URL plus StoredFile ID                         | consolidated under Products; compatibility metadata completed      |
| `product_images`         | retired central declaration used `url`; canonical runtime uses `image_url`              | canonical baseline v2                                                   | consolidated under Products; no migration                          |
| `products`               | retired central declaration used incompatible price/stock semantics                    | canonical baseline v2 and active runtime select Products-local mapping  | consolidated under Products; no migration                          |
| `supplier_profiles`      | canonical verification/license; retired local public fields                            | baseline v2 includes user and license file FKs                         | consolidated in Profiles with scalar user ID                       |
| `traceability_records`   | two incompatible trace models and date names                                           | no bootstrap                                                           | treat as schema redesign, not a class move                         |

`product_wishlist` and `wishlists` are not decorator duplicates because they are
different physical tables. The local live database contains `wishlists` plus a
third spelling, `product_wishlists`, while source declares singular
`product_wishlist`. They are a semantic and naming conflict requiring deployed
row/consumer inventory before retirement or merge.

## Phase 2 Consolidation Decisions

`public.provinces` and `public.districts` now have one writable mapping each,
owned by Geography. The central files are decorator-free compatibility
re-exports.

A repository-wide usage audit and read-only local catalog query found no
active consumer or deployed column for `provinces.is_key_agri`,
`provinces.created_at`, or `provinces.updated_at`. These fields are
`LEGACY_ONLY`; they were not restored to the canonical mapping and require no
migration. The canonical district foreign key retains `ON DELETE CASCADE`.

## Dependency Boundary Report

Observed forbidden edges:

- Admin uses typed Profiles, Users, and Products ports. Its only remaining
  foreign registration is IncidentReport.
- Reviews imports no Product/User persistence, registers neither foreign
  entity, and injects neither foreign repository.
- Review persistence exposes scalar Product/User IDs. Private string-target
  metadata preserves reviewed foreign keys without infrastructure imports.
- Users exports typed identity, account, admin-query, and status ports only.
- Product runtime mappings use cascade persistence for images and
  certifications. These are intra-module but require explicit retention tests.
- No production domain/application file imports TypeORM. One Storage migration
  spec under `application` imports `QueryRunner`; test placement should be
  corrected later.
- No eager ORM relation was found.

Clean-v2 runtime capture and focused Phase 5 tests cover the scoped query
boundaries. Product list/detail remain at 2/5 queries, Review list is reduced
from 3 to 2, and Review enrichment performs at most one Products and one Users
lookup independent of result size.

## Phase 5 Ownership Decisions

Products now owns one writable mapping for `products`, `product_categories`,
`product_images`, `product_certifications`, and `wishlists`. The five central
Product-related files are decorator-free compatibility re-exports, and the
generator preserves that state.

Canonical baseline v2 and active runtime select `public.wishlists`. The
protected local reconciliation snapshot also records `product_wishlists`, but
there is no deployed row inventory. Its lineage remains
`WISHLIST_SCHEMA_RECONCILIATION_REQUIRED`; Phase 5 performs no rename, copy,
drop, dual-read, or dual-write.

Reviews owns `reviews` with scalar identifiers and typed Products/Users
eligibility and summary ports. List enrichment performs at most one Products
and one Users batch lookup. Admin uses typed Products read and conditional
moderation ports. Certification verification and Product moderation use
conditional one-winner updates. Migration decision: `NONE`.

## Phase 4 Ownership Decisions

The four role profile tables now have one writable mapping each under Profiles
infrastructure. Both old central paths and the incompatible Profiles-local
paths are decorator-free re-exports. The canonical classes represent all 22
profile objects previously deferred in the TypeORM compatibility manifest:
three baseline columns, ten foreign keys, and nine indexes.

Admin registers no profile entity and injects no profile repository. Pending
queues, organization reads, statistics, and verification transitions use typed
Profiles ports. All role profiles expose scalar `userId` to the internal read
model, and Admin resolves user summaries with one batched Users query.

Verification uses the existing boolean and rejection-reason fields. Only
pending rows can transition, and a conditional update gives concurrent
reviewers one winner. Public farm output excludes KYC numbers, file IDs,
reviewer metadata, and rejection evidence. Migration decision: `NONE`.

## Phase 3 Ownership Decisions

`public.users`, `public.refresh_tokens`, and `public.otp_verifications` now
have one capability-owned writable mapping each. Their central files are
decorator-free compatibility re-exports. Auth persistence uses scalar user IDs
and private string-target metadata only to retain the reviewed PostgreSQL
foreign keys without importing Users infrastructure.

`public.user_addresses` is `USER_ADDRESSES_DEFERRED`: it is absent from the
26-table baseline and local 33-table snapshot, and has no mounted API, runtime
registration, repository consumer, or active business flow. No table or
migration was added.

New registration still requires email. Read-only local evidence classifies the
two email-null rows as legacy canonical-phone identities, one Firebase-linked
and one phone/password. They remain an existing-environment reconciliation
blocker and were not modified. Phone-first registration and anonymization are
not claimed.

## TypeORM Composition Report

| Concern               | Observed state                                                        |
| --------------------- | --------------------------------------------------------------------- |
| Runtime source        | explicit runtime entity registry                                      |
| CLI source            | same explicit entity registry and v2 migration registry               |
| Seed source           | legacy partial list, tracked for Phase 8                              |
| Integration source    | shared test entity registry plus focused fixtures                     |
| Schema parity source  | canonical v2 catalog and clean-v2 verifier                            |
| Migration scripts     | guarded TypeORM DataSource using v2 lineage                           |
| `DB_SYNCHRONIZE`      | parsed explicitly and forced off for migration CLI                    |
| Production sync guard | enforced by shared DataSource options                                 |
| Migration bootstrap   | canonical baseline v2, 26 tables                                      |

Historical migrations remain legacy evidence. New schema work uses the
guarded v2 lineage and does not rewrite the merged baseline migration.

## Open Questions

These require deployed database or release-platform evidence:

1. Which mapping each duplicate table currently matches in deployed
   PostgreSQL, including constraints, indexes, enums, triggers, and nullability.
2. Whether `product_wishlist`, local-live `product_wishlists`, and `wishlists`
   exist or contain data in deployed environments.
3. Which migrations are recorded in each deployed environment's migration
   ledger.
4. Whether `DB_SYNCHRONIZE` has ever been enabled outside disposable
   development environments.
5. Required legal retention periods for audit, KYC, payments, disputes,
   messages, and traceability evidence.
6. Whether Category and Wishlist will remain product-only capabilities.
