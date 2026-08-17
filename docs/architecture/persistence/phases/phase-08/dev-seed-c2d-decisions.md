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

## 13. Final Decision Matrix

| Table | Identity status | Stable key | Schema unique | Seed-level key | Human decision required | Schema change required |
| --- | --- | --- | --- | --- | --- | --- |
| `cooperative_members` | `RESOLVED_SCHEMA_UNIQUE` | cooperative User ID + farmer User ID | yes | yes | no | no |
| `bulk_listings` | `UNRESOLVED` | none proven | no | no | yes | no yet; domain decision first |
| `bulk_listing_contributions` | `RESOLVED_BY_DUPLICATE_RETIREMENT_PENDING_HUMAN_REVIEW` | listing ID + farmer User ID | no in current schema | yes after BLC-02 retirement | yes | no |
| `harvest_schedules` | `RESOLVED_SEED_LEVEL_PERSISTED_BUSINESS_KEY` | user ID + product ID + expected harvest date | no | yes | no | no |

## 14. Implementation Authorization And Blockers

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

## 15. Unresolved Blockers

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
