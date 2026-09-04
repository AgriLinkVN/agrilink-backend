# P9-00 Phase 9 Retirement and Parity Inventory

## Scope and authority

This database-free audit was derived from current source at
`bd4eab9e2948310301829bfb12f5e97551e62620`. PR #155 was human-reviewed,
passed the Backend Quality Gate, and merged into `develop`. P9-00 inventories
and orders the work; it does not retire an entity, change a mapping, modify a
schema, create a migration, or authorize database access.

```text
PR_155_HEAD_COMMIT=d231341bbf69729f2aa3d2248fe24ed76e88af47
PR_155_MERGE_COMMIT=bd4eab9e2948310301829bfb12f5e97551e62620
P8_10_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_155
PHASE_08_EXIT_CRITERIA_STATUS=ALL_SATISFIED_BY_MERGED_PR_155
PHASE_08_COMPLETE=YES_BY_MERGED_PR_155
IDEMPOTENCY_VERIFIED=YES
SECOND_SEED_RUN_NO_DUPLICATES=YES
DISPOSABLE_DB_SEED_RUN_PASS=YES
```

## Deferred-item inventory

All six P8-10 deferred items remain evidenced by current source. A required
human decision or authorization blocks its mutation slice, not completion of
this inventory.

| Item | Currently exists | Source paths | Owner | Risk | Human decision | Database evidence | Production authorization | Dependencies | Recommended slice |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `CENTRAL_ENTITY_COMPATIBILITY_RETIREMENT` | YES | `src/database/entities`; central import consumers; `entity-registry.ts` | persistence plus named module owners | HIGH | YES for seven ownerless/dormant declarations | NO for re-exports; later parity for mappings | NO | P9-00 | P9-01 then P9-03 |
| `MARKET_PRICES_DUPLICATE_MAPPING_DECISION` | YES | both `market-price.entity.ts` declarations; Market Prices module/service; ownership registry | market-prices | HIGH | YES | YES after a decision | NO for the decision | P9-00 | P9-02 |
| `TYPEORM_COMPATIBILITY_MANIFEST_RESOLUTION` | YES | `typeorm-compatibility-manifest.json`; cooperative/storage entities; V2 migrations | cooperatives and storage | HIGH | YES for cross-owner FK representation | YES | NO | P9-03 | P9-04 |
| `REMAINING_ARCHITECTURE_EXCEPTION_CLOSURE` | YES | `exceptions.json`; Admin IncidentReport consumers; database configuration | persistence roadmap, admin/compliance, database composition | MEDIUM | NO new business decision | NO for the ready item | NO | P9-01 and P9-03 | P9-05 |
| `WISHLIST_AND_MIGRATION_CHAIN_RECONCILIATION` | YES | Wishlist entity/repository; V2 baseline; ownership and discovery artifacts; both migration registries | products and persistence migrations | HIGH | YES | YES | YES for deployed identity and ledger | P9-03 and P9-04 | P9-06 |
| `AUTHORIZED_DEPLOYED_PRODUCTION_PARITY` | YES | production facts absent from repository evidence | release/database operations | CRITICAL | YES, explicit access authorization | YES | YES | P9-07 | P9-08 |

```text
PHASE_9_DEFERRED_ITEM_COUNT=6
PHASE_9_DEFERRED_ITEMS=CENTRAL_ENTITY_COMPATIBILITY_RETIREMENT;MARKET_PRICES_DUPLICATE_MAPPING_DECISION;TYPEORM_COMPATIBILITY_MANIFEST_RESOLUTION;REMAINING_ARCHITECTURE_EXCEPTION_CLOSURE;WISHLIST_AND_MIGRATION_CHAIN_RECONCILIATION;AUTHORIZED_DEPLOYED_PRODUCTION_PARITY
```

## Central entity compatibility inventory

`src/database/entities` contains 35 TypeScript files: 27 decorator-free
compatibility re-exports and eight decorated declarations. Production imports
into this directory are limited to two Admin consumers of the central
`IncidentReport`: the runtime entity registry plus two Admin consumers.
Re-export rows have owner-local declarations and no current
repository consumer, so their eventual deletion is a database-free P9-01
candidate. It is not performed here.

| Table | Owner | Central path | Owner declaration | Decorated mappings | Import consumers | Compatibility only | Safe to retire now | Blocker |
| --- | --- | --- | --- | ---: | ---: | --- | --- | --- |
| `public.ad_campaigns` | ads | `src/database/entities/ad-campaign.entity.ts` | `src/modules/ads/infrastructure/persistence/entities/ad-campaign.entity.ts` | 1 | 0 | YES | YES | none after P9-00 review |
| `public.ad_events` | ads | `src/database/entities/ad-event.entity.ts` | `src/modules/ads/infrastructure/persistence/entities/ad-event.entity.ts` | 1 | 0 | YES | YES | none after P9-00 review |
| `public.ad_packages` | ads | `src/database/entities/ad-package.entity.ts` | `src/modules/ads/infrastructure/persistence/entities/ad-package.entity.ts` | 1 | 0 | YES | YES | none after P9-00 review |
| `public.audit_logs` | admin | `src/database/entities/audit-log.entity.ts` | `src/modules/admin/entities/audit-log.entity.ts` | 1 | 0 | YES | YES | none after P9-00 review |
| `public.contracts` | contracts | `src/database/entities/contract.entity.ts` | `src/modules/contracts/infrastructure/persistence/entities/contract.orm-entity.ts` | 1 | 0 | YES | YES | none after P9-00 review |
| `public.conversations` | messaging | `src/database/entities/conversation.entity.ts` | none | 1 | 0 | NO | NO | owner module and approved runtime/schema contract |
| `public.cooperative_profiles` | profiles | `src/database/entities/cooperative-profile.entity.ts` | `src/modules/profiles/infrastructure/persistence/entities/cooperative-profile.entity.ts` | 1 | 0 | YES | YES | none after P9-00 review |
| `public.disputes` | compliance | `src/database/entities/dispute.entity.ts` | none | 1 | 0 | NO | NO | compliance owner mapping required |
| `public.districts` | geography | `src/database/entities/district.entity.ts` | `src/modules/geography/entities/district.entity.ts` | 1 | 0 | YES | YES | none after P9-00 review |
| `public.enterprise_profiles` | profiles | `src/database/entities/enterprise-profile.entity.ts` | `src/modules/profiles/infrastructure/persistence/entities/enterprise-profile.entity.ts` | 1 | 0 | YES | YES | none after P9-00 review |
| `public.farmer_profiles` | profiles | `src/database/entities/farmer-profile.entity.ts` | `src/modules/profiles/infrastructure/persistence/entities/farmer-profile.entity.ts` | 1 | 0 | YES | YES | none after P9-00 review |
| `public.incident_reports` | compliance | `src/database/entities/incident-report.entity.ts` | none | 1 | 3 | NO | NO | compliance mapping plus Admin port required |
| `public.logistics_profiles` | logistics | `src/database/entities/logistics-profile.entity.ts` | none | 1 | 0 | NO | NO | owner module and approved runtime/schema contract |
| `public.market_prices` | market-prices | `src/database/entities/market-price.entity.ts` | `src/modules/market-prices/entities/market-price.entity.ts` | 2 | 0 | NO | NO | human canonical-model decision |
| `public.messages` | messaging | `src/database/entities/message.entity.ts` | none | 1 | 0 | NO | NO | owner module and approved runtime/schema contract |
| `public.notifications` | notifications | `src/database/entities/notification.entity.ts` | `src/modules/notifications/infrastructure/persistence/notification.orm-entity.ts` | 1 | 0 | YES | YES | none after P9-00 review |
| `public.order_items` | orders | `src/database/entities/order-item.entity.ts` | `src/modules/orders/infrastructure/persistence/entities/order-item.orm-entity.ts` | 1 | 0 | YES | YES | none after P9-00 review |
| `public.order_status_history` | orders | `src/database/entities/order-status-history.entity.ts` | `src/modules/orders/infrastructure/persistence/entities/order-status-history.orm-entity.ts` | 1 | 0 | YES | YES | none after P9-00 review |
| `public.orders` | orders | `src/database/entities/order.entity.ts` | `src/modules/orders/infrastructure/persistence/entities/order.orm-entity.ts` | 1 | 0 | YES | YES | none after P9-00 review |
| `public.otp_verifications` | auth | `src/database/entities/otp-verification.entity.ts` | `src/modules/auth/infrastructure/persistence/entities/otp-verification.entity.ts` | 1 | 0 | YES | YES | none after P9-00 review |
| `public.payments` | payments | `src/database/entities/payment.entity.ts` | `src/modules/payments/infrastructure/persistence/entities/payment.orm-entity.ts` | 1 | 0 | YES | YES | none after P9-00 review |
| `public.product_categories` | products | `src/database/entities/product-category.entity.ts` | `src/modules/products/infrastructure/persistence/entities/product-category.entity.ts` | 1 | 0 | YES | YES | none after P9-00 review |
| `public.product_certifications` | products | `src/database/entities/product-certification.entity.ts` | `src/modules/products/infrastructure/persistence/entities/product-certification.entity.ts` | 1 | 0 | YES | YES | none after P9-00 review |
| `public.product_images` | products | `src/database/entities/product-image.entity.ts` | `src/modules/products/infrastructure/persistence/entities/product-image.entity.ts` | 1 | 0 | YES | YES | none after P9-00 review |
| `public.wishlists` | products | `src/database/entities/product-wishlist.entity.ts` | `src/modules/products/infrastructure/persistence/entities/wishlist.entity.ts` | 1 | 0 | YES | YES | preserve historical `product_wishlist` evidence |
| `public.products` | products | `src/database/entities/product.entity.ts` | `src/modules/products/infrastructure/persistence/entities/product.entity.ts` | 1 | 0 | YES | YES | none after P9-00 review |
| `public.provinces` | geography | `src/database/entities/province.entity.ts` | `src/modules/geography/entities/province.entity.ts` | 1 | 0 | YES | YES | none after P9-00 review |
| `public.purchase_requests` | contracts | `src/database/entities/purchase-request.entity.ts` | `src/modules/contracts/infrastructure/persistence/entities/purchase-request.orm-entity.ts` | 1 | 0 | YES | YES | none after P9-00 review |
| `public.refresh_tokens` | auth | `src/database/entities/refresh-token.entity.ts` | `src/modules/auth/infrastructure/persistence/entities/refresh-token.entity.ts` | 1 | 0 | YES | YES | none after P9-00 review |
| `public.shipment_tracking_events` | logistics | `src/database/entities/shipment-tracking-event.entity.ts` | none | 1 | 0 | NO | NO | owner module and approved runtime/schema contract |
| `public.shipments` | logistics | `src/database/entities/shipment.entity.ts` | none | 1 | 0 | NO | NO | owner module and approved runtime/schema contract |
| `public.supplier_profiles` | profiles | `src/database/entities/supplier-profile.entity.ts` | `src/modules/profiles/infrastructure/persistence/entities/supplier-profile.entity.ts` | 1 | 0 | YES | YES | none after P9-00 review |
| `public.system_configs` | admin | `src/database/entities/system-config.entity.ts` | `src/modules/admin/entities/system-config.entity.ts` | 1 | 0 | YES | YES | none after P9-00 review |
| `public.user_addresses` | users | `src/database/entities/user-address.entity.ts` | `src/modules/users/infrastructure/persistence/entities/user-address.entity.ts` | 1 | 0 | YES | YES | none after P9-00 review |
| `public.users` | users | `src/database/entities/user.entity.ts` | `src/modules/users/infrastructure/persistence/entities/user.entity.ts` | 1 | 0 | YES | YES | none after P9-00 review |

```text
CENTRAL_ENTITY_FILE_COUNT=35
CENTRAL_DECORATED_ENTITY_COUNT=8
CENTRAL_REEXPORT_COUNT=27
CENTRAL_ENTITY_IMPORT_CONSUMER_COUNT=3
```

## Repository-wide writable mapping inventory

The production TypeScript AST contains 49 `@Entity` declarations for 48
physical `schema.table` keys. There are no `@ViewEntity` mappings. The table
below is deterministic and source-derived; central singleton declarations are
classified as deferred runtime extras even though their table count is one.

| Table | Count | Mapping paths | Owner | Classification |
| --- | ---: | --- | --- | --- |
| `public.ad_campaigns` | 1 | `src/modules/ads/infrastructure/persistence/entities/ad-campaign.entity.ts` | ads | ONE_CANONICAL_MAPPING |
| `public.ad_events` | 1 | `src/modules/ads/infrastructure/persistence/entities/ad-event.entity.ts` | ads | ONE_CANONICAL_MAPPING |
| `public.ad_packages` | 1 | `src/modules/ads/infrastructure/persistence/entities/ad-package.entity.ts` | ads | ONE_CANONICAL_MAPPING |
| `public.audit_logs` | 1 | `src/modules/admin/entities/audit-log.entity.ts` | admin | ONE_CANONICAL_MAPPING |
| `public.bulk_listing_contributions` | 1 | `src/modules/cooperatives/infrastructure/persistence/entities/bulk-listing-contribution.entity.ts` | cooperatives | ONE_CANONICAL_MAPPING |
| `public.bulk_listings` | 1 | `src/modules/cooperatives/infrastructure/persistence/entities/bulk-listing.entity.ts` | cooperatives | ONE_CANONICAL_MAPPING |
| `public.commerce_operations` | 1 | `src/modules/commerce/infrastructure/persistence/entities/commerce-operation.orm-entity.ts` | commerce | ONE_CANONICAL_MAPPING |
| `public.contracts` | 1 | `src/modules/contracts/infrastructure/persistence/entities/contract.orm-entity.ts` | contracts | ONE_CANONICAL_MAPPING |
| `public.conversations` | 1 | `src/database/entities/conversation.entity.ts` | messaging | DEFERRED_RUNTIME_EXTRA |
| `public.cooperative_members` | 1 | `src/modules/cooperatives/infrastructure/persistence/entities/cooperative-member.entity.ts` | cooperatives | ONE_CANONICAL_MAPPING |
| `public.cooperative_profiles` | 1 | `src/modules/profiles/infrastructure/persistence/entities/cooperative-profile.entity.ts` | profiles | ONE_CANONICAL_MAPPING |
| `public.cooperative_province_references` | 1 | `src/modules/cooperatives/infrastructure/persistence/entities/cooperative-province-reference.entity.ts` | cooperatives | ONE_CANONICAL_MAPPING |
| `public.disputes` | 1 | `src/database/entities/dispute.entity.ts` | compliance | DEFERRED_RUNTIME_EXTRA |
| `public.districts` | 1 | `src/modules/geography/entities/district.entity.ts` | geography | ONE_CANONICAL_MAPPING |
| `public.enterprise_profiles` | 1 | `src/modules/profiles/infrastructure/persistence/entities/enterprise-profile.entity.ts` | profiles | ONE_CANONICAL_MAPPING |
| `public.farmer_profiles` | 1 | `src/modules/profiles/infrastructure/persistence/entities/farmer-profile.entity.ts` | profiles | ONE_CANONICAL_MAPPING |
| `public.forum_comments` | 1 | `src/modules/forum/entities/forum-comment.entity.ts` | forum | ONE_CANONICAL_MAPPING |
| `public.forum_likes` | 1 | `src/modules/forum/entities/forum-like.entity.ts` | forum | ONE_CANONICAL_MAPPING |
| `public.forum_posts` | 1 | `src/modules/forum/entities/forum-post.entity.ts` | forum | ONE_CANONICAL_MAPPING |
| `public.harvest_schedules` | 1 | `src/modules/cooperatives/infrastructure/persistence/entities/harvest-schedule.entity.ts` | cooperatives | ONE_CANONICAL_MAPPING |
| `public.incident_reports` | 1 | `src/database/entities/incident-report.entity.ts` | compliance | DEFERRED_RUNTIME_EXTRA |
| `public.logistics_profiles` | 1 | `src/database/entities/logistics-profile.entity.ts` | logistics | DEFERRED_RUNTIME_EXTRA |
| `public.market_prices` | 2 | `src/database/entities/market-price.entity.ts`<br>`src/modules/market-prices/entities/market-price.entity.ts` | market-prices | SEMANTIC_DUPLICATE_REQUIRES_DECISION |
| `public.messages` | 1 | `src/database/entities/message.entity.ts` | messaging | DEFERRED_RUNTIME_EXTRA |
| `public.notifications` | 1 | `src/modules/notifications/infrastructure/persistence/notification.orm-entity.ts` | notifications | ONE_CANONICAL_MAPPING |
| `public.order_items` | 1 | `src/modules/orders/infrastructure/persistence/entities/order-item.orm-entity.ts` | orders | ONE_CANONICAL_MAPPING |
| `public.order_status_history` | 1 | `src/modules/orders/infrastructure/persistence/entities/order-status-history.orm-entity.ts` | orders | ONE_CANONICAL_MAPPING |
| `public.orders` | 1 | `src/modules/orders/infrastructure/persistence/entities/order.orm-entity.ts` | orders | ONE_CANONICAL_MAPPING |
| `public.otp_verifications` | 1 | `src/modules/auth/infrastructure/persistence/entities/otp-verification.entity.ts` | auth | ONE_CANONICAL_MAPPING |
| `public.payments` | 1 | `src/modules/payments/infrastructure/persistence/entities/payment.orm-entity.ts` | payments | ONE_CANONICAL_MAPPING |
| `public.product_categories` | 1 | `src/modules/products/infrastructure/persistence/entities/product-category.entity.ts` | products | ONE_CANONICAL_MAPPING |
| `public.product_certifications` | 1 | `src/modules/products/infrastructure/persistence/entities/product-certification.entity.ts` | products | ONE_CANONICAL_MAPPING |
| `public.product_images` | 1 | `src/modules/products/infrastructure/persistence/entities/product-image.entity.ts` | products | ONE_CANONICAL_MAPPING |
| `public.products` | 1 | `src/modules/products/infrastructure/persistence/entities/product.entity.ts` | products | ONE_CANONICAL_MAPPING |
| `public.provinces` | 1 | `src/modules/geography/entities/province.entity.ts` | geography | ONE_CANONICAL_MAPPING |
| `public.purchase_requests` | 1 | `src/modules/contracts/infrastructure/persistence/entities/purchase-request.orm-entity.ts` | contracts | ONE_CANONICAL_MAPPING |
| `public.refresh_tokens` | 1 | `src/modules/auth/infrastructure/persistence/entities/refresh-token.entity.ts` | auth | ONE_CANONICAL_MAPPING |
| `public.reviews` | 1 | `src/modules/reviews/infrastructure/persistence/entities/review.entity.ts` | reviews | ONE_CANONICAL_MAPPING |
| `public.shipment_tracking_events` | 1 | `src/database/entities/shipment-tracking-event.entity.ts` | logistics | DEFERRED_RUNTIME_EXTRA |
| `public.shipments` | 1 | `src/database/entities/shipment.entity.ts` | logistics | DEFERRED_RUNTIME_EXTRA |
| `public.stored_files` | 1 | `src/modules/storage/infrastructure/persistence/stored-file.entity.ts` | storage | ONE_CANONICAL_MAPPING |
| `public.supplier_profiles` | 1 | `src/modules/profiles/infrastructure/persistence/entities/supplier-profile.entity.ts` | profiles | ONE_CANONICAL_MAPPING |
| `public.system_configs` | 1 | `src/modules/admin/entities/system-config.entity.ts` | admin | ONE_CANONICAL_MAPPING |
| `public.traceability_batches` | 1 | `src/modules/traceability/entities/traceability-batch.entity.ts` | traceability | ONE_CANONICAL_MAPPING |
| `public.traceability_events` | 1 | `src/modules/traceability/entities/traceability-event.entity.ts` | traceability | ONE_CANONICAL_MAPPING |
| `public.user_addresses` | 1 | `src/modules/users/infrastructure/persistence/entities/user-address.entity.ts` | users | ONE_CANONICAL_MAPPING |
| `public.users` | 1 | `src/modules/users/infrastructure/persistence/entities/user.entity.ts` | users | ONE_CANONICAL_MAPPING |
| `public.wishlists` | 1 | `src/modules/products/infrastructure/persistence/entities/wishlist.entity.ts` | products | ONE_CANONICAL_MAPPING |

```text
TOTAL_DECORATED_TABLE_MAPPING_COUNT=49
TOTAL_DECORATED_PHYSICAL_TABLE_COUNT=48
MULTI_WRITABLE_MAPPING_TABLE_COUNT=1
MULTI_WRITABLE_MAPPING_TABLES=public.market_prices
```

## `public.market_prices` decision

The central declaration models category/province/date aggregate prices with
`min_price`, `max_price`, and `avg_price`. The owner-module declaration models
one reported product price with `product_name`, `price_per_unit`,
`reported_by`, and `updated_at`. They are different semantic models sharing a
physical name, not compatibility aliases.

The runtime registry, `MarketPricesModule`, and injected repository select the
owner-module declaration. Both service methods still throw TODO errors. V2
migrations deliberately exclude `market_prices`, so there is no current V2
creation or reconciliation authority for either shape.

Human review must choose exactly one of: retain the aggregate model; retain the
reported-product model; split them into separately named tables with an
approved migration; or continue deferring/retire the capability. P9-00 does
not select an answer.

```text
MARKET_PRICES_DUPLICATE_MAPPING_EXISTS=YES
MARKET_PRICES_HUMAN_DECISION_REQUIRED=YES
MARKET_PRICES_MAPPING_PATHS=src/database/entities/market-price.entity.ts;src/modules/market-prices/entities/market-price.entity.ts
MARKET_PRICES_OWNER_MODULES=market-prices;central-compatibility-unowned
MARKET_PRICES_CURRENT_RUNTIME_CONSUMERS=RUNTIME_ENTITY_REGISTRY;MarketPricesModule
MARKET_PRICES_CURRENT_REPOSITORY_CONSUMERS=MarketPricesService_TODO_ONLY
MARKET_PRICES_CURRENT_MIGRATION_AUTHORITY=NONE_IN_V2_EXCLUDED_RUNTIME_TABLE
```

## TypeORM compatibility manifest

All three entries are backed by V2 migrations but are not fully represented by
current entity metadata. None is ready to remove today.

| Table | Object type | Object name | Owner | Deferred phase | Expires | Source | Current entity support | Current migration support | Classification | Retirement possible | Blocker |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `public.cooperative_members` | foreign-key | `fk_p3_member_cooperative` | cooperatives | 8 | 2027-12-31 | `1800000005000-RestoreCanonicalCooperativeMemberSchema.ts` | scalar `cooperative_id`; no relation/FK metadata | exact FK to `users(id)`, CASCADE | REQUIRES_ENTITY_ALIGNMENT | NO | human choice: preserve scalar-only boundary with accepted manifest or approve metadata representation |
| `public.cooperative_members` | foreign-key | `fk_p3_member_farmer` | cooperatives | 8 | 2027-12-31 | `1800000005000-RestoreCanonicalCooperativeMemberSchema.ts` | scalar `farmer_id`; no relation/FK metadata | exact FK to `users(id)`, RESTRICT | REQUIRES_ENTITY_ALIGNMENT | NO | same cross-owner FK metadata decision |
| `public.stored_files` | check-constraint | `CHK_stored_files_status` | storage | 4 | 2027-12-31 | `1800000000000-CreateCanonicalBaselineV2.ts` | status column/default; no `@Check` | exact seven-value check | REQUIRES_ENTITY_ALIGNMENT | NO | align entity check and prove disposable parity |

```text
TYPEORM_COMPATIBILITY_MANIFEST_ENTRY_COUNT=3
READY_TO_RETIRE_COMPATIBILITY_COUNT=0
COMPATIBILITY_REQUIRES_ENTITY_ALIGNMENT_COUNT=3
COMPATIBILITY_REQUIRES_DECISION_COUNT=2
COMPATIBILITY_REQUIRES_MIGRATION_DECISION_COUNT=0
COMPATIBILITY_REQUIRES_PRODUCTION_EVIDENCE_COUNT=0
```

## Remaining architecture exceptions

The exception file contains three current entries. The database boolean entry
is stale: shared composition now parses booleans strictly, rejects requested
synchronization, rejects it specifically in production, and always emits
`synchronize: false`. It is the only exception ready for a database-free
retirement slice. The two IncidentReport exceptions remain necessary until a
compliance-owned mapping/port replaces Admin's central entity imports and
foreign registration.

| ID | Owner | Phase | Expires | Files/edges | Still required | Retirement blocker |
| --- | --- | --- | --- | --- | --- | --- |
| `legacy-central-entity-imports` | persistence-roadmap | 3-7B | 2027-12-31 | two Admin imports of central IncidentReport | YES | compliance-owned mapping and Admin port |
| `foreign-for-feature-registration` | admin | 7B | 2027-06-30 | `AdminRoute:IncidentReport` | YES | remove foreign registration after owner port exists |
| `unsafe-database-boolean-parsing` | database-composition | 1 | 2027-01-31 | `src/config/database.config.ts` | NO | stale metadata removal in P9-01 |

```text
ARCHITECTURE_EXCEPTION_COUNT=3
DATABASE_FREE_RETIRABLE_EXCEPTION_COUNT=1
BLOCKED_EXCEPTION_COUNT=2
```

## Wishlist physical name and migration-chain authority

Current decorated entity metadata, Products repository/module registration,
runtime registry, canonical V2 migration, and canonical catalog all use
`public.wishlists`. The central `product-wishlist.entity.ts` is only a
decorator-free re-export of that entity. Historical ownership/discovery
artifacts additionally preserve `public.product_wishlist` as a retired
compatibility identity whose deployed row state was never authorized for
inference. This creates an unresolved deployed-name question even though the
current runtime is internally consistent.

The migration registry contains 11 legacy migrations and six V2 migrations.
Normal application startup and the normal migration CLI use V2 only. Legacy is
not runtime-reachable but remains explicitly CLI-reachable through the
read-only `migration:legacy:show` command, so it is not test-only. Static
retirement can remove unused compatibility code only after ledger policy is
approved; disposable proof must then validate V2; deployed legacy/V2 ledger
facts require authorization.

```text
WISHLIST_ENTITY_TABLE_NAMES=public.wishlists
WISHLIST_COMPATIBILITY_TABLE_NAMES=public.product_wishlist
WISHLIST_MIGRATION_TABLE_NAMES=public.wishlists
WISHLIST_RUNTIME_TABLE_NAMES=public.wishlists
WISHLIST_NAME_MISMATCH_EXISTS=YES
WISHLIST_RECONCILIATION_REQUIRES_DEPLOYED_DATA_EVIDENCE=YES

LEGACY_MIGRATION_COUNT=11
V2_MIGRATION_COUNT=6
LEGACY_MIGRATION_RUNTIME_REACHABLE=NO
LEGACY_MIGRATION_CLI_REACHABLE=YES_READ_ONLY_SHOW
LEGACY_MIGRATION_TEST_ONLY=NO
MIGRATION_CHAIN_STATIC_ONLY_WORK=REGISTRY_AND_CLI_CONSUMER_RETIREMENT_AFTER_POLICY
MIGRATION_CHAIN_DISPOSABLE_DB_WORK=V2_CLEAN_HEAD_AND_ONBOARDING_PARITY
MIGRATION_CHAIN_DEPLOYED_LEDGER_WORK=LEGACY_AND_V2_LEDGER_IDENTITY_AND_HEAD
```

## Production parity unknowns

No production access is authorized or attempted. Seven distinct evidence
classes therefore remain unknown: deployed schema/object inventory; deployed
migration ledger lineage/head; deployed row counts/data distribution; actual
wishlist physical names and row ownership; compatibility object presence;
runtime API parity; and query-count/performance parity.

```text
PRODUCTION_ACCESS_ATTEMPTED=NO
PRODUCTION_PARITY_UNKNOWN_COUNT=7
PRODUCTION_PARITY_UNKNOWN_ITEMS=DEPLOYED_SCHEMA_OBJECT_INVENTORY;DEPLOYED_MIGRATION_LEDGER_LINEAGE_AND_HEAD;DEPLOYED_ROW_COUNTS_AND_DATA_DISTRIBUTION;WISHLIST_PHYSICAL_NAMES_AND_ROW_OWNERSHIP;COMPATIBILITY_OBJECT_PRESENCE;RUNTIME_API_PARITY;QUERY_COUNT_AND_PERFORMANCE_PARITY
```

## Phase 9 implementation DAG

| Slice | Title | Depends on | Database required | Production required | Human decision | Expected mutation scope | Exit criteria |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P9-01 | Safe compatibility and authority cleanup | P9-00 | NO | NO | NO | zero-consumer central re-exports, stale exception metadata, static tests/docs | reviewed re-exports removed; stale boolean exception closed |
| P9-02 | Decide `market_prices` canonical semantic model | P9-00 | NO for decision | NO | YES | decision documentation only | one approved model/disposition and migration requirement |
| P9-03 | Retire or relocate central decorated owner mappings | P9-01, P9-02 | NO unless P9-02 selects schema change | NO | YES for dormant contracts | owner entities/ports, registry, Admin boundary, central declarations | central compatibility retired; one mapping per approved table |
| P9-04 | Align TypeORM compatibility metadata | P9-03 | YES, disposable proof | NO | YES for cooperative FK strategy | cooperative/storage metadata, manifest, focused tests; migration only if separately approved | manifest zero or reviewed later debt; parity pass |
| P9-05 | Close architecture exceptions | P9-01, P9-03 | NO | NO | NO | Admin/compliance imports and registrations, exception manifest | exception count zero or approved later debt |
| P9-06 | Reconcile wishlist names and migration-chain authority | P9-03, P9-04 | YES | YES for deployed evidence | YES | products compatibility artifacts, migration registries/CLI/docs; schema only by later approval | physical identity and ledger policy approved and reconciled |
| P9-07 | Verify disposable Phase 9 parity | P9-03, P9-04, P9-05, P9-06 | YES | NO | NO | guarded proof tests and evidence | clean V2, idempotency, schema/API/query parity pass |
| P9-08 | Verify authorized deployed production parity | P9-07 | YES | YES | YES, access authorization | read-only operational evidence; corrections require separate scope | seven unknown evidence classes resolved |
| P9-09 | Final Phase 9 closure | P9-08 | NO, consumes evidence | NO | NO | closure docs and static checks | every approved Phase 9 target satisfied |

```text
PHASE_9_SLICE_COUNT=9
PHASE_9_IMPLEMENTATION_DAG=P9-00>P9-01;P9-00>P9-02;P9-01+P9-02>P9-03;P9-03>P9-04;P9-01+P9-03>P9-05;P9-03+P9-04>P9-06;P9-03+P9-04+P9-05+P9-06>P9-07;P9-07>P9-08;P9-08>P9-09
PHASE_9_DAG_CYCLE_COUNT=0
```

## Human decisions and hard blockers

```text
HUMAN_DECISION_REQUIRED_COUNT=5
HUMAN_DECISIONS_REQUIRED=MARKET_PRICES_CANONICAL_MODEL;COOPERATIVE_CROSS_OWNER_FK_METADATA_STRATEGY;WISHLIST_DEPLOYED_PHYSICAL_IDENTITY_DISPOSITION;LEGACY_MIGRATION_LEDGER_RETIREMENT_POLICY;PRODUCTION_PARITY_ACCESS_AUTHORIZATION
STOP_DECISION_MARKET_PRICES=SELECT_AGGREGATE_MODEL_OR_REPORTED_PRODUCT_MODEL_OR_SPLIT_TABLES_OR_DEFER_RETIRE
STOP_DECISION_COOPERATIVE_FKS=APPROVE_ENTITY_METADATA_REPRESENTATION_OR_ACCEPT_REVIEWED_MANIFEST_DEBT
STOP_DECISION_WISHLIST=AFTER_DEPLOYED_EVIDENCE_SELECT_KEEP_WISHLISTS_OR_RECONCILE_PRODUCT_WISHLIST
STOP_DECISION_MIGRATION_LEDGER=AFTER_DEPLOYED_EVIDENCE_APPROVE_LEGACY_LEDGER_RETIREMENT_OR_RETENTION
STOP_DECISION_PRODUCTION=EXPLICITLY_AUTHORIZE_READ_ONLY_PRODUCTION_PARITY_OR_KEEP_P9_08_BLOCKED
```

## Target state and current status

These are Phase 9 exit targets, not current accomplishments. Production parity
can become YES only after explicit authorization; otherwise it remains a hard
blocker rather than being silently relabeled as later debt.

```text
CENTRAL_ENTITY_COMPATIBILITY_RETIRED=NO
ONE_WRITABLE_MAPPING_PER_TABLE=NO
MULTI_WRITABLE_MAPPING_TABLE_COUNT=1
TYPEORM_COMPATIBILITY_MANIFEST_ENTRY_COUNT=3
ARCHITECTURE_EXCEPTION_COUNT=3
WISHLIST_PHYSICAL_NAME_RECONCILED=NO
MIGRATION_CHAIN_AUTHORITY_RECONCILED=NO
DISPOSABLE_SCHEMA_PARITY_PASS=NOT_RUN_FOR_PHASE_9
PRODUCTION_PARITY_VERIFIED=NO_NOT_AUTHORIZED

P9_00_IMPLEMENTATION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P9_00_BLOCKERS=NONE_FOR_INVENTORY
PHASE_09_IMPLEMENTATION_STATUS=IN_PROGRESS
PHASE_09_COMPLETE=NO
```

## Evidence

- [Phase 8 final closure](../phase-08/final-closure.md)
- [Entity ownership registry](../../entity-ownership.json)
- [TypeORM compatibility manifest](../../typeorm-compatibility-manifest.json)
- [Architecture exceptions](../../exceptions.json)
- [Canonical V2 catalog](../../baselines/canonical-baseline-v2-catalog.json)
- [Products/Wishlist ADR](../../../adr/0007-products-wishlist-certifications-and-reviews.md)
- [P9-00 static specification](../../../../../src/database/reconciliation/phase-9-kickoff-inventory.spec.ts)

P9-00 initialized no DataSource, opened no database connection, executed no
SQL, seed, TEST fixture, migration, or synchronization, and attempted no
protected-local or production access.

## P9-01 Implementation Overlay

### Merged authority

PR #156 was human-reviewed, passed the Backend Quality Gate, and merged as
`8cbde69ade0149f0297e79fbdaf88af3891b42a6`. The exact P9-01 row above is the
authority for this implementation.

```text
P9_00_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_156
P9_01_TITLE=Safe compatibility and authority cleanup
P9_01_DEPENDS_ON=P9-00
P9_01_DATABASE_REQUIRED=NO
P9_01_PRODUCTION_REQUIRED=NO
P9_01_HUMAN_DECISION_REQUIRED=NO
P9_01_EXPECTED_MUTATION_SCOPE=ZERO_CONSUMER_CENTRAL_REEXPORTS;STALE_EXCEPTION_METADATA;STATIC_TESTS_AND_DOCS
P9_01_EXIT_CRITERIA=REVIEWED_REEXPORTS_REMOVED;STALE_BOOLEAN_EXCEPTION_CLOSED
```

### Alias-aware central import audit

All production TypeScript import declarations were resolved through both
relative paths and the wildcard aliases in `tsconfig.json`, with transitive
barrel export resolution. Three relative imports resolve into
`src/database/entities`; all target the retained decorated
`incident-report.entity.ts`. No alias import resolves into the directory, and
no import resolves to any of the 27 reviewed re-exports.

The wider repository scan initially found one additional DEV-only tooling
consumer in `scripts/generate-test-token.ts`. P9-01 moves that import directly
to the Users-owned entity before deleting the central User re-export. The
post-change repository-wide count therefore equals the production count.

```text
CENTRAL_ENTITY_RELATIVE_IMPORT_CONSUMER_COUNT=3
CENTRAL_ENTITY_ALIAS_IMPORT_CONSUMER_COUNT=0
CENTRAL_ENTITY_TOTAL_IMPORT_CONSUMER_COUNT=3
CENTRAL_ENTITY_IMPORT_CONSUMERS=src/database/entity-registry.ts;src/modules/admin/admin.route.ts;src/modules/admin/admin.service.ts
CENTRAL_ENTITY_REPOSITORY_IMPORT_CONSUMER_COUNT_BEFORE=4
CENTRAL_ENTITY_REPOSITORY_IMPORT_CONSUMER_COUNT_AFTER=3
CENTRAL_ENTITY_FILE_COUNT_AFTER=8
CENTRAL_DECORATED_ENTITY_COUNT_AFTER=8
CENTRAL_REEXPORT_COUNT_AFTER=0
```

### Changed production files

Each deleted source file was a decorator-free, zero-consumer re-export with an
existing owner-local declaration. The generator change prevents those paths
from being recreated. No decorated entity is removed.

| File | Reason | P9-01 authority |
| --- | --- | --- |
| `generate-entities.js` | prevent recreation of retired central re-exports | static compatibility cleanup |
| `scripts/generate-test-token.ts` | replace its DEV-only central User import with the Users-owned declaration | reviewed re-export retirement |
| `src/database/entities/ad-campaign.entity.ts` | zero-consumer Ads re-export | reviewed re-exports removed |
| `src/database/entities/ad-event.entity.ts` | zero-consumer Ads re-export | reviewed re-exports removed |
| `src/database/entities/ad-package.entity.ts` | zero-consumer Ads re-export | reviewed re-exports removed |
| `src/database/entities/audit-log.entity.ts` | zero-consumer Admin re-export | reviewed re-exports removed |
| `src/database/entities/contract.entity.ts` | zero-consumer Contracts re-export | reviewed re-exports removed |
| `src/database/entities/cooperative-profile.entity.ts` | zero-consumer Profiles re-export | reviewed re-exports removed |
| `src/database/entities/district.entity.ts` | zero-consumer Geography re-export | reviewed re-exports removed |
| `src/database/entities/enterprise-profile.entity.ts` | zero-consumer Profiles re-export | reviewed re-exports removed |
| `src/database/entities/farmer-profile.entity.ts` | zero-consumer Profiles re-export | reviewed re-exports removed |
| `src/database/entities/notification.entity.ts` | zero-consumer Notifications re-export | reviewed re-exports removed |
| `src/database/entities/order-item.entity.ts` | zero-consumer Orders re-export | reviewed re-exports removed |
| `src/database/entities/order-status-history.entity.ts` | zero-consumer Orders re-export | reviewed re-exports removed |
| `src/database/entities/order.entity.ts` | zero-consumer Orders re-export | reviewed re-exports removed |
| `src/database/entities/otp-verification.entity.ts` | zero-consumer Auth re-export | reviewed re-exports removed |
| `src/database/entities/payment.entity.ts` | zero-consumer Payments re-export | reviewed re-exports removed |
| `src/database/entities/product-category.entity.ts` | zero-consumer Products re-export | reviewed re-exports removed |
| `src/database/entities/product-certification.entity.ts` | zero-consumer Products re-export | reviewed re-exports removed |
| `src/database/entities/product-image.entity.ts` | zero-consumer Products re-export | reviewed re-exports removed |
| `src/database/entities/product-wishlist.entity.ts` | zero-consumer alias to canonical Wishlist; historical name evidence retained | reviewed re-exports removed |
| `src/database/entities/product.entity.ts` | zero-consumer Products re-export | reviewed re-exports removed |
| `src/database/entities/province.entity.ts` | zero-consumer Geography re-export | reviewed re-exports removed |
| `src/database/entities/purchase-request.entity.ts` | zero-consumer Contracts re-export | reviewed re-exports removed |
| `src/database/entities/refresh-token.entity.ts` | zero-consumer Auth re-export | reviewed re-exports removed |
| `src/database/entities/supplier-profile.entity.ts` | zero-consumer Profiles re-export | reviewed re-exports removed |
| `src/database/entities/system-config.entity.ts` | zero-consumer Admin re-export | reviewed re-exports removed |
| `src/database/entities/user-address.entity.ts` | zero-consumer Users re-export | reviewed re-exports removed |
| `src/database/entities/user.entity.ts` | zero-consumer Users re-export | reviewed re-exports removed |

The ownership registry also clears the six Phase 6 compatibility-target and
expiry pointers whose files are now retired. The historical
`public.product_wishlist` record remains unchanged pending P9-06 deployed
evidence.

### Counts and preserved decisions

Decorator-free file retirement does not change mapping counts. Both
`market_prices` declarations remain. The TypeORM compatibility manifest is
unchanged. Only the source-proven obsolete `unsafe-database-boolean-parsing`
exception is removed; the two IncidentReport exceptions remain.

```text
TOTAL_DECORATED_TABLE_MAPPING_COUNT_BEFORE=49
TOTAL_DECORATED_PHYSICAL_TABLE_COUNT_BEFORE=48
MULTI_WRITABLE_MAPPING_TABLE_COUNT_BEFORE=1
TOTAL_DECORATED_TABLE_MAPPING_COUNT_AFTER=49
TOTAL_DECORATED_PHYSICAL_TABLE_COUNT_AFTER=48
MULTI_WRITABLE_MAPPING_TABLE_COUNT_AFTER=1
MULTI_WRITABLE_MAPPING_TABLES_AFTER=public.market_prices
ONE_WRITABLE_MAPPING_PER_TABLE=NO

TYPEORM_COMPATIBILITY_MANIFEST_ENTRY_COUNT_BEFORE=3
TYPEORM_COMPATIBILITY_MANIFEST_ENTRY_COUNT_AFTER=3
ARCHITECTURE_EXCEPTION_COUNT_BEFORE=3
ARCHITECTURE_EXCEPTION_COUNT_AFTER=2

MARKET_PRICES_AUTOMATIC_DECISION_MADE=NO
WISHLIST_DEPLOYED_DISPOSITION_INVENTED=NO
LEGACY_MIGRATION_RETIREMENT_INVENTED=NO
PRODUCTION_ACCESS_ATTEMPTED=NO
OUT_OF_SLICE_CHANGE_COUNT=0
```

### Status and successor authorization

P9-02 is the only immediate decision slice whose dependency is satisfied. It
still requires the documented human `MARKET_PRICES_CANONICAL_MODEL` decision.
P9-03 remains unauthorized until both P9-01 and P9-02 are merged.

```text
P9_01_IMPLEMENTATION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P9_01_BLOCKERS=NONE
P9_01_REVIEWED_REEXPORTS_REMOVED=YES
P9_01_STALE_BOOLEAN_EXCEPTION_CLOSED=YES
P9_01_GENERATOR_RECREATION_BLOCKED=YES
P9_02_IMPLEMENTATION_AUTHORIZED=YES_REQUIRES_HUMAN_DECISION
P9_03_IMPLEMENTATION_AUTHORIZED=NO_WAITING_FOR_P9_01_AND_P9_02_MERGE
PHASE_09_IMPLEMENTATION_STATUS=IN_PROGRESS
PHASE_09_COMPLETE=NO
```

P9-01 initialized no DataSource, opened no database connection, executed no
SQL, seed, TEST fixture, migration, or synchronization, and attempted no
protected-local or production access.

## P9-02 Decision and Contract Overlay

PR #157 was human-reviewed, passed the Backend Quality Gate, and merged as
`2909d5687b9627f87ba5e9bc37d034f318111a0b`. The human owner then supplied the
exact decision `SPLIT_MODELS_INTO_SEPARATE_TABLES` for the P9-02
`MARKET_PRICES_CANONICAL_MODEL` gate.

The source audit confirms two distinct models. The central declaration is a
category/province/date aggregate with min/max/average values and no runtime
consumer. The owner-module declaration is a reported product-price model and
is selected by the runtime registry, module, repository injection, DTOs, and
the existing GET/POST controller paths. Those service paths remain TODO.

The complete [Market Prices split decision contract](market-prices-split-decision.md)
records field-level contracts, consumers, target ownership, candidate names,
API impact, row-evidence limits, and the required future migration sequence.

```text
P9_00_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_156
P9_01_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_157
P9_02_TITLE=Decide market_prices canonical semantic model
P9_02_DEPENDS_ON=P9-00
P9_02_DATABASE_REQUIRED=NO_FOR_DECISION
P9_02_PRODUCTION_REQUIRED=NO
P9_02_HUMAN_DECISION_REQUIRED=YES_SATISFIED
P9_02_EXPECTED_MUTATION_SCOPE=DECISION_DOCUMENTATION_ONLY
P9_02_EXIT_CRITERIA=ONE_APPROVED_MODEL_OR_DISPOSITION_AND_MIGRATION_REQUIREMENT

MARKET_PRICES_CANONICAL_MODEL=SPLIT_MODELS_INTO_SEPARATE_TABLES
HUMAN_DECISION_SOURCE=EXPLICIT_HUMAN_APPROVAL
HUMAN_DECISION_STATUS=APPROVED
MARKET_PRICES_HUMAN_DECISION_REQUIRED=NO
MARKET_PRICES_SPLIT_DECISION_APPROVED=YES

SEMANTIC_MODEL_COUNT=2
SEMANTIC_MODELS_ARE_DISTINCT=YES
MODEL_A_ID=AGGREGATED_CATEGORY_PROVINCE_PRICE
MODEL_B_ID=REPORTED_PRODUCT_PRICE
MODEL_A_OWNER=market-prices
MODEL_B_OWNER=market-prices
PREFERRED_MODEL_A_TABLE=public.market_price_aggregates
PREFERRED_MODEL_B_TABLE=public.market_prices
TABLE_NAME_HUMAN_DECISION_REQUIRED=YES

CURRENT_ROW_SEMANTIC_OWNERSHIP=UNKNOWN_REQUIRES_DEPLOYED_EVIDENCE
MARKET_PRICE_DATA_MIGRATION_REQUIRES_DEPLOYED_EVIDENCE=YES
MIGRATION_IMPLEMENTED=NO
SCHEMA_CHANGED=NO
API_BREAKING_CHANGE_COUNT=0
API_CONTRACT_DECISION_REQUIRED=NO_FOR_PRESERVING_CURRENT_ENDPOINTS

CURRENT_WRITABLE_MAPPING_COUNT=2
MULTI_WRITABLE_MAPPING_TABLE_COUNT=1
MULTI_WRITABLE_MAPPING_TABLES=public.market_prices
ONE_WRITABLE_MAPPING_PER_TABLE=NO

COOPERATIVE_FK_DECISION_INVENTED=NO
WISHLIST_DECISION_INVENTED=NO
LEGACY_MIGRATION_DECISION_INVENTED=NO
PRODUCTION_ACCESS_ATTEMPTED=NO

P9_02_IMPLEMENTATION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P9_02_HUMAN_DECISION=MARKET_PRICES_CANONICAL_MODEL=SPLIT_MODELS_INTO_SEPARATE_TABLES
P9_02_BLOCKERS=NONE
P9_03_IMPLEMENTATION_AUTHORIZED=NO_WAITING_FOR_P9_02_MERGE_AND_REVIEW
P9_03_MARKET_PRICE_IMPLEMENTATION_PREREQUISITES=FINAL_TABLE_NAME_HUMAN_APPROVAL;AUTHORIZED_DEPLOYED_ROW_EVIDENCE;SEPARATE_SCHEMA_MIGRATION_SCOPE
PHASE_09_IMPLEMENTATION_STATUS=IN_PROGRESS
PHASE_09_COMPLETE=NO
```

P9-02 creates no migration and changes no entity, registry, repository,
service, controller, DTO, schema, or runtime behavior. It initializes no
DataSource, opens no database connection, executes no SQL, and attempts no
protected-local, remote, or production access.
