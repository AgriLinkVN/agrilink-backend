# Phase 8 Development Seed Decisions

## P8-05A Geography Province Decision

```text
P8_05A_GEOGRAPHY_PROVINCE_DECISION=RETIRE_LEGACY_GEOGRAPHY_DEV_PROVINCE_SEED
DECISION_BASIS=2025_ADMINISTRATIVE_SUCCESSOR_MAPPING_PLUS_ZERO_CURRENT_CONSUMERS
DEV_PROVINCE_RECORD_COUNT=10
EXECUTABLE_CALLERS=0
TEST_CALLERS=0
IMPORT_CALLERS=0
DISTINCT_DEV_PURPOSE_PROVEN=NO_CURRENT_EXECUTABLE_PURPOSE
CANONICAL_STABLE_KEY=Province.code
LEGACY_CODE_STATUS=LEGACY_NON_CANONICAL_IDENTIFIERS_WITH_NO_SURVIVING_CONTRACT
GEOGRAPHY_DEV_PROVINCE_PAYLOAD_COPIES=0
```

The retired source was introduced as a 10-row product-demo Geography payload.
Its abbreviations were stored in `Province.code`, but no current source consumes
those identifiers. The canonical `geography.reference.provinces` group is the
sole province payload and represents the 34 provincial-level administrative
units after the 2025 reorganization.

| Legacy code | Legacy name | Mapping type                    | Canonical code | Canonical name    | Canonical slug |
| ----------- | ----------- | ------------------------------- | -------------- | ----------------- | -------------- |
| `LD`        | Lâm Đồng    | `EXACT_CURRENT_IDENTITY`        | `68`           | Tỉnh Lâm Đồng     | `lam-dong`     |
| `DL`        | Đắk Lắk     | `EXACT_CURRENT_IDENTITY`        | `66`           | Tỉnh Đắk Lắk      | `dak-lak`      |
| `TG`        | Tiền Giang  | `ADMINISTRATIVE_SUCCESSOR_2025` | `82`           | Tỉnh Đồng Tháp    | `dong-thap`    |
| `BT`        | Bến Tre     | `ADMINISTRATIVE_SUCCESSOR_2025` | `86`           | Tỉnh Vĩnh Long    | `vinh-long`    |
| `ST`        | Sóc Trăng   | `ADMINISTRATIVE_SUCCESSOR_2025` | `92`           | Thành phố Cần Thơ | `can-tho`      |
| `BTN`       | Bình Thuận  | `ADMINISTRATIVE_SUCCESSOR_2025` | `68`           | Tỉnh Lâm Đồng     | `lam-dong`     |
| `LA`        | Long An     | `ADMINISTRATIVE_SUCCESSOR_2025` | `80`           | Tỉnh Tây Ninh     | `tay-ninh`     |
| `CT`        | Cần Thơ     | `EXACT_CURRENT_IDENTITY`        | `92`           | Thành phố Cần Thơ | `can-tho`      |
| `HN`        | Hà Nội      | `EXACT_CURRENT_IDENTITY`        | `01`           | Thành phố Hà Nội  | `ha-noi`       |
| `DN`        | Đà Nẵng     | `EXACT_CURRENT_IDENTITY`        | `48`           | Thành phố Đà Nẵng | `da-nang`      |

This decision does not treat legacy DEV codes as canonical-equivalent keys and
does not introduce aliases into `Province.code`. Retirement is authorized by
the human-reviewed successor mapping, zero current consumers, and the absence
of an independent current development contract.

## Deferred Products Geography Debt

```text
PRODUCT_DEV_LEGACY_GEOGRAPHY_MAPPING_STATUS=DEFERRED_TO_P8_05B
```

`src/modules/products/infrastructure/database/seeds/product.seed.ts` still
contains historical province-name references for Tiền Giang, Bến Tre, Sóc
Trăng, Bình Thuận, and Long An. P8-05A does not change that uncalled Products
DEV payload. P8-05B must apply the approved successor mapping before making the
Product DEV path executable.

## P8-05A Users And Seller Decisions

```text
USERS_DEV_GROUP_ID=users.dev.users
USERS_DEV_IDENTITY_CONFLICT_POLICY=FAIL_CLOSED_IF_PHONE_AND_EMAIL_RESOLVE_TO_DIFFERENT_USERS
DEV_USER_PASSWORD_RECONCILIATION_POLICY=REPLACE_WITH_DECLARED_DEV_CREDENTIAL
SELLER_DEV_SEED_DECISION=DEFER_TO_P8_05B_PRODUCT_DEPENDENCY
```

The active seven-user CLI payload is owned by Users and reconciles each record
independently using the unique `phone` and `email` fields. The declared DEV
credential is re-hashed and replaced only during explicit DEV execution. No
credential or hash is exposed through SeedGroup metadata or logging.

The legacy seller seed has no executable caller, but its `SeededSellers` type is
still consumed by the deferred Product DEV source. It remains unmigrated for
P8-05B and retains a known partial-state defect: its exactly-three guard is not
per-record convergent and must not be executed unchanged.

Exact identity comparison found no phone/email overlap between the P8-05A Users
payload and the seller payload. The existing `admin@agrilink.vn` email also
appears in `admin-dev.seed.ts` and `DevSeedService`; those central payloads are
unchanged and remain P8-05C/P8-05D debt. P8-05A introduces no duplicate user
payload.

## P8-05B0 Seed Dependency Output Decision

```text
APPROVED_ARCHITECTURE=SEEDGROUP_SCALAR_DEPENDENCY_OUTPUTS_WITH_DEPENDENCY_SCOPED_LOOKUP
SEED_DEPENDENCY_OUTPUT_MODEL=SCALAR_DEPENDENCY_SCOPED
OUTPUT_SCOPE=PRODUCER_GROUP_ID_PLUS_KIND_PLUS_STABLE_KEY
OUTPUT_REGISTRY_PERSISTENCE=IN_MEMORY_EXECUTION_ONLY
UNDECLARED_DEPENDENCY_ACCESS=FAIL_CLOSED
MISSING_REQUIRED_OUTPUT=FAIL_CLOSED
OUTPUT_TYPE_MISMATCH=FAIL_CLOSED
OUTPUT_COLLISION=FAIL_CLOSED_PER_PRODUCER_KIND_KEY
ENTITY_TRANSPORT=PROHIBITED
REPOSITORY_TRANSPORT=PROHIBITED
SECRET_TRANSPORT=PROHIBITED

USER_DEV_OUTPUT_KIND=user.id.by-email
USER_DEV_OUTPUT_COUNT=7
PROVINCE_OUTPUT_KIND=province.id.by-code
PROVINCE_OUTPUT_COUNT=34
CATEGORY_OUTPUT_KIND=category.id.by-slug
CATEGORY_OUTPUT_COUNT=37

P8_05B0_DEPENDENCY_OUTPUT_CONTRACT_STATUS=IMPLEMENTED_BY_MERGED_PR_108
P8_05B_PRODUCTS_DEV_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
PRODUCT_DEV_STABLE_KEY=sku
PRODUCT_IMAGE_DEV_STABLE_KEY=SEEDED_PRODUCT_SKU_PLUS_PRIMARY_SLOT
```

The orchestrator owns an execution-local registry and supplies each group with
a read-only snapshot limited to producer IDs in that group's declared
dependencies. This unblocks generated owner ID handoff without allowing
cross-owner entity or repository access. Full rationale and trade-offs are in
`seed-dependency-contract.md`.

PR #108 did not implement Products DEV behavior, retire Product/Seller sources,
invent Product SKU values, or change destructive reset/startup behavior. Its
merged output contract is the architecture used by the P8-05B implementation
recorded below.

## P8-05B Products Development Decision

```text
P8_05B_CANONICAL_PRODUCTS_DEV_PATH=PRODUCT_DEVELOPMENT_SEED_SERVICE_REWRITTEN_AS_SEEDGROUP
PRODUCTS_DEV_GROUP_ID=products.dev.products
PRODUCTS_DEV_OWNER=products

LEGACY_PRODUCT_SEED_DECISION=RETIRE_SUPERSEDED
SELLER_DEV_SEED_DECISION=RETIRE_WITH_SUPERSEDED_PRODUCT_PATH

PRODUCT_DEV_STABLE_KEY=sku
PRODUCT_DEV_SKU_COUNT=54
PRODUCT_DEV_SKU_NULL_COUNT=0
PRODUCT_DEV_DUPLICATE_SKU_COUNT=0
PRODUCT_DEV_IDEMPOTENCY=PER_RECORD_CREATE_OR_RECONCILE_BY_SKU

PRODUCT_IMAGE_DEV_STABLE_KEY=SEEDED_PRODUCT_SKU_PLUS_PRIMARY_SLOT
PRODUCT_IMAGE_DEV_IDEMPOTENCY=ONE_PRIMARY_SLOT_PER_SEEDED_PRODUCT
MULTIPLE_PRIMARY_IMAGES_POLICY=FAIL_CLOSED

PRODUCT_DEV_SELLER_DEPENDENCY=users.dev.users/user.id.by-email
PRODUCT_DEV_CATEGORY_DEPENDENCY=products.reference.categories/category.id.by-slug
PRODUCT_DEV_GEOGRAPHY_DEPENDENCY=NONE_FOR_CANONICAL_PATH
PRODUCT_DEV_LEGACY_GEOGRAPHY_MAPPING_STATUS=RESOLVED_BY_RETIRING_DEAD_LEGACY_GEOGRAPHY_BEHAVIOR

DESTRUCTIVE_RESET_STATUS=PRODUCT_DEV_RESET_RETIRED_FAIL_CLOSED_BEFORE_BOOTSTRAP
DEVSEEDSERVICE_PRODUCT_EXECUTION_UNDER_PRODUCT_DEV_STARTUP=0
```

The canonical payload keeps its 54 existing Product names, descriptions,
prices, categories, quantities, and dates, and adds one explicit source-stable
`DEV-*` SKU to each record. Products resolve three seller UUIDs from
`users.dev.users` by email and category UUIDs from
`products.reference.categories` by slug. No User or Geography persistence
adapter crosses the Products boundary. The canonical payload does not persist
`provinceId`, so it has no Geography dependency.

Each seeded Product owns one intended primary image slot. The owner-local seed
writer creates the slot when absent, updates the existing slot when present,
and fails closed if more than one primary image exists. It never deletes
unrelated images or Products. Product DEV reset is retired; setting
`PRODUCT_DEV_SEED_RESET` fails before application bootstrap.

### Legacy Product Payload Audit

Exact names—not fuzzy similarity—were compared across the 16-row legacy source,
the 54-row canonical source, and the 18-row central `DevSeedService` payload.

```text
LEGACY_PRODUCT_RECORD_COUNT=16
LEGACY_PRODUCT_EXACT_ACTIVE_MATCHES=2
LEGACY_PRODUCT_EXACT_CENTRAL_MATCHES=10
LEGACY_PRODUCT_HISTORICAL_ONLY_COUNT=5
LEGACY_PRODUCT_REQUIRES_HUMAN_DECISION_COUNT=0
```

| Legacy exact name | Active exact | Central exact | Classification |
| --- | --- | --- | --- |
| Xoài cát Hòa Lộc | No | Yes | `CENTRAL_ONLY_EQUIVALENT` |
| Sầu riêng Ri6 | No | Yes | `CENTRAL_ONLY_EQUIVALENT` |
| Bưởi da xanh | No | No | `HISTORICAL_DEAD_ONLY` |
| Thanh long ruột đỏ | No | Yes | `CENTRAL_ONLY_EQUIVALENT` |
| Dưa hấu không hạt | No | Yes | `CENTRAL_ONLY_EQUIVALENT` |
| Rau muống hữu cơ | No | No | `HISTORICAL_DEAD_ONLY` |
| Cà rốt Đà Lạt | No | Yes | `CENTRAL_ONLY_EQUIVALENT` |
| Nấm bào ngư xám | No | No | `HISTORICAL_DEAD_ONLY` |
| Gạo ST25 đặc sản | No | Yes | `CENTRAL_ONLY_EQUIVALENT` |
| Gạo Jasmine thơm | No | Yes | `CENTRAL_ONLY_EQUIVALENT` |
| Cà phê Arabica Cầu Đất | No | Yes | `CENTRAL_ONLY_EQUIVALENT` |
| Cà phê Robusta Buôn Ma Thuột | Yes | No | `ACTIVE_CANONICAL_EQUIVALENT` |
| Tiêu đen Phú Quốc | Yes | Yes | `ACTIVE_CANONICAL_EQUIVALENT` |
| Nghệ tươi vàng | No | No | `HISTORICAL_DEAD_ONLY` |
| Hạt điều rang muối | No | No | `HISTORICAL_DEAD_ONLY` |
| Đậu phộng rang | No | Yes | `CENTRAL_ONLY_EQUIVALENT` |

The five historical-only demo records and the legacy per-image/Province-name
behavior had no executable or test consumer. They are documented rather than
migrated solely to preserve dead code. Retiring `product.seed.ts` removes the
only `SeededSellers` consumer, so the uncalled three-seller source is retired
without creating `users.dev.sellers`.

### Repository And Startup Disposition

```text
seedCategories=REMOVED_FROM_NORMAL_PRODUCT_REPOSITORY
countProducts=REMOVED_FROM_NORMAL_PRODUCT_REPOSITORY
saveSeedProducts=REMOVED_FROM_NORMAL_PRODUCT_REPOSITORY
savePrimaryImagesForProducts=REMOVED_FROM_NORMAL_PRODUCT_REPOSITORY
resetProducts=REMOVED_FROM_NORMAL_PRODUCT_REPOSITORY
PRODUCT_DEV_SEED_WRITES=DEDICATED_OWNER_LOCAL_TYPEORM_ADAPTER
CENTRAL_CLI_NEW_PRODUCTS_DEV_EXECUTION=NO
CENTRAL_DEV_SEED_SERVICE_DECOMPOSITION=0
```

Opt-in startup now runs Product Categories, Users DEV, and canonical Products
DEV in one `SeedOrchestrator` execution. It then invokes the still-central
development service with `skipProducts=true`, reusing canonical Product rows
for downstream Forum/Review/Cooperative fixtures without running its overlapping
Product/category/image write section. Decomposition of that service remains
P8-05C debt.
