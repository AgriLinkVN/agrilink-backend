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

| Legacy code | Legacy name | Mapping type                     | Canonical code | Canonical name        | Canonical slug |
| ----------- | ----------- | -------------------------------- | -------------- | --------------------- | -------------- |
| `LD`        | Lâm Đồng    | `EXACT_CURRENT_IDENTITY`         | `68`           | Tỉnh Lâm Đồng         | `lam-dong`     |
| `DL`        | Đắk Lắk     | `EXACT_CURRENT_IDENTITY`         | `66`           | Tỉnh Đắk Lắk          | `dak-lak`      |
| `TG`        | Tiền Giang  | `ADMINISTRATIVE_SUCCESSOR_2025` | `82`           | Tỉnh Đồng Tháp        | `dong-thap`    |
| `BT`        | Bến Tre     | `ADMINISTRATIVE_SUCCESSOR_2025` | `86`           | Tỉnh Vĩnh Long        | `vinh-long`    |
| `ST`        | Sóc Trăng   | `ADMINISTRATIVE_SUCCESSOR_2025` | `92`           | Thành phố Cần Thơ     | `can-tho`      |
| `BTN`       | Bình Thuận  | `ADMINISTRATIVE_SUCCESSOR_2025` | `68`           | Tỉnh Lâm Đồng         | `lam-dong`     |
| `LA`        | Long An     | `ADMINISTRATIVE_SUCCESSOR_2025` | `80`           | Tỉnh Tây Ninh         | `tay-ninh`     |
| `CT`        | Cần Thơ     | `EXACT_CURRENT_IDENTITY`         | `92`           | Thành phố Cần Thơ     | `can-tho`      |
| `HN`        | Hà Nội      | `EXACT_CURRENT_IDENTITY`         | `01`           | Thành phố Hà Nội      | `ha-noi`       |
| `DN`        | Đà Nẵng     | `EXACT_CURRENT_IDENTITY`         | `48`           | Thành phố Đà Nẵng     | `da-nang`      |

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
