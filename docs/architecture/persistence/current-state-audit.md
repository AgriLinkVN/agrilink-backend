# Persistence Current-State Audit

## Evidence Boundary

Source commit: `f66be061f1087b6d8436137d6778cbab1727f834`.

PostgreSQL was not reachable on `localhost:5432` during this audit. Counts,
registration, and mapping differences are observed from TypeScript source.
Migration conclusions are observed from repository history. Statements about
the live schema are explicitly marked unverified.

## Executive Assessment

The ownership roadmap is directionally correct: module-owned persistence,
scalar cross-module IDs, ports/read models, one composition registry, schema
parity, and phased retirement all address observed code.

Three assumptions needed correction:

1. The old `68 / 40 / 21` baseline is stale. Current source has 66 writable
   mappings, 37 central mappings, and 18 duplicate physical tables.
2. Phase 1 cannot merely unify DataSources. The repository has no bootstrap
   migration for most tables, so a clean migration chain cannot create the
   current schema.
3. Profiles should not adopt the existing module-local classes as canonical.
   Runtime uses the central classes, and those contain the KYC, verification,
   and Storage Phase 9 file-ID fields missing from module-local mappings.

Phase 0 is ready and contains documentation/test artifacts only. Entity
movement remains blocked until Phase 1 establishes schema evidence and a
baseline migration strategy.

## Inventory

| Metric | Observed |
| --- | ---: |
| TypeScript files containing writable `@Entity` | 66 |
| Writable `@Entity` mappings | 66 |
| `@ViewEntity` mappings | 0 |
| Physical `(schema, table)` keys | 48 |
| Duplicate writable physical tables | 18 |
| Central mappings under `src/database/entities` | 37 |
| Module-local mappings | 29 |
| Runtime-only mappings versus CLI central glob | 25 |
| CLI-only mappings versus runtime `forFeature` set | 29 |
| TypeORM relations | 26 |
| Eager relations | 0 |
| ORM cascade options | 2 |
| `ON DELETE CASCADE` relation options | 12 |
| Imports from central entity folder inside modules | 30 |
| Reviews imports of Products infrastructure | 3 |
| Foreign `forFeature` registrations | 10 |
| Writable repository infrastructure exports | 1 (`UsersModule`) |

Runtime uses `autoLoadEntities: true` and feature `forFeature` registrations.
CLI uses only `src/database/entities/**/*.entity.ts`. The standalone seed uses
seven explicitly listed entities and `synchronize: true`. These are three
different metadata sets.

## Ownership Matrix

The complete machine-readable matrix is `entity-ownership.json`. Compact view:

| Tables | Canonical owner | Status | Phase | Risk |
| --- | --- | --- | --- | --- |
| `ad_campaigns`, `ad_events`, `ad_packages` | ads | duplicate | 2 | medium-high |
| `audit_logs` | audit | duplicate | 2 | high |
| `system_configs` | admin | duplicate | 2 | medium |
| `districts`, `provinces` | geography | duplicate | 2 | medium |
| `market_prices` | market-prices | duplicate | 2 | high |
| `notifications` | notifications | duplicate | 2 | medium |
| `users`, `user_addresses` | users | central legacy | 3 | critical |
| `refresh_tokens`, `otp_verifications` | auth | central legacy | 3 | high |
| four role profile tables | profiles | duplicate | 4 | critical |
| product/category/image/certification | products | duplicate | 5 | high-critical |
| `wishlists`, legacy `product_wishlist` | products, provisional | split tables | 5 | high |
| `reviews` | reviews | canonical with foreign ORM relations | 5 | high |
| order tables | orders | central legacy | 6 | critical |
| `payments` | payments | central legacy | 6 | critical |
| `contracts`, `purchase_requests` | contracts | central legacy | 6 | high |
| logistics tables/profile | logistics | central legacy | 7A | high |
| conversations/messages | messaging | central legacy | 7A | medium |
| disputes/incidents/certificates | compliance | central legacy | 7B | high |
| `traceability_records` | traceability | duplicate | 7B | critical |
| cooperative persistence tables | cooperatives | canonical | complete | low |
| forum tables | forum | canonical | complete | low |
| `stored_files` | storage | canonical | complete | low |

## Duplicate Conflict Report

Live-schema match is **unverified** for every row below.

| Physical table | Material differences | Migration evidence | Recommendation |
| --- | --- | --- | --- |
| `ad_campaigns` | module adds relations and `updated_at` | no table bootstrap | module mapping candidate; inspect price/timestamps |
| `ad_events` | varchar vs enum event type; module campaign relation | no bootstrap | module candidate; migration likely required if DB is varchar |
| `ad_packages` | decimal `(15,2)` vs numeric `(12,2)`; `type` property differs; timestamps | no bootstrap | DB inspection mandatory; high-risk precision decision |
| `audit_logs` | central `old_data/new_data`; admin `method/path/changes` | no bootstrap | define canonical audit contract before consolidation |
| `cooperative_profiles` | central KYC/verification/file IDs; local public-profile fields | Phase 9 targets central columns | preserve central schema, move it into Profiles; retire local mapping |
| `districts` | module adds `name_en`; delete behavior differs | no bootstrap | module candidate; verify FK before choosing delete behavior |
| `enterprise_profiles` | central verification/license fields; local website/geography fields | Phase 9 targets central file ID | merge schema only after live diff; central is current runtime contract |
| `farmer_profiles` | central KYC/trust/sales; local farm/public fields | Phase 9 targets central KYC file IDs | central runtime schema is base; decide whether local fields are real |
| `market_prices` | central min/max/avg; local one price/product/reporting model | no bootstrap | likely two concepts sharing one table; redesign/migration required |
| `notifications` | body nullable only centrally; user UUID explicit centrally | enum migrations target same table | module repository is runtime owner; reconcile nullability |
| `product_categories` | module adds description/timestamps/children | no bootstrap | module candidate; verify live columns |
| `product_certifications` | `expires_date` vs `expiry_date`; module relation; file IDs | Phase 9 and verification migrations target table | module candidate but rename/date semantics require live inspection |
| `product_images` | central `url`; module `image_url` plus scalar `product_id` | no bootstrap | runtime module mapping candidate; migration may be needed |
| `products` | `price/stock_quantity` vs `price_per_unit/available_quantity`; seller relation differs | review migration assumes `seller_id` | module runtime candidate; critical live-schema diff required |
| `provinces` | central `is_key_agri`; module name/lat/lng/slug | map migration adds lat/lng/slug | module mapping better matches migration history |
| `supplier_profiles` | central verification/license; local public fields | Phase 9 targets central file ID | preserve central runtime schema and merge only proven live fields |
| `system_configs` | central key-based shape; admin adds generated ID/timestamps | no bootstrap | inspect primary key and actual consumers before choosing |
| `traceability_records` | two incompatible trace models and date names | no bootstrap | treat as schema redesign, not a class move |

`product_wishlist` and `wishlists` are not decorator duplicates because they are
different physical tables. They are a semantic conflict requiring data/consumer
inventory before retirement or merge.

## Dependency Boundary Report

Observed forbidden edges:

- Admin directly registers and injects four Profiles mappings, User, Product,
  IncidentReport, and AuditLog.
- Reviews registers User and Product and injects Product's writable repository.
- Review persistence has `ManyToOne` relations to User and Product.
- Users exports `TypeOrmModule`, allowing consumers to inject the User
  repository without a capability contract.
- Product runtime mappings use cascade persistence for images and
  certifications. These are intra-module but require explicit retention tests.
- No production domain/application file imports TypeORM. One Storage migration
  spec under `application` imports `QueryRunner`; test placement should be
  corrected later.
- No eager ORM relation was found.

Potential N+1 cannot be proven statically. Admin's aggregate repository access
and Products repository raw cross-table queries are priority baselines in
Phase 1.

## TypeORM Composition Report

| Concern | Observed state |
| --- | --- |
| Runtime source | `autoLoadEntities` plus feature `forFeature` |
| CLI source | central entity glob only |
| Seed source | partial explicit list, `synchronize: true` |
| Integration source | per-test ad hoc DataSources |
| Schema parity source | absent |
| Migration scripts | incorrectly point at config factory, not DataSource |
| `DB_SYNCHRONIZE` | CLI parses string safely; Nest config generic does not coerce |
| `DB_LOGGING` | same Nest string-coercion risk |
| Production sync guard | absent |
| Migration bootstrap | absent for most of 48 tables |

The current migration chain cannot be treated as the source of truth for a
fresh database. Only provinces map fields, Firebase UID, notification enums,
product certification flow, review moderation, Storage, and P3 cooperative
tables are represented. Phase 1 must first capture a reviewed baseline schema
without rewriting executed migration history.

## Open Questions

These require live database or release-platform evidence:

1. Which mapping each duplicate table currently matches in deployed
   PostgreSQL, including constraints, indexes, enums, triggers, and nullability.
2. Whether both `product_wishlist` and `wishlists` contain production data.
3. Which migrations are recorded in each deployed environment's migration
   ledger.
4. Whether `DB_SYNCHRONIZE` has ever been enabled outside disposable
   development environments.
5. Required legal retention periods for audit, KYC, payments, disputes,
   messages, and traceability evidence.
6. Whether Category and Wishlist will remain product-only capabilities.
