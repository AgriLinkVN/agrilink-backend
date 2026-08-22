# P8-05C0 Central DevSeedService Decomposition Plan

## Decision Status

```text
PLAN_ID=P8_05C0_CENTRAL_DEVSEEDSERVICE_DECOMPOSITION_PLAN
PLAN_STATUS=IMPLEMENTED_BY_MERGED_PR_110
IMPLEMENTATION_STATUS=IN_PROGRESS
SOURCE=src/database/dev-seed.service.ts
CLASSIFICATION=DEV
ONE_TARGET_OWNER_PER_SEEDED_TABLE=YES
DEVSEEDSERVICE_TABLE_COUNT=23
DEVSEEDSERVICE_OWNER_COUNT=10
```

This document is a static, documentation-only decomposition plan for the
central `DevSeedService`. It assigns every business write to the canonical
bounded-context owner, records the dependency and identity decisions that are
proven by source, and turns unresolved identity or schema questions into
explicit blockers. It does not authorize payload changes, business-code
changes, seed execution, database access, or destructive reset execution.

The plan uses the ownership registry as the authority for write ownership and
the merged Phase 8 SeedGroup framework as the target orchestration contract.
PR #109 is the baseline: the canonical Products DEV group is already
owner-local when this plan is written.

## Scope And Evidence Boundary

The audit covers the complete `src/database/dev-seed.service.ts` source,
including its orchestration helper, normal seed methods, raw SQL, destructive
reset path, guards, cross-owner reads, positional dependencies, literals, and
explicit `any` debt. It also compares the central payload with the merged
Geography REFERENCE, Product Categories REFERENCE, Users DEV, and Products DEV
groups. `src/database/seeds/admin-dev.seed.ts` is inspected only to preserve the
P8-05D boundary; it is not decomposed or changed here.

No runtime inference is made from a database. Counts in this document are
source counts, not database-row counts.

## Complete Persistence-Capable Method Inventory

`seedAll()` is an orchestration method that invokes business-write methods but
contains no direct persistence call. It is therefore recorded separately and
is not included in `DEVSEEDSERVICE_WRITE_METHOD_COUNT`.

```text
NORMAL_BUSINESS_WRITE_METHODS=15
DESTRUCTIVE_WRITE_METHODS=1
DEVSEEDSERVICE_WRITE_METHOD_COUNT=16
ORCHESTRATION_METHODS_WITHOUT_DIRECT_WRITE=1
BUSINESS_METHOD_TABLE_ASSIGNMENTS=24
DISTINCT_BUSINESS_TABLES=23
```

| Method | Current writes | Current guard or reconciliation | Target owner |
| --- | --- | --- | --- |
| `seedAll` | causes all normal business writes below; no direct persistence call | fixed call order plus temporary `skipProducts` branch | central orchestration only after retirement |
| `seedUsers` | `users` | `findOne(phone)`; update password for a match, otherwise insert; returns only the first eight of eleven payload users | users |
| `seedAddress` | `user_addresses` | raw first-row lookup by `user_id`, then raw insert when absent | users |
| `seedProfile` | `farmer_profiles`, `cooperative_profiles`, `enterprise_profiles`, `supplier_profiles`, `logistics_profiles` | per-user lookup in the selected profile table, then insert when absent | profiles; logistics for `logistics_profiles` |
| `seedProducts` | `products`, `product_images`, `product_certifications`; invokes `seedCategories` | whole-Products-table count guard; invokes category guard; inserts records without central SKUs | products |
| `seedCategories` | `product_categories` | whole-table count guard | products |
| `seedForum` | `forum_posts`, `forum_comments`, `forum_likes` | whole-Posts-table count guard; likes are randomly selected | forum |
| `seedReviews` | `reviews` | whole-table count guard; products selected by unordered query plus array positions | reviews |
| `seedAdPackages` | `ad_packages` | whole-table count guard | ads |
| `seedAdCampaigns` | `ad_campaigns` | whole-table count guard; packages selected by array position; dates are relative to execution time | ads |
| `seedCoopMembers` | `cooperative_members` | whole-table count guard; first five farmers selected from an unordered query | cooperatives |
| `seedBulkListings` | `bulk_listings`, `bulk_listing_contributions` | whole-Listings-table count guard; child IDs taken from just-created rows | cooperatives |
| `seedHarvestSchedules` | `harvest_schedules` | whole-table count guard; all rows receive one position-selected Product ID | cooperatives |
| `seedViolations` | `products` | skips the entire section if any suspended Product exists; inserts two Products without SKUs | products |
| `seedAuditLogs` | `audit_logs` | whole-table count guard | admin |
| `seedNotifications` | `notifications` | whole-table count guard | notifications |
| `resetAll` | 24 attempted raw-delete targets | destructive best-effort loop plus separate Users delete | each table owner; operation must be retired from this service |

### Machine-Readable Business Write Inventory

`DEPENDENCY_OUTPUTS_REQUIRED` names only cross-group scalar bindings. IDs used
between tables inside one proposed group remain internal to that group.

| SOURCE_METHOD | ENTITY_OR_TABLE | OPERATION_TYPE | CURRENT_PERSISTENCE_ACCESS | CURRENT_OWNER | TARGET_OWNER | CLASSIFICATION | EXISTING_OWNER_SEEDGROUP | TARGET_GROUP_ID | DEPENDENCIES | DEPENDENCY_OUTPUTS_REQUIRED | CURRENT_PAYLOAD_IDENTITY | TARGET_STABLE_KEY | DISPOSITION | NOTES |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `seedUsers` | `users` | `NORMAL_SEED_WRITE` | User repository `findOne`/`save`/`update` | users | users | DEV | `users.dev.users` | `users.dev.users` | none | publishes existing `user.id.by-email` | phone-only lookup | email plus phone | `REQUIRES_HUMAN_DECISION` | one conflicting admin and ten distinct identities |
| `seedAddress` | `user_addresses` | `NORMAL_SEED_WRITE_RAW_SQL` | `DataSource.query` select/insert | users | users | DEV | none | `users.dev.addresses` | `users.dev.users` | `user.id.by-email` | first row for User ID | `UNRESOLVED` | `REQUIRES_HUMAN_DECISION` | address slot has no schema-supported key |
| `seedProfile` | `farmer_profiles` | `NORMAL_SEED_WRITE` | FarmerProfile repository `findOne`/`save` | profiles | profiles | DEV | none | `profiles.dev.role-profiles` | `users.dev.users` | `user.id.by-email` | User ID presence | User ID or unique CCCD | `MIGRATE_TO_OWNER_GROUP` | blocked on numeric Geography fields |
| `seedProfile` | `cooperative_profiles` | `NORMAL_SEED_WRITE` | CooperativeProfile repository `findOne`/`save` | profiles | profiles | DEV | none | `profiles.dev.role-profiles` | `users.dev.users` | `user.id.by-email` | User ID presence | User ID or unique license/tax code | `MIGRATE_TO_OWNER_GROUP` | blocked on numeric Geography fields |
| `seedProfile` | `enterprise_profiles` | `NORMAL_SEED_WRITE` | EnterpriseProfile repository `findOne`/`save` | profiles | profiles | DEV | none | `profiles.dev.role-profiles` | `users.dev.users` | `user.id.by-email` | User ID presence | User ID or unique tax code | `MIGRATE_TO_OWNER_GROUP` | blocked on numeric Geography fields |
| `seedProfile` | `supplier_profiles` | `NORMAL_SEED_WRITE` | SupplierProfile repository `findOne`/`save` | profiles | profiles | DEV | none | `profiles.dev.role-profiles` | `users.dev.users` | `user.id.by-email` | User ID presence | unique User ID | `MIGRATE_TO_OWNER_GROUP` | blocked on numeric Geography fields |
| `seedProfile` | `logistics_profiles` | `NORMAL_SEED_WRITE` | LogisticsProfile repository `findOne`/`save` | logistics | logistics | DEV | none | `logistics.dev.profile` | `users.dev.users` | `user.id.by-email` | User ID presence | unique User ID | `MIGRATE_TO_OWNER_GROUP` | blocked on numeric operating-province values |
| `seedProducts` | `products` | `NORMAL_SEED_WRITE` | Product repository `count`/`find`/`save` | products | products | DEV | `products.dev.products` | `products.dev.products` | Users DEV; Categories REFERENCE | `user.id.by-email`; `category.id.by-slug`; publish `product.id.by-sku` | whole-table count and display name | `UNRESOLVED` (target shape SKU) | `REQUIRES_HUMAN_DECISION` | 18 ordinary records have no SKU |
| `seedProducts` | `product_images` | `NORMAL_SEED_WRITE` | ProductImage repository `save` | products | products | DEV | `products.dev.products` | `products.dev.products` | internal Product row | none external | just-created Product plus insertion order | Product SKU plus primary slot | `REUSE_EXISTING_OWNER_GROUP` | blocked on central Product mapping |
| `seedProducts` | `product_certifications` | `NORMAL_SEED_WRITE` | ProductCertification repository `save` | products | products | DEV | none | `products.dev.products` | internal Product row | none external | Product position plus `Date.now()` certificate number | `UNRESOLVED` | `REQUIRES_HUMAN_DECISION` | four central-only certification rows |
| `seedCategories` | `product_categories` | `NORMAL_SEED_WRITE` | ProductCategory repository `count`/`save` | products | products | DEV payload duplicating REFERENCE identities | `products.reference.categories` | `products.reference.categories` | none | publishes existing `category.id.by-slug` | whole-table count and slug | slug | `REMOVE_DUPLICATE_WRITE` | all ten slugs already canonical |
| `seedForum` | `forum_posts` | `NORMAL_SEED_WRITE` | ForumPost repository `count`/`save` | forum | forum | DEV | none | `forum.dev.discussions` | `users.dev.users` | `user.id.by-email` | whole-table count and insertion order | `UNRESOLVED` | `REQUIRES_HUMAN_DECISION` | parent ID is needed only inside group |
| `seedForum` | `forum_comments` | `NORMAL_SEED_WRITE` | ForumComment repository `save` | forum | forum | DEV | none | `forum.dev.discussions` | internal Post; Users DEV | `user.id.by-email` | parent array position and insertion order | `UNRESOLVED` | `REQUIRES_HUMAN_DECISION` | no external Post output proposed |
| `seedForum` | `forum_likes` | `NORMAL_SEED_WRITE` | ForumLike repository `save` | forum | forum | DEV | none | `forum.dev.discussions` | internal Post; Users DEV | `user.id.by-email` | random intended set | Post ID plus User ID | `REQUIRES_HUMAN_DECISION` | key is proven, intended set is not deterministic |
| `seedReviews` | `reviews` | `NORMAL_SEED_WRITE` | Review repository `count`/`save` | reviews | reviews | DEV | none | `reviews.dev.product-feedback` | Users DEV; Products DEV | `user.id.by-email`; `product.id.by-sku` | whole-table count and Product positions | reviewer ID plus Product ID | `MIGRATE_TO_OWNER_GROUP` | exact Product SKUs remain blocked |
| `seedAdPackages` | `ad_packages` | `NORMAL_SEED_WRITE` | AdPackage repository `count`/`save` | ads | ads | DEV | none | `ads.dev.catalog-and-campaigns` | none | none | whole-table count and display label | `UNRESOLVED` | `REQUIRES_HUMAN_DECISION` | package IDs stay internal if group is retained |
| `seedAdCampaigns` | `ad_campaigns` | `NORMAL_SEED_WRITE` | AdCampaign repository `count`/`save` | ads | ads | DEV | none | `ads.dev.catalog-and-campaigns` | internal Package; Users DEV | `user.id.by-email` | package position plus execution-relative date | `UNRESOLVED` | `REQUIRES_HUMAN_DECISION` | passed Admin ID is unused |
| `seedCoopMembers` | `cooperative_members` | `NORMAL_SEED_WRITE` | CooperativeMember repository `count`/`save` | cooperatives | cooperatives | DEV | none | `cooperatives.dev.operations` | Users DEV | `user.id.by-email` | whole-table count and first-five query order | `UNRESOLVED` | `REQUIRES_HUMAN_DECISION` | passed Farmer ID is unused |
| `seedBulkListings` | `bulk_listings` | `NORMAL_SEED_WRITE` | BulkListing repository `count`/`save` | cooperatives | cooperatives | DEV | none | `cooperatives.dev.operations` | Users DEV | `user.id.by-email` | whole-table count and insertion order | `UNRESOLVED` | `REQUIRES_HUMAN_DECISION` | Product array parameter is unused |
| `seedBulkListings` | `bulk_listing_contributions` | `NORMAL_SEED_WRITE` | BulkListingContribution repository `save` | cooperatives | cooperatives | DEV | none | `cooperatives.dev.operations` | internal Bulk Listing; Users DEV | `user.id.by-email` | just-created Listing ID and insertion order | `UNRESOLVED` | `REQUIRES_HUMAN_DECISION` | two rows share the same listing/farmer pair |
| `seedHarvestSchedules` | `harvest_schedules` | `NORMAL_SEED_WRITE` | HarvestSchedule repository `count`/`save` | cooperatives | cooperatives | DEV | none | `cooperatives.dev.operations` | Users DEV; Products DEV | `user.id.by-email`; `product.id.by-sku` | whole-table count and Product position zero | `UNRESOLVED` | `REQUIRES_HUMAN_DECISION` | three rows share the selected Product ID |
| `seedViolations` | `products` | `NORMAL_SEED_WRITE` | Product repository `findOne`/`save` | products | products | DEV | `products.dev.products` | `products.dev.products` | Users DEV; Categories REFERENCE | `user.id.by-email`; `category.id.by-slug`; publish `product.id.by-sku` | existence of any suspended Product | `UNRESOLVED` (target shape SKU) | `REQUIRES_HUMAN_DECISION` | two violation Products have no SKU; passed IDs are unused |
| `seedAuditLogs` | `audit_logs` | `NORMAL_SEED_WRITE` | AuditLog repository `count`/`save` | admin | admin | DEV | none | `admin.dev.audit-logs` | Users DEV | `user.id.by-email` | whole-table count and insertion order | `UNRESOLVED` | `REQUIRES_HUMAN_DECISION` | no external output proposed |
| `seedNotifications` | `notifications` | `NORMAL_SEED_WRITE` | Notification repository `count`/`save` | notifications | notifications | DEV | none | `notifications.dev.inbox` | Users DEV | `user.id.by-email` | whole-table count and insertion order | `UNRESOLVED` | `REQUIRES_HUMAN_DECISION` | no external output proposed |

The 24 method-to-table assignments above count `products` in both
`seedProducts` and `seedViolations`. The distinct business-table count is 23.

### Cross-Owner Construction Reads

| SOURCE_METHOD | ENTITY_OR_TABLE_READ | CURRENT_ACCESS | DEV DATA PURPOSE | TARGET CONTRACT |
| --- | --- | --- | --- | --- |
| `resolveDevSeedProductsForOrchestration` / `seedAll` | `products` | caller-supplied `loadExisting` using Product repository `find()` | supplies Products when `skipProducts=true` | remove after consumers use declared Product SKU outputs |
| `seedProducts` | `users` | User repository `find()` plus role search | selects Product sellers | `users.dev.users/user.id.by-email` |
| `seedReviews` | `products` | Product repository query filtered in memory | selects first eight active Products | `products.dev.products/product.id.by-sku` |
| `seedCoopMembers` | `users` | User repository role query plus `slice(0, 5)` | selects cooperative members | explicit `users.dev.users/user.id.by-email` keys |
| `seedViolations` | `users` | User repository `find()` plus role search | selects sellers for suspended Products | explicit `users.dev.users/user.id.by-email` keys |

Same-owner reads such as Categories from Products, Packages from Ads, and the
suspended-Product existence guard are captured in the write inventory and do
not require cross-group repository access in the target design.

## Canonical Write Owner Map

All 23 tables have exactly one canonical target owner in
`entity-ownership.json`. No new ownership decision is introduced here.

| Table | Current method(s) | Canonical owner | Target candidate group | Disposition |
| --- | --- | --- | --- | --- |
| `users` | `seedUsers` | users | `users.dev.users` | reuse existing group; payload decision required |
| `user_addresses` | `seedAddress` | users | `users.dev.addresses` | human/schema decision required |
| `farmer_profiles` | `seedProfile` | profiles | `profiles.dev.role-profiles` | migrate after Geography-field decision |
| `cooperative_profiles` | `seedProfile` | profiles | `profiles.dev.role-profiles` | migrate after Geography-field decision |
| `enterprise_profiles` | `seedProfile` | profiles | `profiles.dev.role-profiles` | migrate after Geography-field decision |
| `supplier_profiles` | `seedProfile` | profiles | `profiles.dev.role-profiles` | migrate after Geography-field decision |
| `logistics_profiles` | `seedProfile` | logistics | `logistics.dev.profile` | migrate after Geography-field decision |
| `product_categories` | `seedCategories` (invoked by `seedProducts`) | products | `products.reference.categories` | exact duplicate; reuse existing group |
| `products` | `seedProducts`, `seedViolations` | products | `products.dev.products` | reuse/extend existing group after identity decision |
| `product_images` | `seedProducts` | products | `products.dev.products` | reuse existing owner group after Product mapping |
| `product_certifications` | `seedProducts` | products | `products.dev.products` | stable-key decision required |
| `forum_posts` | `seedForum` | forum | `forum.dev.discussions` | stable-key decision required |
| `forum_comments` | `seedForum` | forum | `forum.dev.discussions` | stable-key decision required |
| `forum_likes` | `seedForum` | forum | `forum.dev.discussions` | deterministic intended-set decision required |
| `reviews` | `seedReviews` | reviews | `reviews.dev.product-feedback` | migrate after Product mapping |
| `ad_packages` | `seedAdPackages` | ads | `ads.dev.catalog-and-campaigns` | stable-key decision required |
| `ad_campaigns` | `seedAdCampaigns` | ads | `ads.dev.catalog-and-campaigns` | stable-key and deterministic-date decisions required |
| `cooperative_members` | `seedCoopMembers` | cooperatives | `cooperatives.dev.operations` | stable-key decision required |
| `bulk_listings` | `seedBulkListings` | cooperatives | `cooperatives.dev.operations` | stable-key decision required |
| `bulk_listing_contributions` | `seedBulkListings` | cooperatives | `cooperatives.dev.operations` | stable-key decision required |
| `harvest_schedules` | `seedHarvestSchedules` | cooperatives | `cooperatives.dev.operations` | stable-key and Product mapping decisions required |
| `audit_logs` | `seedAuditLogs` | admin | `admin.dev.audit-logs` | stable-key decision required |
| `notifications` | `seedNotifications` | notifications | `notifications.dev.inbox` | stable-key decision required |

## Existing-Group Overlap Audit

### Users DEV

The central service contains eleven user identities; the merged
`users.dev.users` group contains seven. The exact three-way admin comparison is:

| Source | Email | Phone | Role | Full name |
| --- | --- | --- | --- | --- |
| `users.dev.users` | `admin@agrilink.vn` | `+84901111099` | `ADMIN` | `Quản trị viên Hệ thống` |
| `DevSeedService` | `admin@agrilink.vn` | `+84905064606` | `ADMIN` | `Admin Hệ thống AgriLink` |
| `admin-dev.seed.ts` | `admin@agrilink.vn` | `0909999999` | `ADMIN` | `Admin AgriLink` |

Exact email/phone comparison produces one conflicting identity and ten
central-only identities:

| Central identity | Existing-group relationship | Decision |
| --- | --- | --- |
| `admin@agrilink.vn` / `+84905064606` | same email as canonical admin, whose phone is `+84901111099`; the admin DEV source also uses the same email with `0909999999` | `CONFLICTING_DUPLICATE`; human resolution required |
| remaining ten central email/phone pairs | no exact canonical email or phone match | `DISTINCT_OWNER_FIXTURE`; explicitly retain, map, or retire each one |

Role or display-name similarity is not a stable identity and is not used to
delete or merge the ten distinct records. Future consumers should use
`user.id.by-email` only after the approved account set is explicit.

| Central email | Central phone | Role | Classification |
| --- | --- | --- | --- |
| `admin@agrilink.vn` | `+84905064606` | `ADMIN` | `CONFLICTING_DUPLICATE` |
| `farmer@sandbox.com` | `+84905602427` | `FARMER` | `DISTINCT_OWNER_FIXTURE` |
| `buyer@sandbox.com` | `+84909259456` | `BUYER` | `DISTINCT_OWNER_FIXTURE` |
| `enterprise@sandbox.com` | `+84902136212` | `ENTERPRISE` | `DISTINCT_OWNER_FIXTURE` |
| `supplier@sandbox.com` | `+84905516850` | `SUPPLIER` | `DISTINCT_OWNER_FIXTURE` |
| `logistics@sandbox.com` | `+84903730212` | `LOGISTICS` | `DISTINCT_OWNER_FIXTURE` |
| `cooperative@sandbox.com` | `+84902372975` | `COOPERATIVE` | `DISTINCT_OWNER_FIXTURE` |
| `state_agency@sandbox.com` | `+84907658754` | `STATE_AGENCY` | `DISTINCT_OWNER_FIXTURE` |
| `demo.farmer@sandbox.com` | `+84909000001` | `FARMER` | `DISTINCT_OWNER_FIXTURE` |
| `demo.coop@sandbox.com` | `+84909000002` | `COOPERATIVE` | `DISTINCT_OWNER_FIXTURE` |
| `demo.supplier@sandbox.com` | `+84909000003` | `SUPPLIER` | `DISTINCT_OWNER_FIXTURE` |

```text
DEVSEEDSERVICE_USERS_OVERLAP=CONFLICTING_DUPLICATE(admin email; phone conflict)+DISTINCT_DEV_PAYLOAD(10 central identities)
```

### Product Categories REFERENCE

All ten central category slugs exist in the 37-row canonical
`products.reference.categories` group. They are exact identity duplicates by
the schema-backed stable slug. The target service must consume
`category.id.by-slug`; it must not retain the central category writer.

```text
DEVSEEDSERVICE_CATEGORY_OVERLAP=EXACT_IDENTITY_DUPLICATE:10_BY_SLUG
```

### Products DEV

The central Product payload has 18 ordinary Products and two violation
Products, but none declares a SKU. Five ordinary display names equal names in
the 54-SKU canonical Products DEV payload:

| Central display name | Canonical SKU |
| --- | --- |
| `Bưởi da xanh Bến Tre` | `DEV-BUOI-DA-XANH-001` |
| `Rau muống hữu cơ Đà Lạt` | `DEV-RAU-MUONG-HUU-CO-001` |
| `Tiêu đen Phú Quốc` | `DEV-TIEU-DEN-PHU-QUOC-001` |
| `Hạt điều rang muối W320` | `DEV-HAT-DIEU-W320-001` |
| `Hoa cúc vàng Đà Lạt` | `DEV-HOA-CUC-VANG-001` |

Names are not Product identity. This is semantic overlap only, not proof that
the rows are duplicates. Every central ordinary and violation Product requires
an explicit map-to-SKU, add-with-new-SKU, or retire decision. Product Images
remain attached to that unresolved Product identity. The four certification
rows are not present in the current canonical group and also lack a proven
stable key.

```text
DEVSEEDSERVICE_PRODUCTS_OVERLAP=SEMANTIC_OVERLAP_ONLY
DEVSEEDSERVICE_IMAGES_OVERLAP=SEMANTIC_OVERLAP_ONLY; UPSTREAM_PRODUCT_IDENTITY_UNRESOLVED
CENTRAL_PRODUCT_SKUS=0
CENTRAL_PRODUCT_IDENTITY_DECISION=REQUIRED
```

## Current `skipProducts` Contract

When `skipProducts=true`, `seedAll()` skips the entire `seedProducts()` call.
That skips the central category, 18 ordinary Product, 18 Product Image, and four
Product Certification writes. It does not skip the query that loads all
existing Products, downstream fixtures, or `seedViolations()` and its two
additional Product writes.

```text
SKIP_PRODUCTS_CURRENT_SCOPE=SEEDPRODUCTS_ONLY_CATEGORIES_PRODUCTS_IMAGES_CERTIFICATIONS; LOADS_ALL_PRODUCTS_AND_DOES_NOT_SKIP_VIOLATIONS_OR_DOWNSTREAM_FIXTURES
```

The flag is a temporary overlap bridge, not an ownership boundary. It can be
removed only in the final P8-05C slice after every central Product write and
consumer has migrated.

## Stable-Key And Convergence Audit

Schema-backed or already-approved keys are retained. A display name, whole
table count, query order, generated UUID, or execution-time timestamp is not a
stable seed identity.

| Table | Proven or proposed stable key | Audit result |
| --- | --- | --- |
| `users` | email plus phone, reconciled independently | proven by unique columns and existing owner group; split identity must fail closed |
| `user_addresses` | none | `MISSING_SCHEMA_SUPPORT`; current first-address-by-user behavior is not backed by an address-slot key |
| `farmer_profiles` | one-to-one User ID and unique CCCD | proven; payload Geography fields remain blocked |
| `cooperative_profiles` | one-to-one User ID; unique license/tax identifiers | proven; payload Geography fields remain blocked |
| `enterprise_profiles` | one-to-one User ID and unique tax code | proven; payload Geography fields remain blocked |
| `supplier_profiles` | unique User ID | proven; payload Geography fields remain blocked |
| `logistics_profiles` | unique User ID | proven; operating-province semantics remain blocked |
| `product_categories` | slug | proven; canonical group already publishes IDs by slug |
| `products` | SKU | schema support and existing group contract proven; central payload mapping is unresolved |
| `product_images` | Product SKU plus primary slot | approved in P8-05B; blocked on central Product mapping |
| `product_certifications` | none | unresolved; timestamp-derived certificate numbers are not stable and are not schema-unique |
| `forum_posts` | none | unresolved |
| `forum_comments` | none | unresolved |
| `forum_likes` | post ID plus user ID | schema-proven pair; blocked on Post identity and random intended set |
| `reviews` | reviewer ID plus Product ID | schema-proven pair; blocked on explicit Product SKU mapping |
| `ad_packages` | none | unresolved |
| `ad_campaigns` | none | unresolved; execution-relative dates also prevent deterministic reconciliation |
| `cooperative_members` | none | unresolved |
| `bulk_listings` | none | unresolved |
| `bulk_listing_contributions` | none | unresolved; two current rows intentionally share one listing/farmer pair |
| `harvest_schedules` | none | unresolved; Product dependency is also positional |
| `audit_logs` | none | unresolved |
| `notifications` | none | unresolved |

Thirteen table payloads require an identity/schema decision before their target
group can be implemented: `user_addresses`, `products`,
`product_certifications`, `forum_posts`, `forum_comments`, `ad_packages`,
`ad_campaigns`, `cooperative_members`, `bulk_listings`,
`bulk_listing_contributions`, `harvest_schedules`, `audit_logs`, and
`notifications`.

```text
UNRESOLVED_STABLE_KEYS=13
```

The count treats the central Product payload as unresolved even though the
schema supports SKU: the records themselves have no SKU and no approved mapping.
It does not count Product Images, Forum Likes, or Reviews as missing schema
support because their target key shape is proven; their upstream mapping or
deterministic-set blocker is recorded separately.

## Whole-Table And Existential Guards

Eleven methods use `count() > 0` to skip a complete fixture set:
`seedProducts`, `seedCategories`, `seedForum`, `seedReviews`,
`seedAdPackages`, `seedAdCampaigns`, `seedCoopMembers`, `seedBulkListings`,
`seedHarvestSchedules`, `seedAuditLogs`, and `seedNotifications`.
`seedViolations` adds an existential guard that skips both intended rows if any
suspended Product exists.

```text
WHOLE_TABLE_GUARDS_FOUND=12
TARGET_WHOLE_TABLE_GUARDS=0
```

Each owner group must reconcile each approved record independently and define
partial-retry behavior. A destructive reset is not an idempotency strategy.

| METHOD | TARGET_GROUP | REPLACEMENT_REQUIRED |
| --- | --- | --- |
| `seedProducts` | `products.dev.products` | `PER_RECORD_CONVERGENCE` |
| `seedCategories` | `products.reference.categories` | `PER_RECORD_CONVERGENCE` (reuse canonical group) |
| `seedForum` | `forum.dev.discussions` | `PER_RECORD_CONVERGENCE` |
| `seedReviews` | `reviews.dev.product-feedback` | `PER_RECORD_CONVERGENCE` |
| `seedAdPackages` | `ads.dev.catalog-and-campaigns` | `PER_RECORD_CONVERGENCE` |
| `seedAdCampaigns` | `ads.dev.catalog-and-campaigns` | `PER_RECORD_CONVERGENCE` |
| `seedCoopMembers` | `cooperatives.dev.operations` | `PER_RECORD_CONVERGENCE` |
| `seedBulkListings` | `cooperatives.dev.operations` | `PER_RECORD_CONVERGENCE` |
| `seedHarvestSchedules` | `cooperatives.dev.operations` | `PER_RECORD_CONVERGENCE` |
| `seedAuditLogs` | `admin.dev.audit-logs` | `PER_RECORD_CONVERGENCE` |
| `seedNotifications` | `notifications.dev.inbox` | `PER_RECORD_CONVERGENCE` |
| `seedViolations` | `products.dev.products` | `PER_RECORD_CONVERGENCE` |

## Positional And Nondeterministic Dependencies

The source contains eleven Product-array bracket expressions: nine review
references, the first Product supplied to harvest schedules, and the last
Product supplied to `seedViolations`. The final violation parameter is unused,
so ten expressions affect persisted values. Reviews rely on the first eight
active Products returned by an unordered query and construct nine rows from
positions `0..7`. Harvest schedules all use position `0`.

The source also selects ad packages by array position, takes the first five
farmers returned by an unordered query, chooses Forum Likes with
`Math.random()`, creates certification numbers with `Date.now()`, and creates
campaign dates relative to the execution date. Product arrays passed to Forum
and Bulk Listings are unused.

```text
POSITIONAL_PRODUCT_EXPRESSIONS=11
EFFECTIVE_POSITIONAL_PRODUCT_DEPENDENCIES=10
POSITIONAL_PRODUCT_DEPENDENCIES=11_SOURCE_EXPRESSIONS/10_EFFECTIVE_PERSISTED_VALUE_DEPENDENCIES
PRODUCT_DEV_OUTPUT_REQUIRED_BY_P8_05C=YES
PRODUCT_DEV_OUTPUT_KIND=product.id.by-sku
```

Before implementation, each review and harvest row must name an explicit
approved Product SKU. No source evidence supports guessing those mappings.

## Geography Literal Audit

The central service has 22 numeric Geography literal uses: eight address
province arguments, four profile province fields, and ten values in the
logistics operating-provinces array. The distinct values are
`1, 2, 3, 6, 7, 10, 11, 12, 22, 23, 24`.

These target fields are legacy `int`/`int[]` fields, while
`province.id.by-code` publishes canonical Province UUID strings. Static source
does not prove that the integers are codes, database IDs, historical
administrative identifiers, or display-order values. Therefore this plan does
not add a Geography dependency edge.

```text
CENTRAL_DEV_GEOGRAPHY_LITERAL_COUNT=22
CENTRAL_DEV_GEOGRAPHY_IDENTIFIER_STATUS=LEGACY_NUMERIC_NON_RELATIONAL_FIELDS_INCOMPATIBLE_WITH_CANONICAL_UUID_OUTPUT
GEOGRAPHY_DEPENDENCY_EDGE=BLOCKED_NOT_DECLARED
```

Address, role-profile, and logistics implementation must wait for an explicit
field-semantics and mapping/schema decision.

## Raw SQL And Destructive Behavior

There are four raw `query()` call sites:

| Method | Raw operation | Classification | Target disposition |
| --- | --- | --- | --- |
| `resetAll` | dynamic `DELETE FROM "${table}"` | `DESTRUCTIVE_RESET` | remove from ordinary seeding |
| `resetAll` | `DELETE FROM "users"` | `DESTRUCTIVE_RESET` | remove from ordinary seeding |
| `seedAddress` | address `SELECT` by User ID | `NORMAL_SEED_WRITE` support read | replace with owner-local typed adapter |
| `seedAddress` | address `INSERT` | `NORMAL_SEED_WRITE` | replace with owner-local typed adapter after key decision |

`resetAll()` attempts deletes against 23 names in its loop and then `users`, for
24 attempted targets. Its list includes `review` even though the canonical
table is `reviews`, and includes `ad_events`, which the service does not seed.
Best-effort deletion can therefore leave a partially reset graph. The target
design removes the method from the ordinary seeding service; it does not move
it into an owner group.

```text
RAW_SQL_OCCURRENCES=4
DESTRUCTIVE_RESET_OCCURRENCES=1_METHOD/2_RAW_DELETE_CALL_SITES/24_ATTEMPTED_TARGETS
TARGET_RAW_BUSINESS_WRITES=0
TARGET_CENTRAL_DESTRUCTIVE_RESETS=0
```

## Explicit Type Debt

The service contains eight explicit `any` occurrences. They are assigned to
the implementation slice that must replace them with owner-local typed input or
adapter contracts:

| Source line/use | Form | Owner slice |
| --- | --- | --- |
| Farmer Profile `districtId` | `null as any` | P8-05C1 |
| `seedCategories` repository parameter | `repo: any` | P8-05C2 |
| Campaign save payload | `c as any` | P8-05C3 |
| Cooperative Member payload | object `as any` | P8-05C2 |
| Bulk Listing payload | object `as any` | P8-05C2 |
| Bulk Listing Contribution array | array `as any` | P8-05C2 |
| Harvest Schedule payload | object `as any` | P8-05C2 |
| Violation Product save payload | `s as any` | P8-05C2 |

```text
DEVSEEDSERVICE_EXPLICIT_ANY_COUNT=8
P8_05C1_EXPLICIT_ANY_COUNT=1
P8_05C2_EXPLICIT_ANY_COUNT=6
P8_05C3_EXPLICIT_ANY_COUNT=1
P8_05C4_EXPLICIT_ANY_COUNT=0
```

## Target Owner Groups

The proposed unit is a coherent bounded-context fixture, not one group per
table. Parent and child rows that do not need external consumers stay in one
owner group so their generated IDs remain internal. A group marked
`REQUIRES_HUMAN_DECISION` is a planned boundary, not implementation approval.

| GROUP_ID | OWNER | CLASSIFICATION | TABLES_OWNED | DEPENDENCIES | OUTPUTS_TO_PUBLISH | STABLE_KEYS | STABLE_KEY_STATUS | DISPOSITION / RATIONALE |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `users.dev.users` | users | DEV | `users` | none | existing `user.id.by-email` | email plus phone | `PROVEN` | `REUSE_EXISTING_OWNER_GROUP`; central identity decision required |
| `users.dev.addresses` | users | DEV | `user_addresses` | `users.dev.users` | none | none | `MISSING_SCHEMA_SUPPORT` | `REQUIRES_HUMAN_DECISION`; separate address lifecycle from accounts |
| `profiles.dev.role-profiles` | profiles | DEV | four role-profile tables | `users.dev.users` | none | User ID plus per-profile unique identifiers | `PROVEN` | `MIGRATE_TO_OWNER_GROUP`; coherent role/KYC fixture, blocked by Geography fields |
| `logistics.dev.profile` | logistics | DEV | `logistics_profiles` | `users.dev.users` | none | unique User ID | `PROVEN` | `MIGRATE_TO_OWNER_GROUP`; separate owner, blocked by Geography fields |
| `products.dev.products` | products | DEV | `products`, `product_images`, `product_certifications` | `users.dev.users`, `products.reference.categories` | add `product.id.by-sku` | Product SKU and Image primary slot proven; Certification none | `UNRESOLVED` | `REUSE_EXISTING_OWNER_GROUP`; Product fixture aggregate, extension/mapping decision required |
| `forum.dev.discussions` | forum | DEV | `forum_posts`, `forum_comments`, `forum_likes` | `users.dev.users` | none | Post/Comment none; Like pair proven | `UNRESOLVED` | `REQUIRES_HUMAN_DECISION`; parent/children stay internal |
| `reviews.dev.product-feedback` | reviews | DEV | `reviews` | `users.dev.users`, `products.dev.products` | none | reviewer plus Product pair | `PROVEN` | `MIGRATE_TO_OWNER_GROUP`; blocked by Product SKU mapping |
| `ads.dev.catalog-and-campaigns` | ads | DEV | `ad_packages`, `ad_campaigns` | `users.dev.users` | none | none | `MISSING_SCHEMA_SUPPORT` | `REQUIRES_HUMAN_DECISION`; package IDs remain internal to marketing fixture |
| `cooperatives.dev.operations` | cooperatives | DEV | four cooperative-operation tables | `users.dev.users`, `products.dev.products` | none | none | `MISSING_SCHEMA_SUPPORT` | `REQUIRES_HUMAN_DECISION`; listing/contribution IDs remain internal |
| `admin.dev.audit-logs` | admin | DEV | `audit_logs` | `users.dev.users` | none | none | `MISSING_SCHEMA_SUPPORT` | `REQUIRES_HUMAN_DECISION`; owner-local leaf fixture |
| `notifications.dev.inbox` | notifications | DEV | `notifications` | `users.dev.users` | none | none | `MISSING_SCHEMA_SUPPORT` | `REQUIRES_HUMAN_DECISION`; owner-local leaf fixture |

No Forum Post, Ad Package, or Bulk Listing output is proposed: their child rows
remain in the same owner group. New scalar outputs should be added only for a
proven cross-group consumer.

## Target Dependency DAG

```text
products.reference.categories/category.id.by-slug ----.
                                                       v
users.dev.users/user.id.by-email ----------------> products.dev.products
       |                                               |
       |                                               `-- product.id.by-sku --.
       |                                                                        |
       |--> users.dev.addresses                                                  |
       |--> profiles.dev.role-profiles                                           |
       |--> logistics.dev.profile                                                |
       |--> forum.dev.discussions                                                |
       |--> ads.dev.catalog-and-campaigns                                        |
       |--> admin.dev.audit-logs                                                 |
       |--> notifications.dev.inbox                                              |
       |                                                                        |
       |---------------------------> reviews.dev.product-feedback <--------------'
       `---------------------------> cooperatives.dev.operations <---------------'
```

All cross-owner dependencies carry scalar output bindings only. The graph does
not include a Geography edge until the 22 numeric literals have an approved
meaning. It also does not encode unused parameters as dependencies.

| PRODUCER_GROUP | OUTPUT_KIND | STABLE_KEY_TYPE | CONSUMER_GROUP | PURPOSE |
| --- | --- | --- | --- | --- |
| `products.reference.categories` | `category.id.by-slug` | Product Category slug | `products.dev.products` | assign canonical categories to retained DEV Products |
| `users.dev.users` | `user.id.by-email` | normalized User email | `products.dev.products` | assign retained Product sellers |
| `users.dev.users` | `user.id.by-email` | normalized User email | `users.dev.addresses` | assign Address owner |
| `users.dev.users` | `user.id.by-email` | normalized User email | `profiles.dev.role-profiles` | assign profile owner |
| `users.dev.users` | `user.id.by-email` | normalized User email | `logistics.dev.profile` | assign logistics account |
| `users.dev.users` | `user.id.by-email` | normalized User email | `forum.dev.discussions` | assign authors and likers |
| `users.dev.users` | `user.id.by-email` | normalized User email | `reviews.dev.product-feedback` | assign reviewers |
| `products.dev.products` | `product.id.by-sku` | Product SKU | `reviews.dev.product-feedback` | replace Product array positions |
| `users.dev.users` | `user.id.by-email` | normalized User email | `ads.dev.catalog-and-campaigns` | assign campaign supplier |
| `users.dev.users` | `user.id.by-email` | normalized User email | `cooperatives.dev.operations` | assign cooperative/farmer actors |
| `products.dev.products` | `product.id.by-sku` | Product SKU | `cooperatives.dev.operations` | assign harvest Product explicitly |
| `users.dev.users` | `user.id.by-email` | normalized User email | `admin.dev.audit-logs` | assign audit actors |
| `users.dev.users` | `user.id.by-email` | normalized User email | `notifications.dev.inbox` | assign notification recipients |

## Implementation Slices

| Slice | TARGET_GROUPS | FILES_EXPECTED | DEPENDENCIES_ALREADY_AVAILABLE | NEW_OUTPUTS_REQUIRED |
| --- | --- | --- | --- | --- |
| P8-05C1 | `users.dev.users`; `users.dev.addresses`; `profiles.dev.role-profiles`; `logistics.dev.profile` | owner-local seed contracts/adapters/specs under `src/modules/users/**` and `src/modules/profiles/**`; an approved logistics owner location; central-service retirement edits | `users.dev.users/user.id.by-email` contract and group | no new output kind; approved central accounts must join the existing email map |
| P8-05C2 | `products.dev.products`; `reviews.dev.product-feedback`; `cooperatives.dev.operations` | existing Products DEV service/writer/spec and Product output contract; new owner-local seeds/specs under `src/modules/reviews/**` and `src/modules/cooperatives/**`; central retirement edits | `user.id.by-email`; `category.id.by-slug` | `products.dev.products/product.id.by-sku` |
| P8-05C3 | `forum.dev.discussions`; `ads.dev.catalog-and-campaigns` | new owner-local seeds/adapters/specs under `src/modules/forum/**` and `src/modules/ads/**`; central retirement edits | `user.id.by-email` | none; parent IDs remain group-internal |
| P8-05C4 | `admin.dev.audit-logs`; `notifications.dev.inbox`; central cleanup | new owner-local seeds/adapters/specs under `src/modules/admin/**` and `src/modules/notifications/**`; `src/database/dev-seed.service.ts`; `src/main.ts`; orchestration specs | `user.id.by-email` and all prior slice groups | none |

### P8-05C1 — User-Rooted Identities And Profiles

Target groups: `users.dev.users`, `users.dev.addresses`,
`profiles.dev.role-profiles`, and `logistics.dev.profile`.

Central retirement scope: `seedUsers`, `seedAddress`, and every branch of
`seedProfile`.

Entry blockers:

- resolve the three-way admin email/phone conflict;
- explicitly retain, map, or retire each of the ten central-only users;
- approve an address stable-key/schema strategy;
- approve the numeric Geography field semantics and mappings.

Exit gate: every approved row converges independently in its owner group, all
required User IDs are published by the Users owner, and the central service no
longer writes User, Address, Profile, or Logistics tables.

### P8-05C2 — Product-Dependent Fixtures

Target groups: `products.dev.products`, `reviews.dev.product-feedback`, and
`cooperatives.dev.operations`.

Central retirement scope: `seedProducts`, `seedCategories`, `seedReviews`,
`seedCoopMembers`, `seedBulkListings`, `seedHarvestSchedules`, and
`seedViolations`.

Entry blockers:

- decide map/add/retire for all 20 central Product records and assign approved
  SKUs where retained;
- approve Product Certification identity;
- replace every positional review and harvest dependency with an explicit SKU;
- approve stable keys for the cooperative-operation tables.

Exit gate: Product Categories have one canonical writer, Products have one DEV
writer, `product.id.by-sku` is published to declared consumers, dependent
groups use scalar bindings, and no Product selection depends on query order.

### P8-05C3 — Content And Marketing Fixtures

Target groups: `forum.dev.discussions` and
`ads.dev.catalog-and-campaigns`.

Central retirement scope: `seedForum`, `seedAdPackages`, and
`seedAdCampaigns`.

Entry blockers: approve Post, Comment, Package, and Campaign keys; define the
deterministic Forum Like intended set; define fixed campaign time semantics;
and replace package-array positions with stable internal keys.

Exit gate: both groups converge record by record and contain no random,
execution-time, whole-table, or query-order identity behavior.

### P8-05C4 — Leaf Fixtures And Central Retirement

Target groups: `admin.dev.audit-logs` and `notifications.dev.inbox`, followed by
central entrypoint cleanup.

Central retirement scope: `seedAuditLogs`, `seedNotifications`, `resetAll`,
`seedAll`, `resolveDevSeedProductsForOrchestration`, and the temporary
`skipProducts` bridge after P8-05C1 through P8-05C3 have completed.

Entry blockers: approve Audit Log and Notification stable keys and satisfy all
prior slice exit gates.

Exit gate: the central service is deleted or has no business writes; the
remaining central path is a SeedGroup DAG runner only; destructive reset is not
part of ordinary seeding; and the P8-10 orchestration-only exit can be closed by
implementation evidence.

## Admin DEV, Test, And Backfill Boundaries

`src/database/seeds/admin-dev.seed.ts` remains a separate P8-05D source. Static
inspection confirms it writes Users, four profile tables, Products, and Product
Images and shares `admin@agrilink.vn` while declaring another phone. Its
dashboard-specific payload and standalone entrypoint require their own
ownership, identity, and safety review.

```text
ADMIN_DEV_TARGET_PHASE=P8_05D
ADMIN_DEV_IMPLEMENTATION_CHANGES=0
```

TEST fixtures remain P8-06 work. Migration and rollout backfills remain
migration-governed and are not pulled into any DEV SeedGroup by this plan.

```text
BUSINESS_IMPLEMENTATION_CHANGES=0
ADMIN_DEV_IMPLEMENTATION_CHANGES=0
TEST_FIXTURE_IMPLEMENTATION_CHANGES=0
MIGRATION_BACKFILL_CHANGES=0
```

## Trade-Off And Architecture Decision

The selected design uses one candidate group per coherent bounded-context
fixture. This keeps parent/child identifiers private when no external consumer
exists, minimizes output surface, and aligns every write with the canonical
owner. It costs more up-front identity work because weak central fixtures can
no longer hide behind whole-table guards.

Rejected alternatives:

- retaining `DevSeedService` as a cross-owner writer violates
  `CENTRAL_RUNNER_IS_ORCHESTRATOR_ONLY`;
- creating one group per table increases DAG and output complexity without an
  ownership benefit;
- treating display names or array positions as identities makes retries and
  partial recovery nondeterministic;
- adding speculative Geography UUID dependencies would silently reinterpret
  legacy numeric fields;
- moving `resetAll()` into the runner would preserve an unsafe, partially
  ordered cross-owner delete path.

This is a planning ADR embedded in the Phase 8 phase record. Implementation PRs
must cite the relevant slice, close its named blockers with reviewed evidence,
and update this document if the boundary or key decision changes.

## Phase Exit Impact

This plan resolves the static ownership assignment and candidate dependency
graph for every `DevSeedService` write. It does not close runtime exit gates.

| Phase 8 exit criterion | P8-05C0 impact |
| --- | --- |
| `ALL_EXECUTABLE_SEEDERS_CLASSIFIED` | central service classified DEV; admin source remains separately scoped to P8-05D |
| `ALL_SEEDED_TABLES_HAVE_ONE_OWNER` | statically satisfied for all 23 central-service business tables |
| `NO_CROSS_OWNER_SEED_REPOSITORY_ACCESS` | target assignments complete; implementation still open |
| `REFERENCE_DEV_TEST_SEEDS_SEPARATED` | exact category overlap assigned to REFERENCE owner; implementation still open |
| `DEPENDENCY_DAG_EXPLICIT` | candidate P8-05C DAG complete; Geography edge intentionally blocked |
| `IDEMPOTENCY_VERIFIED` | not closed; 12 group guards and 13 unresolved table identities require implementation |
| `DISPOSABLE_DB_SEED_RUN_PASS` | not run or authorized by this plan |
| `SECOND_SEED_RUN_NO_DUPLICATES` | not run or authorized by this plan |
| `CENTRAL_SEEDER_ORCHESTRATION_ONLY` | four implementation slices defined; not yet closed |

## Static Plan Gate

This documentation task performed no database-capable validation:

```text
PROTECTED_LOCAL_DB_ACCESSED=NO
PRODUCTION_DB_ACCESSED=NO
DATABASE_CONNECTIONS=0
SQL=0
DDL=0
DML=0
SEEDS_EXECUTED=0
MIGRATIONS_EXECUTED=0
SYNCHRONIZE=NO
DESTRUCTIVE_RESET_EXECUTED=NO
```

```text
P8_05C0_WRITE_INVENTORY_COMPLETE=YES
P8_05C0_OWNER_MAP_COMPLETE=YES
P8_05C0_OVERLAP_AUDIT_COMPLETE=YES
P8_05C0_STABLE_KEY_AUDIT_COMPLETE=YES
P8_05C0_DEPENDENCY_DAG_COMPLETE=YES
P8_05C0_IMPLEMENTATION_SLICES_DEFINED=YES
P8_05C_IMPLEMENTATION_AUTHORIZED=NO
P8_05C0_READY_FOR_HUMAN_REVIEW=YES
```

`STABLE_KEY_AUDIT_COMPLETE=YES` means every table was assessed and every
unresolved key was made a named blocker. It does not mean all thirteen key
decisions have been approved.

## P8-05C1A Decision Overlay

The authoritative User, Address, Profile, Logistics, and legacy Geography
decisions are recorded in
[dev-seed-c1-decisions.md](dev-seed-c1-decisions.md). This overlay does not
rewrite the P8-05C0 current-state audit; it records the reviewed target decision
for the C1 implementation slice.

| C1 entry blocker | Decision | Status |
| --- | --- | --- |
| three-way admin identity conflict | reuse `users.dev.users/user.id.by-email` for `admin@agrilink.vn`; retire the central duplicate; leave admin DEV to P8-05D | `RESOLVED` |
| ten central-only identities | retain three distinct identities, map four consumers to existing canonical identities, retire three declarations without deterministic consumers | `RESOLVED` |
| User Address stable identity | seed-level User plus existing `Địa chỉ chính` default slot; 0 creates, 1 reconciles, more than 1 fails closed | `RESOLVED` |
| legacy numeric Geography semantics | preserve opaque `int`/`int[]` owner metadata; no Province UUID/code interpretation and no Geography dependency | `RESOLVED` |

The future Users DEV payload contains ten unique email/phone identities: the
seven merged canonical accounts plus retained
`farmer@sandbox.com`, `cooperative@sandbox.com`, and
`state_agency@sandbox.com`. Existing `user.id.by-email` outputs are sufficient.

```text
P8_05C1A_DECISION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
C1_BLOCKERS_REMAINING=NONE
P8_05C1_IMPLEMENTATION_AUTHORIZED=YES
P8_05C1_IMPLEMENTATION_STATUS=NOT_STARTED
```

Authorization means the documented C1B source implementation may begin after
human review. It does not authorize schema changes, database execution, seed
execution, or changes to `admin-dev.seed.ts`.

## P8-05C1B Implementation Overlay

The C1 implementation uses the reviewed decisions without changing C2, C3,
C4, or admin DEV business payloads.

| Central source | C1 target | Implementation status |
| --- | --- | --- |
| `seedUsers` / `users` | ten canonical identities and ten outputs in `users.dev.users` | `MIGRATED` |
| `seedAddress` / `user_addresses` | no executable group; raw SELECT/INSERT removed | `DEFERRED_BY_PERSISTENCE_BOUNDARY`; central write `RETIRED` |
| `seedProfile` / four canonical Profile tables | `profiles.dev.role-profiles` and owner-local adapter | `MIGRATED` |
| `seedProfile` / `logistics_profiles` | no executable group under Phase 7A `DORMANT_DEFER` | `DEFERRED_BY_PERSISTENCE_BOUNDARY`; central write `RETIRED` |
| C1 targets in `resetAll` | removed; later-owner reset debt remains central | `RETIRED` for C1 targets only |

`legacy.dev.remaining` replaces the former direct central call during
decomposition. It is not a canonical owner group. Its dependencies are
`users.dev.users` and `products.dev.products`; it resolves the eight actor
aliases only through scoped `user.id.by-email` bindings. The Products edge
orders the existing repository load until C2 publishes approved Product
identities. No orchestrator-global output access is introduced.

The twelve remaining normal write methods are unchanged in ownership and stay
assigned to C2/C3/C4: `seedProducts`, `seedCategories`, `seedForum`,
`seedReviews`, `seedAdPackages`, `seedAdCampaigns`, `seedCoopMembers`,
`seedBulkListings`, `seedHarvestSchedules`, `seedViolations`, `seedAuditLogs`,
and `seedNotifications`. `resetAll` remains one destructive-write method for
C4; only its retired C1 targets were removed. Minimal actor-parameter changes
replace three unordered Users queries and are not later-owner migrations.

```text
P8_05C1_CENTRAL_NORMAL_WRITE_METHODS_REMAINING=12
P8_05C1_CENTRAL_DESTRUCTIVE_METHODS_REMAINING=1
P8_05C1_CENTRAL_PERSISTENCE_CAPABLE_METHODS_REMAINING=13
TEMPORARY_LEGACY_CONTINUATION=YES
TEMPORARY_LEGACY_GROUP_ID=legacy.dev.remaining
TEMPORARY_LEGACY_DEPENDENCIES=users.dev.users,products.dev.products
TARGET_RETIREMENT=P8_05C4
P8_05C2_BUSINESS_MIGRATIONS=0
P8_05C3_BUSINESS_MIGRATIONS=0
P8_05C4_LEAF_BUSINESS_MIGRATIONS=0
P8_05C1_EXIT_GATE=SATISFIED_IN_SOURCE_PENDING_HUMAN_REVIEW
```

No database, seed, migration, synchronization, SQL, DDL, or DML command was
executed. Disposable-database verification remains a later explicit gate.

## P8-05C2A Product-Dependent Decision Overlay

The authoritative Product, Review, Certification, Cooperative Member, Bulk
Listing, Contribution, Harvest, and determinism decisions are recorded in
[dev-seed-c2-decisions.md](dev-seed-c2-decisions.md). This overlay preserves
the historical P8-05C0 evidence and records the current decision result after
PR #112 implemented C1.

```text
P8_05C1_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_112
P8_05C2A_PRODUCT_DEPENDENT_DECISION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_05C2_IMPLEMENTATION_STATUS=NOT_STARTED
```

| Original C2 blocker | C2A decision | Status |
| --- | --- | --- |
| decide all 20 central Products | 11 map to existing SKUs and nine receive approved new SKUs; seller ownership distinguishes the four formerly conflicting fixtures | `RESOLVED` |
| Product Certification identity | Product UUID plus explicit deterministic certificate number; 0 creates, 1 reconciles, more than 1 fails closed | `RESOLVED` |
| nine positional Review Product references | all nine map by comment evidence to explicit Product SKUs | `RESOLVED` |
| Cooperative Member identity | current source has one explicit member; migration proves cooperative/farmer pair unique | `RESOLVED` |
| Bulk Listing identity | generated UUID and non-unique display title are the only candidates | `STILL_BLOCKED` |
| duplicate Listing/Farmer contributions | two rows share the pair and no persisted distinguishing business component exists | `STILL_BLOCKED` |
| three positional Harvest Product references | all three map by crop/notes evidence to `DEV-XOAI-HOA-LOC-001` | `RESOLVED` |
| Harvest Schedule identity | User/Product/date is not schema- or domain-proven unique | `STILL_BLOCKED` |
| C2 execution-time identity | four certificate numbers become explicit deterministic values; member join time is create-only non-identity and preserved on reconciliation | `RESOLVED` |

### P8-05C2A Human Product Decision Overlay

Human review resolves the four Product blockers by making seller ownership
identity-relevant for DEV fixtures. `CP-03`, `CP-12`, `CP-13`, and `CP-17`
become distinct additions with explicit seller-qualified SKUs; the four
previous candidate SKUs and their existing canonical Products remain
unchanged. `REV-04` follows retained `CP-03` through
`DEV-BUOI-DA-XANH-FARMER-001`.

```text
HUMAN_PRODUCT_DECISION_STATUS=RESOLVED
NEW_HUMAN_APPROVED_PRODUCT_COUNT=4
NEW_HUMAN_APPROVED_SKU_COLLISIONS=0
PRODUCT_MAPPING_BLOCKER=NONE

ORDINARY_MAP_EXISTING_COUNT=11
ORDINARY_ADD_NEW_COUNT=7
ORDINARY_RETIRE_COUNT=0
ORDINARY_UNRESOLVED_COUNT=0
VIOLATION_ADD_NEW_COUNT=2
VIOLATION_UNRESOLVED_COUNT=0

MAP_EXISTING_COUNT=11
ADD_NEW_COUNT=9
RETIRE_COUNT=0
UNRESOLVED_COUNT=0
CURRENT_CANONICAL_PRODUCT_COUNT=54
TARGET_CANONICAL_PRODUCT_COUNT=63
TARGET_PRODUCT_OUTPUT_COUNT=63
```

The implementation boundary is split so that Product output, Reviews, and
Cooperative operations can be reviewed independently. C2B is authorized by the
resolved Product decisions. C2C's decision surface is resolved but its runtime
implementation waits for the C2B output. C2D retains three domain/stable-key
blockers, so the whole C2 scope is not authorized.

```text
P8_05C2B_PRODUCTS_EXTENSION=PRODUCTS_CERTIFICATIONS_AND_PRODUCT_ID_BY_SKU
P8_05C2B_IMPLEMENTATION_AUTHORIZED=YES
P8_05C2B_BLOCKERS=NONE

P8_05C2C_REVIEWS=EXPLICIT_REVIEWER_EMAIL_AND_PRODUCT_SKU_FIXTURES
P8_05C2C_DECISION_STATUS=RESOLVED
P8_05C2C_IMPLEMENTATION_AUTHORIZED=NO
P8_05C2C_BLOCKERS=P8_05C2B_PRODUCT_OUTPUT_NOT_IMPLEMENTED

P8_05C2D_COOPERATIVES=MEMBERS_LISTINGS_CONTRIBUTIONS_AND_HARVEST
P8_05C2D_IMPLEMENTATION_AUTHORIZED=NO
P8_05C2D_BLOCKERS=BULK_LISTING_IDENTITY; BULK_CONTRIBUTION_IDENTITY; HARVEST_SCHEDULE_IDENTITY

P8_05C2_IMPLEMENTATION_AUTHORIZED=NO
P8_05C2D_DECISIONS_BLOCKED
STOP_REASON=COOPERATIVE_OPERATION_STABLE_IDENTITIES_REQUIRE_DOMAIN_DECISION
```

No Product, Review, Cooperative, C3, C4, admin DEV, schema, or migration source
is changed by C2A. The temporary `legacy.dev.remaining` group remains active.

## P8-05C2B Products Implementation Overlay

C2B moves the approved Product-owned writes while preserving C2A history and
the unresolved C2D decisions. The canonical Products group now reconciles 63
Products, their managed primary image slots, and four deterministic
Certifications before publishing all 63 `product.id.by-sku` bindings.

| Central source/write section | C2B disposition | Current result |
| --- | --- | --- |
| `seedProducts` / `products` | `MIGRATED` | 54 canonical definitions preserved; nine approved definitions added under `products.dev.products` |
| `seedProducts` / `product_images` | `MIGRATED` | canonical primary-slot convergence retained; seven source-specific C2B images added; violation Products declare no image |
| `seedProducts` / `product_certifications` | `MIGRATED` | four deterministic Product-ID/certificate-number fixtures with fail-closed preflight |
| `seedCategories` / `product_categories` | `RETIRED_DUPLICATE` | only `products.reference.categories` produces the 37-row catalog |
| `seedViolations` / `products` | `MIGRATED` | two suspended SKU fixtures owned by Products; central Product write removed |
| C2B tables in `resetAll` | `RETIRED` | Product Categories, Products, Product Images, and Product Certifications removed from central destructive targets |

`seedViolations` contained Product creation only. Its removal does not remove a
co-located Audit Log or Notification write: those C4 fixtures live in the
independent `seedAuditLogs` and `seedNotifications` methods and remain
temporarily reachable.

```text
PRODUCT_WRITE_PORTION=RETIRED
C4_SIDE_EFFECT_PORTION=INDEPENDENT_AUDIT_AND_NOTIFICATION_METHODS_RETAINED_TEMPORARILY

P8_05C2B_CENTRAL_NORMAL_WRITE_METHODS_REMAINING=9
P8_05C2B_CENTRAL_DESTRUCTIVE_METHODS_REMAINING=1
P8_05C2B_CENTRAL_PERSISTENCE_CAPABLE_METHODS_REMAINING=10
P8_05C2B_CENTRAL_BUSINESS_TABLES_REMAINING=12

CENTRAL_CATEGORY_BUSINESS_WRITES=0
CENTRAL_PRODUCT_BUSINESS_WRITES=0
CENTRAL_PRODUCT_IMAGE_BUSINESS_WRITES=0
CENTRAL_PRODUCT_CERTIFICATION_BUSINESS_WRITES=0
VIOLATION_PRODUCT_WRITES_AFTER_C2B=0
```

The nine remaining normal methods are `seedForum`, `seedReviews`,
`seedAdPackages`, `seedAdCampaigns`, `seedCoopMembers`, `seedBulkListings`,
`seedHarvestSchedules`, `seedAuditLogs`, and `seedNotifications`. Review and
Harvest receive explicit scalar IDs only as transition wiring. Bulk Listing
and Contribution receive no Product parameter. No C2C or C2D persistence
ownership moves in this slice.

```text
TEMPORARY_LEGACY_CONTINUATION=YES
TEMPORARY_LEGACY_GROUP_ID=legacy.dev.remaining
TEMPORARY_LEGACY_DEPENDENCIES=users.dev.users,products.dev.products
PRODUCT_SCALAR_IDS_PASSED_TO_LEGACY_CONTINUATION=8
CENTRAL_POSITIONAL_PRODUCT_QUERY_DEPENDENCIES=0
CENTRAL_PRODUCT_REPOSITORY_QUERIES_FOR_DEV_SEED=0

P8_05C2A_PRODUCT_DEPENDENT_DECISION_STATUS=IMPLEMENTED_BY_MERGED_PR_113
P8_05C2B_IMPLEMENTATION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_05C2C_DECISION_STATUS=RESOLVED
P8_05C2C_IMPLEMENTATION_STATUS=NOT_STARTED
P8_05C2D_IMPLEMENTATION_STATUS=NOT_STARTED
P8_05C2D_IMPLEMENTATION_AUTHORIZED=NO
P8_05C2_IMPLEMENTATION_STATUS=IN_PROGRESS

BULK_LISTING_STABLE_KEY=NONE_PROVEN
CONTRIBUTION_STABLE_KEY=NONE_PROVEN
HARVEST_SCHEDULE_STABLE_KEY=NONE_PROVEN
```

## P8-05C2C Reviews Ownership Overlay

PR #114 merged C2B into `develop`. C2C moves exactly the nine approved Product
Review fixtures into `reviews.dev.product-feedback`, using explicit reviewer
email and Product SKU declarations. Its dedicated Reviews infrastructure
writer looks up the unique reviewer-ID/Product-ID pair, preflights every
identity, and converges each record independently. It does not extend the
normal runtime Reviews repository with generic DEV-only operations.

| Central source/write section | C2C disposition | Current result |
| --- | --- | --- |
| `seedReviews` / `reviews` | `MIGRATED` | nine explicit fixtures owned by `reviews.dev.product-feedback` |
| Review repository/entity access in `DevSeedService` | `RETIRED` | no central Review query, entity import, or business write remains |
| Review Product position/alias wiring | `RETIRED` | User email and Product SKU outputs resolve inside the Reviews owner group |
| Review target in `resetAll` | `RETIRED` | no central destructive Review target remains |

The eight central normal write methods now remaining are `seedForum`,
`seedAdPackages`, `seedAdCampaigns`, `seedCoopMembers`, `seedBulkListings`,
`seedHarvestSchedules`, `seedAuditLogs`, and `seedNotifications`. They write
eleven business tables: three Forum tables, two Ads tables, four Cooperative
operation tables, Audit Logs, and Notifications. `resetAll` remains the one
central destructive method and is still C4 retirement debt.

```text
P8_05C2C_SEED_REVIEWS_STATUS=MIGRATED
P8_05C2C_CENTRAL_NORMAL_WRITE_METHODS_REMAINING=8
P8_05C2C_CENTRAL_DESTRUCTIVE_METHODS_REMAINING=1
P8_05C2C_CENTRAL_PERSISTENCE_CAPABLE_METHODS_REMAINING=9
P8_05C2C_CENTRAL_BUSINESS_TABLES_REMAINING=11

REVIEWS_DEV_GROUP_ID=reviews.dev.product-feedback
REVIEW_DEV_RECORD_COUNT=9
REVIEW_DEV_IDEMPOTENCY=PER_RECORD_BY_REVIEWER_ID_AND_PRODUCT_ID
REVIEW_PREFLIGHT=ALL_NINE_IDENTITIES_BEFORE_FIRST_WRITE
CENTRAL_REVIEW_BUSINESS_WRITES=0
CENTRAL_REVIEW_REPOSITORY_QUERIES=0
CENTRAL_RESET_REVIEW_TARGETS=0

TEMPORARY_LEGACY_CONTINUATION=YES
TEMPORARY_LEGACY_GROUP_ID=legacy.dev.remaining
PRODUCT_SCALAR_IDS_PASSED_TO_LEGACY_CONTINUATION=1
LEGACY_REMAINING_PRODUCT_SKUS=DEV-XOAI-HOA-LOC-001
LEGACY_REVIEW_PRODUCT_ALIASES_REMAINING=0

P8_05C2B_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_114
P8_05C2C_IMPLEMENTATION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_05C2D_IMPLEMENTATION_STATUS=NOT_STARTED
P8_05C2D_IMPLEMENTATION_AUTHORIZED=NO
P8_05C2_IMPLEMENTATION_STATUS=IN_PROGRESS

BULK_LISTING_STABLE_KEY=NONE_PROVEN
CONTRIBUTION_STABLE_KEY=NONE_PROVEN
HARVEST_SCHEDULE_STABLE_KEY=NONE_PROVEN
```

C2C does not move Cooperative Member, Bulk Listing, Contribution, or Harvest
Schedule persistence. Harvest alone retains the Xoài Product UUID through the
narrow temporary continuation. Forum, Ads, Audit Logs, and Notifications are
unchanged except for compile-safe continuation wiring.

## P8-05C2D0 Pre-Human-Review Identity And Grouping Overlay

PR #115 merged C2C at
`c2304b0afb1e6022d7deae4dff49c0e5589ca542`. The C2D0 source, schema, domain,
and Git-history audit is documented in
[dev-seed-c2d-decisions.md](dev-seed-c2d-decisions.md). It changes no runtime
source and preserves the historical C2 decomposition evidence above.

The target is no longer one coupled `cooperatives.dev.operations` group.
Member and Harvest have independent stable identities and retry boundaries,
while Listing and Contribution must remain one bulk workflow so the generated
Listing UUID stays owner-local. Only Harvest consumes Product output. No
Cooperative UUID has a proven external consumer.

```text
P8_05C2C_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_115
P8_05C2D0_IDENTITY_DECISION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW

C2D_GROUPING_DECISION=SPLIT_OWNER_LOCALLY_BY_MEMBER_BULK_WORKFLOW_AND_HARVEST
COOPERATIVE_DEV_GROUPS=cooperatives.dev.members,cooperatives.dev.bulk-operations,cooperatives.dev.harvest
COOPERATIVE_DEV_OUTPUT_COUNT=0

COOPERATIVE_MEMBER_STABLE_KEY=cooperative User ID + farmer User ID
BULK_LISTING_STABLE_KEY=NONE_PROVEN
CONTRIBUTION_STABLE_KEY=listing ID + farmer User ID
CONTRIBUTION_KEY_CONDITION=BLC_02_RETIRE_DUPLICATE_FIXTURE_PENDING_HUMAN_REVIEW
HARVEST_SCHEDULE_STABLE_KEY=user ID + product ID + expected harvest date

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
```

## P8-05C2D0 Human-Review Authorization Overlay

This overlay supersedes the combined Member/Harvest authorization in the
pre-human-review C2D0 proposal. The three conceptual owner-local groups remain,
but their implementation readiness now differs. Members is schema-resolved;
Bulk Operations is blocked only by its parent Listing identity after approved
BLC-02 retirement; Harvest is blocked because its mutable expected date is not
a stable reconciliation identity.

```text
P8_05C2D0_IDENTITY_DECISION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
C2D_GROUPING_DECISION=SPLIT_OWNER_LOCALLY_BY_MEMBER_BULK_WORKFLOW_AND_HARVEST
COOPERATIVE_DEV_GROUPS=cooperatives.dev.members,cooperatives.dev.bulk-operations,cooperatives.dev.harvest

COOPERATIVE_MEMBER_STABLE_KEY=cooperative User ID + farmer User ID
BULK_LISTING_STABLE_KEY=NONE_PROVEN
BULK_LISTING_IDENTITY_STATUS=UNRESOLVED
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
HARVEST_SCHEDULE_STABLE_KEY=NONE_PROVEN
HARVEST_IDENTITY_STATUS=UNRESOLVED_MUTABLE_DATE_NOT_STABLE_IDENTITY
HARVEST_PRODUCT_MAPPING_STATUS=RESOLVED
HARVEST_PERSISTENCE_IDENTITY_STATUS=UNRESOLVED
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

The `seedCoopMembers` / `cooperative_members` row below is now migrated to the
Cooperatives owner. Historical inventory rows above remain unchanged as audit
evidence.

| Central source/write section | C2D1 disposition | Current result |
| --- | --- | --- |
| `seedCoopMembers` / `cooperative_members` | `MIGRATED` | one fixture owned by `cooperatives.dev.members` |
| central Cooperative Member entity/repository access | `RETIRED` | no central Member query, import, or write |
| `cooperative_members` in central `resetAll` | `RETIRED` | blocked Listing, Contribution, and Harvest reset targets remain |
| Member row output | `NOT_REQUIRED` | remaining central methods consume actor UUIDs, not the Member UUID |

After C2D1, seven central normal write methods remain: `seedForum`,
`seedAdPackages`, `seedAdCampaigns`, `seedBulkListings`,
`seedHarvestSchedules`, `seedAuditLogs`, and `seedNotifications`. They write
ten business tables. `resetAll` remains the one central destructive method, so
eight central persistence-capable methods remain.

```text
P8_05C2D0_IDENTITY_DECISION_STATUS=IMPLEMENTED_BY_MERGED_PR_116
P8_05C2D1_MEMBERS_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_117

COOPERATIVES_DEV_MEMBERS_GROUP_ID=cooperatives.dev.members
COOPERATIVE_MEMBER_DEV_RECORD_COUNT=1
COOPERATIVE_MEMBER_DEV_DEPENDENCIES=users.dev.users
COOPERATIVE_MEMBER_DEV_OUTPUT_COUNT=0
COOPERATIVE_MEMBER_JOINED_AT_CREATE_POLICY=CURRENT_EXECUTION_TIME_ON_CREATE
COOPERATIVE_MEMBER_JOINED_AT_RECONCILE_POLICY=PRESERVE_EXISTING_VALUE

P8_05C2D1_CENTRAL_NORMAL_WRITE_METHODS_REMAINING=7
P8_05C2D1_CENTRAL_DESTRUCTIVE_METHODS_REMAINING=1
P8_05C2D1_CENTRAL_PERSISTENCE_CAPABLE_METHODS_REMAINING=8
P8_05C2D1_CENTRAL_BUSINESS_TABLES_REMAINING=10
CENTRAL_COOPERATIVE_MEMBER_BUSINESS_WRITES=0
CENTRAL_COOPERATIVE_MEMBER_REPOSITORY_QUERIES=0
CENTRAL_RESET_COOPERATIVE_MEMBER_TARGETS=0
C2D_REMAINING_RESET_TARGETS=bulk_listings,bulk_listing_contributions,harvest_schedules

BULK_LISTING_STABLE_KEY=NONE_PROVEN
CONTRIBUTION_STABLE_KEY=listing ID + farmer User ID
CONTRIBUTION_IDENTITY_STATUS=RESOLVED_BY_APPROVED_DUPLICATE_RETIREMENT
HARVEST_SCHEDULE_STABLE_KEY=NONE_PROVEN
HARVEST_IDENTITY_STATUS=UNRESOLVED_MUTABLE_DATE_NOT_STABLE_IDENTITY
P8_05C2D2_BUSINESS_MIGRATIONS=0
P8_05C2D3_BUSINESS_MIGRATIONS=0
P8_05C2D_IMPLEMENTATION_STATUS=IN_PROGRESS
P8_05C2_IMPLEMENTATION_STATUS=IN_PROGRESS
```
Proposed owner-local edges:

```text
users.dev.users/user.id.by-email -> cooperatives.dev.members
users.dev.users/user.id.by-email -> cooperatives.dev.bulk-operations
users.dev.users/user.id.by-email -> cooperatives.dev.harvest
products.dev.products/product.id.by-sku -> cooperatives.dev.harvest
```

## P8-05C3A Forum And Ads Identity Decision Overlay

This overlay records the audit and decision outcome for the Forum and Ads content/marketing fixtures.
PR #117 is merged into `develop` at `052225d4b86edf18ba52bf7e46a9765a40b787b2`.

```text
P8_05C2D1_MEMBERS_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_117
P8_05C3A_FORUM_ADS_DECISION_STATUS=IMPLEMENTED_BY_MERGED_PR_119
P8_05C3_IMPLEMENTATION_STATUS=NOT_STARTED

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
```

## P8-05C4A Audit Log And Notification Identity Decision Overlay

This overlay records the audit and decision outcome for the Audit Log and Notification leaf fixtures.
PR #119 is merged into `develop` at `5ad0b67c7c45bc3432e3075a6b779df9936ac484`.

```text
P8_05C3A_FORUM_ADS_DECISION_STATUS=IMPLEMENTED_BY_MERGED_PR_119
P8_05C4A_AUDIT_LOG_NOTIFICATION_DECISION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_05C4_IMPLEMENTATION_STATUS=NOT_STARTED

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

BUSINESS_IMPLEMENTATION_CHANGES=0
SCHEMA_CHANGES=0
MIGRATIONS_CREATED=0
```

## P8-05C4BC Audit Log And Notification Retirement Overlay

Following human review and merge of decision PR #120, this slice retires only
the central Audit Log and Notification synthetic DEV fixtures and their reset
targets. The five blocked C2D/C3 write methods, `resetAll`,
`legacy.dev.remaining`, and the Harvest Product scalar bridge remain unchanged.
No replacement C4 DEV SeedGroup is introduced. Earlier C0 target-group rows are
preserved as historical planning evidence and are superseded by C4A.

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

The standalone Admin DEV decision record is
[admin-dev-seed-decisions.md](admin-dev-seed-decisions.md). Current source has
seven repository-backed write sections across seven tables owned by Users,
Profiles, and Products. The Admin User maps to the canonical Users DEV Admin;
eight other Users are distinct extension candidates. Eight Profile identities
are resolved, and human review preserves their geography scalars as opaque
legacy owner metadata under P8-05C1. Ten Products declare no SKU, so they and
their ten Images remain identity-blocked.

```text
P8_05C4B_AUDIT_LOG_RETIREMENT_STATUS=IMPLEMENTED_BY_MERGED_PR_121
P8_05C4C_NOTIFICATION_RETIREMENT_STATUS=IMPLEMENTED_BY_MERGED_PR_121
P8_05C4D_CENTRAL_RETIREMENT_AUTHORIZED=NO

P8_05D0_ADMIN_DEV_DECISION_STATUS=IMPLEMENTED_BY_MERGED_PR_122
P8_05D_IMPLEMENTATION_STATUS=IN_PROGRESS
ADMIN_DEV_TARGET_STRATEGY=PARTIAL_MAP_PARTIAL_RETIRE_WITH_BLOCKERS

ADMIN_DEV_WRITE_METHOD_COUNT=1
ADMIN_DEV_WRITE_SECTION_COUNT=7
ADMIN_DEV_TABLE_COUNT=7
ADMIN_DEV_OWNER_COUNT=3
ADMIN_DEV_UNRESOLVED_IDENTITY_COUNT=20
ADMIN_DEV_MAP_EXISTING_COUNT=1
ADMIN_DEV_EXTENSION_CANDIDATE_COUNT=16

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

The existing `users.dev.users` SeedGroup owns all 18 current Users DEV
fixtures after adding the eight distinct dashboard actors. The standalone
Admin DEV path invokes that owner group and consumes its `user.id.by-email`
scalars for the retained Profile and Product sections; it no longer contains a
User writer or User repository access.

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

After merged PR #123, the existing Profiles DEV owner group absorbs the eight
approved dashboard Profile fixtures without introducing another group or
output kind. Its only dependency remains `users.dev.users`, and all twelve
owner fixtures complete identity preflight before the first Profile write.

The guarded standalone CLI now orchestrates Users, then Profiles, then its
unchanged Product/Image section. Direct standalone Profile business access is
zero. Four Profile entity registrations remain as temporary DataSource wiring
for the owner group and are deferred to D4; D3 remains unauthorized and is the
only current D4 blocker.

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
