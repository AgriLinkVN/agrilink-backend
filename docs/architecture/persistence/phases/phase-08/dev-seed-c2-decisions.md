# P8-05C2A Product-Dependent Fixture Decisions

## Decision Status

```text
DECISION_ID=P8_05C2A_PRODUCT_DEPENDENT_FIXTURE_DECISIONS
DECISION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
CLASSIFICATION=DEV
SOURCE=src/database/dev-seed.service.ts
BASE_COMMIT=b1988e27fcfeaf2c03baad762ff609c59ed18cd4
BASE_PR=112

P8_05C2_IMPLEMENTATION_STATUS=NOT_STARTED
HUMAN_PRODUCT_DECISION_STATUS=RESOLVED
P8_05C2B_IMPLEMENTATION_AUTHORIZED=YES
P8_05C2C_DECISION_STATUS=RESOLVED
P8_05C2C_IMPLEMENTATION_AUTHORIZED=NO
P8_05C2D_IMPLEMENTATION_AUTHORIZED=NO
P8_05C2_IMPLEMENTATION_AUTHORIZED=NO
P8_05C2A_DECISION_READINESS=C2B_AUTHORIZED_C2D_BLOCKED
```

This is a static audit and decision record. It does not migrate business
fixtures, change payloads, execute a seed, connect to a database, or authorize
schema work. Counts are declarations in current source, not database rows.

## Evidence And Constraints

The evidence boundary is current source at the PR #112 merge commit, the
accepted Phase 8 ownership and dependency contracts, TypeORM entities,
repository ports/adapters, reviewed migrations, and the canonical V2 catalog.
The protected local database and production were not queried.

The governing constraints are:

- Product name, query order, array position, generated UUID, and execution time
  are not fixture identity.
- Cross-owner identifiers use scalar outputs scoped to declared dependencies.
- The Product owner does not expose entities or repositories to Reviews or
  Cooperatives.
- A seed-level key without a database uniqueness constraint must use persisted
  business fields and fail closed when more than one row matches.
- The existing 54 Product SKUs remain unchanged.
- A missing domain identity is recorded as a blocker; this decision does not
  add a column, constraint, or migration to manufacture one.

## Current Central C2 State

PR #112 removed all central User, Address, Profile, and Logistics business
writes. The temporary `legacy.dev.remaining` group remains active and invokes
the remaining central service after `users.dev.users` and
`products.dev.products`.

```text
CENTRAL_USER_BUSINESS_WRITES=0
CENTRAL_PROFILE_BUSINESS_WRITES=0
CENTRAL_ADDRESS_BUSINESS_WRITES=0
CENTRAL_LOGISTICS_BUSINESS_WRITES=0

TEMPORARY_LEGACY_CONTINUATION=YES
TEMPORARY_LEGACY_GROUP_ID=legacy.dev.remaining

CENTRAL_NORMAL_WRITE_METHODS_REMAINING=12
CENTRAL_DESTRUCTIVE_METHODS_REMAINING=1
```

The twelve normal methods are `seedProducts`, `seedCategories`, `seedForum`,
`seedReviews`, `seedAdPackages`, `seedAdCampaigns`, `seedCoopMembers`,
`seedBulkListings`, `seedHarvestSchedules`, `seedViolations`, `seedAuditLogs`,
and `seedNotifications`. This C2A record covers the seven Product-dependent
methods. `resetAll` remains temporary C4 destructive debt. C3 and C4 methods
are unchanged.

## 1. Central Ordinary Product Inventory

Seller aliases below resolve through the C1 actor contract:
`farmer.id` is `farmer@sandbox.com`, `coop.id` is
`cooperative@sandbox.com`, and `supplier.id` maps to
`supplier@agrilink.vn`. Every row is `ACTIVE`.

| ID      | Display name            | Category          | Seller / type                           | Price / unit    | Quantity / minimum | Farming     | Harvest    | Other meaningful fields                                                                 |
| ------- | ----------------------- | ----------------- | --------------------------------------- | --------------- | ------------------ | ----------- | ---------- | --------------------------------------------------------------------------------------- |
| `CP-01` | Xoài cát Hòa Lộc        | `trai-cay`        | `farmer@sandbox.com` / FARMER           | 45,000 / KG     | 500 / 10           | VIETGAP     | 2026-06-15 | view 1284; Tiền Giang, sweet/low-fibre description; Product-specific primary image      |
| `CP-02` | Sầu riêng Ri6           | `trai-cay`        | `cooperative@sandbox.com` / COOPERATIVE | 85,000 / KG     | 600 / 5            | VIETGAP     | 2026-07-15 | view 3250; Cai Lậy, yellow flesh/small seed description; Product-specific primary image |
| `CP-03` | Bưởi da xanh Bến Tre    | `trai-cay`        | `farmer@sandbox.com` / FARMER           | 32,000 / KG     | 800 / 10           | VIETGAP     | 2026-07-01 | view 1120; pink, seedless, juicy description; Product-specific primary image            |
| `CP-04` | Thanh long ruột đỏ      | `trai-cay`        | `cooperative@sandbox.com` / COOPERATIVE | 35,000 / KG     | 1000 / 50          | GLOBALGAP   | 2026-06-20 | view 2105; Bình Thuận export description; Product-specific primary image                |
| `CP-05` | Dưa hấu không hạt       | `trai-cay`        | `farmer@sandbox.com` / FARMER           | 18,000 / KG     | 3000 / 30          | TRADITIONAL | 2026-06-10 | view 987; Long An, sweet/thin-rind description; Product-specific primary image          |
| `CP-06` | Vải thiều Lục Ngạn      | `trai-cay`        | `supplier@agrilink.vn` / SUPPLIER       | 42,000 / KG     | 1500 / 20          | GLOBALGAP   | 2026-06-05 | view 4120; Bắc Giang/export description; Product-specific primary image                 |
| `CP-07` | Rau muống hữu cơ Đà Lạt | `rau-cu-qua`      | `farmer@sandbox.com` / FARMER           | 25,000 / KG     | 200 / 5            | ORGANIC     | 2026-06-01 | view 892; pesticide-free description; Product-specific primary image                    |
| `CP-08` | Cà rốt Đà Lạt           | `rau-cu-qua`      | `farmer@sandbox.com` / FARMER           | 22,000 / KG     | 400 / 10           | VIETGAP     | 2026-06-05 | view 645; fresh/crisp description; Product-specific primary image                       |
| `CP-09` | Gạo ST25 đặc sản        | `lua-gao-ngu-coc` | `farmer@sandbox.com` / FARMER           | 28,000 / KG     | 2000 / 20          | VIETGAP     | 2026-05-30 | view 5432; Sóc Trăng/world-award description; Product-specific primary image            |
| `CP-10` | Gạo Jasmine thơm        | `lua-gao-ngu-coc` | `farmer@sandbox.com` / FARMER           | 24,000 / KG     | 1500 / 20          | TRADITIONAL | 2026-04-20 | view 3210; Cần Thơ aromatic-rice description; Product-specific primary image            |
| `CP-11` | Cà phê Arabica Cầu Đất  | `ca-phe-che`      | `farmer@sandbox.com` / FARMER           | 120,000 / KG    | 150 / 2            | ORGANIC     | 2025-12-01 | view 764; 1500m/organic/roasted description; Product-specific primary image             |
| `CP-12` | Cà phê Robusta BMT      | `ca-phe-che`      | `supplier@agrilink.vn` / SUPPLIER       | 95,000 / KG     | 500 / 5            | VIETGAP     | 2025-12-15 | view 2890; dark-roast description; Product-specific primary image                       |
| `CP-13` | Tiêu đen Phú Quốc       | `gia-vi-thao-moc` | `supplier@agrilink.vn` / SUPPLIER       | 180,000 / KG    | 200 / 1            | TRADITIONAL | 2026-03-01 | view 3210; OCOP 5-star description; Product-specific primary image                      |
| `CP-14` | Gừng tươi hữu cơ        | `gia-vi-thao-moc` | `farmer@sandbox.com` / FARMER           | 45,000 / KG     | 400 / 5            | ORGANIC     | 2026-04-20 | view 1320; Kỳ Sơn/high-oil description; Product-specific primary image                  |
| `CP-15` | Hạt điều rang muối W320 | `hat-dau`         | `cooperative@sandbox.com` / COOPERATIVE | 180,000 / KG    | 500 / 2            | VIETGAP     | 2026-03-01 | view 3456; Bình Phước/W320 description; Product-specific primary image                  |
| `CP-16` | Đậu phộng rang          | `hat-dau`         | `farmer@sandbox.com` / FARMER           | 55,000 / KG     | 1200 / 10          | TRADITIONAL | 2026-05-01 | view 867; roasted finished-product description; Product-specific primary image          |
| `CP-17` | Mật ong hoa nhãn        | `mat-ong-dac-san` | `cooperative@sandbox.com` / COOPERATIVE | 180,000 / LITER | 200 / 1            | ORGANIC     | 2026-07-01 | view 2670; Hưng Yên/pure honey description; Product-specific primary image              |
| `CP-18` | Hoa cúc vàng Đà Lạt     | `hoa-cay-canh`    | `farmer@sandbox.com` / FARMER           | 45,000 / BUNCH  | 500 / 5            | VIETGAP     | 2026-06-05 | view 1120; 20 stems/bunch description; Product-specific primary image                   |

The central image URLs are per-product Unsplash intents. The current canonical
DEV writer gives every existing record one shared fallback image. Therefore no
central row is an exact full-payload duplicate even when all identity-relevant
and commercial fields agree.

All ten slugs written by central `seedCategories` already exist in
`products.reference.categories`. Their schema-backed slug identities are exact
duplicates. C2B removes the central category writer and continues to consume
`category.id.by-slug`; it does not copy those REFERENCE rows into DEV.

```text
CENTRAL_CATEGORY_RECORD_COUNT=10
CENTRAL_CATEGORY_DECISION=REMOVE_DUPLICATE_WRITE_AND_REUSE_PRODUCTS_REFERENCE_CATEGORIES
```

## 2. Product Map, Add, Retire Decisions

`PARTIAL_SEMANTIC_MATCH` is sufficient for mapping only when seller persona,
category, price, unit, quantities, farming type, status, view count, and
harvest date all agree and the description identifies the same fixture. On a
map, the richer canonical description, expiry, name, and current canonical
image slot remain authoritative; the central image is retired rather than
overwriting the canonical record.

| ID      | Canonical match candidate     | Evidence class            | Decision                                     | Canonical or proposed SKU            | Evidence / unresolved difference                                                                                  |
| ------- | ----------------------------- | ------------------------- | -------------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `CP-01` | Xoài cát Hòa Lộc loại 1       | `PARTIAL_SEMANTIC_MATCH`  | `MAP_TO_EXISTING_CANONICAL_SKU`              | `DEV-XOAI-HOA-LOC-001`               | all commercial fields, seller, date, category, farming, status and view count agree; canonical wording is richer  |
| `CP-02` | Sầu riêng Ri6 Cai Lậy         | `PARTIAL_SEMANTIC_MATCH`  | `MAP_TO_EXISTING_CANONICAL_SKU`              | `DEV-SAU-RIENG-RI6-001`              | all commercial fields and seller/date/category agree; same Cai Lậy fixture                                        |
| `CP-03` | Bưởi da xanh Bến Tre          | `PARTIAL_SEMANTIC_MATCH`  | `ADD_TO_CANONICAL_PRODUCTS_DEV_WITH_NEW_SKU` | `DEV-BUOI-DA-XANH-FARMER-001`        | seller is identity-relevant; preserve the central Farmer payload without changing the Cooperative-owned Product   |
| `CP-04` | Thanh long ruột đỏ xuất khẩu  | `PARTIAL_SEMANTIC_MATCH`  | `MAP_TO_EXISTING_CANONICAL_SKU`              | `DEV-THANH-LONG-RUOT-DO-001`         | all commercial fields, seller, date, category, farming, status and view count agree                               |
| `CP-05` | Dưa hấu không hạt Long An     | `PARTIAL_SEMANTIC_MATCH`  | `MAP_TO_EXISTING_CANONICAL_SKU`              | `DEV-DUA-HAU-KHONG-HAT-001`          | all commercial fields and seller/date/category agree; canonical name supplies location                            |
| `CP-06` | Vải thiều Lục Ngạn Bắc Giang  | `PARTIAL_SEMANTIC_MATCH`  | `MAP_TO_EXISTING_CANONICAL_SKU`              | `DEV-VAI-THIEU-LUC-NGAN-001`         | all commercial fields and supplier/date/category agree                                                            |
| `CP-07` | Rau muống hữu cơ Đà Lạt       | `PARTIAL_SEMANTIC_MATCH`  | `MAP_TO_EXISTING_CANONICAL_SKU`              | `DEV-RAU-MUONG-HUU-CO-001`           | exact name plus all commercial fields, seller, date and category agree                                            |
| `CP-08` | none                          | `NO_CANONICAL_EQUIVALENT` | `ADD_TO_CANONICAL_PRODUCTS_DEV_WITH_NEW_SKU` | `DEV-CA-ROT-DA-LAT-001`              | distinct retained fixture and Review consumer; no canonical carrot Product                                        |
| `CP-09` | Gạo ST25 đặc sản Sóc Trăng    | `PARTIAL_SEMANTIC_MATCH`  | `MAP_TO_EXISTING_CANONICAL_SKU`              | `DEV-GAO-ST25-001`                   | all commercial fields, seller, date, category, farming, status and view count agree                               |
| `CP-10` | none                          | `NO_CANONICAL_EQUIVALENT` | `ADD_TO_CANONICAL_PRODUCTS_DEV_WITH_NEW_SKU` | `DEV-GAO-JASMINE-THOM-001`           | distinct retained fixture with certification; no canonical Jasmine Product                                        |
| `CP-11` | Cà phê Arabica Cầu Đất Đà Lạt | `PARTIAL_SEMANTIC_MATCH`  | `MAP_TO_EXISTING_CANONICAL_SKU`              | `DEV-CA-PHE-ARABICA-001`             | all commercial fields, seller, date, category, farming, status and view count agree                               |
| `CP-12` | Cà phê Robusta Buôn Ma Thuột  | `PARTIAL_SEMANTIC_MATCH`  | `ADD_TO_CANONICAL_PRODUCTS_DEV_WITH_NEW_SKU` | `DEV-CA-PHE-ROBUSTA-SUPPLIER-001`    | seller and price are identity-relevant; preserve the 95,000 Supplier payload and existing Cooperative Product     |
| `CP-13` | Tiêu đen Phú Quốc             | `PARTIAL_SEMANTIC_MATCH`  | `ADD_TO_CANONICAL_PRODUCTS_DEV_WITH_NEW_SKU` | `DEV-TIEU-DEN-PHU-QUOC-SUPPLIER-001` | seller is identity-relevant; preserve the central Supplier payload without changing the Cooperative-owned Product |
| `CP-14` | Gừng tươi hữu cơ Kỳ Sơn       | `PARTIAL_SEMANTIC_MATCH`  | `MAP_TO_EXISTING_CANONICAL_SKU`              | `DEV-GUNG-TUOI-HUU-CO-001`           | all commercial fields, seller, date, category, farming, status and view count agree                               |
| `CP-15` | Hạt điều rang muối W320       | `PARTIAL_SEMANTIC_MATCH`  | `MAP_TO_EXISTING_CANONICAL_SKU`              | `DEV-HAT-DIEU-W320-001`              | exact name plus all commercial fields, seller, date and category agree                                            |
| `CP-16` | Đậu phộng đỏ Bình Định        | `NO_CANONICAL_EQUIVALENT` | `ADD_TO_CANONICAL_PRODUCTS_DEV_WITH_NEW_SKU` | `DEV-DAU-PHONG-RANG-001`             | central row is a 55,000 roasted product; candidate is a distinct 35,000 raw red-peanut product                    |
| `CP-17` | Mật ong hoa nhãn nguyên chất  | `PARTIAL_SEMANTIC_MATCH`  | `ADD_TO_CANONICAL_PRODUCTS_DEV_WITH_NEW_SKU` | `DEV-MAT-ONG-HOA-NHAN-COOP-001`      | seller is identity-relevant; preserve the central Cooperative payload without changing the Farmer-owned Product   |
| `CP-18` | Hoa cúc vàng Đà Lạt           | `PARTIAL_SEMANTIC_MATCH`  | `MAP_TO_EXISTING_CANONICAL_SKU`              | `DEV-HOA-CUC-VANG-001`               | exact name plus all commercial fields, seller, date and category agree                                            |

### Human Product Decision Overlay

Human review establishes that seller ownership is identity-relevant for DEV
Product fixtures. A seller difference creates a distinct Product even when the
name and other commercial fields match; a seller plus price difference is
stronger distinct-fixture evidence. The pre-review blockers and candidate
canonical SKUs remain recorded here rather than being erased.

| ID      | Pre-review state                                                 | Human decision                             | New SKU                              | Existing SKU preserved unchanged |
| ------- | ---------------------------------------------------------------- | ------------------------------------------ | ------------------------------------ | -------------------------------- |
| `CP-03` | `REQUIRES_HUMAN_DECISION`; candidate `DEV-BUOI-DA-XANH-001`      | add distinct Farmer-owned Product          | `DEV-BUOI-DA-XANH-FARMER-001`        | `DEV-BUOI-DA-XANH-001`           |
| `CP-12` | `REQUIRES_HUMAN_DECISION`; candidate `DEV-CA-PHE-ROBUSTA-001`    | add distinct Supplier-owned 95,000 Product | `DEV-CA-PHE-ROBUSTA-SUPPLIER-001`    | `DEV-CA-PHE-ROBUSTA-001`         |
| `CP-13` | `REQUIRES_HUMAN_DECISION`; candidate `DEV-TIEU-DEN-PHU-QUOC-001` | add distinct Supplier-owned Product        | `DEV-TIEU-DEN-PHU-QUOC-SUPPLIER-001` | `DEV-TIEU-DEN-PHU-QUOC-001`      |
| `CP-17` | `REQUIRES_HUMAN_DECISION`; candidate `DEV-MAT-ONG-HOA-NHAN-001`  | add distinct Cooperative-owned Product     | `DEV-MAT-ONG-HOA-NHAN-COOP-001`      | `DEV-MAT-ONG-HOA-NHAN-001`       |

Each new Product preserves the complete central seller-owned payload,
including price, unit, quantities, farming type, harvest date, description,
view count, and source-specific primary image.

```text
HUMAN_PRODUCT_DECISION_STATUS=RESOLVED
NEW_HUMAN_APPROVED_PRODUCT_COUNT=4
NEW_HUMAN_APPROVED_SKU_COLLISIONS=0
```

```text
ORDINARY_PRODUCT_COUNT=18
EXACT_FULL_PAYLOAD_EQUIVALENT_COUNT=0
PARTIAL_SEMANTIC_MATCH_COUNT=15
NO_CANONICAL_EQUIVALENT_COUNT=3

ORDINARY_MAP_EXISTING_COUNT=11
ORDINARY_ADD_NEW_COUNT=7
ORDINARY_RETIRE_COUNT=0
ORDINARY_UNRESOLVED_COUNT=0
```

All proposed SKUs are explicit, deterministic, below the Product column's
50-character limit, unique across the nine approved additions, and absent from
the existing 54-SKU payload. For the seven approved ordinary additions, C2B
must preserve the source-specific image URL and nullable `expiryDate` rather
than inventing an expiry. Existing 54 Product payloads and SKUs remain
unchanged.

## 3. Violation Product Decisions

The two `seedViolations` rows are compliance/admin demonstration artifacts,
not substitutes for ordinary saleable canonical Products. Their suspended
status, rejection reason, state-agency notification, and audit-log scenario
prove a retained demo purpose. The future identity is an explicit SKU; the
existence of any suspended Product is not an identity or group guard.

| ID      | Name                         | Seller                            | Category | Price / unit   | Quantity | Status / reason                             | Decision                                     | Proposed SKU                                |
| ------- | ---------------------------- | --------------------------------- | -------- | -------------- | -------- | ------------------------------------------- | -------------------------------------------- | ------------------------------------------- |
| `VP-01` | Thuốc trừ sâu không tem nhãn | `farmer@sandbox.com` / FARMER     | null     | 50,000 / LITER | 100      | SUSPENDED; unknown origin and missing label | `ADD_TO_CANONICAL_PRODUCTS_DEV_WITH_NEW_SKU` | `DEV-VIOLATION-BVTV-KHONG-TEM-001`          |
| `VP-02` | Phân bón kém chất lượng      | `supplier@agrilink.vn` / SUPPLIER | null     | 120,000 / KG   | 500      | SUSPENDED; NPK content at 60% of claim      | `ADD_TO_CANONICAL_PRODUCTS_DEV_WITH_NEW_SKU` | `DEV-VIOLATION-PHAN-BON-KEM-CHAT-LUONG-001` |

The legacy objects use non-entity names `price` and `stockQuantity`. C2B must
deliberately map those values to `pricePerUnit` and `availableQuantity`, retain
null optional dates/category and zero/default counters, and create no Product
image because the source declares none. This is a documented payload
normalization, not an implicit alias contract.

```text
VIOLATION_PRODUCT_COUNT=2
VIOLATION_ADD_NEW_COUNT=2
VIOLATION_UNRESOLVED_COUNT=0

CENTRAL_PRODUCT_RECORD_COUNT=20
CENTRAL_PRODUCT_DECISION_COUNT=20
MAP_EXISTING_COUNT=11
ADD_NEW_COUNT=9
RETIRE_COUNT=0
UNRESOLVED_COUNT=0

CURRENT_CANONICAL_PRODUCT_COUNT=54
APPROVED_NEW_PRODUCTS=9
TARGET_CANONICAL_PRODUCT_COUNT=63
PRODUCT_MAPPING_BLOCKER=NONE
```

## 4. Product Output Contract

The Product owner must publish the UUID returned by the same create-or-
reconcile flow. It must not perform a second global Product query for consumers.

| Producer                | Kind                | Key                       | Value               | Consumers                                                     |
| ----------------------- | ------------------- | ------------------------- | ------------------- | ------------------------------------------------------------- |
| `products.dev.products` | `product.id.by-sku` | canonical DEV Product SKU | actual Product UUID | `reviews.dev.product-feedback`; `cooperatives.dev.operations` |

```text
PRODUCT_DEV_OUTPUT_REQUIRED=YES
PRODUCT_DEV_OUTPUT_KIND=product.id.by-sku
TARGET_PRODUCT_OUTPUT_COUNT=63
PRODUCT_ENTITY_TRANSPORT=PROHIBITED
PRODUCT_REPOSITORY_TRANSPORT=PROHIBITED
```

Products publishes this output because two proven cross-group consumers need
it. Reviews and Cooperatives publish no output because no later group is proven
to consume their generated IDs.

## 5. Review Positional Mapping

Current source filters active Products from an unordered query, takes the
first eight UUIDs, and uses positions `0..7` in nine Review rows. The runtime
Product at any position is indeterminate. The comments, however, uniquely name
the intended fixture and provide evidence independent of position.

| Fixture  | Reviewer email           | Rating | Comment intent                              | Current expression / effective position | Proposed Product SKU          | Decision / evidence                                                                    |
| -------- | ------------------------ | -----: | ------------------------------------------- | --------------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------- |
| `REV-01` | `buyer@agrilink.vn`      |      5 | sweet fragrant Xoài, careful packing        | `productIds[0]` / 0                     | `DEV-XOAI-HOA-LOC-001`        | `USE_PRODUCT_SKU`; comment explicitly names Xoài intent                                |
| `REV-02` | `enterprise@agrilink.vn` |      4 | quality/price suitable for processing plant | `productIds[0]` / 0                     | `DEV-XOAI-HOA-LOC-001`        | `USE_PRODUCT_SKU`; shares the explicitly named first Xoài fixture                      |
| `REV-03` | `buyer@agrilink.vn`      |      5 | Ri6 Cai Lậy, yellow flesh/small seed        | `productIds[1]` / 1                     | `DEV-SAU-RIENG-RI6-001`       | `USE_PRODUCT_SKU`; comment uniquely names Ri6 Cai Lậy                                  |
| `REV-04` | `enterprise@agrilink.vn` |      4 | juicy Bưởi da xanh                          | `productIds[2]` / 2                     | `DEV-BUOI-DA-XANH-FARMER-001` | `USE_PRODUCT_SKU`; preserves the original relationship to central Farmer-owned `CP-03` |
| `REV-05` | `buyer@agrilink.vn`      |      5 | red dragon fruit/export quality             | `productIds[3]` / 3                     | `DEV-THANH-LONG-RUOT-DO-001`  | `USE_PRODUCT_SKU`; comment uniquely names red dragon fruit                             |
| `REV-06` | `enterprise@agrilink.vn` |      3 | watermelon good but undersized              | `productIds[4]` / 4                     | `DEV-DUA-HAU-KHONG-HAT-001`   | `USE_PRODUCT_SKU`; comment uniquely names watermelon                                   |
| `REV-07` | `buyer@agrilink.vn`      |      5 | authentic Lục Ngạn lychee                   | `productIds[5]` / 5                     | `DEV-VAI-THIEU-LUC-NGAN-001`  | `USE_PRODUCT_SKU`; comment uniquely names origin/product                               |
| `REV-08` | `farmer@sandbox.com`     |      4 | fresh pesticide-free rau muống              | `productIds[6]` / 6                     | `DEV-RAU-MUONG-HUU-CO-001`    | `USE_PRODUCT_SKU`; comment uniquely names vegetable                                    |
| `REV-09` | `buyer@agrilink.vn`      |      5 | crisp Đà Lạt carrot for salad               | `productIds[7]` / 7                     | `DEV-CA-ROT-DA-LAT-001`       | `USE_PRODUCT_SKU`; comment uniquely names approved new Product                         |

`reviews` has the partial unique index
`IDX_reviews_reviewer_product_unique(reviewer_id, product_id) WHERE
product_id IS NOT NULL`. The entity and runtime repository both enforce one
Product Review by reviewer/Product pair.

Target convergence is:

- zero matches: create;
- one match: reconcile the declared rating, comment, and purchase flag;
- more than one match: fail closed.

```text
REVIEW_FIXTURE_COUNT=9
REVIEW_STABLE_KEY=reviewer User ID + Product ID
REVIEW_IDENTITY_STATUS=RESOLVED_SCHEMA_UNIQUE
REVIEW_POSITIONAL_MAPPING_STATUS=RESOLVED
REVIEW_UNRESOLVED_PRODUCT_MAPPINGS=0
```

## 6. Product Certification Identity Decision

Central source creates one verified VietGAP certification after Products
`CP-01`, `CP-04`, `CP-06`, and `CP-10`. `cert_number` is a persisted nullable
varchar, but neither the entity nor reviewed catalog has a unique constraint
other than the generated UUID primary key. The runtime repository normally
creates certifications by Product ID and does not look them up by certificate
number.

| Fixture   | Product SKU                  | Type    | Current number generation | Issuer     | Issued / expiry         | Other fields                       | Proposed deterministic number       |
| --------- | ---------------------------- | ------- | ------------------------- | ---------- | ----------------------- | ---------------------------------- | ----------------------------------- |
| `CERT-01` | `DEV-XOAI-HOA-LOC-001`       | VIETGAP | `VG-${Date.now()}-1`      | Bộ NN&PTNT | 2025-01-01 / 2027-01-01 | verified; placeholder document URL | `DEV-CERT-VIETGAP-XOAI-HOA-LOC-001` |
| `CERT-02` | `DEV-THANH-LONG-RUOT-DO-001` | VIETGAP | `VG-${Date.now()}-4`      | Bộ NN&PTNT | 2025-01-01 / 2027-01-01 | verified; placeholder document URL | `DEV-CERT-VIETGAP-THANH-LONG-001`   |
| `CERT-03` | `DEV-VAI-THIEU-LUC-NGAN-001` | VIETGAP | `VG-${Date.now()}-6`      | Bộ NN&PTNT | 2025-01-01 / 2027-01-01 | verified; placeholder document URL | `DEV-CERT-VIETGAP-VAI-LUC-NGAN-001` |
| `CERT-04` | `DEV-GAO-JASMINE-THOM-001`   | VIETGAP | `VG-${Date.now()}-10`     | Bộ NN&PTNT | 2025-01-01 / 2027-01-01 | verified; placeholder document URL | `DEV-CERT-VIETGAP-GAO-JASMINE-001`  |

The approved seed-level identity is Product UUID plus the explicit
deterministic certificate number. C2B must query that exact pair: zero creates,
one reconciles, and more than one fails closed. The absence of a schema unique
constraint is an accepted limitation, not permission to treat certificate type
or issuer as globally unique. Revisit if the domain later defines certificate
number uniqueness. The normal runtime creation path initializes a certification
as pending, while this DEV source deliberately declares all four verified;
C2B preserves the explicit verified status and fields as fixture payload rather
than deriving them from runtime creation defaults.

```text
PRODUCT_CERTIFICATION_COUNT=4
PRODUCT_CERTIFICATION_STABLE_KEY=Product ID + explicit deterministic certNumber
PRODUCT_CERTIFICATION_STABLE_KEY_STATUS=RESOLVED_SEED_LEVEL_PERSISTED_BUSINESS_KEY_WITHOUT_DB_UNIQUE_CONSTRAINT
TIMESTAMP_CERTIFICATE_NUMBERS_REMAINING=0_IN_TARGET
```

## 7. Cooperative Member Decision

Earlier P8-05C0 evidence recorded an unordered first-five Farmer query. PR #112
removed that cross-owner query. Current source now declares exactly one member
and uses the explicit C1 actor ID; it does not express five distinct personas.

| Cooperative               | Member email         | Status | Role                | Joined time                    | Stable key candidate                 |
| ------------------------- | -------------------- | ------ | ------------------- | ------------------------------ | ------------------------------------ |
| `cooperative@sandbox.com` | `farmer@sandbox.com` | active | Thành viên sản xuất | `new Date()` on initial create | cooperative User ID + farmer User ID |

Migration constraint `uq_p3_member_cooperative_farmer` proves the pair unique.
Target convergence uses that pair and fails closed on ambiguity. `joinedAt` is
not identity: use execution time only on a zero-match create and preserve the
stored value during reconciliation.

```text
COOPERATIVE_MEMBER_COUNT=1
COOPERATIVE_MEMBER_USER_MAPPINGS=cooperative@sandbox.com+farmer@sandbox.com
COOPERATIVE_MEMBER_STABLE_KEY=cooperative User ID + farmer User ID
COOPERATIVE_MEMBER_IDENTITY_STATUS=RESOLVED_SCHEMA_UNIQUE
```

## 8. Bulk Listing Decision

The `products` parameter to `seedBulkListings` is unused. Neither listing sets
`productCategoryId`; commodity intent exists only in title/description. The
target model therefore has no Product or Product Category dependency for Bulk
Listings.

| Fixture | Cooperative               | Commodity intent                    | Quantity / unit | Price  | Deadline   | State         | Other fields                                            |
| ------- | ------------------------- | ----------------------------------- | --------------- | ------ | ---------- | ------------- | ------------------------------------------------------- |
| `BL-01` | `cooperative@sandbox.com` | Xoài cát Hòa Lộc summer aggregation | 5000 / KG       | 42,000 | 2026-07-15 | `isOpen=true` | 15 member households; VietGAP; `productCategoryId=null` |
| `BL-02` | `cooperative@sandbox.com` | red dragon fruit export order       | 10000 / KG      | 33,000 | 2026-07-20 | `isOpen=true` | China export; GlobalGAP; `productCategoryId=null`       |

The entity and migration provide only generated UUID identity. Title is not
unique, and the repository exposes only lookup by generated ID plus
cooperative ID. Cooperative plus title, insertion index, created time, or a
generated UUID is not approved as stable identity.

```text
BULK_LISTING_COUNT=2
BULK_LISTING_PRODUCT_INPUT=UNUSED_REMOVE_FROM_TARGET_CONTRACT
BULK_LISTING_STABLE_KEY=NONE_PROVEN
BULK_LISTING_IDENTITY_STATUS=UNRESOLVED
STOP_REASON=BULK_LISTING_STABLE_IDENTITY_REQUIRES_HUMAN_DECISION
```

## 9. Bulk Listing Contribution Decision

Both current rows belong to `BL-01` and `farmer@sandbox.com`:

| Fixture  | Listing | Farmer               | Quantity / unit | Pair multiplicity        |
| -------- | ------- | -------------------- | --------------- | ------------------------ |
| `BLC-01` | `BL-01` | `farmer@sandbox.com` | 1500 / KG       | same listing/farmer pair |
| `BLC-02` | `BL-01` | `farmer@sandbox.com` | 2000 / KG       | same listing/farmer pair |

Multiple intentional contributions for one listing/farmer pair are therefore
source-proven. The schema persists only generated UUID, listing ID, farmer ID,
quantity, unit, and created time. Quantity is mutable business data, not an
identifier. No contribution code, event key, lot, plot, delivery, or other
distinguishing stable component exists.

```text
CONTRIBUTION_ROW_COUNT=2
DUPLICATE_LISTING_FARMER_PAIR_COUNT=1
CONTRIBUTION_STABLE_KEY=NONE_PROVEN
CONTRIBUTION_IDENTITY_STATUS=UNRESOLVED
STOP_REASON=BULK_CONTRIBUTION_STABLE_IDENTITY_REQUIRES_DOMAIN_DECISION
```

No fake ordinal key is approved.

## 10. Harvest Schedule Decisions

Current orchestration passes `products[0].id` to all three rows. That Product
is indeterminate because the upstream Product query is unordered. The declared
`cropName` and notes independently identify Xoài cát Hòa Lộc, so the Product
mapping can be decided without interpreting position zero.

| Fixture      | Owner                | Current Product expression | Date       | Quantity / unit | Status field | Notes                    | Product decision                       |
| ------------ | -------------------- | -------------------------- | ---------- | --------------- | ------------ | ------------------------ | -------------------------------------- |
| `HARVEST-01` | `farmer@sandbox.com` | `products[0].id`           | 2026-07-15 | 2000 / KG       | absent       | Xoài cát, main crop      | `USE_PRODUCT_SKU:DEV-XOAI-HOA-LOC-001` |
| `HARVEST-02` | `farmer@sandbox.com` | `products[0].id`           | 2026-07-20 | 1500 / KG       | absent       | Xoài cát, late crop      | `USE_PRODUCT_SKU:DEV-XOAI-HOA-LOC-001` |
| `HARVEST-03` | `farmer@sandbox.com` | `products[0].id`           | 2026-08-01 | 3000 / KG       | absent       | Xoài cát, staggered crop | `USE_PRODUCT_SKU:DEV-XOAI-HOA-LOC-001` |

The schema has a non-unique index on User ID plus expected harvest date, but no
unique constraint or domain key. The repository supports lookup only by
generated ID plus User ID. Owner/Product/date might be a useful query, but
source and schema do not prove that two plots or harvest lots cannot share it.

```text
HARVEST_FIXTURE_COUNT=3
HARVEST_PRODUCT_MAPPING_STATUS=RESOLVED
HARVEST_SCHEDULE_STABLE_KEY=NONE_PROVEN
HARVEST_IDENTITY_STATUS=UNRESOLVED
STOP_REASON=HARVEST_SCHEDULE_STABLE_IDENTITY_REQUIRES_HUMAN_DECISION
```

## 11. Time And Determinism Audit

| Field or behavior                 | Current form                    |             Rows | Identity impact                        | Target decision                                                  |
| --------------------------------- | ------------------------------- | ---------------: | -------------------------------------- | ---------------------------------------------------------------- |
| Product harvest dates             | `new Date(fixed-string)`        |               18 | none; fixed                            | `PRESERVE_EXISTING_VALUE`                                        |
| Certification number              | `Date.now()` embedded in number |                4 | current identity candidate is unstable | use the four fixed declared DEV numbers above                    |
| Certification issued/expiry dates | fixed dates                     |                4 | none                                   | `PRESERVE_EXISTING_VALUE`                                        |
| Cooperative Member `joinedAt`     | `new Date()`                    |                1 | not identity                           | execution time on create; `PRESERVE_EXISTING_VALUE` on reconcile |
| Bulk Listing deadlines            | fixed dates                     |                2 | not approved identity                  | `PRESERVE_EXISTING_VALUE`                                        |
| Harvest expected dates            | fixed dates                     |                3 | not yet approved identity              | `PRESERVE_EXISTING_VALUE`                                        |
| Entity `createdAt`/`updatedAt`    | repository/schema managed       | all created rows | prohibited as identity                 | `RECONCILE_TO_EXECUTION_TIME` lifecycle metadata only            |

```text
C2_EXECUTION_TIME_DEPENDENT_FIELDS=product_certifications.certNumber(4 rows); cooperative_members.joinedAt(1 row)
RANDOM_BEHAVIOR_FOUND=NO_IN_C2
CURRENT_EFFECTIVE_POSITIONAL_PRODUCT_DEPENDENCIES=10
TARGET_POSITIONAL_PRODUCT_DEPENDENCIES=0
```

The C2 source contains no `Math.random()`. Forum randomness belongs to C3.

## 12. Final C2 Dependency DAG

```text
products.reference.categories/category.id.by-slug ----.
                                                       v
users.dev.users/user.id.by-email ----------------> products.dev.products
       |                                               |
       |                                               `-- product.id.by-sku --.
       |                                                                        |
       |---------------------------> reviews.dev.product-feedback <--------------'
       `---------------------------> cooperatives.dev.operations <---------------'
```

| Producer                        | Output kind           | Consumer                       | Purpose                                                  |
| ------------------------------- | --------------------- | ------------------------------ | -------------------------------------------------------- |
| `products.reference.categories` | `category.id.by-slug` | `products.dev.products`        | category IDs for Product records that declare a category |
| `users.dev.users`               | `user.id.by-email`    | `products.dev.products`        | Product seller IDs                                       |
| `users.dev.users`               | `user.id.by-email`    | `reviews.dev.product-feedback` | explicit reviewer IDs                                    |
| `products.dev.products`         | `product.id.by-sku`   | `reviews.dev.product-feedback` | explicit reviewed Product IDs                            |
| `users.dev.users`               | `user.id.by-email`    | `cooperatives.dev.operations`  | cooperative, member, contribution, and harvest actor IDs |
| `products.dev.products`         | `product.id.by-sku`   | `cooperatives.dev.operations`  | explicit Harvest Product ID only                         |

There is no Geography edge. Bulk Listings do not consume Products. Reviews and
Cooperatives publish no outputs.

## 13. Proposed Implementation Split

The original C2 scope is too large for one reviewable implementation PR and
Cooperative identity work remains substantial. Retain the three-way split.

C2B is now authorized, but is not implemented here. Its exact future scope is
to preserve the existing 54 SKUs, add the nine approved Products for a total
of 63, publish all 63 reconciled UUIDs through `product.id.by-sku`, migrate the
four Certifications with deterministic certificate numbers, and remove the
central category/Product/image/certification/violation writes. It must retain
owner boundaries and dependency-scoped scalar outputs.

| Slice                         | Scope                                                       | Authorized | Blockers                                                              | Exit gate                                                                                                                                                            |
| ----------------------------- | ----------------------------------------------------------- | ---------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `P8-05C2B_PRODUCTS_EXTENSION` | Product map/add/retire, Certifications, `product.id.by-sku` | `YES`      | none                                                                  | all 20 Product decisions final; 63 Products/certifications converge; Product output published; central Product/category/image/certification/violation writes retired |
| `P8-05C2C_REVIEWS`            | explicit reviewer email and Product SKU fixtures            | `NO`       | decision surface resolved; `P8_05C2B_PRODUCT_OUTPUT_NOT_IMPLEMENTED`  | nine reviewer/Product pairs converge 0/1/>1; no Product query or array position; central Review write retired                                                        |
| `P8-05C2D_COOPERATIVES`       | member, listings, contributions, harvest                    | `NO`       | Bulk Listing identity; Contribution domain identity; Harvest identity | every retained row has a proven key; declared scalar inputs only; no positional/unused Product dependency; central Cooperative writes retired                        |

```text
P8_05C2B_IMPLEMENTATION_AUTHORIZED=YES
P8_05C2B_BLOCKERS=NONE
P8_05C2C_DECISION_STATUS=RESOLVED
P8_05C2C_IMPLEMENTATION_AUTHORIZED=NO
P8_05C2C_BLOCKERS=P8_05C2B_PRODUCT_OUTPUT_NOT_IMPLEMENTED
P8_05C2D_IMPLEMENTATION_AUTHORIZED=NO
P8_05C2D_BLOCKERS=BULK_LISTING_IDENTITY; BULK_CONTRIBUTION_IDENTITY; HARVEST_SCHEDULE_IDENTITY
P8_05C2_IMPLEMENTATION_AUTHORIZED=NO
```

## 14. Architecture Decision, Trade-Offs, And Remaining Blockers

Chosen decisions:

- Map only when the complete shared business payload proves the same intended
  fixture; preserve the canonical row when wording/image differs.
- Treat different seller ownership as distinct DEV Product identity and add a
  new SKU without mutating the other seller's canonical Product.
- Add source-proven, non-equivalent Products with explicit SKUs and retain
  nullable fields rather than fabricating data.
- Retain violation Products as explicit compliance/demo records with SKUs.
- Publish only Product UUID by SKU to the two proven consumers.
- Use comment/crop content, not source position, to decide Review and Harvest
  Product mappings.
- Use schema-proven Review and Member pairs; use an explicit persisted
  certificate number as the narrower seed-level certification key.
- Refuse title, quantity, insertion index, generated UUID, and timestamp as
  identities for cooperative operations.

Alternatives rejected:

| Alternative                                            | Reason rejected                                                  |
| ------------------------------------------------------ | ---------------------------------------------------------------- |
| map by Product name                                    | seller and price conflicts prove name is insufficient            |
| publish Product entities/repository access             | violates owner boundaries and scalar output contract             |
| keep positional Product lookups                        | unordered query order is nondeterministic                        |
| treat any suspended Product as both violation fixtures | prevents independent retry and can suppress missing rows         |
| use listing title as identity                          | display field is non-unique and unsupported by domain/repository |
| use listing/farmer for contribution                    | two intentional rows already share that pair                     |
| add fake contribution ordinal                          | no persisted business meaning and reorder-unstable               |
| assume owner/Product/date is Harvest-unique            | neither schema nor domain port proves that cardinality           |

Accepted trade-off: Product certification convergence relies on a persisted
seed-level pair without a database unique constraint, so the adapter must
preflight and fail closed on duplicates. This avoids a schema change while
retaining a genuine business identifier. Revisit if certificate-number
uniqueness becomes a domain invariant.

Remaining blockers are deliberately narrow:

```text
PRODUCT_MAPPING_BLOCKER=NONE
BULK_LISTING_IDENTITY_BLOCKER=UNRESOLVED
BULK_CONTRIBUTION_IDENTITY_BLOCKER=UNRESOLVED
HARVEST_SCHEDULE_IDENTITY_BLOCKER=UNRESOLVED

P8_05C2B_IMPLEMENTATION_AUTHORIZED=YES
P8_05C2C_DECISION_STATUS=RESOLVED
P8_05C2C_IMPLEMENTATION_AUTHORIZED=NO
P8_05C2C_IMPLEMENTATION_AUTHORIZATION_STATUS=NO_PENDING_C2B_OUTPUT
P8_05C2D_IMPLEMENTATION_AUTHORIZED=NO
P8_05C2D_IMPLEMENTATION_AUTHORIZATION_STATUS=NO_DOMAIN_IDENTITY_BLOCKERS
P8_05C2_IMPLEMENTATION_AUTHORIZED=NO
STOP_REASON=COOPERATIVE_OPERATION_STABLE_IDENTITIES_REQUIRE_DOMAIN_DECISION
```

## P8-05C2B Implementation Overlay

PR #113 merged the final Product identity decisions into `develop` at
`9cf03b40e9d7e8abcaafcef06649f51738377f90`. C2B implements those decisions
without rewriting this document's C2A audit history. The Products owner keeps
the original 54 SKU definitions unchanged, adds exactly the nine approved
fixtures, and returns each reconciled UUID from the same per-SKU flow as a
dependency-scoped scalar output.

```text
P8_05C2A_PRODUCT_DEPENDENT_DECISION_STATUS=IMPLEMENTED_BY_MERGED_PR_113
P8_05C2B_PRODUCTS_EXTENSION_STATUS=IMPLEMENTED_BY_MERGED_PR_114

PRODUCTS_DEV_GROUP_COUNT=1
PRODUCTS_DEV_RECORD_COUNT=63
EXISTING_54_SKUS_CHANGED=0
EXISTING_54_SKUS_REMOVED=0
APPROVED_NEW_PRODUCT_COUNT=9
PRODUCT_DEV_DUPLICATE_SKU_COUNT=0
PRODUCT_DEV_OUTPUT_KIND=product.id.by-sku
PRODUCT_DEV_OUTPUT_COUNT=63
PRODUCT_DEV_OUTPUT_SOURCE=SAME_RECONCILIATION_FLOW
SECOND_GLOBAL_PRODUCT_QUERY_FOR_OUTPUTS=0

NEW_ORDINARY_PRODUCT_PRIMARY_IMAGES=7
NEW_VIOLATION_PRODUCT_IMAGE_DECLARATIONS=0
PRODUCT_IMAGE_DEV_IDEMPOTENCY=PER_RECORD_BY_PRODUCT_SKU_PLUS_PRIMARY_SLOT
PRODUCT_CERTIFICATION_COUNT=4
PRODUCT_CERTIFICATION_IDEMPOTENCY=PER_RECORD_BY_PRODUCT_ID_AND_CERT_NUMBER
PRODUCT_CERTIFICATION_DUPLICATE_POLICY=FAIL_CLOSED
PRODUCT_CERTIFICATION_PREFLIGHT=ALL_FOUR_IDENTITIES_BEFORE_FIRST_CERTIFICATION_WRITE
TIMESTAMP_CERTIFICATE_NUMBERS=0
```

The temporary `legacy.dev.remaining` continuation resolves only eight
allowlisted Product SKU outputs: the eight unique Products needed by the nine
still-central Review fixtures, with `DEV-XOAI-HOA-LOC-001` also serving the
three still-central Harvest rows. It transports UUID strings only. Review and
Harvest persistence ownership remains unchanged, and no Product repository,
entity collection, unordered query, or array position crosses the bridge.

```text
TEMPORARY_LEGACY_GROUP_ID=legacy.dev.remaining
PRODUCT_SCALAR_IDS_PASSED_TO_LEGACY_CONTINUATION=8
CENTRAL_POSITIONAL_PRODUCT_QUERY_DEPENDENCIES=0
CENTRAL_PRODUCT_REPOSITORY_QUERIES_FOR_DEV_SEED=0
CENTRAL_PRODUCT_ENTITY_TRANSPORT=0
REV_04_PRODUCT_SKU=DEV-BUOI-DA-XANH-FARMER-001
HARVEST_PRODUCT_SKU=DEV-XOAI-HOA-LOC-001
P8_05C2C_BUSINESS_MIGRATIONS=0
P8_05C2D_BUSINESS_MIGRATIONS=0
HARVEST_IDENTITY_STATUS=UNRESOLVED
```

The former central Product/category/image/certification methods and the
Product-only `seedViolations` method are removed. Audit Log and Notification
fixtures were separate C4 methods in source and remain temporarily reachable;
no Product ID compatibility input is needed for them.

```text
CENTRAL_CATEGORY_BUSINESS_WRITES=0
CENTRAL_PRODUCT_BUSINESS_WRITES=0
CENTRAL_PRODUCT_IMAGE_BUSINESS_WRITES=0
CENTRAL_PRODUCT_CERTIFICATION_BUSINESS_WRITES=0
VIOLATION_PRODUCT_WRITES_AFTER_C2B=0
VIOLATION_C4_SIDE_EFFECT_STATUS=INDEPENDENT_AUDIT_AND_NOTIFICATION_METHODS_PRESERVED_FOR_C4

PRODUCT_DEV_CROSS_OWNER_ENTITY_IMPORTS=0
PRODUCT_DEV_CROSS_OWNER_REPOSITORY_ACCESS=0
PRODUCT_ENTITY_OUTPUTS=0
PRODUCT_REPOSITORY_OUTPUTS=0
NEW_GLOBAL_SEED_OUTPUT_ACCESS=0

P8_05C2B_IMPLEMENTATION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_05C2C_IMPLEMENTATION_STATUS=NOT_STARTED
P8_05C2D_IMPLEMENTATION_STATUS=NOT_STARTED
P8_05C2D_IMPLEMENTATION_AUTHORIZED=NO
P8_05C2_IMPLEMENTATION_STATUS=IN_PROGRESS

SCHEMA_CHANGES=0
MIGRATIONS_CREATED=0
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

## P8-05C2C Reviews Implementation Overlay

PR #114 merged the C2B Product extension into `develop` at
`c331bd702861a0d8615d3f89dc607bd4489062e0`. C2C implements the already
approved nine-Review decision surface without changing C2A or C2B fixture
history. `reviews.dev.product-feedback` consumes only dependency-scoped User
and Product UUID strings, and the Reviews-owned adapter uses the schema-backed
reviewer/Product pair for fail-closed per-record convergence.

All nine identities are preflighted before the first Review mutation. Zero
matches creates, one match reconciles the intended rating, comment, and
verified-purchase flag, and more than one match fails closed. The group returns
the empty SeedGroup result because no later seed consumer has a proven need for
Review UUIDs.

```text
P8_05C2B_PRODUCTS_EXTENSION_STATUS=IMPLEMENTED_BY_MERGED_PR_114
P8_05C2C_REVIEWS_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW

REVIEWS_DEV_GROUP_ID=reviews.dev.product-feedback
REVIEWS_DEV_GROUP_OWNER=reviews
REVIEWS_DEV_GROUP_COUNT=1
STARTUP_REVIEWS_DEV_CANONICAL_PATH_COUNT=1
REVIEW_DEV_RECORD_COUNT=9
REVIEW_DEV_DEPENDENCIES=users.dev.users,products.dev.products
REVIEW_STABLE_KEY=reviewer User ID + Product ID
REVIEW_SCHEMA_UNIQUE_EVIDENCE=CONFIRMED
REVIEW_DEV_IDEMPOTENCY=PER_RECORD_BY_REVIEWER_ID_AND_PRODUCT_ID
REVIEW_PREFLIGHT=ALL_NINE_IDENTITIES_BEFORE_FIRST_WRITE
REVIEW_DECLARED_IDENTITY_DUPLICATES=0
SECOND_RUN_REVIEW_DUPLICATES=0
REVIEW_DEV_OUTPUT_COUNT=0
REVIEW_BUSINESS_FIELD_MISMATCH_COUNT=0
REV_04_TARGET_SKU=DEV-BUOI-DA-XANH-FARMER-001
REV_04_OLD_COOPERATIVE_SKU_USED=NO

CENTRAL_REVIEW_BUSINESS_WRITES=0
CENTRAL_REVIEW_REPOSITORY_QUERIES=0
CENTRAL_REVIEW_ENTITY_IMPORTS_FOR_DEV_SEED=0
CENTRAL_RESET_REVIEW_TARGETS=0
CENTRAL_POSITIONAL_REVIEW_PRODUCT_DEPENDENCIES=0

TEMPORARY_LEGACY_GROUP_ID=legacy.dev.remaining
PRODUCT_SCALAR_IDS_PASSED_TO_LEGACY_CONTINUATION=1
LEGACY_REMAINING_PRODUCT_SKUS=DEV-XOAI-HOA-LOC-001
LEGACY_REVIEW_PRODUCT_ALIASES_REMAINING=0

REVIEW_DEV_CROSS_OWNER_ENTITY_IMPORTS=0
REVIEW_DEV_CROSS_OWNER_REPOSITORY_ACCESS=0
REVIEW_ENTITY_OUTPUTS=0
NEW_GLOBAL_SEED_OUTPUT_ACCESS=0
TYPEORM_IMPORTS_IN_SEED_FRAMEWORK_CONTRACTS=0
NEW_CENTRAL_BUSINESS_WRITES=0

P8_05C2C_IMPLEMENTATION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_05C2D_IMPLEMENTATION_STATUS=NOT_STARTED
P8_05C2D_IMPLEMENTATION_AUTHORIZED=NO
P8_05C2D_BUSINESS_MIGRATIONS=0
P8_05C2_IMPLEMENTATION_STATUS=IN_PROGRESS
P8_05C3_BUSINESS_MIGRATIONS=0
P8_05C4_BUSINESS_MIGRATIONS=0
ADMIN_DEV_IMPLEMENTATION_CHANGES=0

BULK_LISTING_STABLE_KEY=NONE_PROVEN
CONTRIBUTION_STABLE_KEY=NONE_PROVEN
HARVEST_SCHEDULE_STABLE_KEY=NONE_PROVEN
HARVEST_IDENTITY_STATUS=UNRESOLVED
```

The temporary Product bridge now retains only
`DEV-XOAI-HOA-LOC-001`, which the still-central Harvest Schedule method uses.
The seven Review-only aliases are retired. Cooperative Member, Bulk Listing,
Contribution, and Harvest persistence remain central; C2C adds no Cooperative
ownership, schema, migration, or fabricated C2D identity.

## P8-05C2D0 Pre-Human-Review Cooperative Identity Overlay

PR #115 merged the C2C implementation at
`c2304b0afb1e6022d7deae4dff49c0e5589ca542` with a successful Backend Quality
Gate. The subsequent C2D0 static audit is recorded in
[dev-seed-c2d-decisions.md](dev-seed-c2d-decisions.md). This overlay preserves
all C2A/B/C evidence while replacing the former three undifferentiated C2D
identity blockers with their current exact dispositions.

Current schema reconfirms Member uniqueness. Harvest is resolved only as a
persisted-business-field DEV seed key with fail-closed duplicate handling; no
database uniqueness is claimed. Git history shows that BLC-02 duplicates a
listing/Farmer pair that the earlier domain explicitly permitted only once, so
the duplicate-retirement decision remains pending human review. Bulk Listing
still has no proven stable tuple.

```text
P8_05C2C_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_115
P8_05C2D0_IDENTITY_DECISION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW

COOPERATIVE_MEMBER_IDENTITY_STATUS=RESOLVED_SCHEMA_UNIQUE
COOPERATIVE_MEMBER_STABLE_KEY=cooperative User ID + farmer User ID

BULK_LISTING_STABLE_KEY=NONE_PROVEN
BULK_LISTING_IDENTITY_STATUS=UNRESOLVED

CONTRIBUTION_ORIGINAL_INTENT=ACCIDENTAL_DUPLICATE_FIXTURE
BLC_01_FARMER_EMAIL=farmer@sandbox.com
BLC_02_FARMER_EMAIL=farmer@sandbox.com
BLC_02_DECISION=RETIRE_DUPLICATE_FIXTURE
BLC_02_DECISION_STATUS=PENDING_HUMAN_REVIEW
CONTRIBUTION_STABLE_KEY=listing ID + farmer User ID
CONTRIBUTION_IDENTITY_STATUS=RESOLVED_BY_DUPLICATE_RETIREMENT_PENDING_HUMAN_REVIEW

HARVEST_SCHEDULE_STABLE_KEY=user ID + product ID + expected harvest date
HARVEST_IDENTITY_STATUS=RESOLVED_SEED_LEVEL_PERSISTED_BUSINESS_KEY
HARVEST_DUPLICATE_POLICY=FAIL_CLOSED

C2D_GROUPING_DECISION=SPLIT_OWNER_LOCALLY_BY_MEMBER_BULK_WORKFLOW_AND_HARVEST
COOPERATIVE_DEV_OUTPUT_COUNT=0
BULK_LISTING_PRODUCT_DEPENDENCY=NONE
HARVEST_PRODUCT_DEPENDENCY=products.dev.products/product.id.by-sku

P8_05C2D_IMPLEMENTATION_AUTHORIZED=NO
P8_05C2D_BLOCKERS=BULK_LISTING_DOMAIN_IDENTITY_UNRESOLVED
P8_05C2D1_MEMBER_HARVEST_AUTHORIZED=YES_AFTER_C2D0_MERGE
P8_05C2D2_BULK_OPERATIONS_AUTHORIZED=NO
P8_05C2D_IMPLEMENTATION_STATUS=NOT_STARTED
P8_05C2_IMPLEMENTATION_STATUS=IN_PROGRESS
```

## P8-05C2D0 Human-Review Correction Overlay

This overlay supersedes the current-status values in the preceding C2D0
proposal without erasing its source audit. Human review approves the accidental
duplicate verdict and BLC-02 retirement. It rejects expected harvest date as a
stable key because the audited historical schedule behavior permits that field
to be rescheduled.

```text
P8_05C2D0_IDENTITY_DECISION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW

CONTRIBUTION_ORIGINAL_INTENT=ACCIDENTAL_DUPLICATE_FIXTURE
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

## C2A Scope And Database Safety

```text
BUSINESS_IMPLEMENTATION_CHANGES=0
C3_BUSINESS_IMPLEMENTATION_CHANGES=0
C4_BUSINESS_IMPLEMENTATION_CHANGES=0
ADMIN_DEV_IMPLEMENTATION_CHANGES=0
SCHEMA_CHANGES=0
MIGRATIONS_CREATED=0

PROTECTED_LOCAL_DB_ACCESSED=NO
PRODUCTION_DB_ACCESSED=NO
DATABASE_CONNECTIONS=0
SQL=0
DDL=0
DML=0
SEEDS_EXECUTED=0
MIGRATIONS_EXECUTED=0
SYNCHRONIZE=NO
```

## P8-05C2D1 Cooperative Member Implementation Overlay

PR #116 merged the C2D0 decision. C2D1 now owns the one Cooperative Member DEV
fixture in `cooperatives.dev.members`, using dependency-scoped User UUIDs and
the schema-backed cooperative/Farmer identity. No Member UUID output is
published, and the central Member write/reset path is retired.

```text
P8_05C2D0_IDENTITY_DECISION_STATUS=IMPLEMENTED_BY_MERGED_PR_116
P8_05C2D1_MEMBERS_IMPLEMENTATION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
COOPERATIVES_DEV_MEMBERS_GROUP_ID=cooperatives.dev.members
COOPERATIVE_MEMBER_DEV_RECORD_COUNT=1
COOPERATIVE_MEMBER_STABLE_KEY=cooperative User ID + farmer User ID
COOPERATIVE_MEMBER_DEV_OUTPUT_COUNT=0
CENTRAL_COOPERATIVE_MEMBER_BUSINESS_WRITES=0
CENTRAL_RESET_COOPERATIVE_MEMBER_TARGETS=0

BULK_LISTING_STABLE_KEY=NONE_PROVEN
CONTRIBUTION_IDENTITY_STATUS=RESOLVED_BY_APPROVED_DUPLICATE_RETIREMENT
HARVEST_SCHEDULE_STABLE_KEY=NONE_PROVEN
HARVEST_IDENTITY_STATUS=UNRESOLVED_MUTABLE_DATE_NOT_STABLE_IDENTITY
P8_05C2D2_BUSINESS_MIGRATIONS=0
P8_05C2D3_BUSINESS_MIGRATIONS=0
P8_05C2D_IMPLEMENTATION_AUTHORIZED=NO
P8_05C2_IMPLEMENTATION_STATUS=IN_PROGRESS
```
