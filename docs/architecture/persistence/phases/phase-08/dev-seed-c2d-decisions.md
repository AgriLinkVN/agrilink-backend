# P8-05C2D0 Cooperative Operation Identity Decisions

This document is the static source, schema, domain, and Git-history audit for
the Cooperative-owned remainder of `legacy.dev.remaining`. It authorizes no
runtime mutation by itself. Its decisions become implementation input only
after human review and merge.

```text
DECISION_ID=P8_05C2D0_COOPERATIVE_OPERATION_IDENTITY_DECISIONS
P8_05C2C_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_115
P8_05C2D0_IDENTITY_DECISION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_05C2D_IMPLEMENTATION_STATUS=NOT_STARTED
P8_05C2_IMPLEMENTATION_STATUS=IN_PROGRESS
```

## 1. Current State And Audit Boundary

PR #115 merged C2C into `develop` at
`c2304b0afb1e6022d7deae4dff49c0e5589ca542` with a successful Backend Quality
Gate. The current central service has no Review write, query, repository, or
entity import. Its temporary Product bridge contains only
`DEV-XOAI-HOA-LOC-001`, used by Harvest.

The remaining central Cooperative methods are `seedCoopMembers`,
`seedBulkListings`, and `seedHarvestSchedules`. The Contribution writes are
nested in `seedBulkListings`. This audit reads source and Git objects only. It
does not run the service, a seed, a migration, SQL, or any database-aware
bootstrap.

Authoritative current sources:

- [central DEV service](../../../../../src/database/dev-seed.service.ts)
- [Cooperative persistence port](../../../../../src/modules/cooperatives/application/ports/outbound/cooperative-persistence.port.ts)
- [Cooperative persistence models](../../../../../src/modules/cooperatives/domain/models/cooperative-persistence.models.ts)
- [Cooperative repositories](../../../../../src/modules/cooperatives/infrastructure/persistence/repositories/typeorm-cooperative-persistence.repositories.ts)
- [P3 Cooperative boundary migration](../../../../../src/database/migrations/1783731600000-EstablishCooperativePersistenceBoundaries.ts)

```text
CENTRAL_REVIEW_BUSINESS_WRITES=0
LEGACY_REMAINING_PRODUCT_SKUS=DEV-XOAI-HOA-LOC-001
CURRENT_COOPERATIVE_METHODS=seedCoopMembers,seedBulkListings,seedHarvestSchedules
CONTRIBUTION_WRITE_LOCATION=seedBulkListings
```

## 2. Cooperative Member Reconfirmation

The single fixture resolves `cooperative@sandbox.com` and
`farmer@sandbox.com`, then persists the corresponding User UUID pair. The
current migration declares
`uq_p3_member_cooperative_farmer (cooperative_id, farmer_id)`, the repository
looks up the same pair, and its focused test asserts that ownership-scoped
lookup. There is no source drift from the C2A decision.

`status=active`, `role=Thành viên sản xuất`, and the runtime `joinedAt` value
are mutable payload, not identity. Generated `id`, `createdAt`, and `updatedAt`
are also excluded.

```text
COOPERATIVE_MEMBER_COUNT=1
COOPERATIVE_MEMBER_STABLE_KEY=cooperative User ID + farmer User ID
COOPERATIVE_MEMBER_IDENTITY_STATUS=RESOLVED_SCHEMA_UNIQUE
COOPERATIVE_MEMBER_SCHEMA_UNIQUE=YES
COOPERATIVE_MEMBER_SEED_LEVEL_KEY=YES
COOPERATIVE_MEMBER_HUMAN_DECISION_REQUIRED=NO
COOPERATIVE_MEMBER_SCHEMA_CHANGE_REQUIRED=NO
```

## 3. Bulk Listing Field And Domain Audit

Both rows omit `productCategoryId`; the nullable mapping therefore persists
`NULL`. Generated UUID and ORM/database lifecycle timestamps are not declared
fixture identity. No additional persisted field exists in the current entity.

| Field | BL-01 | BL-02 |
| --- | --- | --- |
| Cooperative email | `cooperative@sandbox.com` | `cooperative@sandbox.com` |
| Title | `Xoài cát Hòa Lộc — Thu gom vụ hè` | `Thanh long ruột đỏ — Đơn hàng xuất khẩu` |
| Description | `Thu gom xoài cát Hòa Lộc từ 15 hộ xã viên, sản lượng 5 tấn, đạt VietGAP.` | `Đáp ứng đơn hàng xuất khẩu Trung Quốc 10 tấn, yêu cầu GlobalGAP.` |
| Product category ID | `NULL` (omitted) | `NULL` (omitted) |
| Target quantity | `5000` | `10000` |
| Unit | `KG` | `KG` |
| Price per unit | `42000` | `33000` |
| Deadline | `2026-07-15` | `2026-07-20` |
| Is open | `true` | `true` |
| Created-at source | ORM/database lifecycle | ORM/database lifecycle |
| Updated-at source | ORM/database lifecycle | ORM/database lifecycle |
| Other persisted fields | generated UUID only | generated UUID only |

The current migration has checks for positive quantity/price and a non-unique
`(cooperative_id, is_open)` index. It has no Bulk Listing unique constraint.
The current repository can locate a listing only by generated ID scoped to its
cooperative. Current application source contains no create/update use case,
controller, DTO, validation rule, or test that defines business cardinality.

Historical commit `b0dd57f7a851397d8326e693ac02f39a86bc5c3c` contains an unmerged,
fuller Cooperative implementation. Its create surface accepts the listing
payload and its update surface permits title, description, quantity, unit,
price, and date changes. Its migration indexes cooperative/creation time and
status/dates but declares no listing uniqueness. Because that commit is not an
ancestor of current `develop`, it is supporting history, not current schema
authority.

## 4. Bulk Listing Candidate Keys

| Candidate | Persisted fields only | Mutable business fields | Cardinality evidence | Schema unique | Repository lookup | History and collision assessment | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A. `cooperativeId + title` | yes | `title` | none; display text does not define one listing | no | no | historical API permits title edits; current fixtures differ only incidentally | reject |
| B. `cooperativeId + title + deadline` | yes | `title`, `deadline` | none | no | no | both identifying candidates are editable; rescheduling/renaming would orphan identity | reject |
| C. `cooperativeId + deadline + unit` | yes | `deadline`, `unit` | none; one cooperative may have several same-unit listings for a deadline | no | no | high legitimate-collision risk despite no current collision | reject |
| D. `cooperativeId + productCategoryId + deadline` | yes | nullable category, `deadline` | none | no | no | both DEV rows have `NULL` category; nullable component and legitimate category/date reuse | reject |
| E. cooperative plus the complete declared payload | yes | title, description, quantity, unit, price, deadline, open state | none | no | no | turns corrections into identity changes and mistakes payload equality for domain identity | reject |

The two DEV rows being different is not cardinality evidence. No persisted
business tuple survives the stability and collision tests, so this PR neither
adds a fixture-key column nor proposes a schema constraint.

```text
BULK_LISTING_COUNT=2
BULK_LISTING_STABLE_KEY=NONE_PROVEN
BULK_LISTING_IDENTITY_STATUS=UNRESOLVED
BULK_LISTING_DUPLICATE_POLICY=NOT_APPLICABLE_UNTIL_IDENTITY_RESOLVED
BULK_LISTING_SCHEMA_UNIQUE=NO
BULK_LISTING_SEED_LEVEL_KEY=NO
BULK_LISTING_HUMAN_DECISION_REQUIRED=YES
BULK_LISTING_SCHEMA_CHANGE_REQUIRED=NO_YET_DOMAIN_DECISION_FIRST
```

## 5. Contribution Current-Source Audit

The current source declares two rows for BL-01 and passes the same sole
`farmerId` to both:

| Fixture | Listing | Farmer email | Quantity | Unit |
| --- | --- | --- | --- | --- |
| BLC-01 | BL-01 | `farmer@sandbox.com` | `1500` | `KG` |
| BLC-02 | BL-01 | `farmer@sandbox.com` | `2000` | `KG` |

Thus there are two rows and one duplicated listing/farmer pair. Quantity is
mutable contribution payload and cannot distinguish them. The current entity
has no lot, plot, delivery, contribution code, accepted date, or harvest
reference. Its generated UUID and lifecycle `createdAt` are prohibited identity
components. The current migration has separate non-unique listing and farmer
indexes, no unique pair, and the current port exposes only `saveContribution`.

```text
CONTRIBUTION_ROW_COUNT=2
DUPLICATE_LISTING_FARMER_PAIR_COUNT=1
BLC_01_FARMER_EMAIL=farmer@sandbox.com
BLC_02_FARMER_EMAIL=farmer@sandbox.com
```

## 6. Contribution Git-History Audit

The current fixture block entered history in
`06c2846790bc1e8fa96494e36dddbb5dfbb80765` (`Feature/dev seed data (#72)`,
2026-07-24). The independent parallel commit
`becf869fb4bec1642b016c6f3ce7565cd82671c3` contains the same construction.
The original User fixture array included both `farmer@sandbox.com` and
`demo.farmer@sandbox.com`, but `seedBulkListings` accepted exactly one
`farmerId`; both contribution declarations used that parameter. `git log -L`
shows later changes only renamed entity/cast details or removed an unused
Product parameter. No revision selected the demo Farmer or added a second
business discriminator.

More importantly, earlier Cooperative domain work in unmerged commit
`b0dd57f7a851397d8326e693ac02f39a86bc5c3c` declared
`uq_contrib_listing_farmer (bulk_listing_id, farmer_id)`, documented one
contribution per Farmer per listing, and translated PostgreSQL `23505` into an
"already contributed" domain error. Its update/remove flow modified the one
existing contribution rather than appending a delivery. This is direct
historical domain evidence that two rows for the same pair were invalid, even
though it is not a current-schema invariant.

The evidence does not support two distinct Farmers: the seed signature and
both literal rows select the same Farmer. It also does not support repeated
lots/deliveries: no persisted discriminator exists, and historical domain code
forbids the duplicate pair.

### Contribution Original-Intent Verdict

```text
CONTRIBUTION_ORIGINAL_INTENT=ACCIDENTAL_DUPLICATE_FIXTURE
GIT_HISTORY_EVIDENCE=ORIGINAL_SEED_PASSES_ONE_FARMER_TO_BOTH_ROWS;HISTORICAL_DOMAIN_UNIQUE_PAIR_AND_ALREADY_CONTRIBUTED_GUARD
BLC_02_DECISION=RETIRE_DUPLICATE_FIXTURE
BLC_02_DECISION_STATUS=PENDING_HUMAN_REVIEW
```

If human review accepts retirement, BLC-01 remains and uses `listing ID +
farmer User ID`. Later reconciliation must preflight the full pair, create on
zero, reconcile on one, and fail closed on more than one. This is a seed-level
key supported by the historical cardinality rule; it must not be described as
a unique invariant of the current schema.

Retiring BLC-02 changes declared Contribution business data from two rows and
`3500 KG` to one row and `1500 KG`. BL-01's `5000 KG` target is unchanged, so
declared contribution coverage changes from 70% to 30%. No other fixture is
rewritten.

```text
CONTRIBUTION_STABLE_KEY=listing ID + farmer User ID
CONTRIBUTION_IDENTITY_STATUS=RESOLVED_BY_DUPLICATE_RETIREMENT_PENDING_HUMAN_REVIEW
CONTRIBUTION_SCHEMA_UNIQUE=NO_CURRENT_SCHEMA;YES_HISTORICAL_UNMERGED_DOMAIN
CONTRIBUTION_SEED_LEVEL_KEY=YES_AFTER_BLC_02_RETIREMENT
CONTRIBUTION_DUPLICATE_POLICY=FAIL_CLOSED
CONTRIBUTION_HUMAN_DECISION_REQUIRED=YES
CONTRIBUTION_SCHEMA_CHANGE_REQUIRED=NO
BLC_02_RETIREMENT_QUANTITY_IMPACT_KG=-2000
```

## 7. Harvest Field And Domain Audit

All three rows use `farmer@sandbox.com`, Product SKU
`DEV-XOAI-HOA-LOC-001`, crop name `Xoài cát Hòa Lộc`, and unit `KG`.

| Fixture | Expected date | Estimated quantity | Notes |
| --- | --- | --- | --- |
| HARVEST-01 | `2026-07-15` | `2000` | `Xoài cát: vụ chính` |
| HARVEST-02 | `2026-07-20` | `1500` | `Xoài cát: vụ muộn` |
| HARVEST-03 | `2026-08-01` | `3000` | `Xoài cát: vụ rải` |

The current entity persists owner, nullable Product, crop name, required
expected date, nullable estimated quantity/unit/notes, generated UUID, and
lifecycle timestamps. The current repository uses generated ID plus owner for
normal ownership access. The migration's non-unique
`(user_id, expected_harvest_date)` index establishes owner/date lookup intent,
not database uniqueness.

There is no current controller/use case/DTO. The historical unmerged domain
surface permits schedule payload updates and has non-unique Farmer/date and
Cooperative/date indexes. It does not prove a DB unique invariant. However, the
fixture history consistently models main, late, and staggered planned harvest
occurrences for one owner/Product and distinguishes those occurrences with
explicit expected dates. The model has no separate plot/delivery/occurrence
field. For this declared DEV set, owner + Product + planned occurrence date is
a persisted business tuple with explicit meaning; it is not lifecycle
metadata. The absence of schema uniqueness is handled by fail-closed preflight.

## 8. Harvest Candidate Keys

| Candidate | Persisted fields only | Mutable fields | Cardinality/index evidence | Collision risk | History evidence | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| A. `userId + productId + expectedHarvestDate` | yes | planned date can be rescheduled | non-unique owner/date index; date distinguishes the three declared occurrences | possible outside this fixture set, therefore `>1` must fail closed | all three original fixtures retain one Product and distinct planned dates | approve as DEV seed-level key |
| B. A + `cropName` | yes | date and crop display text | no additional cardinality evidence | adds mutable/redundant text without reducing proven ambiguity | all current crop names are identical | reject |
| C. `userId + cropName + expectedHarvestDate` | yes | date and crop display text | owner/date index only | name edits/localization cause identity drift and Product is omitted | fixture has a stable Product SKU available | reject |
| D. A + `notes` | yes | date and free-form notes | none for notes | commentary is not identity | notes label occurrences but are mutable payload | reject |

Approval of A is deliberately seed-scoped. It does not claim that the current
database prevents duplicate rows. Later implementation must preflight every
declared full tuple before its first write; `0 -> create`, `1 -> reconcile`, and
`>1 -> fail closed`.

```text
HARVEST_FIXTURE_COUNT=3
HARVEST_SCHEDULE_STABLE_KEY=user ID + product ID + expected harvest date
HARVEST_IDENTITY_STATUS=RESOLVED_SEED_LEVEL_PERSISTED_BUSINESS_KEY
HARVEST_SCHEMA_UNIQUE=NO
HARVEST_SEED_LEVEL_KEY=YES
HARVEST_DUPLICATE_POLICY=FAIL_CLOSED
HARVEST_HUMAN_DECISION_REQUIRED=NO
HARVEST_SCHEMA_CHANGE_REQUIRED=NO
```

## 9. Date Semantics

`expectedHarvestDate` is an explicitly declared, persisted planned-occurrence
field. The main, late, and staggered schedule rows use it to distinguish three
business records for the same owner and Product. That is why it can participate
in a seed-level key here.

`createdAt`, `updatedAt`, `new Date()` used for lifecycle timing, and database
row order describe execution or persistence lifecycle. They do not identify a
planned harvest occurrence and remain prohibited from every seed identity.

## 10. Group Boundary Decision

One `cooperatives.dev.operations` group would keep generated listing IDs local,
but it would couple independently resolvable Member and Harvest work to the
unresolved Bulk Listing identity. Three owner-local workflow groups preserve
cohesion without splitting merely per table:

1. `cooperatives.dev.members` owns Member reconciliation.
2. `cooperatives.dev.bulk-operations` owns Listings followed by their
   Contributions; generated Listing IDs remain local to this group.
3. `cooperatives.dev.harvest` owns Harvest Schedule reconciliation.

This split isolates retry/failure boundaries and lets Harvest alone consume the
Product dependency. No later external consumer has a proven need for any
Cooperative row UUID, so all groups return empty outputs.

```text
C2D_GROUPING_DECISION=SPLIT_OWNER_LOCALLY_BY_MEMBER_BULK_WORKFLOW_AND_HARVEST
COOPERATIVE_DEV_GROUPS=cooperatives.dev.members,cooperatives.dev.bulk-operations,cooperatives.dev.harvest
COOPERATIVE_DEV_OUTPUT_COUNT=0
```

## 11. External Dependency DAG

```text
users.dev.users/user.id.by-email -> cooperatives.dev.members
users.dev.users/user.id.by-email -> cooperatives.dev.bulk-operations
users.dev.users/user.id.by-email -> cooperatives.dev.harvest
products.dev.products/product.id.by-sku -> cooperatives.dev.harvest
```

The Product edge is Harvest-only. Bulk Listing and Contribution receive no
Product parameter, and this plan does not restore the already removed unused
dependency.

```text
BULK_LISTING_PRODUCT_DEPENDENCY=NONE
HARVEST_PRODUCT_DEPENDENCY=products.dev.products/product.id.by-sku
```

## 12. Reset And Type Debt

Focused ESLint reports five current Cooperative `no-explicit-any` warnings:
one Member payload, two Listing payloads, one Contribution array, and one
Harvest payload. The adjacent Ads warning is C3 debt and is not counted. Future
C2D implementation owns removal of the five Cooperative casts.

Central `resetAll` still targets exactly `cooperative_members`,
`bulk_listings`, `bulk_listing_contributions`, and `harvest_schedules`. Future
C2D ownership migration must retire those four central targets; this decision
PR changes none of them.

```text
C2D_EXPLICIT_ANY_COUNT=5
C2D_RESET_TARGET_COUNT=4
```

## 13. Pre-Human-Review Decision Matrix (Superseded)

| Table | Identity status | Stable key | Schema unique | Seed-level key | Human decision required | Schema change required |
| --- | --- | --- | --- | --- | --- | --- |
| `cooperative_members` | `RESOLVED_SCHEMA_UNIQUE` | cooperative User ID + farmer User ID | yes | yes | no | no |
| `bulk_listings` | `UNRESOLVED` | none proven | no | no | yes | no yet; domain decision first |
| `bulk_listing_contributions` | `RESOLVED_BY_DUPLICATE_RETIREMENT_PENDING_HUMAN_REVIEW` | listing ID + farmer User ID | no in current schema | yes after BLC-02 retirement | yes | no |
| `harvest_schedules` | `RESOLVED_SEED_LEVEL_PERSISTED_BUSINESS_KEY` | user ID + product ID + expected harvest date | no | yes | no | no |

## 14. Pre-Human-Review Authorization And Blockers (Superseded)

The whole C2D slice is not authorized because no Bulk Listing identity has been
proven. Human review of this PR must also accept BLC-02 retirement before the
bulk workflow can use the contribution decision. Member and Harvest can be a
separate implementation slice after this decision PR merges; the blocked Bulk
workflow must not be smuggled into it.

```text
P8_05C2D_IMPLEMENTATION_AUTHORIZED=NO
P8_05C2D_BLOCKERS=BULK_LISTING_DOMAIN_IDENTITY_UNRESOLVED
P8_05C2D1_MEMBER_HARVEST_AUTHORIZED=YES_AFTER_C2D0_MERGE
P8_05C2D2_BULK_OPERATIONS_AUTHORIZED=NO
P8_05C2D2_BLOCKERS=BULK_LISTING_DOMAIN_IDENTITY_UNRESOLVED;BLC_02_RETIREMENT_PENDING_HUMAN_REVIEW
```

Resolving the remaining blocker requires a human/domain decision establishing
the cardinality and persisted identity of a Bulk Listing. If that decision
cannot identify an existing stable tuple, any schema support belongs in a
separately reviewed future task. This PR does not manufacture a fixture key or
infer uniqueness from the two DEV rows.

## 15. Pre-Human-Review Unresolved Blockers (Superseded)

```text
P8_05C2D_DECISIONS_BLOCKED
STOP_REASON=BULK_LISTING_DOMAIN_IDENTITY_UNRESOLVED
```

Bulk Listing needs an explicit domain/cardinality decision. The present model
does not show whether two listings from one Cooperative may legitimately share
title, date, category, unit, or even the full mutable payload. Until the domain
supplies a stable persisted business discriminator, the Bulk Listing and its
dependent Contribution workflow remain blocked.

## 16. Scope And Database Safety

```text
BUSINESS_IMPLEMENTATION_CHANGES=0
SCHEMA_CHANGES=0
MIGRATIONS_CREATED=0
P8_05C3_BUSINESS_IMPLEMENTATION_CHANGES=0
P8_05C4_BUSINESS_IMPLEMENTATION_CHANGES=0
ADMIN_DEV_IMPLEMENTATION_CHANGES=0

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

## 17. Human-Review Correction

This section is the authoritative current decision overlay for PR #116. It
preserves the pre-human-review audit and candidate reasoning above while
superseding its Contribution approval state, Harvest conclusion, authorization
matrix, and blocker list.

### Contribution Decision Finalized

Human review accepts the Git-history conclusion:

```text
CONTRIBUTION_ORIGINAL_INTENT=ACCIDENTAL_DUPLICATE_FIXTURE
BLC_02_DECISION=RETIRE_DUPLICATE_FIXTURE
BLC_02_DECISION_STATUS=HUMAN_APPROVED
```

The original method accepted one `farmerId`; BLC-01 and BLC-02 used that same
Farmer; no lot, delivery, or plot discriminator existed; and historical
Cooperative code enforced one Contribution per listing/Farmer pair with an
"already contributed" duplicate response. Human review therefore does not
reinterpret BLC-02 as another Farmer or another delivery.

BLC-01 remains `farmer@sandbox.com`, `1500 KG`. Retirement removes `2000 KG`
of declared Contribution payload while leaving BL-01's `5000 KG` target
unchanged.

```text
BLC_02_RETIREMENT_QUANTITY_IMPACT_KG=-2000
CONTRIBUTION_STABLE_KEY=listing ID + farmer User ID
CONTRIBUTION_IDENTITY_STATUS=RESOLVED_BY_APPROVED_DUPLICATE_RETIREMENT
CONTRIBUTION_SCHEMA_UNIQUE=NO_CURRENT_SCHEMA;YES_HISTORICAL_UNMERGED_DOMAIN
CONTRIBUTION_SEED_LEVEL_KEY=YES
CONTRIBUTION_HUMAN_DECISION_REQUIRED=NO
CONTRIBUTION_SCHEMA_CHANGE_REQUIRED=NO
CONTRIBUTION_DUPLICATE_POLICY=FAIL_CLOSED
```

### Harvest Mutable-Date Correction

Human architecture review rejects `user ID + product ID + expected harvest
date` as stable seed identity. `expectedHarvestDate` is legitimate persisted
business data and distinguishes HARVEST-01, HARVEST-02, and HARVEST-03 in the
current fixture payload. That is not equivalent to stable domain identity:
historical schedule behavior permits rescheduling, so the tuple changes while
the business schedule remains the same. Reconciliation by that tuple could
incorrectly create a second row after a reschedule.

The tuple remains documented in the earlier candidate table as the original
proposal, but its approval is superseded. It may support query/filter behavior,
not Phase 8 reconciliation identity. Generated UUID, fixture ordinal, schedule
code invented for seeding, `createdAt`, and `updatedAt` remain prohibited. This
PR adds no schema.

The three existing owner/Product/date mappings remain unchanged, and Product
SKU resolution remains proven:

```text
HARVEST_PRODUCT_MAPPING_STATUS=RESOLVED
HARVEST_PERSISTENCE_IDENTITY_STATUS=UNRESOLVED
HARVEST_SCHEDULE_STABLE_KEY=NONE_PROVEN
HARVEST_IDENTITY_STATUS=UNRESOLVED_MUTABLE_DATE_NOT_STABLE_IDENTITY
HARVEST_SCHEMA_UNIQUE=NO
HARVEST_SEED_LEVEL_KEY=NO
HARVEST_HUMAN_DECISION_REQUIRED=YES
HARVEST_SCHEMA_CHANGE_REQUIRED=NO_YET_DOMAIN_IDENTITY_DECISION_FIRST
```

### Current Group Authorization

The owner-local conceptual groups remain `cooperatives.dev.members`,
`cooperatives.dev.bulk-operations`, and `cooperatives.dev.harvest`. The previous
combined Member/Harvest authorization is superseded. Contribution identity is
resolved, so Bulk Operations is blocked only by its parent Bulk Listing.

```text
P8_05C2D1_MEMBERS_IMPLEMENTATION_AUTHORIZED=YES_AFTER_PR_116_MERGE
P8_05C2D2_BULK_OPERATIONS_IMPLEMENTATION_AUTHORIZED=NO
P8_05C2D2_BLOCKERS=BULK_LISTING_DOMAIN_IDENTITY_UNRESOLVED
P8_05C2D3_HARVEST_IMPLEMENTATION_AUTHORIZED=NO
P8_05C2D3_BLOCKERS=HARVEST_DOMAIN_IDENTITY_UNRESOLVED
P8_05C2D_IMPLEMENTATION_AUTHORIZED=NO
P8_05C2D_BLOCKERS=BULK_LISTING_DOMAIN_IDENTITY_UNRESOLVED;HARVEST_DOMAIN_IDENTITY_UNRESOLVED
```

### Current Decision Matrix

| Table | Identity status | Stable key | Schema unique | Seed-level key | Human decision required | Schema change required |
| --- | --- | --- | --- | --- | --- | --- |
| `cooperative_members` | `RESOLVED_SCHEMA_UNIQUE` | cooperative User ID + farmer User ID | yes | yes | no | no |
| `bulk_listings` | `UNRESOLVED` | `NONE_PROVEN` | no | no | yes | `NO_YET_DOMAIN_DECISION_FIRST` |
| `bulk_listing_contributions` | `RESOLVED_BY_APPROVED_DUPLICATE_RETIREMENT` | listing ID + farmer User ID | `NO_CURRENT_SCHEMA` | yes | no | no |
| `harvest_schedules` | `UNRESOLVED_MUTABLE_DATE_NOT_STABLE_IDENTITY` | `NONE_PROVEN` | no | no | yes | `NO_YET_DOMAIN_IDENTITY_DECISION_FIRST` |

```text
P8_05C2D0_IDENTITY_DECISION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_05C2D_IMPLEMENTATION_STATUS=NOT_STARTED
P8_05C2_IMPLEMENTATION_STATUS=IN_PROGRESS
P8_05C2D0_HUMAN_REVIEW_COMPLETE
```

## 18. Human-Review Scope And Safety

```text
BUSINESS_IMPLEMENTATION_CHANGES=0
SCHEMA_CHANGES=0
MIGRATIONS_CREATED=0
P8_05C3_BUSINESS_IMPLEMENTATION_CHANGES=0
P8_05C4_BUSINESS_IMPLEMENTATION_CHANGES=0
ADMIN_DEV_IMPLEMENTATION_CHANGES=0

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

## 19. P8-05C2D1 Cooperative Member Implementation Overlay

PR #116 merged this document's human-review decision at
`429852a930e1f76951f6529e25dc356c83eaa2a8`. C2D1 migrates exactly
COOP-MEMBER-01 from the central service into one Cooperatives-owned group. The
group resolves `cooperative@sandbox.com` and `farmer@sandbox.com` exclusively
through `users.dev.users/user.id.by-email` and uses no Product or Geography
dependency.

All declared identities are looked up before the first mutation. Zero matches
creates, one reconciles only `status=active` and `role=Thành viên sản xuất`,
and more than one fails closed. Create retains the previous `new Date()`
semantics for `joinedAt`; reconcile never replaces the stored value.

```text
P8_05C2D0_IDENTITY_DECISION_STATUS=IMPLEMENTED_BY_MERGED_PR_116
P8_05C2D1_MEMBERS_IMPLEMENTATION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW

COOPERATIVES_DEV_MEMBERS_GROUP_ID=cooperatives.dev.members
COOPERATIVES_DEV_MEMBERS_GROUP_COUNT=1
COOPERATIVE_MEMBER_DEV_RECORD_COUNT=1
COOPERATIVE_MEMBER_DEPENDENCIES=users.dev.users
COOPERATIVE_MEMBER_STABLE_KEY=cooperative User ID + farmer User ID
COOPERATIVE_MEMBER_IDEMPOTENCY=PER_RECORD_BY_COOPERATIVE_ID_AND_FARMER_ID
COOPERATIVE_MEMBER_PREFLIGHT=ALL_DECLARED_IDENTITIES_BEFORE_FIRST_WRITE
COOPERATIVE_MEMBER_JOINED_AT_CREATE_POLICY=CURRENT_EXECUTION_TIME_ON_CREATE
COOPERATIVE_MEMBER_JOINED_AT_RECONCILE_POLICY=PRESERVE_EXISTING_VALUE
SECOND_RUN_JOINED_AT_DRIFT=0
COOPERATIVE_MEMBER_DEV_OUTPUT_COUNT=0

STARTUP_COOPERATIVES_DEV_MEMBERS_CANONICAL_PATH_COUNT=1
STARTUP_COOPERATIVES_DEV_BULK_OPERATIONS_PATH_COUNT=0
STARTUP_COOPERATIVES_DEV_HARVEST_PATH_COUNT=0
CENTRAL_COOPERATIVE_MEMBER_BUSINESS_WRITES=0
CENTRAL_COOPERATIVE_MEMBER_REPOSITORY_QUERIES=0
CENTRAL_COOPERATIVE_MEMBER_ENTITY_IMPORTS_FOR_DEV_SEED=0
CENTRAL_RESET_COOPERATIVE_MEMBER_TARGETS=0
CENTRAL_DOWNSTREAM_MEMBER_ROW_ID_CONSUMERS=0
C2D_EXPLICIT_ANY_COUNT_AFTER_C2D1=4
C2D_REMAINING_RESET_TARGETS=bulk_listings,bulk_listing_contributions,harvest_schedules

BULK_LISTING_STABLE_KEY=NONE_PROVEN
BULK_LISTING_IDENTITY_STATUS=UNRESOLVED
CONTRIBUTION_STABLE_KEY=listing ID + farmer User ID
CONTRIBUTION_IDENTITY_STATUS=RESOLVED_BY_APPROVED_DUPLICATE_RETIREMENT
BLC_02_DECISION=RETIRE_DUPLICATE_FIXTURE
HARVEST_SCHEDULE_STABLE_KEY=NONE_PROVEN
HARVEST_IDENTITY_STATUS=UNRESOLVED_MUTABLE_DATE_NOT_STABLE_IDENTITY
HARVEST_PRODUCT_MAPPING_STATUS=RESOLVED
P8_05C2D2_BUSINESS_MIGRATIONS=0
P8_05C2D3_BUSINESS_MIGRATIONS=0
P8_05C2D_IMPLEMENTATION_AUTHORIZED=NO
P8_05C2D_IMPLEMENTATION_STATUS=IN_PROGRESS
P8_05C2_IMPLEMENTATION_STATUS=IN_PROGRESS
```

Bulk/Contribution and Harvest implementation remain outside C2D1. The approved
BLC-02 retirement is future C2D2 input only; no blocked fixture is changed in
this slice.

## 20. P8-05C2D2A Bulk Listing Identity Decision Overlay

This overlay is the current authority for the Bulk Listing parent-identity
audit at merged-PR-#128 base
`d39052254124b59250dfaa06d0b9d5d90cea8af6`. It is a static source, schema,
API-contract, and Git-history audit only. It does not modify or execute
`DevSeedService`, a SeedGroup, a DataSource, SQL, a migration, or a database.

Merged PR #128 closes P8-05D. The standalone Admin DEV source is absent and
its direct business write count remains zero. The central continuation remains
separate debt with exactly five normal write methods: `seedForum`,
`seedAdPackages`, `seedAdCampaigns`, `seedBulkListings`, and
`seedHarvestSchedules`. `legacy.dev.remaining` and `resetAll` remain intact.

### 20.1 Current Fixture Inventory

Both declarations use the `COOP` scalar resolved from
`cooperative@sandbox.com` by `users.dev.users/user.id.by-email`. The migration
foreign key proves that `bulk_listings.cooperative_id` references `users.id`,
not a Cooperative Profile ID. Both declarations omit nullable
`productCategoryId`; neither declares a Product ID or any location field.

| Fixture label | Cooperative User identity | Product/category reference | Title | Description | Quantity | Unit | Price per unit | Location fields | Status | Date fields | Other payload |
| --- | --- | --- | --- | --- | ---: | --- | ---: | --- | --- | --- | --- |
| `BL-01` | `cooperative@sandbox.com` -> User ID | Product: none; category: `NULL` (omitted) | `Xoài cát Hòa Lộc — Thu gom vụ hè` | `Thu gom xoài cát Hòa Lộc từ 15 hộ xã viên, sản lượng 5 tấn, đạt VietGAP.` | `5000` | `KG` | `42000` | none | `isOpen=true` | `deadline=2026-07-15`; lifecycle timestamps generated | generated UUID primary key |
| `BL-02` | `cooperative@sandbox.com` -> User ID | Product: none; category: `NULL` (omitted) | `Thanh long ruột đỏ — Đơn hàng xuất khẩu` | `Đáp ứng đơn hàng xuất khẩu Trung Quốc 10 tấn, yêu cầu GlobalGAP.` | `10000` | `KG` | `33000` | none | `isOpen=true` | `deadline=2026-07-20`; lifecycle timestamps generated | generated UUID primary key |

The method performs one whole-table `repo.count()` guard. If any listing
exists, both declarations are skipped. Otherwise TypeORM/database generation
assigns each UUID at insertion. The generated IDs are then unknown to a later
run and are not deterministic fixture identity.

```text
BULK_LISTING_FIXTURE_COUNT=2
BULK_LISTING_WHOLE_TABLE_GUARD_COUNT=1
BULK_LISTING_CURRENT_LOOKUP_OR_GUARD=WHOLE_TABLE_REPOSITORY_COUNT
BULK_LISTING_CURRENT_GENERATED_ID=TYPEORM_DATABASE_GENERATED_UUID
BULK_LISTING_GENERATED_UUID_IDENTITY_USAGE=YES_PRIMARY_KEY_ONLY;NOT_DETERMINISTIC_SEED_IDENTITY
```

### 20.2 Schema, Domain, And History Evidence

The entity and migration contain no `listingCode`, `referenceCode`,
`externalId`, `slug`, `publicCode`, or owner-assigned code. The only unique
constraint is the UUID primary key; this audit reports zero business unique
constraints. The sole secondary Listing index is non-unique
`(cooperative_id, is_open)`. The repository finds normal domain rows only by
generated `id + cooperativeId`.

Current source has no Bulk Listing controller, command, DTO, or use case that
adds a different identity contract. Supporting history in unmerged commit
`b0dd57f7a851397d8326e693ac02f39a86bc5c3c` also exposed UUID route IDs and no
business code. Its update contract allowed title, description, quantity, unit,
price, and date changes, and its indexes expressed query order/filter needs,
not uniqueness. Original commits `06c2846790bc1e8fa96494e36dddbb5dfbb80765`
and `becf869fb4bec1642b016c6f3ce7565cd82671c3` introduced the same two
declarations without another identity field or cardinality rule.

```text
BULK_LISTING_PERSISTED_BUSINESS_ID_FIELD=NONE_PROVEN
BULK_LISTING_TABLE_UNIQUE_CONSTRAINT_COUNT=0
BULK_LISTING_TABLE_PRIMARY_KEY_COUNT=1
BULK_LISTING_TABLE_SECONDARY_INDEX_COUNT=1
BULK_LISTING_CURRENT_SCHEMA_INDEXES=PRIMARY_KEY(id);NON_UNIQUE(cooperative_id,is_open)
```

### 20.3 Candidate Composite Identity Audit

| Candidate key | Fields | Immutable business identity | Mutable payload included | Schema unique support | Domain-service assumption | Collision risk | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| generated UUID | `id` | no; generated at insertion | no | primary key only | assumes one generated execution ID can identify later fixture intent | certain second-run identity loss | `REJECTED` |
| cooperative + Product | `cooperativeId + productId` | not applicable | no | field absent | invents a Product relation | not evaluable | `REJECTED` |
| cooperative + category | `cooperativeId + productCategoryId` | no proof | nullable category | none | assumes one listing per Cooperative/category | both current rows collide at `NULL`; legitimate category reuse | `REJECTED` |
| cooperative + title | `cooperativeId + title` | no; history permits title edits | title | none | assumes title uniqueness and immutability | renaming drifts identity; duplicate campaign titles are not forbidden | `REJECTED` |
| cooperative + category + unit | `cooperativeId + productCategoryId + unit` | no proof | nullable category and editable unit | none | assumes one listing per Cooperative/category/unit | both rows collide at `NULL + KG` | `REJECTED` |
| cooperative + deadline | `cooperativeId + deadline` | no; deadline is mutable schedule payload | deadline | none | assumes one listing per Cooperative/deadline | same-day listings are legitimate and rescheduling drifts identity | `REJECTED` |
| cooperative + title + quantity | `cooperativeId + title + totalQuantity` | no | title and quantity | none | assumes payload corrections create a new business listing | mutable tuple; renaming or quantity correction drifts identity | `REJECTED` |
| cooperative + category + open state | `cooperativeId + productCategoryId + isOpen` | no | nullable category and lifecycle/open state | non-unique query index only covers Cooperative/open state | assumes one row per current open-state bucket | both rows collide; state transitions drift identity | `REJECTED` |
| cooperative + complete payload | every declared persisted payload field | no | title, description, quantity, unit, price, deadline, open state | none | equates payload equality with domain identity | any correction creates a false new identity | `REJECTED` |

No candidate is `PROVEN`. Current fixture distinctness is semantic data, not
cardinality evidence. A new listing code could become real domain identity,
but no such field or semantics currently exist, so this audit does not select
the schema-changing option or invent code values.

```text
BULK_LISTING_IDENTITY_DECISION=BULK_LISTING_IDENTITY_REMAINS_UNRESOLVED
BULK_LISTING_IDENTITIES_RESOLVED=NO
SEED_IDENTITY_DECISION=NONE_PROVEN
DOMAIN_SCHEMA_CHANGE_DECISION=NOT_AUTHORIZED;HUMAN_DECISION_REQUIRED_FIRST
SYNTHETIC_SEED_ONLY_IDENTITY_APPROVED=NO
```

### 20.4 Product And Owner Dependencies

`productCategoryId` is an optional category reference, not a Product
relationship. `seedBulkListings` has no Product argument after C2B removed its
unused parameter. Restoring a Product dependency would invent domain structure
and is rejected. The owner is the Cooperative-role User ID and its scalar
output already exists, so no new owner scalar output is required.

```text
BULK_LISTING_PRODUCT_RELATION_EXISTS=NO
BULK_LISTING_PRODUCT_ID_FIELD=NONE
BULK_LISTING_PRODUCT_SEED_DEPENDENCY_REQUIRED=NO
BULK_LISTING_OWNER_FIELD=cooperativeId
BULK_LISTING_OWNER_DOMAIN_TYPE=COOPERATIVE_ROLE_USER_ID
BULK_LISTING_OWNER_SEED_OUTPUT=users.dev.users/user.id.by-email/cooperative@sandbox.com
NEW_SCALAR_OUTPUT_DECISION_REQUIRED=NO_FOR_BULK_LISTING_OWNER
```

### 20.5 Contribution Consequence

The C2D0 human decision remains authoritative: BLC-02 is an accidental
duplicate and must be retired in a future authorized implementation. The one
retained Contribution identity remains Bulk Listing ID + Farmer User ID, with
fail-closed duplicate handling and no schema change in this audit.

A future Bulk Operations owner group must first reconcile a Bulk Listing by an
approved business identity and obtain its persisted UUID before reconciling the
Contribution. That logical parent-ID result is required. Whether it stays an
internal result in one owner group or becomes a dependency output is a later
implementation design. If an output is needed, its kind must be derived from
the approved business key; the placeholder below is not an approved output.

```text
CONTRIBUTION_ORIGINAL_INTENT=ACCIDENTAL_DUPLICATE_FIXTURE
BLC_02_DECISION=RETIRE_DUPLICATE_FIXTURE
BLC_02_DECISION_STATUS=HUMAN_APPROVED
CONTRIBUTION_STABLE_KEY=Bulk Listing ID + Farmer User ID
CONTRIBUTION_DUPLICATE_POLICY=FAIL_CLOSED
CONTRIBUTION_PARENT_OUTPUT_REQUIRED=YES_LOGICAL_PARENT_ID_AFTER_BULK_LISTING_IDENTITY_APPROVAL
CONTRIBUTION_PARENT_OUTPUT_KIND_CANDIDATE=bulk-listing.id.by-<approved-business-key>;UNAPPROVED_PLACEHOLDER
CONTRIBUTION_PARENT_IDENTITY_RESOLVED=NO
```

### 20.6 P8-05C2D2A Human Decisions Required

Evidence is insufficient to choose a business identity or retire legitimate
Bulk Listing concepts autonomously. Human review must answer each decision:

```text
BULK_LISTING_IDENTITY_POLICY_DECISION=
APPROVE_EXISTING_PERSISTED_BUSINESS_KEY:<exact current field>
or APPROVE_EXISTING_COMPOSITE:<exact ordered fields and cardinality rule>
or ADD_DOMAIN_LISTING_CODE
or RETIRE_CURRENT_DEV_FIXTURES
or DEFER

BL_01_IDENTITY_DECISION=
RETAIN_UNDER_APPROVED_IDENTITY
or RETIRE
or DEFER

BL_02_IDENTITY_DECISION=
RETAIN_UNDER_APPROVED_IDENTITY
or RETIRE
or DEFER
```

If `ADD_DOMAIN_LISTING_CODE` is selected, a separate authorized domain/schema
decision must define assignment authority, immutability, uniqueness scope, and
exact fixture codes before implementation. If a current composite is selected,
human review must explicitly approve its cardinality and behavior under edits;
current source proves none.

### 20.7 Authorization, Boundaries, And Current Phase Status

Because neither parent Listing has an approved persisted identity, the
Contribution parent is unresolved even though the retained Contribution's own
pair identity is known. Partial Bulk Operations implementation is not
authorized. Harvest, C3, and central C4D decisions remain untouched.

```text
P8_05D1_USERS_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_123
P8_05D2_PROFILES_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_124
P8_05D3_PRODUCTS_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_127
P8_05D4_STANDALONE_ENTRYPOINT_RETIREMENT_STATUS=IMPLEMENTED_BY_MERGED_PR_128
P8_05D_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_128
ADMIN_DEV_SOURCE_FILE_EXISTS=NO
ADMIN_DEV_DIRECT_BUSINESS_WRITE_COUNT=0

CENTRAL_NORMAL_WRITE_METHOD_COUNT=5
LEGACY_DEV_REMAINING_EXISTS=YES

P8_05C2D2A_BULK_LISTING_IDENTITY_DECISION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_05C2D2_BULK_OPERATIONS_IMPLEMENTATION_STATUS=NOT_STARTED
P8_05C2D2_BULK_OPERATIONS_IMPLEMENTATION_AUTHORIZED=NO
P8_05C2D2_BLOCKERS=BULK_LISTING_PERSISTED_BUSINESS_ID_NONE_PROVEN;BULK_LISTING_COMPOSITE_KEY_NONE_PROVEN;BL_01_IDENTITY_DECISION_REQUIRED;BL_02_IDENTITY_DECISION_REQUIRED;CONTRIBUTION_PARENT_BULK_LISTING_IDENTITY_UNRESOLVED

P8_05C2D3_HARVEST_IMPLEMENTATION_AUTHORIZED=NO
HARVEST_SCHEDULE_STABLE_KEY=NONE_PROVEN
P8_05C3B_IMPLEMENTATION_AUTHORIZED=NO
P8_05C3C_IMPLEMENTATION_AUTHORIZED=NO
P8_05C4D_CENTRAL_RETIREMENT_AUTHORIZED=NO

BUSINESS_IMPLEMENTATION_CHANGES=0
CENTRAL_DEVSEEDSERVICE_RUNTIME_CHANGES=0
COOPERATIVES_RUNTIME_CHANGES=0
C3_BUSINESS_IMPLEMENTATION_CHANGES=0
C4D_BUSINESS_IMPLEMENTATION_CHANGES=0
SCHEMA_CHANGES=0
MIGRATIONS_CREATED=0
```
