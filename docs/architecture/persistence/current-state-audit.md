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

1. The old `68 / 40 / 21` baseline is stale. After Phase 4 consolidation,
   current source has 54 writable mappings, 21 central mappings, and 6
   duplicate physical tables.
2. Phase 1 cannot merely unify DataSources. The repository has no bootstrap
   migration for most tables, so a clean migration chain cannot create the
   current schema.
3. Profiles should not adopt the existing module-local classes as canonical.
   Runtime uses the central classes, and those contain the KYC, verification,
   and Storage Phase 9 file-ID fields missing from module-local mappings.

Phase 0 is merged and contains documentation/test artifacts only. Local schema
evidence now supports a hybrid baseline/onboarding strategy. Entity movement
remains blocked until Phase 1 implements that strategy and establishes
runtime/CLI/test schema parity.

## Inventory

| Metric                                            | Observed |
| ------------------------------------------------- | -------: |
| TypeScript files containing writable `@Entity`    |       54 |
| Writable `@Entity` mappings                       |       54 |
| `@ViewEntity` mappings                            |        0 |
| Physical `(schema, table)` keys                   |       48 |
| Duplicate writable physical tables                |        6 |
| Central mappings under `src/database/entities`    |       21 |
| Module-local mappings                             |       33 |
| Runtime-only mappings versus CLI central glob     |       25 |
| CLI-only mappings versus runtime `forFeature` set |       29 |
| TypeORM relations                                 |       34 |
| Eager relations                                   |        0 |
| ORM cascade options                               |        2 |
| `ON DELETE CASCADE` relation options              |       11 |
| Imports from central entity folder inside modules |        3 |
| Reviews imports of Products infrastructure        |        3 |
| Foreign `forFeature` registrations                |        3 |
| Writable repository infrastructure exports        |        0 |

Runtime uses `autoLoadEntities: true` and feature `forFeature` registrations.
CLI uses only `src/database/entities/**/*.entity.ts`. The standalone seed uses
seven explicitly listed entities and `synchronize: true`. These are three
different metadata sets.

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
| product/category/image/certification       | products              | duplicate                            | 5        | high-critical |
| `wishlists`, legacy `product_wishlist`     | products, provisional | split tables                         | 5        | high          |
| `reviews`                                  | reviews               | canonical with foreign ORM relations | 5        | high          |
| order tables                               | orders                | central legacy                       | 6        | critical      |
| `payments`                                 | payments              | central legacy                       | 6        | critical      |
| `contracts`, `purchase_requests`           | contracts             | central legacy                       | 6        | high          |
| logistics tables/profile                   | logistics             | central legacy                       | 7A       | high          |
| conversations/messages                     | messaging             | central legacy                       | 7A       | medium        |
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
| `product_categories`     | module adds description/timestamps/children                                            | no bootstrap                                                           | module candidate; verify live columns                              |
| `product_certifications` | `expires_date` vs `expiry_date`; module relation; file IDs                             | Phase 9 and verification migrations target table                       | module candidate but rename/date semantics require live inspection |
| `product_images`         | central `url`; module `image_url` plus scalar `product_id`                             | no bootstrap                                                           | runtime module mapping candidate; migration may be needed          |
| `products`               | `price/stock_quantity` vs `price_per_unit/available_quantity`; seller relation differs | review migration assumes `seller_id`                                   | module runtime candidate; critical live-schema diff required       |
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

- Admin uses typed Profiles and Users ports for profile queues and
  verification. Its remaining foreign registrations are Product and
  IncidentReport.
- Reviews registers Product and injects Product's writable repository.
- Review persistence has `ManyToOne` relations to User and Product.
- Users exports typed identity, account, admin-query, and status ports only.
- Product runtime mappings use cascade persistence for images and
  certifications. These are intra-module but require explicit retention tests.
- No production domain/application file imports TypeORM. One Storage migration
  spec under `application` imports `QueryRunner`; test placement should be
  corrected later.
- No eager ORM relation was found.

Potential N+1 cannot be proven statically. Admin's aggregate repository access
and Products repository raw cross-table queries are priority baselines in
Phase 1.

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
| Runtime source        | `autoLoadEntities` plus feature `forFeature`                          |
| CLI source            | central entity glob only                                              |
| Seed source           | partial explicit list, `synchronize: true`                            |
| Integration source    | per-test ad hoc DataSources                                           |
| Schema parity source  | absent                                                                |
| Migration scripts     | point at config factory and do not forward DataSource flags correctly |
| Migration glob        | loads a `*.spec.ts` file and fails with `describe is not defined`     |
| `DB_SYNCHRONIZE`      | CLI parses string safely; Nest config generic does not coerce         |
| `DB_LOGGING`          | same Nest string-coercion risk                                        |
| Production sync guard | absent                                                                |
| Migration bootstrap   | absent for most of 48 tables                                          |

The current migration chain cannot be treated as the source of truth for a
fresh database. On `agrilink_migration_test`, all 11 migrations loaded but the
first failed because `public.provinces` did not exist. The transaction rolled
back with zero ledger rows and zero business tables. Phase 1 must establish a
new reviewed baseline lineage plus controlled existing-environment onboarding,
without rewriting historical migrations.

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
