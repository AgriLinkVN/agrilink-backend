# P8-05C1A User Identity, Address, And Geography Decisions

## Decision Status

```text
DECISION_ID=P8_05C1A_USER_ROOTED_IDENTITY_AND_GEOGRAPHY_DECISIONS
DECISION_STATUS=IMPLEMENTED_BY_MERGED_PR_111
IMPLEMENTATION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
CLASSIFICATION=DEV
P8_05C1_IMPLEMENTATION_AUTHORIZED=YES
```

This document resolves the static decision blockers for the user-rooted
P8-05C1 slice. It changes no User payload, central seed behavior, entity,
schema, migration, bootstrap, or database state. PR #110 and merge commit
`73de52dbd52f4e12a14c0a2fd6af8212a005510a` are the planning baseline.

## Evidence And Constraints

The decisions use current source, TypeORM mappings, the canonical V2 catalog,
the ownership registry, Phase 7A dormant-context decisions, and read-only Git
history. The protected local database and production were not queried.

The relevant constraints are:

- User email and phone are independently unique and must not resolve to
  different rows.
- Cross-group IDs must come from declared scalar outputs.
- A display name or role alone is not User identity.
- Legacy integer Geography-looking columns are not canonical Province UUID
  relationships unless schema and history prove that relationship.
- A seed-level slot may be narrower than global domain cardinality, but it must
  use fields already present in source and fail closed on ambiguity.

## User Source Inventory

### Source Counts And Entry Points

```text
CANONICAL_USERS_DEV_COUNT=7
DEVSEEDSERVICE_USER_DECLARED_COUNT=11
DEVSEEDSERVICE_USER_ACTUALLY_WRITTEN_COUNT=11
DEVSEEDSERVICE_USER_RETURNED_COUNT=8
DEVSEEDSERVICE_DECLARED_BUT_NEVER_WRITTEN_COUNT=0
ADMIN_DEV_USER_DECLARED_COUNT=9
```

`seedUsers()` writes or reconciles all eleven central declarations: indices
`0..7` are written and returned under named keys; indices `8..10` are also
written by the second loop but are not returned. The last three therefore have
no direct, stable downstream reference. Unordered role queries can select them
incidentally; that is not an identity contract.

`users.dev.users` is executed by the standalone seed CLI and by the guarded
Products DEV startup DAG when DEV seeding is selected. `DevSeedService` runs
only through the guarded non-production Products DEV startup path.
`admin-dev.seed.ts` writes its nine declarations only through its separate,
guarded standalone/admin entrypoint.

### A. Existing `users.dev.users`

| SOURCE | EMAIL | PHONE | ROLE | FULL_NAME | IS_ACTUALLY_WRITTEN_BY_CURRENT_ENTRYPOINT | CURRENT_CONSUMERS | DOWNSTREAM_FIXTURES_REQUIRING_ID | DISPOSITION |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `users.dev.users` | `admin@agrilink.vn` | `+84901111099` | ADMIN | Quản trị viên Hệ thống | yes when DEV group selected | no current owner-group consumer | future Addresses, Audit Logs, Notifications | retain canonical identity |
| `users.dev.users` | `farmer@agrilink.vn` | `+84901111001` | FARMER | Nông dân Nguyễn Văn Ruộng | yes | Products DEV | Products DEV | retain canonical identity |
| `users.dev.users` | `cooperative@agrilink.vn` | `+84901111002` | COOPERATIVE | Hợp tác xã Nông nghiệp Xanh | yes | Products DEV | Products DEV | retain canonical identity |
| `users.dev.users` | `buyer@agrilink.vn` | `+84901111003` | BUYER | Người mua Trần Thị Thu Mua | yes | none today | future Addresses, Forum, Reviews, Notifications | retain canonical identity and map central consumers |
| `users.dev.users` | `enterprise@agrilink.vn` | `+84901111004` | ENTERPRISE | Doanh nghiệp Nông sản Việt | yes | none today | future Addresses, Profiles, Reviews, Notifications | retain canonical identity and map central consumers |
| `users.dev.users` | `supplier@agrilink.vn` | `+84901111005` | SUPPLIER | Nhà cung cấp Vật tư An Dân | yes | Products DEV | future Addresses, Profiles, Ads, Notifications; Products DEV | retain canonical identity and map central consumers |
| `users.dev.users` | `logistics@agrilink.vn` | `+84901111007` | LOGISTICS | Logistics Giao hàng nhanh | yes | none today | future Addresses, Logistics Profile, Notifications | retain canonical identity and map central consumers |

### B. Central `DevSeedService`

| SOURCE | EMAIL | PHONE | ROLE | FULL_NAME | IS_ACTUALLY_WRITTEN_BY_CURRENT_ENTRYPOINT | CURRENT_CONSUMERS | DOWNSTREAM_FIXTURES_REQUIRING_ID | DISPOSITION |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `DevSeedService` | `admin@agrilink.vn` | `+84905064606` | ADMIN | Admin Hệ thống AgriLink | yes; returned as `ADMIN` | Address, Audit Logs, Notifications; two unused method parameters | Addresses, Audit Logs, Notifications | map to canonical admin; retire duplicate write |
| `DevSeedService` | `farmer@sandbox.com` | `+84905602427` | FARMER | Nguyễn Văn Nông | yes; returned as `FARMER` | Address, Farmer Profile, Forum, Reviews, Bulk Contribution, Harvest, Notifications | same owner groups after decomposition | retain as distinct canonical DEV User |
| `DevSeedService` | `buyer@sandbox.com` | `+84909259456` | BUYER | Trần Thị Thu Mua | yes; returned as `BUYER` | Address, Forum, Reviews, Notifications | mapped to canonical Buyer outputs | map consumers to `buyer@agrilink.vn` |
| `DevSeedService` | `enterprise@sandbox.com` | `+84902136212` | ENTERPRISE | Doanh nghiệp Nông sản Việt | yes; returned as `ENTERPRISE` | Address, Enterprise Profile, Reviews, Notifications | mapped to canonical Enterprise outputs | map consumers to `enterprise@agrilink.vn` |
| `DevSeedService` | `supplier@sandbox.com` | `+84905516850` | SUPPLIER | Nhà cung cấp Vật tư An Dân | yes; returned as `SUPPLIER` | Address, Supplier Profile, Ads, Notifications; unordered Product role lookup | mapped to canonical Supplier outputs | map consumers to `supplier@agrilink.vn` |
| `DevSeedService` | `logistics@sandbox.com` | `+84903730212` | LOGISTICS | Logistics Giao hàng Nhanh | yes; returned as `LOGISTICS` | Address, Logistics Profile, Notifications | mapped to canonical Logistics outputs | map consumers to `logistics@agrilink.vn` |
| `DevSeedService` | `cooperative@sandbox.com` | `+84902372975` | COOPERATIVE | HTX Nông nghiệp Xanh Tiền Giang | yes; returned as `COOP` | Address, Cooperative Profile, Forum, Cooperative Operations, Notifications | same owner groups after decomposition | retain as distinct canonical DEV User |
| `DevSeedService` | `state_agency@sandbox.com` | `+84907658754` | STATE_AGENCY | Cơ quan Quản lý NN Nông thôn | yes; returned as `STATE_AGENCY` | Address, Audit Logs, Notifications | same owner groups after decomposition | retain as distinct canonical DEV User |
| `DevSeedService` | `demo.farmer@sandbox.com` | `+84909000001` | FARMER | Nông dân Demo Lâm Đồng | yes; not returned | no deterministic consumer; only unordered role scans can select it | none after scalar-output migration | retire unused declaration |
| `DevSeedService` | `demo.coop@sandbox.com` | `+84909000002` | COOPERATIVE | HTX Demo Tiền Giang | yes; not returned | no deterministic consumer; only unordered Product role scan can select it | none | retire unused declaration |
| `DevSeedService` | `demo.supplier@sandbox.com` | `+84909000003` | SUPPLIER | Nhà cung cấp Demo Đắk Lắk | yes; not returned | no deterministic consumer; only unordered role scans can select it | none after scalar-output migration | retire unused declaration |

The four map decisions are not role-only merges. Buyer has the same named
persona after removing the existing canonical role prefix. Enterprise and
Supplier have exact organization names. Logistics differs only by casing.
None has a phone-specific consumer. By contrast, the central Farmer and
Cooperative carry distinct named personas and distinct profile fixtures, so
they are retained.

### C. Standalone `admin-dev.seed.ts`

| SOURCE | EMAIL | PHONE | ROLE | FULL_NAME | IS_ACTUALLY_WRITTEN_BY_CURRENT_ENTRYPOINT | CURRENT_CONSUMERS | DOWNSTREAM_FIXTURES_REQUIRING_ID | DISPOSITION |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `admin-dev.seed.ts` | `admin@agrilink.vn` | `0909999999` | ADMIN | Admin AgriLink | yes, standalone only | none after insertion; source looks up by email | none in that source | defer conflict to P8-05D |
| `admin-dev.seed.ts` | `hung.nv@farm.vn` | `0912345678` | FARMER | Nguyễn Văn Hùng | yes, standalone only | Farmer Profile, Products, Images | admin-dashboard fixture | defer to P8-05D |
| `admin-dev.seed.ts` | `mai.lt@farm.vn` | `0912345679` | FARMER | Lê Thị Mai | yes, standalone only | Farmer Profile, Products, Images | admin-dashboard fixture | defer to P8-05D |
| `admin-dev.seed.ts` | `tuan.pq@farm.vn` | `0912345680` | FARMER | Phạm Quang Tuấn | yes, standalone only | Farmer Profile, Products, Images | admin-dashboard fixture | defer to P8-05D |
| `admin-dev.seed.ts` | `htx.dalat@coop.vn` | `0912345681` | COOPERATIVE | HTX Rau Sạch Đà Lạt | yes, standalone only | Cooperative Profile, Products, Images | admin-dashboard fixture | defer to P8-05D |
| `admin-dev.seed.ts` | `htx.tiengiang@coop.vn` | `0912345682` | COOPERATIVE | HTX Trái Cây Tiền Giang | yes, standalone only | Cooperative Profile, Products, Images | admin-dashboard fixture | defer to P8-05D |
| `admin-dev.seed.ts` | `xnk.mekong@ent.vn` | `0912345683` | ENTERPRISE | Công ty TNHH XNK Nông Sản Mekong | yes, standalone only | Enterprise Profile, Products, Images | admin-dashboard fixture | defer to P8-05D |
| `admin-dev.seed.ts` | `agri.tech@ent.vn` | `0912345684` | ENTERPRISE | Công ty CP Công Nghệ Nông Nghiệp Xanh | yes, standalone only | Enterprise Profile, Products, Images | admin-dashboard fixture | defer to P8-05D |
| `admin-dev.seed.ts` | `phanbon.xanh@sup.vn` | `0912345685` | SUPPLIER | Công ty TNHH Phân Bón Xanh Việt | yes, standalone only | Supplier Profile, Products, Images | admin-dashboard fixture | defer to P8-05D |

## Admin Conflict Decision

Repository-wide static search finds the two noncanonical admin phones only in
their declarations and the Phase 8 audit documents. Central consumers pass the
admin UUID, not its phone. The admin DEV source reconciles by email and never
uses its Admin UUID for a child fixture.

```text
CENTRAL_ADMIN_PHONE_CONSUMERS=NONE
ADMIN_DEV_PHONE_CONSUMERS=NONE
P8_05C1_ADMIN_IDENTITY_DECISION=REUSE_CANONICAL_USERS_DEV_ADMIN_BY_EMAIL
CENTRAL_ADMIN_DUPLICATE_WRITE=RETIRE
ADMIN_DEV_ADMIN_CONFLICT=DEFERRED_TO_P8_05D
```

## Central-Only User Decisions

| EMAIL | PHONE | ROLE | ACTUALLY_WRITTEN | RETURNED | CONSUMERS | DISPOSITION |
| --- | --- | --- | --- | --- | --- | --- |
| `farmer@sandbox.com` | `+84905602427` | FARMER | yes | yes | distinct Farmer/Profile and relationship fixtures | `RETAIN_AS_DISTINCT_CANONICAL_DEV_USER` |
| `buyer@sandbox.com` | `+84909259456` | BUYER | yes | yes | Forum, Reviews, Notifications, Address | `MAP_CONSUMERS_TO_EXISTING_CANONICAL_USER` (`buyer@agrilink.vn`) |
| `enterprise@sandbox.com` | `+84902136212` | ENTERPRISE | yes | yes | Enterprise Profile, Reviews, Notifications, Address | `MAP_CONSUMERS_TO_EXISTING_CANONICAL_USER` (`enterprise@agrilink.vn`) |
| `supplier@sandbox.com` | `+84905516850` | SUPPLIER | yes | yes | Supplier Profile, Ads, Notifications, Address | `MAP_CONSUMERS_TO_EXISTING_CANONICAL_USER` (`supplier@agrilink.vn`) |
| `logistics@sandbox.com` | `+84903730212` | LOGISTICS | yes | yes | Logistics Profile, Notifications, Address | `MAP_CONSUMERS_TO_EXISTING_CANONICAL_USER` (`logistics@agrilink.vn`) |
| `cooperative@sandbox.com` | `+84902372975` | COOPERATIVE | yes | yes | distinct Cooperative/Profile and relationship fixtures | `RETAIN_AS_DISTINCT_CANONICAL_DEV_USER` |
| `state_agency@sandbox.com` | `+84907658754` | STATE_AGENCY | yes | yes | Audit Logs, Notifications, Address | `RETAIN_AS_DISTINCT_CANONICAL_DEV_USER` |
| `demo.farmer@sandbox.com` | `+84909000001` | FARMER | yes | no | no deterministic consumer | `RETIRE_UNUSED_DECLARATION` |
| `demo.coop@sandbox.com` | `+84909000002` | COOPERATIVE | yes | no | no deterministic consumer | `RETIRE_UNUSED_DECLARATION` |
| `demo.supplier@sandbox.com` | `+84909000003` | SUPPLIER | yes | no | no deterministic consumer | `RETIRE_UNUSED_DECLARATION` |

No payload is changed by this PR. C1B must add the three retained central
identities to `users.dev.users`, redirect mapped consumers to canonical email
outputs, and remove the duplicate/unused central writes only when the
owner-local groups replace them.

## Minimum Required User Set And Future Payload

The final C1B Users payload contains the seven already-approved canonical
accounts plus three source-proven distinct central accounts. This preserves the
merged Users DEV contract while eliminating the central admin duplicate, four
semantic duplicates, and three declarations without deterministic consumers.

| EMAIL | PHONE | ROLE | SOURCE_ORIGIN | CONSUMING_GROUPS | CANONICAL_STATUS |
| --- | --- | --- | --- | --- | --- |
| `admin@agrilink.vn` | `+84901111099` | ADMIN | existing Users DEV | Addresses; Audit Logs; Notifications | existing canonical |
| `farmer@agrilink.vn` | `+84901111001` | FARMER | existing Users DEV | Products DEV | existing canonical |
| `cooperative@agrilink.vn` | `+84901111002` | COOPERATIVE | existing Users DEV | Products DEV | existing canonical |
| `buyer@agrilink.vn` | `+84901111003` | BUYER | existing Users DEV | Addresses; Forum; Reviews; Notifications | existing canonical; receives mapped consumers |
| `enterprise@agrilink.vn` | `+84901111004` | ENTERPRISE | existing Users DEV | Addresses; Profiles; Reviews; Notifications | existing canonical; receives mapped consumers |
| `supplier@agrilink.vn` | `+84901111005` | SUPPLIER | existing Users DEV | Products DEV; Addresses; Profiles; Ads; Notifications | existing canonical; receives mapped consumers |
| `logistics@agrilink.vn` | `+84901111007` | LOGISTICS | existing Users DEV | Addresses; Logistics Profile; Notifications | existing canonical; receives mapped consumers |
| `farmer@sandbox.com` | `+84905602427` | FARMER | central service | Addresses; Profiles; Forum; Reviews; Cooperatives; Notifications | add as distinct canonical DEV identity in C1B |
| `cooperative@sandbox.com` | `+84902372975` | COOPERATIVE | central service | Addresses; Profiles; Forum; Cooperatives; Notifications | add as distinct canonical DEV identity in C1B |
| `state_agency@sandbox.com` | `+84907658754` | STATE_AGENCY | central service | Addresses; Audit Logs; Notifications | add as distinct canonical DEV identity in C1B |

```text
P8_05C_REQUIRED_USER_EMAILS=admin@agrilink.vn,farmer@agrilink.vn,cooperative@agrilink.vn,buyer@agrilink.vn,enterprise@agrilink.vn,supplier@agrilink.vn,logistics@agrilink.vn,farmer@sandbox.com,cooperative@sandbox.com,state_agency@sandbox.com
FINAL_C1_USER_COUNT=10
DUPLICATE_EMAIL_COUNT=0
DUPLICATE_PHONE_COUNT=0
```

## User Address Schema And Lifecycle Decision

### Current Model

The owner entity declares a generated UUID primary key, a plain UUID
`user_id`, nullable `label`, nullable integer `province_id` and `district_id`,
and an `is_default` boolean. It declares no relation decorator, foreign-key
constraint, or unique constraint. `user_addresses` is absent from the canonical
V2 baseline and remains a deferred Users mapping with no runtime repository/API.

The shape permits multiple addresses for one User. Current central behavior is
narrower: it skips when any address exists for the User; otherwise it inserts
exactly one row with the already-declared label `Địa chỉ chính` and
`is_default=true`.

```text
ADDRESS_CARDINALITY_MODEL=MULTIPLE_ADDRESSES_PER_USER_ALLOWED
ADDRESS_UNIQUE_CONSTRAINTS=PRIMARY_KEY_ONLY; NO_USER_LABEL_OR_DEFAULT_UNIQUE_CONSTRAINT
ADDRESS_CURRENT_INTENDED_SLOT=ONE_CENTRAL_SEEDED_DEFAULT_ROW_PER_DECLARED_ADDRESS_PAYLOAD
USERS_DEV_ADDRESS_IDENTITY=SEEDED_USER_PLUS_DEFAULT_ADDRESS_SLOT
ADDRESS_DECISION=APPROVE_SEED_LEVEL_SLOT_USER_ID+EXISTING_LABEL_DIA_CHI_CHINH+IS_DEFAULT_TRUE
```

This does not claim that a User may have only one address globally. C1B must
query the exact seed-owned slot using User ID, the existing literal label, and
`is_default=true`: zero matches creates, one reconciles, and more than one
fails closed. It must not delete or rewrite unrelated User addresses. The
deferred table/migration status remains an execution-verification concern and
does not authorize schema creation in C1B.

## Geography Field-By-Field Inventory

`CENTRAL_DEV_GEOGRAPHY_LITERAL_COUNT=22`. The following 22 numeric occurrences
are the complete count.

| OWNER_GROUP | ENTITY | FIELD | DB_COLUMN_TYPE | ENTITY_TS_TYPE | FK_CONSTRAINT | RELATION_DECORATOR | CURRENT_LITERAL | CURRENT_SOURCE_MEANING_IF_DOCUMENTED | SEMANTIC_CLASSIFICATION | DECISION | DEPENDENCY_REQUIRED |
| --- | --- | --- | --- | --- | --- | --- | ---: | --- | --- | --- | --- |
| `users.dev.addresses` | UserAddress | `provinceId` | integer nullable | `number \| null` | no | no | 1 | address text says Hà Nội | `LEGACY_INTERNAL_NUMERIC_CODE` | `PRESERVE_AS_LEGACY_METADATA` | no |
| `users.dev.addresses` | UserAddress | `provinceId` | integer nullable | `number \| null` | no | no | 2 | address text says Lâm Đồng | `LEGACY_INTERNAL_NUMERIC_CODE` | `PRESERVE_AS_LEGACY_METADATA` | no |
| `users.dev.addresses` | UserAddress | `provinceId` | integer nullable | `number \| null` | no | no | 3 | address text says TP.HCM | `LEGACY_INTERNAL_NUMERIC_CODE` | `PRESERVE_AS_LEGACY_METADATA` | no |
| `users.dev.addresses` | UserAddress | `provinceId` | integer nullable | `number \| null` | no | no | 1 | address text says Hà Nội | `LEGACY_INTERNAL_NUMERIC_CODE` | `PRESERVE_AS_LEGACY_METADATA` | no |
| `users.dev.addresses` | UserAddress | `provinceId` | integer nullable | `number \| null` | no | no | 10 | address text says Buôn Ma Thuột/Đắk Lắk | `LEGACY_INTERNAL_NUMERIC_CODE` | `PRESERVE_AS_LEGACY_METADATA` | no |
| `users.dev.addresses` | UserAddress | `provinceId` | integer nullable | `number \| null` | no | no | 6 | address text says Đà Nẵng | `LEGACY_INTERNAL_NUMERIC_CODE` | `PRESERVE_AS_LEGACY_METADATA` | no |
| `users.dev.addresses` | UserAddress | `provinceId` | integer nullable | `number \| null` | no | no | 22 | address text says Tiền Giang | `LEGACY_INTERNAL_NUMERIC_CODE` | `PRESERVE_AS_LEGACY_METADATA` | no |
| `users.dev.addresses` | UserAddress | `provinceId` | integer nullable | `number \| null` | no | no | 1 | address text says Hà Nội | `LEGACY_INTERNAL_NUMERIC_CODE` | `PRESERVE_AS_LEGACY_METADATA` | no |
| `profiles.dev.role-profiles` | FarmerProfile | `provinceId` | integer nullable | `number \| null` | no | no | 2 | residence says Lâm Đồng | `LEGACY_INTERNAL_NUMERIC_CODE` | `PRESERVE_AS_LEGACY_METADATA` | no |
| `profiles.dev.role-profiles` | CooperativeProfile | `provinceId` | integer nullable | `number \| null` | no | no | 22 | address says Tiền Giang | `LEGACY_INTERNAL_NUMERIC_CODE` | `PRESERVE_AS_LEGACY_METADATA` | no |
| `profiles.dev.role-profiles` | EnterpriseProfile | `provinceId` | integer nullable | `number \| null` | no | no | 1 | address says Hà Nội | `LEGACY_INTERNAL_NUMERIC_CODE` | `PRESERVE_AS_LEGACY_METADATA` | no |
| `profiles.dev.role-profiles` | SupplierProfile | `provinceId` | integer nullable | `number \| null` | no | no | 10 | address says Buôn Ma Thuột/Đắk Lắk | `LEGACY_INTERNAL_NUMERIC_CODE` | `PRESERVE_AS_LEGACY_METADATA` | no |
| `logistics.dev.profile` | LogisticsProfile | `operatingProvinces[0]` | integer array | `number[]` | no | no | 1 | no per-value map documented | `LEGACY_INTERNAL_NUMERIC_CODE` | `PRESERVE_AS_LEGACY_METADATA` | no |
| `logistics.dev.profile` | LogisticsProfile | `operatingProvinces[1]` | integer array | `number[]` | no | no | 2 | no per-value map documented | `LEGACY_INTERNAL_NUMERIC_CODE` | `PRESERVE_AS_LEGACY_METADATA` | no |
| `logistics.dev.profile` | LogisticsProfile | `operatingProvinces[2]` | integer array | `number[]` | no | no | 6 | no per-value map documented | `LEGACY_INTERNAL_NUMERIC_CODE` | `PRESERVE_AS_LEGACY_METADATA` | no |
| `logistics.dev.profile` | LogisticsProfile | `operatingProvinces[3]` | integer array | `number[]` | no | no | 7 | no per-value map documented | `LEGACY_INTERNAL_NUMERIC_CODE` | `PRESERVE_AS_LEGACY_METADATA` | no |
| `logistics.dev.profile` | LogisticsProfile | `operatingProvinces[4]` | integer array | `number[]` | no | no | 22 | no per-value map documented | `LEGACY_INTERNAL_NUMERIC_CODE` | `PRESERVE_AS_LEGACY_METADATA` | no |
| `logistics.dev.profile` | LogisticsProfile | `operatingProvinces[5]` | integer array | `number[]` | no | no | 23 | no per-value map documented | `LEGACY_INTERNAL_NUMERIC_CODE` | `PRESERVE_AS_LEGACY_METADATA` | no |
| `logistics.dev.profile` | LogisticsProfile | `operatingProvinces[6]` | integer array | `number[]` | no | no | 24 | no per-value map documented | `LEGACY_INTERNAL_NUMERIC_CODE` | `PRESERVE_AS_LEGACY_METADATA` | no |
| `logistics.dev.profile` | LogisticsProfile | `operatingProvinces[7]` | integer array | `number[]` | no | no | 10 | no per-value map documented | `LEGACY_INTERNAL_NUMERIC_CODE` | `PRESERVE_AS_LEGACY_METADATA` | no |
| `logistics.dev.profile` | LogisticsProfile | `operatingProvinces[8]` | integer array | `number[]` | no | no | 11 | no per-value map documented | `LEGACY_INTERNAL_NUMERIC_CODE` | `PRESERVE_AS_LEGACY_METADATA` | no |
| `logistics.dev.profile` | LogisticsProfile | `operatingProvinces[9]` | integer array | `number[]` | no | no | 12 | no per-value map documented | `LEGACY_INTERNAL_NUMERIC_CODE` | `PRESERVE_AS_LEGACY_METADATA` | no |

Farmer `districtId=null` is not part of the numeric count. Its column is also
nullable integer with no Geography relation or FK, so C1B preserves null and
adds no District dependency. `UserAddress.districtId` is not written by the
central payload.

### Why These Are Not Canonical Province IDs Or Codes

Canonical `Province.id` is UUID and `province.id.by-code` returns UUID strings.
The affected columns are `int`/`int[]`, have no relation decorators, and have
no foreign keys to `provinces`. The literal-to-address pairs also contradict
canonical codes: Lâm Đồng is canonical code `68`, not `2`; Hồ Chí Minh is `79`,
not `3`; Đà Nẵng is `48`, not `6`; Đắk Lắk is `66`, not `10`; and the current
code `22` represents Quảng Ninh, not the Tiền Giang text paired with the
central literal.

Preservation means copying the opaque legacy metadata unchanged while its
owning fixture remains. It does not claim to know every number's province and
does not make it a Geography foreign key. The P8-05A successor mapping is not
reused.

## Geography Git-History Evidence

Read-only history establishes:

- commit `06c2846790bc1e8fa96494e36dddbb5dfbb80765` (`Feature/dev seed data
  (#72)`) introduced all 22 literals together for screenshot/demo data;
- that commit contains paired address text for six values but no mapping table,
  enum, FK, canonical code statement, or per-value explanation for the
  Logistics array;
- the early persistence model used integer fields while Province already used
  UUID identity;
- Users ownership commit `5b8d4aea341f00c3f43aa925249c1a020610493f`
  preserved integer Address fields without adding a relation;
- Profiles ownership commit `2685efe15753af5463512cffccdf3af4ec483713`
  preserved integer Profile fields without adding Geography relations;
- the canonical V2 baseline explicitly retains integer Profile columns and no
  Province FK; it excludes the deferred `user_addresses` and
  `logistics_profiles` tables.

```text
GEOGRAPHY_LITERAL_HISTORICAL_EVIDENCE=PR_72_SCREENSHOT_FIXTURE_WITH_PARTIAL_TEXT_CORRELATION; NO_AUTHORITATIVE_NUMERIC_MAPPING; SCHEMA_PROVES_NON_RELATIONAL_INT_METADATA
GEOGRAPHY_REFERENCE_DEPENDENCY_REQUIRED=NO
```

## Profile And Logistics Stable Keys

| TABLE | USER_ID_UNIQUE | SECONDARY_UNIQUE_IDENTIFIER | TARGET_SEED_KEY | CONFLICT_BEHAVIOR |
| --- | --- | --- | --- | --- |
| `farmer_profiles` | yes; one-to-one unique constraint | `cccd_number` unique | User ID resolved by email | fail if User ID and CCCD resolve to different rows |
| `cooperative_profiles` | yes; one-to-one unique constraint | `business_license_number` and `tax_code` unique | User ID resolved by email | fail if User ID, license, or tax code split across rows |
| `enterprise_profiles` | yes; one-to-one unique constraint | `tax_code` unique | User ID resolved by email | fail if User ID and tax code resolve to different rows |
| `supplier_profiles` | yes; explicit unique column | no schema-unique secondary identifier; tax code is nullable/non-unique | User ID resolved by email | fail on more than one User-ID match; reconcile exactly one |
| `logistics_profiles` | yes; explicit unique column in deferred entity | none | User ID resolved by email | fail on more than one User-ID match; reconcile exactly one |

```text
FARMER_PROFILE_TARGET_SEED_KEY=user.id
COOPERATIVE_PROFILE_TARGET_SEED_KEY=user.id
ENTERPRISE_PROFILE_TARGET_SEED_KEY=user.id
SUPPLIER_PROFILE_TARGET_SEED_KEY=user.id
LOGISTICS_PROFILE_USER_ID_UNIQUE=YES
LOGISTICS_PROFILE_TARGET_SEED_KEY=user.id
```

## Final P8-05C1 Dependency DAG

The legacy numeric fields produce no Geography edge.

```text
users.dev.users / user.id.by-email
  |--> users.dev.addresses
  |--> profiles.dev.role-profiles
  `--> logistics.dev.profile
```

| PRODUCER_GROUP | OUTPUT_KIND | CONSUMER_GROUP | PURPOSE |
| --- | --- | --- | --- |
| `users.dev.users` | `user.id.by-email` | `users.dev.addresses` | address owner and seed-slot lookup |
| `users.dev.users` | `user.id.by-email` | `profiles.dev.role-profiles` | one-to-one profile owner and conflict checks |
| `users.dev.users` | `user.id.by-email` | `logistics.dev.profile` | unique Logistics Profile owner |

No new User output kind is required. No consumer may query the Users or
Geography repository.

## Architecture Decision And Trade-Offs

### Chosen Decisions

- Reuse canonical Users where stable persona/organization evidence and absent
  phone contracts support mapping; retain genuinely distinct central personas.
- Retire declarations with no deterministic consumer rather than legitimizing
  unordered role selection.
- Use the source-declared default Address label and flag as a seed-level slot,
  while preserving global multi-address cardinality.
- Preserve integer Geography fields as opaque legacy owner metadata and add no
  speculative Geography dependency.

### Alternatives Rejected

| Alternative | Reason rejected |
| --- | --- |
| retain all central Users | preserves duplicate admin and unnecessary semantic duplicates |
| map every same-role User | role is not identity and would collapse distinct Farmer/Cooperative fixtures |
| make Address `user_id` globally unique | contradicts the multi-address entity and invents a domain constraint |
| interpret integers as Province UUIDs/codes | contradicted by type, constraints, canonical codes, and history |
| apply the P8-05A successor map | no evidence connects these integers to those historical Product province names |

Accepted trade-off: legacy numeric metadata remains opaque until its owning
domain receives a schema migration. That preserves current payload meaning and
keeps C1B small, but it provides no canonical Geography referential integrity.
Revisit when Address/Profile/Logistics schemas adopt explicit Province UUID
relations or retire these fields.

## Authorization, Remaining Boundaries, And Safety

All four named C1A decisions are resolved. Deferred table/runtime verification
is still governed by later Phase 8 disposable-database gates and does not
authorize a schema change in C1B.

```text
C1_ADMIN_IDENTITY_BLOCKER=RESOLVED
C1_CENTRAL_USER_DISPOSITION_BLOCKER=RESOLVED
C1_ADDRESS_IDENTITY_BLOCKER=RESOLVED
C1_GEOGRAPHY_SEMANTICS_BLOCKER=RESOLVED
C1_BLOCKERS_REMAINING=NONE
P8_05C1_IMPLEMENTATION_AUTHORIZED=YES

ADMIN_DEV_TARGET_PHASE=P8_05D
ADMIN_DEV_IMPLEMENTATION_CHANGES=0
BUSINESS_IMPLEMENTATION_CHANGES=0
TEST_FIXTURE_IMPLEMENTATION_CHANGES=0
MIGRATION_BACKFILL_CHANGES=0

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

`admin-dev.seed.ts` remains unchanged. Its admin conflict and all dashboard
fixture identities are deferred to P8-05D. TEST fixtures, migrations, and
backfills remain outside P8-05C1.

## P8-05C1B Implementation Overlay

This overlay records the source implementation without rewriting the decision
history. PR #111 merge commit
`3737a8ee5afb70586a9890fec40c5e57b2f6c8f6` is the implementation baseline.

Static evidence confirms that neither deferred table has an executable
canonical mapping. `user_addresses` is absent from canonical baseline V2 and
all migrations, has no runtime/CLI registration or repository owner, and
remains a deferred Users mapping. `logistics_profiles` is also absent from the
baseline and migrations; Phase 7A explicitly classifies it as `DORMANT_DEFER`
with no runtime/CLI registration or owner repository. The approved seed-level
identities remain future owner decisions, but do not authorize writes to
absent, deferred tables. Both obsolete central DEV writes are retired without
replacement execution, schema, or migration.

```text
USER_ADDRESSES_PERSISTENCE_STATUS=DEFERRED_NONCANONICAL_MAPPING
LOGISTICS_PROFILES_PERSISTENCE_STATUS=DORMANT_NO_EXECUTION
USER_ADDRESSES_C1_DISPOSITION=DEFER_SEED_EXECUTION_AND_RETIRE_LEGACY_CENTRAL_WRITE
LOGISTICS_PROFILES_C1_DISPOSITION=DEFER_SEED_EXECUTION_AND_RETIRE_LEGACY_CENTRAL_WRITE

P8_05C1B_USERS_STATUS=MIGRATED_TO_USERS_DEV_USERS
P8_05C1B_ADDRESSES_STATUS=RETIRED_DUE_TO_DEFERRED_PERSISTENCE
P8_05C1B_PROFILES_STATUS=MIGRATED_TO_PROFILES_DEV_ROLE_PROFILES
P8_05C1B_LOGISTICS_STATUS=RETIRED_DUE_TO_DEFERRED_PERSISTENCE
TEMPORARY_LEGACY_CONTINUATION_STATUS=ACTIVE_UNTIL_P8_05C4
```

`profiles.dev.role-profiles` owns only the four canonical Profile tables. It
preflights User-ID and secondary-unique matches before its first write, fails
closed on split identity, reconciles intended DEV fields per record, and keeps
legacy province integers opaque. It consumes only declared
`users.dev.users/user.id.by-email` bindings.

`legacy.dev.remaining` is explicitly temporary migration scaffolding. It runs
in the same DAG, depends on `users.dev.users` for scalar actor identities and
`products.dev.products` for ordering before remaining Product-dependent
fixtures, and invokes only still-unmigrated C2/C3/C4 sections. It exposes no
global output registry and is scheduled for deletion in P8-05C4.

```text
FINAL_C1_USER_COUNT=10
USER_DEV_OUTPUT_COUNT=10
PROFILE_OWNER_GROUP=profiles.dev.role-profiles
PROFILE_TABLE_COUNT=4
GEOGRAPHY_DEPENDENCY=NONE
TEMPORARY_LEGACY_CONTINUATION=YES
TEMPORARY_LEGACY_GROUP_ID=legacy.dev.remaining
TARGET_RETIREMENT=P8_05C4

SCHEMA_CHANGES=0
MIGRATIONS_CREATED=0
DISPOSABLE_DATABASE_VERIFICATION=NOT_RUN
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
