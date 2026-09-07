# P9-02 Market Prices Split Decision and Contract

## Authority and scope

P9-02 consumes the explicit human decision below and records the contract for
later implementation. The merged Phase 9 DAG defines P9-02 as database-free
decision documentation. This slice does not rename a table, change a mapping,
create a migration, inspect deployed rows, or authorize production access.

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
```

The approval retains both semantic models and requires separate physical
persistence identities. It does not approve final table names, column changes,
row classification, copy rules, destructive operations, or production work.

## Current source-derived models

### Model A: aggregated category/province price

```text
MODEL_A_ID=AGGREGATED_CATEGORY_PROVINCE_PRICE
MODEL_A_ENTITY_CLASS=MarketPrice
MODEL_A_CURRENT_TABLE=public.market_prices
MODEL_A_OWNER=market-prices
MODEL_A_SOURCE=src/database/entities/market-price.entity.ts
MODEL_A_FIELDS=id;categoryId;provinceId;priceDate;minPrice;maxPrice;avgPrice;unit;source;createdAt
MODEL_A_NULLABILITY=minPrice=NULLABLE;maxPrice=NULLABLE;source=NULLABLE;ALL_OTHER_FIELDS=NON_NULL
MODEL_A_DEFAULTS=id=GENERATED_UUID;createdAt=TYPEORM_CREATE_TIMESTAMP;OTHER_FIELDS=NONE_DECLARED
MODEL_A_INDEXES=PRIMARY_KEY_ID_ONLY
MODEL_A_CONSTRAINTS=id=UUID_PRIMARY_KEY;minPrice/maxPrice/avgPrice=DECIMAL_15_2;unit=ProductUnit_ENUM;source=VARCHAR_100
MODEL_A_RELATIONS_OR_SCALAR_IDS=categoryId=SCALAR_INT;provinceId=SCALAR_INT;NO_TYPEORM_RELATIONS
MODEL_A_CURRENT_REPOSITORIES=NONE
MODEL_A_CURRENT_SERVICES=NONE
MODEL_A_CURRENT_CONTROLLERS=NONE
MODEL_A_CURRENT_RUNTIME_READ_PATHS=NONE
MODEL_A_CURRENT_RUNTIME_WRITE_PATHS=NONE
MODEL_A_MIGRATION_AUTHORITY=NONE_IN_V2;EXCLUDED_RUNTIME_TABLE
```

The combination of category, province, date, unit, and min/max/average values
proves an aggregate observation contract. No explicit time-bucket column,
unique constraint, or repository contract currently exists.

### Model B: reported product price

```text
MODEL_B_ID=REPORTED_PRODUCT_PRICE
MODEL_B_ENTITY_CLASS=MarketPrice
MODEL_B_CURRENT_TABLE=public.market_prices
MODEL_B_OWNER=market-prices
MODEL_B_SOURCE=src/modules/market-prices/entities/market-price.entity.ts
MODEL_B_FIELDS=id;productName;categoryId;provinceId;pricePerUnit;unit;source;reportedBy;priceDate;createdAt;updatedAt
MODEL_B_NULLABILITY=categoryId=NULLABLE;provinceId=NULLABLE;source=NULLABLE;reportedBy=NULLABLE;ALL_OTHER_FIELDS=NON_NULL
MODEL_B_DEFAULTS=id=GENERATED_UUID;createdAt=TYPEORM_CREATE_TIMESTAMP;updatedAt=TYPEORM_UPDATE_TIMESTAMP;OTHER_FIELDS=NONE_DECLARED
MODEL_B_INDEXES=PRIMARY_KEY_ID_ONLY
MODEL_B_CONSTRAINTS=id=UUID_PRIMARY_KEY;pricePerUnit=DECIMAL_12_2;unit=ProductUnit_ENUM
MODEL_B_RELATIONS_OR_SCALAR_IDS=categoryId=SCALAR_UUID_STRING;provinceId=SCALAR_UUID_STRING;reportedBy=SCALAR_USER_UUID_STRING;NO_TYPEORM_RELATIONS
MODEL_B_CURRENT_REPOSITORIES=MarketPricesService.marketPriceRepo_REPOSITORY_INJECTION
MODEL_B_CURRENT_SERVICES=MarketPricesService.findAll_TODO;MarketPricesService.create_TODO
MODEL_B_CURRENT_CONTROLLERS=MarketPricesController
MODEL_B_CURRENT_RUNTIME_READ_PATHS=GET_/api/v1/market-prices_TO_TODO_findAll
MODEL_B_CURRENT_RUNTIME_WRITE_PATHS=POST_/api/v1/market-prices_TO_TODO_create
MODEL_B_MIGRATION_AUTHORITY=NONE_IN_V2;EXCLUDED_RUNTIME_TABLE
```

The module registration, runtime entity registry, DTOs, controller, and
repository injection all select Model B. The repository is injected but no
read or write operation is executed because both service methods throw their
documented TODO errors.

```text
SEMANTIC_MODEL_COUNT=2
SEMANTIC_MODELS_ARE_DISTINCT=YES
CURRENT_PHYSICAL_TABLE=public.market_prices
CURRENT_WRITABLE_MAPPING_COUNT=2
MARKET_PRICES_DUPLICATE_MAPPING_EXISTS=YES
MAPPING_PATH_A=src/database/entities/market-price.entity.ts
MAPPING_PATH_B=src/modules/market-prices/entities/market-price.entity.ts
```

## Current consumers and authority

| Concern | Model A | Model B |
| --- | --- | --- |
| Runtime entity registry | no | `entity-registry.ts` entry with `baselineV2=false` |
| Module registration | none | `MarketPricesModule` `forFeature` |
| Repository | none | `MarketPricesService.marketPriceRepo` |
| Public read | none | `GET /api/v1/market-prices`, TODO service |
| Authorized write | none | `POST /api/v1/market-prices`, TODO service |
| V2 migration | none | none |
| Static local schema evidence | no aggregate shape | module one-price shape observed in Phase 0 |

The static Phase 0 evidence establishes that the previously inspected local
schema had Model B columns. It does not establish current deployed schema or
classify any row. No database is accessed in P9-02.

## Split target and naming boundary

Both final models belong to the `market-prices` bounded context. The central
aggregate declaration must ultimately move into a module-owned persistence
path; it is not approved as a permanent central mapping.

```text
MODEL_A_OWNER=market-prices
MODEL_B_OWNER=market-prices
CENTRAL_MARKET_PRICE_MAPPING_TARGET_STATUS=RELOCATE_TO_MARKET_PRICES_MODULE_AFTER_APPROVED_TABLE_NAME_AND_MIGRATION_CONTRACT

MODEL_A_PHYSICAL_TABLE_CANDIDATES=public.market_price_aggregates;public.aggregated_market_prices
MODEL_B_PHYSICAL_TABLE_CANDIDATES=public.market_prices;public.reported_market_prices;public.product_market_prices
PREFERRED_MODEL_A_TABLE=public.market_price_aggregates
PREFERRED_MODEL_B_TABLE=public.market_prices
NAME_SELECTION_SOURCE_AUTHORITY=MODEL_A_AGGREGATE_FIELDS_AND_PHASE_9_TERMINOLOGY;MODEL_B_EXISTING_MODULE_API_RUNTIME_REGISTRATION_AND_STATIC_PHASE_0_SCHEMA_EVIDENCE
TABLE_NAME_HUMAN_DECISION_REQUIRED=YES
```

Keeping `public.market_prices` for Model B minimizes application and deployed
schema churn. `public.market_price_aggregates` is the clearest candidate for
Model A, but no source or Git history establishes it as an approved persisted
identity. Final names therefore remain a human decision before schema work.

## Row ownership and migration boundary

```text
CURRENT_ROW_SEMANTIC_OWNERSHIP=UNKNOWN_REQUIRES_DEPLOYED_EVIDENCE
MARKET_PRICE_DATA_MIGRATION_REQUIRES_DEPLOYED_EVIDENCE=YES
SOURCE_PROVEN_EXISTING_SCHEMA_SHAPE=MODEL_B_REPORTED_PRODUCT_PRICE_IN_STATIC_PHASE_0_LOCAL_EVIDENCE
SOURCE_PROVEN_ROW_CLASSIFICATION=NONE
COPY_OR_BACKFILL_RULE=NOT_APPROVED
DESTRUCTIVE_DROP_OR_RENAME=NOT_APPROVED
```

Static column evidence cannot prove whether rows exist or whether historic
writes ever encoded aggregate values. A later authorized database slice must
collect row counts and shape-compatible evidence before selecting a copy,
backfill, or no-copy disposition.

## API and application impact

| Endpoint or use case | Current model | Target model | Breaking contract | Requires API change |
| --- | --- | --- | --- | --- |
| `GET /api/v1/market-prices` | Model B | Model B | NO | NO |
| `POST /api/v1/market-prices` | Model B | Model B | NO | NO |
| Aggregate read/write capability | Model A has no runtime use case | Model A under a future explicit module port | NO_EXISTING_CONTRACT | YES_ONLY_IF_A_NEW_API_IS_SEPARATELY_APPROVED |

```text
API_BREAKING_CHANGE_COUNT=0
API_CONTRACT_DECISION_REQUIRED=NO_FOR_PRESERVING_CURRENT_ENDPOINTS
```

The split can preserve both current endpoint DTOs and response intent by
leaving them on Model B. P9-02 does not design or authorize a new aggregate
API.

## Future migration plan

| Step | Action | Database required | Deployed evidence required | Reversible | Data-loss risk |
| --- | --- | --- | --- | --- | --- |
| EXPAND | after final name approval, create the aggregate table and its module-owned mapping without changing `market_prices` | YES | NO for an empty additive table; approval still required | YES before writes | NONE |
| COPY_OR_BACKFILL | classify existing rows and copy only source-proven aggregate rows if any exist | YES | YES | YES while source rows remain and a copy ledger is retained | HIGH if classification is guessed |
| VERIFY | verify schema, constraints, row counts, sampled semantic classification, and idempotent copy results | YES | YES | NOT_APPLICABLE_READ_ONLY | NONE |
| SWITCH_RUNTIME | register the aggregate mapping only after its table exists; keep existing endpoints and Model B on `market_prices` | YES | YES before enabling aggregate writes | YES with staged deployment | LOW if additive |
| CONTRACT | remove the central decorated declaration after the owner mapping and data disposition are proven; do not drop or rename physical objects without separate approval | CONDITIONAL | YES | YES for source removal; database reversal depends on later plan | HIGH if performed prematurely |

```text
MIGRATION_IMPLEMENTED=NO
SCHEMA_CHANGED=NO
P9_02_MIGRATION_REQUIREMENT=SEPARATE_ADDITIVE_EXPAND_COPY_VERIFY_SWITCH_CONTRACT_SLICE_AFTER_FINAL_NAMES_AND_DEPLOYED_EVIDENCE
```

## Preserved decisions and current status

```text
CURRENT_WRITABLE_MAPPING_COUNT=2
MULTI_WRITABLE_MAPPING_TABLE_COUNT=1
MULTI_WRITABLE_MAPPING_TABLES=public.market_prices
ONE_WRITABLE_MAPPING_PER_TABLE=NO

COOPERATIVE_FK_DECISION_INVENTED=NO
COOPERATIVE_CROSS_OWNER_FK_METADATA_STRATEGY=UNRESOLVED_REQUIRES_HUMAN_DECISION
WISHLIST_DECISION_INVENTED=NO
WISHLIST_DEPLOYED_PHYSICAL_IDENTITY_DISPOSITION=UNRESOLVED_REQUIRES_DEPLOYED_EVIDENCE_AND_HUMAN_DECISION
LEGACY_MIGRATION_DECISION_INVENTED=NO
LEGACY_MIGRATION_LEDGER_RETIREMENT_POLICY=UNRESOLVED_REQUIRES_DEPLOYED_EVIDENCE_AND_HUMAN_DECISION
PRODUCTION_ACCESS_ATTEMPTED=NO
PRODUCTION_PARITY_ACCESS_AUTHORIZATION=NOT_GRANTED

P9_02_IMPLEMENTATION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P9_02_HUMAN_DECISION=MARKET_PRICES_CANONICAL_MODEL=SPLIT_MODELS_INTO_SEPARATE_TABLES
P9_02_BLOCKERS=NONE
P9_03_IMPLEMENTATION_AUTHORIZED=NO_WAITING_FOR_P9_02_MERGE_AND_REVIEW
P9_03_MARKET_PRICE_IMPLEMENTATION_PREREQUISITES=FINAL_TABLE_NAME_HUMAN_APPROVAL;AUTHORIZED_DEPLOYED_ROW_EVIDENCE;SEPARATE_SCHEMA_MIGRATION_SCOPE
PHASE_09_IMPLEMENTATION_STATUS=IN_PROGRESS
PHASE_09_COMPLETE=NO
```

P9-02 constructs no DataSource, opens no connection, executes no SQL or
migration, and accesses neither protected local nor remote databases.
