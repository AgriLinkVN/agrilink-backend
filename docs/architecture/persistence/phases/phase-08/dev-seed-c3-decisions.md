# P8-05C3A Forum and Ads Identity Decisions

This document is the static source, schema, domain, and Git-history audit for
the Forum and Ads content/marketing portions of `legacy.dev.remaining`. It
authorizes no runtime mutation by itself. Its decisions become implementation
input only after human review and merge.

```text
DECISION_ID=P8_05C3A_FORUM_ADS_IDENTITY_DECISIONS
P8_05C2D1_MEMBERS_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_117
P8_05C3A_FORUM_ADS_DECISION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_05C3_IMPLEMENTATION_STATUS=NOT_STARTED
```

## 1. Current C3 Central State

PR #117 merged C2D1 Cooperative Member seed ownership into `develop` at
`052225d4b86edf18ba52bf7e46a9765a40b787b2` with a successful Backend Quality Gate.
The central service no longer writes Cooperative Member records or imports the
Member entity/repository.

The remaining C3 central methods in `src/database/dev-seed.service.ts` are:

- `seedForum`
- `seedAdPackages`
- `seedAdCampaigns`

Audit metrics for current C3 central code:

```text
C3_CENTRAL_METHOD_COUNT=3
C3_CENTRAL_TABLE_COUNT=5
C3_EXPLICIT_ANY_COUNT=1
C3_RESET_TARGET_COUNT=6
```

Tables written by current C3 methods: `forum_posts`, `forum_comments`,
`forum_likes`, `ad_packages`, and `ad_campaigns`.
The explicit `any` debt exists at line 152 in `seedAdCampaigns`: `await campaignRepo.save(c as any);`.
The 6 C3-related reset targets in `resetAll` are: `forum_posts`,
`forum_comments`, `forum_likes`, `ad_packages`, `ad_campaigns`, and `ad_events`.

## 2. Forum Post Inventory And Key Audit

Inventory of all 5 intended Forum Post fixtures in `seedForum`:

| Fixture | Author Email | Title | Content Summary | Category | Other Persisted Fields |
| --- | --- | --- | --- | --- | --- |
| FP-01 | `farmer@sandbox.com` | Kỹ thuật trồng lúa ST25 đạt năng suất cao | Kinh nghiệm trồng lúa ST25 3 vụ liên tiếp | TECHNICAL | viewCount: 342, likeCount: 15, commentCount: 3 |
| FP-02 | `cooperative@sandbox.com` | Thị trường trái cây nhập khẩu cuối năm 2026 | Dự báo giá sầu riêng, thanh long, vải thiều | MARKET | viewCount: 567, likeCount: 28, commentCount: 5 |
| FP-03 | `buyer@agrilink.vn` | Kinh nghiệm mua nông sản online uy tín | Mẹo mua nông sản chất lượng trên AgriLink | EXPERIENCE | viewCount: 234, likeCount: 12, commentCount: 2 |
| FP-04 | `farmer@sandbox.com` | Tình hình sâu bệnh trên cây ăn trái mùa mưa | Phòng trừ tổng hợp IPM cho cây có múi | TECHNICAL | viewCount: 189, likeCount: 22 |
| FP-05 | `cooperative@sandbox.com` | HTX Xanh Tiền Giang tuyển thành viên mới | Tuyển 20 hộ xã viên cho vụ Đông Xuân | EXPERIENCE | viewCount: 98, likeCount: 8 |

```text
FORUM_POST_FIXTURE_COUNT=5
```

### Domain Identity Audit for Forum Post

Inspection of `ForumPost` entity, `forum.service.ts`, DTOs, and controllers:

- The schema has no `slug` column, external reference code, or unique constraint.
- Title and content are editable display fields via `updatePost`.
- `createdAt` and `updatedAt` are lifecycle timestamps.
- Author ID alone does not identify a post as an author can post multiple times.

### Candidate Keys Evaluation

1. **`authorId + title`**: Persisted fields only: yes; Mutable fields: `title` (editable); Schema unique: no; Verdict: REJECT (title is editable display text).
2. **`authorId + title + category`**: Persisted fields only: yes; Mutable fields: `title`, `category`; Schema unique: no; Verdict: REJECT.
3. **`authorId + createdAt`**: Persisted fields only: yes; Mutable fields: `createdAt` (lifecycle timestamp); Schema unique: no; Verdict: REJECT.

```text
FORUM_POST_STABLE_KEY=NONE_PROVEN
FORUM_POST_IDENTITY_STATUS=UNRESOLVED
```

## 3. Forum Comment Inventory And Key Audit

Inventory of all 7 intended Forum Comment fixtures in `seedForum`:

| Fixture | Target Post Reference | Author Email | Content Summary |
| --- | --- | --- | --- |
| FC-01 | FP-01 (`saved[0]`) | `buyer@agrilink.vn` | Hỏi thêm về xử lý sâu đục thân |
| FC-02 | FP-01 (`saved[0]`) | `cooperative@sandbox.com` | Trồng ST25 hiệu quả cao hơn 25-30% |
| FC-03 | FP-01 (`saved[0]`) | `farmer@sandbox.com` | Hứa viết thêm phần 2 chi tiết |
| FC-04 | FP-02 (`saved[1]`) | `buyer@agrilink.vn` | Giá sầu riêng có thể tăng vì nhu cầu TQ lớn |
| FC-05 | FP-02 (`saved[1]`) | `farmer@sandbox.com` | Cải tạo vườn tăng sản lượng vụ tới |
| FC-06 | FP-02 (`saved[1]`) | `cooperative@sandbox.com` | Thị trường TQ tăng trưởng tốt 2-3 năm nữa |
| FC-07 | FP-02 (`saved[1]`) | `buyer@agrilink.vn` | Cập nhật giá sầu riêng chợ Thủ Đức 90k/kg |

```text
FORUM_COMMENT_FIXTURE_COUNT=7
```

### Domain Identity Audit for Forum Comment

- FC-04 and FC-07 share the same Post (FP-02) and same Author (`buyer@agrilink.vn`). `postId + authorId` collides.
- Comment text is mutable display text.
- No persisted stable comment code or discriminator exists in `ForumComment` schema.

```text
FORUM_COMMENT_STABLE_KEY=NONE_PROVEN
FORUM_COMMENT_IDENTITY_STATUS=UNRESOLVED
```

## 4. Forum Like Inventory And Key Audit

Central `seedForum` iterates over saved posts and liker IDs (`farmer@sandbox.com`, `cooperative@sandbox.com`, `buyer@agrilink.vn`), evaluating `if (post.likeCount > 0 && Math.random() > 0.3)`.

### Schema Invariant

`ForumLike` entity declares `@Unique(['postId', 'userId'])`.

```text
FORUM_LIKE_STABLE_KEY=user ID + post ID
FORUM_LIKE_IDENTITY_STATUS=RESOLVED_SCHEMA_UNIQUE
FORUM_LIKE_SCHEMA_UNIQUE=YES
FORUM_LIKE_NONDETERMINISTIC_BEHAVIOR_DECISION=RETIRE_NONDETERMINISTIC_DEMO_BEHAVIOR
FORUM_LIKE_FIXTURE_SET_STATUS=NO_APPROVED_DETERMINISTIC_FIXTURE_SET
FORUM_LIKE_IDENTITY_BLOCKER=NO
FORUM_RANDOM_BEHAVIOR_TARGET=RETIRED_WHEN_FORUM_OWNER_MIGRATION_IS_EVENTUALLY_AUTHORIZED
```

Human review accepts `user ID + post ID` as `RESOLVED_SCHEMA_UNIQUE` based on the `@Unique(['postId', 'userId'])` constraint. However, human review does not accept converting the historical random Like selection (`Math.random() > 0.3`) into an arbitrary deterministic fixture set. Instead, the nondeterministic demo behavior will be retired (`RETIRE_NONDETERMINISTIC_DEMO_BEHAVIOR`) when Forum owner migration is eventually authorized. No arbitrary liker/post pairs are invented, and `FORUM_LIKE_IDENTITY_BLOCKER=NO`.

## 5. Random And Positional Forum Behavior

The central Forum seed contains:

1. `Math.random() > 0.3` random filter for Forum Like creation.
2. `saved.length === 1` and `saved.length === 2` array-position checks to attach comments.

```text
FORUM_RANDOM_BEHAVIOR_COUNT=1
FORUM_POSITIONAL_DEPENDENCY_COUNT=2
```

Required dispositions for migration:

- Like selection: `RETIRE_NONDETERMINISTIC_DEMO_BEHAVIOR` (retire nondeterministic demo behavior when Forum migration is eventually authorized; no approved deterministic fixture set).
- Comment parent assignment: `saved[0]` and `saved[1]` are migration debt. As Forum Post identity remains unresolved, no semantic Post seed identity is invented yet.

## 6. Forum Grouping Decision

Evaluation: Forum Posts, Comments, and Likes should be grouped together into a single owner-local group: `forum.dev.discussions`.

Rationale:

- Comments and Likes depend on parent Posts.
- Generated Post UUIDs remain local within group execution.
- No external consumer requires Forum Post UUID outputs.

```text
C3_FORUM_GROUPING_DECISION=forum.dev.discussions
FORUM_DEV_OUTPUT_COUNT=0
```

## 7. Ads Package Inventory And Key Audit

Inventory of all 3 Ad Package fixtures in `seedAdPackages`:

| Fixture | Name | Ad Type | Duration | Price | Max Impressions | Description | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| AP-01 | Banner chính (Carousel) | BANNER | 30 days | 500,000 | 10,000 | Hiển thị trên carousel trang chủ | active |
| AP-02 | Sản phẩm nổi bật | FEATURED | 14 days | 300,000 | 5,000 | Sản phẩm được gắn nhãn nổi bật | active |
| AP-03 | Spotlight tuần | SPOTLIGHT | 7 days | 700,000 | 20,000 | Hiển thị spotlight nổi bật 7 ngày | active |

```text
AD_PACKAGE_COUNT=3
```

### Domain Identity Audit for Ad Package

- `AdPackage` has auto-increment `id: number`.
- Package `name` has no unique constraint and is mutable display text.
- No `code` or `slug` column exists.

```text
AD_PACKAGE_STABLE_KEY=NONE_PROVEN
AD_PACKAGE_IDENTITY_STATUS=UNRESOLVED
```

## 8. Ads Campaign Inventory And Key Audit

Inventory of all 4 Ad Campaign fixtures in `seedAdCampaigns`:

| Fixture | Supplier Email | Package Position | Title | Status | Start Date | End Date | Impressions/Clicks |
| --- | --- | --- | --- | --- | --- | --- | --- |
| AC-01 | `supplier@agrilink.vn` | `packages[0]` | Nông sản sạch Đà Lạt | ACTIVE | `now - 5d` | `now + 25d` | 4,500 / 230 |
| AC-02 | `supplier@agrilink.vn` | `packages[1]` | Đặc sản vùng miền — Khuyến mãi tháng 7 | ACTIVE | `now - 5d` | `now + 25d` | 2,100 / 98 |
| AC-03 | `supplier@agrilink.vn` | `packages[2]` | Sầu riêng Ri6 chính vụ | ACTIVE | `now - 5d` | `now + 25d` | 7,800 / 420 |
| AC-04 | `supplier@agrilink.vn` | `packages[0]` | Phân bón hữu cơ — Giảm 15% | PENDING_APPROVAL | `null` | `null` | 0 / 0 |

```text
AD_CAMPAIGN_COUNT=4
AD_CAMPAIGN_PACKAGE_POSITIONAL_DEPENDENCIES=4
```

Package selection relies on array indices `packages[0]`, `packages[1]`, `packages[2]`, `packages[0]`.

### Domain Identity Audit for Ad Campaign

- `title` is editable display text.
- Campaign start/end dates in central code are calculated dynamically relative to `new Date()`.
- No persisted business key or unique constraint exists.

```text
AD_CAMPAIGN_STABLE_KEY=NONE_PROVEN
AD_CAMPAIGN_IDENTITY_STATUS=UNRESOLVED
```

## 9. Ads Grouping Decision

Evaluation: Ad Packages and Ad Campaigns should be grouped together into a single owner-local group: `ads.dev.catalog-and-campaigns`.

Rationale:

- Campaigns depend on Packages (`packageId: number`).
- Auto-increment Package IDs stay execution-local within the group.
- No external module requires Ad Package or Campaign UUID outputs.

```text
C3_ADS_GROUPING_DECISION=ads.dev.catalog-and-campaigns
ADS_DEV_OUTPUT_REQUIREMENT=0
```

## 10. User Dependency Map

Required user emails for C3 groups:

```text
FORUM_REQUIRED_USER_EMAILS=farmer@sandbox.com,cooperative@sandbox.com,buyer@agrilink.vn
ADS_REQUIRED_USER_EMAILS=supplier@agrilink.vn,admin@agrilink.vn
```

All 5 required emails exist in the canonical 10-User DEV payload provided by `users.dev.users`. No new users need to be added.

### External DAG

```text
users.dev.users/user.id.by-email -> forum.dev.discussions
users.dev.users/user.id.by-email -> ads.dev.catalog-and-campaigns
```

## 11. Time Determinism And Random Audit

Uses of execution-time or random functions in C3 code:

- `Math.random() > 0.3` in `seedForum` like creation -> Nondeterministic random behavior.
- Relative date calculations (`now - 5d`, `now + 25d`) in `seedAdCampaigns` -> Execution-time dependent dates.

```text
C3_EXECUTION_TIME_DEPENDENT_FIELDS=ad_campaigns.start_date,ad_campaigns.end_date,ORM created_at/updated_at
C3_RANDOM_FIELDS=Math.random() in seedForum likes
AD_CAMPAIGN_DATE_POLICY=CREATE_ONLY_EXECUTION_RELATIVE_PAYLOAD_PRESERVE_ON_RECONCILE
AD_CAMPAIGN_DATE_IDENTITY_COMPONENT=NO
SECOND_RUN_CAMPAIGN_DATE_DRIFT=0
```

Classification:

- **Ad Campaign Dates**: Classified as `CREATE_ONLY_PAYLOAD` (business payload fields, never stable identity components). On CREATE, existing DEV intent is preserved (`startDate = execution time - 5 days`, `endDate = execution time + 25 days`). On RECONCILE, existing stored dates are preserved without shifting (`SECOND_RUN_CAMPAIGN_DATE_DRIFT=0`).
- **ORM Timestamps**: `createdAt`/`updatedAt` remain separately classified as `LIFECYCLE_DEFAULT`.
- **Like Selection**: `RETIRE_NONDETERMINISTIC_DEMO_BEHAVIOR` when Forum owner migration is eventually authorized.

## 12. Reset Debt

Reset targets in `dev-seed.service.ts` belonging to Forum and Ads:

- `forum_posts`
- `forum_comments`
- `forum_likes`
- `ad_packages`
- `ad_campaigns`
- `ad_events`

```text
C3_RESET_TARGETS=forum_posts,forum_comments,forum_likes,ad_packages,ad_campaigns,ad_events
C3_STALE_RESET_TARGETS=ad_events
```

`ad_events` is never written by `DevSeedService`; it is stale destructive reset debt.

## 13. Final Identity Matrix

| Entity / Table | Identity Status | Stable Key | Schema Unique | Seed-Level Key | Human Decision Required | Schema Change Required |
| --- | --- | --- | --- | --- | --- | --- |
| `forum_posts` | `UNRESOLVED` | `NONE_PROVEN` | `NO` | `NO` | `YES` | `NO_YET_DOMAIN_IDENTITY_DECISION_FIRST` |
| `forum_comments` | `UNRESOLVED` | `NONE_PROVEN` | `NO` | `NO` | `YES` | `NO_YET_DOMAIN_IDENTITY_DECISION_FIRST` |
| `forum_likes` | `RESOLVED_SCHEMA_UNIQUE` | `user ID + post ID` | `YES` | `YES` | `NO` | `NO` |
| `ad_packages` | `UNRESOLVED` | `NONE_PROVEN` | `NO` | `NO` | `YES` | `NO_YET_DOMAIN_IDENTITY_DECISION_FIRST` |
| `ad_campaigns` | `UNRESOLVED` | `NONE_PROVEN` | `NO` | `NO` | `YES` | `NO_YET_DOMAIN_IDENTITY_DECISION_FIRST` |

## 14. Implementation Split

```text
P8_05C3B_FORUM_IMPLEMENTATION_AUTHORIZED=NO
P8_05C3B_FORUM_BLOCKERS=FORUM_POST_DOMAIN_IDENTITY_UNRESOLVED;FORUM_COMMENT_DOMAIN_IDENTITY_UNRESOLVED

P8_05C3C_ADS_IMPLEMENTATION_AUTHORIZED=NO
P8_05C3C_ADS_BLOCKERS=AD_PACKAGE_DOMAIN_IDENTITY_UNRESOLVED;AD_CAMPAIGN_DOMAIN_IDENTITY_UNRESOLVED

P8_05C3_IMPLEMENTATION_AUTHORIZED=NO
```

## 15. Human Review Overlay & Authoritative Status

Neither Forum nor Ads owner-local implementation is authorized to proceed yet.

```text
P8_05C3A_FORUM_ADS_DECISION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW

FORUM_LIKE_NONDETERMINISTIC_BEHAVIOR_DECISION=RETIRE_NONDETERMINISTIC_DEMO_BEHAVIOR
FORUM_LIKE_FIXTURE_SET_STATUS=NO_APPROVED_DETERMINISTIC_FIXTURE_SET
FORUM_LIKE_IDENTITY_BLOCKER=NO
FORUM_RANDOM_BEHAVIOR_TARGET=RETIRED_WHEN_FORUM_OWNER_MIGRATION_IS_EVENTUALLY_AUTHORIZED

AD_CAMPAIGN_DATE_POLICY=CREATE_ONLY_EXECUTION_RELATIVE_PAYLOAD_PRESERVE_ON_RECONCILE
AD_CAMPAIGN_DATE_IDENTITY_COMPONENT=NO
SECOND_RUN_CAMPAIGN_DATE_DRIFT=0

P8_05C3B_FORUM_IMPLEMENTATION_AUTHORIZED=NO
P8_05C3B_FORUM_BLOCKERS=FORUM_POST_DOMAIN_IDENTITY_UNRESOLVED;FORUM_COMMENT_DOMAIN_IDENTITY_UNRESOLVED

P8_05C3C_ADS_IMPLEMENTATION_AUTHORIZED=NO
P8_05C3C_ADS_BLOCKERS=AD_PACKAGE_DOMAIN_IDENTITY_UNRESOLVED;AD_CAMPAIGN_DOMAIN_IDENTITY_UNRESOLVED

P8_05C3_IMPLEMENTATION_AUTHORIZED=NO
```

Blockers summary:

- **Forum**: `forum_posts` and `forum_comments` lack persisted stable business keys in the domain model. `forum_likes` key shape is schema-resolved (`user ID + post ID`); nondeterministic like creation will be retired without creating arbitrary fixture pairs.
- **Ads**: `ad_packages` and `ad_campaigns` lack persisted stable business keys in the domain model. Campaign dates are payload policy (`CREATE_ONLY_EXECUTION_RELATIVE_PAYLOAD_PRESERVE_ON_RECONCILE`) and do not block identity, but package and campaign business identities remain unresolved.

Per Phase 8 blocker policy, stable keys must NOT be invented (e.g., creating fake reference codes or relying on mutable title/content) merely to make seeds idempotent. Domain/schema identity decisions must be made first by human maintainers.

## 16. Scope And Safety Invariants

```text
BUSINESS_IMPLEMENTATION_CHANGES=0
SCHEMA_CHANGES=0
MIGRATIONS_CREATED=0

P8_05C2D2_BUSINESS_IMPLEMENTATION_CHANGES=0
P8_05C2D3_BUSINESS_IMPLEMENTATION_CHANGES=0
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
DESTRUCTIVE_RESET_EXECUTED=NO
```


## 16.1 P8-05C3B1 Human Review Decision Evidence

Human review accepts the complete C3B1 audit in section 17 and resolves the
ordinary DEV Forum fixtures by retirement. This trailing overlay is current
authority. It authorizes only a future retirement implementation after PR #134
merges; it makes no runtime or schema change in this documentation PR.

The earlier audit remains intentionally unchanged and is classified as:

```text
HISTORICAL_AUTHORITY_LABEL=HISTORICAL_AS_OF_C3B1_AUDIT_BEFORE_HUMAN_DECISION
HISTORICAL_FORUM_POST_IDENTITY_DECISION=IDENTITY_REMAINS_UNRESOLVED
HISTORICAL_FORUM_COMMENT_IDENTITY_DECISION=IDENTITY_REMAINS_UNRESOLVED
HISTORICAL_FORUM_LIKE_FIXTURE_SET_DECISION=RANDOM_SET_REQUIRES_HUMAN_DECISION
HISTORICAL_P8_05C3B_IMPLEMENTATION_AUTHORIZED=NO
```

Human review does not claim that Post or Comment identity was discovered and
does not invalidate the schema-backed Like row identity. It rejects adding
domain, schema, synthetic, seed-only, or hardcoded identifiers solely to keep
legacy screenshot/demo fixtures deterministic.

### 18.1 Post policy and fixture dispositions

No persisted Post business identity or immutable natural composite is proven.
Title, content, and category are editable; UUIDs and timestamps are generated;
history identifies these as screenshot/demo content; and no downstream
ordinary DEV seed consumes Post IDs. Human review therefore rejects new domain
or seed-only semantics for these fixtures.

```text
FORUM_POST_IDENTITY_POLICY_DECISION=RETIRE_CURRENT_DEV_FIXTURES
FORUM_POST_NEW_DOMAIN_IDENTIFIER_AUTHORIZED=NO
FORUM_POST_EXISTING_COMPOSITE_IDENTITY_APPROVED=NO
FORUM_POST_SYNTHETIC_IDENTITY_APPROVED=NO
FORUM_POST_SEED_ONLY_KEY_APPROVED=NO
FORUM_POST_DEV_FIXTURE_DISPOSITION=RETIRE_FROM_ORDINARY_DEV_SEED

FP_01_DECISION=RETIRE
FP_01_DEV_FIXTURE_DISPOSITION=RETIRE_FROM_ORDINARY_DEV_SEED
FP_01_DECISION_REASON=SCREENSHOT_DEMO_DEV_FIXTURE_HAS_NO_PROVEN_PERSISTED_BUSINESS_IDENTITY_AND_HUMAN_REVIEW_REJECTS_INVENTING_DOMAIN_OR_SEED_ONLY_IDENTITY
FP_02_DECISION=RETIRE
FP_02_DEV_FIXTURE_DISPOSITION=RETIRE_FROM_ORDINARY_DEV_SEED
FP_02_DECISION_REASON=SCREENSHOT_DEMO_DEV_FIXTURE_HAS_NO_PROVEN_PERSISTED_BUSINESS_IDENTITY_AND_HUMAN_REVIEW_REJECTS_INVENTING_DOMAIN_OR_SEED_ONLY_IDENTITY
FP_03_DECISION=RETIRE
FP_03_DEV_FIXTURE_DISPOSITION=RETIRE_FROM_ORDINARY_DEV_SEED
FP_03_DECISION_REASON=SCREENSHOT_DEMO_DEV_FIXTURE_HAS_NO_PROVEN_PERSISTED_BUSINESS_IDENTITY_AND_HUMAN_REVIEW_REJECTS_INVENTING_DOMAIN_OR_SEED_ONLY_IDENTITY
FP_04_DECISION=RETIRE
FP_04_DEV_FIXTURE_DISPOSITION=RETIRE_FROM_ORDINARY_DEV_SEED
FP_04_DECISION_REASON=SCREENSHOT_DEMO_DEV_FIXTURE_HAS_NO_PROVEN_PERSISTED_BUSINESS_IDENTITY_AND_HUMAN_REVIEW_REJECTS_INVENTING_DOMAIN_OR_SEED_ONLY_IDENTITY
FP_05_DECISION=RETIRE
FP_05_DEV_FIXTURE_DISPOSITION=RETIRE_FROM_ORDINARY_DEV_SEED
FP_05_DECISION_REASON=SCREENSHOT_DEMO_DEV_FIXTURE_HAS_NO_PROVEN_PERSISTED_BUSINESS_IDENTITY_AND_HUMAN_REVIEW_REJECTS_INVENTING_DOMAIN_OR_SEED_ONLY_IDENTITY

FORUM_POST_APPROVED_RETAIN_COUNT=0
FORUM_POST_APPROVED_RETIRE_COUNT=5
FORUM_POST_IDENTITIES_RESOLVED=NOT_REQUIRED_FIXTURES_RETIRED
```

### 18.2 Comment policy and fixture dispositions

No persisted Comment business identity is proven; every proposed composite
contains mutable or generated values; the parent Post fixtures are retired;
and no downstream ordinary DEV seed consumes Comment IDs. Human review rejects
introducing Comment identity solely to retain these seven demo rows.

```text
FORUM_COMMENT_IDENTITY_POLICY_DECISION=RETIRE_CURRENT_DEV_FIXTURES
FORUM_COMMENT_NEW_DOMAIN_IDENTIFIER_AUTHORIZED=NO
FORUM_COMMENT_EXISTING_COMPOSITE_IDENTITY_APPROVED=NO
FORUM_COMMENT_SYNTHETIC_IDENTITY_APPROVED=NO
FORUM_COMMENT_SEED_ONLY_KEY_APPROVED=NO
FORUM_COMMENT_DEV_FIXTURE_DISPOSITION=RETIRE_FROM_ORDINARY_DEV_SEED

FC_01_DECISION=RETIRE
FC_01_DEV_FIXTURE_DISPOSITION=RETIRE_FROM_ORDINARY_DEV_SEED
FC_01_DECISION_REASON=SCREENSHOT_DEMO_COMMENT_FIXTURE_HAS_NO_PROVEN_PERSISTED_BUSINESS_IDENTITY_AND_PARENT_FORUM_POST_DEV_FIXTURE_IS_RETIRED
FC_02_DECISION=RETIRE
FC_02_DEV_FIXTURE_DISPOSITION=RETIRE_FROM_ORDINARY_DEV_SEED
FC_02_DECISION_REASON=SCREENSHOT_DEMO_COMMENT_FIXTURE_HAS_NO_PROVEN_PERSISTED_BUSINESS_IDENTITY_AND_PARENT_FORUM_POST_DEV_FIXTURE_IS_RETIRED
FC_03_DECISION=RETIRE
FC_03_DEV_FIXTURE_DISPOSITION=RETIRE_FROM_ORDINARY_DEV_SEED
FC_03_DECISION_REASON=SCREENSHOT_DEMO_COMMENT_FIXTURE_HAS_NO_PROVEN_PERSISTED_BUSINESS_IDENTITY_AND_PARENT_FORUM_POST_DEV_FIXTURE_IS_RETIRED
FC_04_DECISION=RETIRE
FC_04_DEV_FIXTURE_DISPOSITION=RETIRE_FROM_ORDINARY_DEV_SEED
FC_04_DECISION_REASON=SCREENSHOT_DEMO_COMMENT_FIXTURE_HAS_NO_PROVEN_PERSISTED_BUSINESS_IDENTITY_AND_PARENT_FORUM_POST_DEV_FIXTURE_IS_RETIRED
FC_05_DECISION=RETIRE
FC_05_DEV_FIXTURE_DISPOSITION=RETIRE_FROM_ORDINARY_DEV_SEED
FC_05_DECISION_REASON=SCREENSHOT_DEMO_COMMENT_FIXTURE_HAS_NO_PROVEN_PERSISTED_BUSINESS_IDENTITY_AND_PARENT_FORUM_POST_DEV_FIXTURE_IS_RETIRED
FC_06_DECISION=RETIRE
FC_06_DEV_FIXTURE_DISPOSITION=RETIRE_FROM_ORDINARY_DEV_SEED
FC_06_DECISION_REASON=SCREENSHOT_DEMO_COMMENT_FIXTURE_HAS_NO_PROVEN_PERSISTED_BUSINESS_IDENTITY_AND_PARENT_FORUM_POST_DEV_FIXTURE_IS_RETIRED
FC_07_DECISION=RETIRE
FC_07_DEV_FIXTURE_DISPOSITION=RETIRE_FROM_ORDINARY_DEV_SEED
FC_07_DECISION_REASON=SCREENSHOT_DEMO_COMMENT_FIXTURE_HAS_NO_PROVEN_PERSISTED_BUSINESS_IDENTITY_AND_PARENT_FORUM_POST_DEV_FIXTURE_IS_RETIRED

FORUM_COMMENT_APPROVED_RETAIN_COUNT=0
FORUM_COMMENT_APPROVED_RETIRE_COUNT=7
FORUM_COMMENT_IDENTITIES_RESOLVED=NOT_REQUIRED_FIXTURES_RETIRED
FORUM_COMMENT_PARENT_IDENTITY_RESOLVED=NOT_REQUIRED_PARENT_FIXTURES_RETIRED
```

### 18.3 Like policy

The unique `postId + userId` constraint continues to prove Like row identity.
The fixture set is separate: source has no approved fixed pair declarations and
probabilistically selects from 15 positional candidates with `Math.random()`.
Human review rejects both that generator and an invented replacement pair set.

```text
FORUM_LIKE_ROW_IDENTITY=USER_ID_PLUS_POST_ID
FORUM_LIKE_ROW_IDENTITY_RESOLVED=YES
FORUM_LIKE_FIXTURE_POLICY_DECISION=RETIRE_CURRENT_DEV_FIXTURES
FORUM_LIKE_RANDOM_GENERATOR_DISPOSITION=RETIRE
FORUM_LIKE_APPROVED_FIXED_PAIR_COUNT=0
FORUM_LIKE_POLICY_RESOLVED=YES
FORUM_LIKE_EXACT_PAIR_SET_APPROVED=NO
FORUM_LIKE_REPLACEMENT_RANDOMNESS_AUTHORIZED=NO
```

No pairs are inferred from a prior random execution.

### 18.4 Final Forum disposition and dependencies

The current legacy writer still consumes `farmer@sandbox.com`,
`cooperative@sandbox.com`, and `buyer@agrilink.vn` through `users.dev.users`
and `user.id.by-email`. That remains pre-retirement runtime evidence. Future
Forum retirement removes these Forum actor usages, but does not establish that
the entire Users dependency is dead because Ads may consume other actors.

```text
FORUM_DEV_FIXTURE_DISPOSITION=RETIRE_FROM_ORDINARY_DEV_SEED
FORUM_POST_APPROVED_RETAIN_COUNT=0
FORUM_POST_APPROVED_RETIRE_COUNT=5
FORUM_COMMENT_APPROVED_RETAIN_COUNT=0
FORUM_COMMENT_APPROVED_RETIRE_COUNT=7
FORUM_LIKE_APPROVED_FIXED_PAIR_COUNT=0
FORUM_LIKE_RANDOM_GENERATOR_DISPOSITION=RETIRE

FORUM_NEW_OWNER_LOCAL_DEV_SEED_REQUIRED=NO
FORUM_NEW_SEEDGROUP_REQUIRED=NO
FORUM_NEW_SCALAR_OUTPUT_REQUIRED=NO
FORUM_NEW_SEED_OUTPUT_KINDS=0
FUTURE_FORUM_OWNER_SEED_DEPENDENCIES=NONE_FIXTURES_RETIRED
```

No `forum-post.id.by-*`, `forum-comment.id.by-*`, `postCode`, `commentCode`,
seed-only slug, `seed_key`, `fixture_code`, hardcoded UUID, or payload hash is
approved or required.

### 18.5 Retirement-only authorization and expected state

After PR #134 merges, a future C3B runtime PR may remove `seedForum`, its three
Forum repository acquisitions, all Post/Comment/Like declarations and random
generation, its Forum-only actor plumbing if separately proven dead, and the
three Forum reset targets. It must create no replacement Forum DEV group. This
overlay does not perform those changes.

```text
P8_05C3B1_FORUM_DECISION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_05C3B_IMPLEMENTATION_AUTHORIZED=YES_AFTER_P8_05C3B1_PR_134_MERGE
P8_05C3B_BLOCKERS=NONE
P8_05C3B_IMPLEMENTATION_STRATEGY=RETIRE_LEGACY_FORUM_DEV_FIXTURES
P8_05C3B_IMPLEMENTATION_STATUS=NOT_STARTED

CURRENT_CENTRAL_NORMAL_WRITE_METHOD_COUNT=3
CURRENT_CENTRAL_NORMAL_WRITE_METHODS=seedForum;seedAdPackages;seedAdCampaigns
CURRENT_CENTRAL_BUSINESS_TABLE_COUNT=5
CURRENT_CENTRAL_BUSINESS_TABLES=forum_posts;forum_comments;forum_likes;ad_packages;ad_campaigns

POST_C3B_CENTRAL_NORMAL_WRITE_METHOD_COUNT=2
POST_C3B_CENTRAL_NORMAL_WRITE_METHODS=seedAdPackages;seedAdCampaigns
POST_C3B_CENTRAL_BUSINESS_TABLE_COUNT=2
POST_C3B_CENTRAL_BUSINESS_TABLES=ad_packages;ad_campaigns

CURRENT_FORUM_RESET_TARGETS=forum_likes;forum_comments;forum_posts
EXPECTED_POST_C3B_FORUM_RESET_TARGET_COUNT=0
```

### 18.6 Boundaries and safety

Ads decisions remain unchanged, and C4D remains blocked by C3C Ads. The future
Forum authorization does not authorize central service retirement.

```text
P8_05C3C_IMPLEMENTATION_AUTHORIZED=NO
P8_05C4D_CENTRAL_RETIREMENT_AUTHORIZED=NO

FORUM_BUSINESS_IMPLEMENTATION_CHANGES=0
ADS_BUSINESS_IMPLEMENTATION_CHANGES=0
CENTRAL_DEVSEEDSERVICE_RUNTIME_CHANGES=0
LEGACY_DEV_REMAINING_CHANGES=0
RUNTIME_FILES_CHANGED=0
SCHEMA_CHANGES=0
MIGRATIONS_CREATED=0

PROTECTED_LOCAL_DB_ACCESSED=NO
PRODUCTION_DB_ACCESSED=NO
DATABASE_CONNECTIONS=0
DATASOURCE_CONSTRUCTED=NO
DATASOURCE_INITIALIZE_CALLS=0
SQL=0
DDL=0
DML=0
SEEDS_EXECUTED=0
MIGRATIONS_EXECUTED=0
SYNCHRONIZE=NO
DESTRUCTIVE_RESET_EXECUTED=NO
```

## 17. P8-05C3B1 Forum Identity And Fixture Policy Audit

This trailing overlay is the current Forum authority after merged PR #133. It
preserves the C3A evidence above, but supersedes its planning-level assertion
that random Likes would be retired: neither repository source nor history
proves an exact intended pair set or a reviewed retirement decision. C3B1
therefore leaves the Like fixture policy, Post identity, and Comment identity
for explicit human review. No Forum runtime or schema change is authorized.

### 17.1 Current handoff, ownership, and central baseline

```text
PR_133_MERGED=YES
PR_133_HEAD_COMMIT=74fea7d75ba715557e17378a49e81e0067a79ada
PR_133_MERGE_COMMIT=60b553032d376ccb713393ac7e790da540867146
PR_133_QUALITY_GATE=SUCCESS
BASE_COMMIT=60b553032d376ccb713393ac7e790da540867146

P8_05C2D3_HARVEST_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_133
CENTRAL_SEED_HARVEST_SCHEDULES_METHOD_EXISTS=NO
CENTRAL_NORMAL_WRITE_METHOD_COUNT=3
CENTRAL_NORMAL_WRITE_METHODS=seedForum;seedAdPackages;seedAdCampaigns
CENTRAL_BUSINESS_TABLE_COUNT=5
CENTRAL_BUSINESS_TABLES=forum_posts;forum_comments;forum_likes;ad_packages;ad_campaigns

FORUM_POST_SEED_OWNER=FORUM
FORUM_COMMENT_SEED_OWNER=FORUM
FORUM_LIKE_SEED_OWNER=FORUM
```

`ForumModule` registers all three entities, and `ForumService` owns all three
repositories. The central method is therefore a legacy writer for one coherent
Forum-owned persistence boundary.

### 17.2 Executable Post fixtures

`seedForum` has one `forum_posts` whole-table count guard. When the table is
nonempty, it returns before creating Posts, Comments, or Likes. When empty, it
saves these five Posts in declaration order. FP labels are audit labels only.
All omitted entity defaults are `imageUrls=null`, `isHidden=false`, and
ORM-generated `createdAt`/`updatedAt`; every `id` is a generated UUID.

| Label | Author identity | Title | Content | Category | Status / slug / publishedAt | Other declared fields | Lookup or guard |
| --- | --- | --- | --- | --- | --- | --- | --- |
| FP-01 | `farmer@sandbox.com` | `Kỹ thuật trồng lúa ST25 đạt năng suất cao` | `<p>Chào mọi người, tôi đã trồng giống lúa ST25 được 3 vụ liên tiếp. Sau đây tôi xin chia sẻ một số kinh nghiệm để đạt năng suất cao nhất:</p><ul><li>Chọn giống từ nguồn uy tín</li><li>Làm đất kỹ trước khi cấy</li><li>Bón phân đúng giai đoạn</li></ul><p>Ai có thắc mắc gì cứ hỏi nhé!</p>` | `TECHNICAL` | fields absent | `viewCount=342;likeCount=15;commentCount=3` | whole-table Post count; then array position |
| FP-02 | `cooperative@sandbox.com` | `Thị trường trái cây nhập khẩu cuối năm 2026` | `<p>Dự báo giá trái cây nhập khẩu cuối năm 2026: sầu riêng tăng 15%, vải thiều giảm 10% do Trung Quốc tăng sản lượng nội địa. Chi tiết từng loại:</p><ol><li><strong>Sầu riêng Ri6</strong>: 85.000 - 95.000 đ/kg</li><li><strong>Thanh long ruột đỏ</strong>: 30.000 - 40.000 đ/kg</li><li><strong>Vải thiều</strong>: 40.000 - 50.000 đ/kg</li></ol>` | `MARKET` | fields absent | `viewCount=567;likeCount=28;commentCount=5` | whole-table Post count; then array position |
| FP-03 | `buyer@agrilink.vn` | `Kinh nghiệm mua nông sản online uy tín` | `<p>Là người mua hàng thường xuyên trên AgriLink, tôi muốn chia sẻ một số mẹo để mua được nông sản chất lượng:</p><p><strong>1. Kiểm tra điểm tin cậy của người bán</strong><br>Luôn xem trust score và số lượng giao dịch đã hoàn thành.</p><p><strong>2. Đọc kỹ thông tin sản phẩm</strong><br>Xem giấy chứng nhận VietGAP, hữu cơ, ngày thu hoạch.</p><p><strong>3. Liên hệ trực tiếp với người bán</strong><br>Nhắn tin đặt câu hỏi trước khi đặt hàng.</p>` | `EXPERIENCE` | fields absent | `viewCount=234;likeCount=12;commentCount=2` | whole-table Post count; then array position |
| FP-04 | `farmer@sandbox.com` | `Tình hình sâu bệnh trên cây ăn trái mùa mưa` | `<p>Mùa mưa năm nay ở ĐBSCL có nhiều diễn biến phức tạp. Một số bệnh thường gặp trên cây có múi: vàng lá thối rễ, greening, sâu vẽ bùa.</p><p>Giải pháp tôi áp dụng hiệu quả: phòng trừ tổng hợp IPM, sử dụng chế phẩm sinh học thay vì hóa chất. Mong được trao đổi thêm với anh em nông dân cả nước!</p>` | `TECHNICAL` | fields absent | `viewCount=189;likeCount=22;commentCount=0` | whole-table Post count; then array position |
| FP-05 | `cooperative@sandbox.com` | `HTX Xanh Tiền Giang tuyển thành viên mới` | `<p>HTX Nông nghiệp Xanh Tiền Giang thông báo tuyển thêm 20 hộ xã viên cho vụ Đông Xuân 2026-2027.</p><p><strong>Quyền lợi:</strong></p><ul><li>Hỗ trợ giống, vật tư đầu vào</li><li>Bao tiêu sản phẩm đầu ra</li><li>Tập huấn kỹ thuật canh tác</li><li>Hỗ trợ vay vốn ngân hàng</li></ul><p>Liên hệ: +84902372975 - HTX Xanh Tiền Giang.</p>` | `EXPERIENCE` | fields absent | `viewCount=98;likeCount=8;commentCount=0` | whole-table Post count; then array position |

```text
FORUM_POST_FIXTURE_COUNT=5
FORUM_POST_PERSISTED_BUSINESS_ID_FIELD=NONE_PROVEN
FORUM_POST_WHOLE_TABLE_GUARD_COUNT=1
FORUM_POST_GENERATED_UUID_IDENTITY_USAGE=YES_PRIMARY_KEY_ONLY;NOT_DETERMINISTIC_SEED_IDENTITY
FORUM_POST_SCHEMA_UNIQUE_COUNT=0
FORUM_POST_SCHEMA_SECONDARY_INDEX_COUNT=0
```

The entity, canonical baseline migration, DTOs, service, controller, and Git
history contain no persisted `slug`, `postCode`, `referenceCode`, `publicId`,
`externalId`, `canonicalId`, `permalink`, `threadCode`, or equivalent business
identifier. `UpdatePostDto` is a partial create payload and `updatePost` assigns
it to the row, proving title, content, category, and image URLs are editable.
Moderation, read, comment, and Like flows also change counters and state.

| Candidate key | Fields | Immutable business identity | Mutable payload included | Schema unique | Domain cardinality | Edit behavior / collision risk | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| author + title | `authorId,title` | no | title | no | not proven | title editable; same author may reuse a title | `REJECTED` |
| author + category + title | `authorId,category,title` | no | category and title | no | not proven | both editable; tuple reuse allowed | `REJECTED` |
| author + created time | `authorId,createdAt` | no | lifecycle timestamp | no | not proven | time is ORM-generated, not fixture-assigned, and collision semantics are unspecified | `REJECTED` |
| title | `title` | no | title | no | not proven | editable and globally nonunique | `REJECTED` |
| slug | field absent | no | n/a | no | none | no persisted field or lookup exists | `REJECTED` |
| author + complete payload | `authorId` plus all payload fields | no | content, category, images, counters, moderation state, timestamps | no | not proven | ordinary edits and reads change the tuple | `REJECTED` |
| generated UUID | `id` | no deterministic assignment | generated lifecycle value | primary key only | row identity only | a fresh seed receives a different value | `REJECTED` |

```text
FORUM_POST_IDENTITY_DECISION=IDENTITY_REMAINS_UNRESOLVED
FORUM_POST_IDENTITIES_RESOLVED=NO
```

### 17.3 Executable Comment fixtures and parent consequence

Comments inherit the Post whole-table guard and are saved only for the first
two newly generated Post UUIDs. There is no `parentCommentId` field in the
entity or migration. All comments use `isHidden=false`, an ORM-generated
`createdAt`/`updatedAt`, and a generated UUID.

| Label | Parent reference | Author identity | Exact content | Parent comment | Lookup or guard |
| --- | --- | --- | --- | --- | --- |
| FC-01 | FP-01 by current `post.id` when `saved.length===1` | `buyer@agrilink.vn` | `Bài viết rất hữu ích. Anh có thể chia sẻ thêm về cách xử lý sâu đục thân không?` | field absent | whole-table Post count and Post array position |
| FC-02 | FP-01 by current `post.id` when `saved.length===1` | `cooperative@sandbox.com` | `Tôi cũng trồng ST25, thấy hiệu quả kinh tế cao hơn giống thường 25-30%. Ủng hộ bài viết!` | field absent | whole-table Post count and Post array position |
| FC-03 | FP-01 by current `post.id` when `saved.length===1` | `farmer@sandbox.com` | `Cảm ơn anh em đã quan tâm. Tôi sẽ viết thêm phần 2 chi tiết hơn nhé!` | field absent | whole-table Post count and Post array position |
| FC-04 | FP-02 by current `post.id` when `saved.length===2` | `buyer@agrilink.vn` | `Cảm ơn thông tin. Giá sầu riêng tôi thấy còn có thể tăng nữa vì nhu cầu Trung Quốc lớn.` | field absent | whole-table Post count and Post array position |
| FC-05 | FP-02 by current `post.id` when `saved.length===2` | `farmer@sandbox.com` | `Nhà vườn bên tôi đang tập trung cải tạo vườn để tăng sản lượng sầu riêng cho vụ tới.` | field absent | whole-table Post count and Post array position |
| FC-06 | FP-02 by current `post.id` when `saved.length===2` | `cooperative@sandbox.com` | `Chính xác! Thị trường sầu riêng Trung Quốc còn tăng trưởng tốt ít nhất 2-3 năm nữa.` | field absent | whole-table Post count and Post array position |
| FC-07 | FP-02 by current `post.id` when `saved.length===2` | `buyer@agrilink.vn` | `Cập nhật thêm: giá sầu riêng tại chợ đầu mối Thủ Đức hiện 90.000đ/kg.` | field absent | whole-table Post count and Post array position |

```text
FORUM_COMMENT_FIXTURE_COUNT=7
FORUM_COMMENT_PERSISTED_BUSINESS_ID_FIELD=NONE_PROVEN
FORUM_COMMENT_GENERATED_UUID_IDENTITY_USAGE=YES_PRIMARY_KEY_ONLY;NOT_DETERMINISTIC_SEED_IDENTITY
FORUM_COMMENT_SCHEMA_UNIQUE_COUNT=0
FORUM_COMMENT_SCHEMA_SECONDARY_INDEX_COUNT=0
FORUM_COMMENT_PARENT_POST_ID_REQUIRED=YES
FORUM_COMMENT_PARENT_IDENTITY_RESOLVED=NO
```

| Candidate key | Fields | Immutable business identity | Mutable payload included | Schema unique | Domain cardinality | Edit behavior / collision risk | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| parent Post + author + content | `postId,authorId,content` | no | content | no | repeated equal comments not prohibited | content is display payload and parent identity is unresolved | `REJECTED` |
| parent Post + author + created time | `postId,authorId,createdAt` | no | lifecycle timestamp | no | not proven | time is generated, not fixture-assigned | `REJECTED` |
| parent Post + parent Comment + author | `postId,parentCommentId,authorId` | no | n/a | no | not proven | `parentCommentId` is absent; FP-02 also has two comments by the buyer | `REJECTED` |
| complete payload | all persisted payload and lifecycle fields | no | content, moderation state, timestamps | no | not proven | mutable/generated values and unresolved Post parent | `REJECTED` |
| generated UUID | `id` | no deterministic assignment | generated lifecycle value | primary key only | row identity only | a fresh seed receives a different value | `REJECTED` |

```text
FORUM_COMMENT_IDENTITY_DECISION=IDENTITY_REMAINS_UNRESOLVED
FORUM_COMMENT_IDENTITIES_RESOLVED=NO
```

### 17.4 Like row identity versus fixture-set policy

`ForumLike` has a schema-backed unique constraint over `postId + userId`, and
`ForumService.toggleLike` looks up that pair before creating or removing a row.
That proves row identity and one-Like-per-User-per-Post cardinality. It does not
prove which DEV pairs should exist.

The legacy writer iterates five newly saved Posts by position and the three
Users in `[farmer, cooperative, buyer]` order, producing 15 candidate pairs.
Each pair is included only when `Math.random() > 0.3`. No pair is explicitly
declared. A second invocation against the same nonempty database leaves the set
unchanged only because the whole-table Post guard skips the entire method; a
fresh database or reseed can produce a different set.

```text
FORUM_LIKE_USER_FIELD=userId
FORUM_LIKE_POST_FIELD=postId
FORUM_LIKE_SCHEMA_UNIQUE_FIELDS=postId;userId
FORUM_LIKE_ROW_IDENTITY=USER_ID_PLUS_POST_ID
FORUM_LIKE_ROW_IDENTITY_RESOLVED=YES
FORUM_LIKE_FIXTURE_GENERATION_MODE=PROBABILISTIC_RANDOM_SELECTION_OVER_15_POSITIONAL_CANDIDATE_PAIRS
FORUM_LIKE_FIXED_PAIR_COUNT=0
FORUM_LIKE_RANDOMNESS_PRESENT=YES_MATH_RANDOM_GT_0_3
FORUM_LIKE_SECOND_RUN_EXPECTED_PAIR_SET_STABLE=NO_ACROSS_FRESH_RUNS_OR_RESEEDS;UNCHANGED_ONLY_WHEN_WHOLE_TABLE_GUARD_SKIPS
FORUM_LIKE_FIXTURE_SET_DECISION=RANDOM_SET_REQUIRES_HUMAN_DECISION
FORUM_LIKE_POLICY_RESOLVED=NO
```

`PRESERVE_EXACT_CURRENT_PAIR_SET` is unavailable because source and history do
not establish one. Human review may approve an exact fixed list, retire these
DEV fixtures, or defer. This audit does not infer pairs from a random run.

### 17.5 Dependencies, outputs, reset, and original intent

```text
FORUM_REQUIRED_USER_IDENTITIES=farmer@sandbox.com;cooperative@sandbox.com;buyer@agrilink.vn
FORUM_REQUIRED_UNIQUE_USER_EMAIL_COUNT=3
FORUM_USER_SEED_OUTPUT_SUFFICIENT=YES_USERS_DEV_USERS_AND_USER_ID_BY_EMAIL_COVER_ALL_ACTORS
FORUM_FUTURE_SEEDGROUP_SHAPE=SINGLE_OWNER_GROUP_PLAUSIBLE

FORUM_POST_DOWNSTREAM_SEED_ID_CONSUMER_COUNT=0
FORUM_COMMENT_DOWNSTREAM_SEED_ID_CONSUMER_COUNT=0
FORUM_LIKE_DOWNSTREAM_SEED_ID_CONSUMER_COUNT=0
CURRENT_FORUM_RESET_TARGETS=forum_likes;forum_comments;forum_posts

FORUM_POST_ORIGINAL_FIXTURE_INTENT=SCREENSHOT_DEMO_CONTENT
FORUM_COMMENT_ORIGINAL_FIXTURE_INTENT=SCREENSHOT_DEMO_CONTENT
FORUM_LIKE_ORIGINAL_FIXTURE_INTENT=RANDOM_SYNTHETIC_SOCIAL_ACTIVITY
```

The original declarations and randomness entered in
`becf869fb4bec1642b016c6f3ce7565cd82671c3` (`feat: add comprehensive dev
seed service for screenshots`), later merged by
`06c2846790bc1e8fa96494e36dddbb5dfbb80765` (`Feature/dev seed data (#72)`).
Forum ownership and the Like pair constraint entered in
`04331cb3e5f499575022ad193b520f9622296fdd` (`feat(forum): agricultural
knowledge forum module (#31)`). Demo usefulness is intent evidence, not an
identity grant.

No ordinary DEV source outside this owner boundary consumes a Forum-generated
ID, so no public seed output is currently required. If Posts and dependent
Comments/Likes are retained, one future Forum owner group would still require
an internal deterministic Post mapping. The existing Users output already
provides all three actors, and no User repository lookup is needed.

Conceptual dependency only:

```text
users.dev.users/user.id.by-email
  -> Forum Posts
     -> Forum Comments
     -> Forum Likes
```

### 17.6 P8-05C3B1 human decisions required

The placeholders below are choices for human review, not approved identities.
For `RETAIN`, the reviewer must replace `<approved_identity>` with a real
persisted identity policy. For Likes, an approval must enumerate exact User
email/Post-identity pairs.

```text
FORUM_POST_IDENTITY_POLICY_DECISION=APPROVE_EXISTING_BUSINESS_KEY:<field>;or APPROVE_EXISTING_COMPOSITE:<ordered_fields_and_cardinality_rule>;or ADD_DOMAIN_POST_IDENTIFIER;or RETIRE_CURRENT_DEV_FIXTURES;or DEFER
FP_01_DECISION=RETAIN_UNDER_<approved_identity>;or RETIRE;or DEFER
FP_02_DECISION=RETAIN_UNDER_<approved_identity>;or RETIRE;or DEFER
FP_03_DECISION=RETAIN_UNDER_<approved_identity>;or RETIRE;or DEFER
FP_04_DECISION=RETAIN_UNDER_<approved_identity>;or RETIRE;or DEFER
FP_05_DECISION=RETAIN_UNDER_<approved_identity>;or RETIRE;or DEFER

FORUM_COMMENT_IDENTITY_POLICY_DECISION=APPROVE_EXISTING_BUSINESS_KEY:<field>;or APPROVE_EXISTING_COMPOSITE:<ordered_fields_and_cardinality_rule>;or ADD_DOMAIN_COMMENT_IDENTIFIER;or RETIRE_CURRENT_DEV_FIXTURES;or DEFER
FC_01_DECISION=RETAIN_UNDER_<approved_identity>;or RETIRE;or DEFER
FC_02_DECISION=RETAIN_UNDER_<approved_identity>;or RETIRE;or DEFER
FC_03_DECISION=RETAIN_UNDER_<approved_identity>;or RETIRE;or DEFER
FC_04_DECISION=RETAIN_UNDER_<approved_identity>;or RETIRE;or DEFER
FC_05_DECISION=RETAIN_UNDER_<approved_identity>;or RETIRE;or DEFER
FC_06_DECISION=RETAIN_UNDER_<approved_identity>;or RETIRE;or DEFER
FC_07_DECISION=RETAIN_UNDER_<approved_identity>;or RETIRE;or DEFER

FORUM_LIKE_FIXTURE_POLICY_DECISION=APPROVE_EXACT_FIXED_PAIRS:<pairs>;or RETIRE_CURRENT_DEV_FIXTURES;or DEFER
```

### 17.7 Authorization, boundaries, and current authority

```text
P8_05C3B1_FORUM_DECISION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_05C3B_IMPLEMENTATION_STATUS=NOT_STARTED
P8_05C3B_IMPLEMENTATION_AUTHORIZED=NO
P8_05C3B_BLOCKERS=FORUM_POST_IDENTITY_POLICY_DECISION_REQUIRED;FP_01_DECISION_REQUIRED;FP_02_DECISION_REQUIRED;FP_03_DECISION_REQUIRED;FP_04_DECISION_REQUIRED;FP_05_DECISION_REQUIRED;FORUM_COMMENT_PARENT_POST_IDENTITY_UNRESOLVED;FORUM_COMMENT_IDENTITY_POLICY_DECISION_REQUIRED;FC_01_DECISION_REQUIRED;FC_02_DECISION_REQUIRED;FC_03_DECISION_REQUIRED;FC_04_DECISION_REQUIRED;FC_05_DECISION_REQUIRED;FC_06_DECISION_REQUIRED;FC_07_DECISION_REQUIRED;FORUM_LIKE_FIXTURE_POLICY_DECISION_REQUIRED

P8_05C3C_IMPLEMENTATION_AUTHORIZED=NO
P8_05C4D_CENTRAL_RETIREMENT_AUTHORIZED=NO

FORUM_BUSINESS_IMPLEMENTATION_CHANGES=0
ADS_BUSINESS_IMPLEMENTATION_CHANGES=0
CENTRAL_DEVSEEDSERVICE_RUNTIME_CHANGES=0
LEGACY_DEV_REMAINING_CHANGES=0
RUNTIME_FILES_CHANGED=0
SCHEMA_CHANGES=0
MIGRATIONS_CREATED=0

PROTECTED_LOCAL_DB_ACCESSED=NO
PRODUCTION_DB_ACCESSED=NO
DATABASE_CONNECTIONS=0
DATASOURCE_CONSTRUCTED=NO
DATASOURCE_INITIALIZE_CALLS=0
SQL=0
DDL=0
DML=0
SEEDS_EXECUTED=0
MIGRATIONS_EXECUTED=0
SYNCHRONIZE=NO
DESTRUCTIVE_RESET_EXECUTED=NO
```

## 18. P8-05C3B1 Human Review Decision Overlay

This trailing overlay is current authority. Section 17 remains the accepted
pre-decision audit, while section 16.1 records the full human rationale and
fixture-by-fixture retirement dispositions.

```text
P8_05C3B1_FORUM_DECISION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW

FORUM_POST_IDENTITY_POLICY_DECISION=RETIRE_CURRENT_DEV_FIXTURES
FORUM_POST_IDENTITIES_RESOLVED=NOT_REQUIRED_FIXTURES_RETIRED
FORUM_POST_APPROVED_RETAIN_COUNT=0
FORUM_POST_APPROVED_RETIRE_COUNT=5

FORUM_COMMENT_IDENTITY_POLICY_DECISION=RETIRE_CURRENT_DEV_FIXTURES
FORUM_COMMENT_IDENTITIES_RESOLVED=NOT_REQUIRED_FIXTURES_RETIRED
FORUM_COMMENT_PARENT_IDENTITY_RESOLVED=NOT_REQUIRED_PARENT_FIXTURES_RETIRED
FORUM_COMMENT_APPROVED_RETAIN_COUNT=0
FORUM_COMMENT_APPROVED_RETIRE_COUNT=7

FORUM_LIKE_ROW_IDENTITY=USER_ID_PLUS_POST_ID
FORUM_LIKE_ROW_IDENTITY_RESOLVED=YES
FORUM_LIKE_FIXTURE_POLICY_DECISION=RETIRE_CURRENT_DEV_FIXTURES
FORUM_LIKE_RANDOM_GENERATOR_DISPOSITION=RETIRE
FORUM_LIKE_APPROVED_FIXED_PAIR_COUNT=0
FORUM_LIKE_POLICY_RESOLVED=YES

FORUM_DEV_FIXTURE_DISPOSITION=RETIRE_FROM_ORDINARY_DEV_SEED
FORUM_NEW_OWNER_LOCAL_DEV_SEED_REQUIRED=NO
FORUM_NEW_SEEDGROUP_REQUIRED=NO
FORUM_NEW_SCALAR_OUTPUT_REQUIRED=NO
FORUM_NEW_SEED_OUTPUT_KINDS=0
FUTURE_FORUM_OWNER_SEED_DEPENDENCIES=NONE_FIXTURES_RETIRED

P8_05C3B_IMPLEMENTATION_AUTHORIZED=YES_AFTER_P8_05C3B1_PR_134_MERGE
P8_05C3B_BLOCKERS=NONE
P8_05C3B_IMPLEMENTATION_STRATEGY=RETIRE_LEGACY_FORUM_DEV_FIXTURES
P8_05C3B_IMPLEMENTATION_STATUS=NOT_STARTED

CURRENT_CENTRAL_NORMAL_WRITE_METHOD_COUNT=3
CURRENT_CENTRAL_NORMAL_WRITE_METHODS=seedForum;seedAdPackages;seedAdCampaigns
POST_C3B_CENTRAL_NORMAL_WRITE_METHOD_COUNT=2
POST_C3B_CENTRAL_NORMAL_WRITE_METHODS=seedAdPackages;seedAdCampaigns
CURRENT_CENTRAL_BUSINESS_TABLE_COUNT=5
CURRENT_CENTRAL_BUSINESS_TABLES=forum_posts;forum_comments;forum_likes;ad_packages;ad_campaigns
POST_C3B_CENTRAL_BUSINESS_TABLE_COUNT=2
POST_C3B_CENTRAL_BUSINESS_TABLES=ad_packages;ad_campaigns
CURRENT_FORUM_RESET_TARGETS=forum_likes;forum_comments;forum_posts
EXPECTED_POST_C3B_FORUM_RESET_TARGET_COUNT=0

P8_05C3C_IMPLEMENTATION_AUTHORIZED=NO
P8_05C4D_CENTRAL_RETIREMENT_AUTHORIZED=NO
RUNTIME_FILES_CHANGED=0
SCHEMA_CHANGES=0
MIGRATIONS_CREATED=0
```

## 19. P8-05C3B Forum Retirement Implementation Overlay

Merged PR #134 is the decision authority for this retirement-only slice. The
central `seedForum` writer, its five Post fixtures, seven Comment fixtures,
random Like generator, three Forum repository acquisitions, and three Forum
reset targets are removed. No replacement Forum group or output exists, and
normal Forum domain persistence remains unchanged.

The actor audit removes only `FARMER`, `BUYER`, and `COOP`, whose sole remaining
consumers were inside `seedForum`. `ADMIN` and `SUPPLIER` remain consumed by Ads.
The already-unused `ENTERPRISE`, `LOGISTICS`, and `STATE_AGENCY` aliases are
unrelated legacy debt and remain out of scope. Consequently the Users group
dependency remains: five legacy aliases are still resolved from its output,
although only two flow into the remaining Ads writer.

```text
P8_05C3B1_FORUM_DECISION_STATUS=IMPLEMENTED_BY_MERGED_PR_134
P8_05C3B_IMPLEMENTATION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_05C3B_IMPLEMENTATION_AUTHORIZED=YES
P8_05C3B_BLOCKERS=NONE
P8_05C3B_IMPLEMENTATION_STRATEGY=RETIRE_LEGACY_FORUM_DEV_FIXTURES

CENTRAL_SEED_FORUM_METHOD_EXISTS=NO
CENTRAL_FORUM_POST_REPOSITORY_ACCESS=0
CENTRAL_FORUM_COMMENT_REPOSITORY_ACCESS=0
CENTRAL_FORUM_LIKE_REPOSITORY_ACCESS=0
CENTRAL_FORUM_POST_WRITE_CALLS=0
CENTRAL_FORUM_COMMENT_WRITE_CALLS=0
CENTRAL_FORUM_LIKE_WRITE_CALLS=0
FORUM_POST_EXECUTABLE_FIXTURE_COUNT=0
FORUM_COMMENT_EXECUTABLE_FIXTURE_COUNT=0
FORUM_RANDOM_LIKE_GENERATOR_EXISTS=NO
FORUM_MATH_RANDOM_USAGE_IN_CENTRAL_SEED=0

FP_01_EXECUTABLE_FIXTURE_EXISTS=NO
FP_02_EXECUTABLE_FIXTURE_EXISTS=NO
FP_03_EXECUTABLE_FIXTURE_EXISTS=NO
FP_04_EXECUTABLE_FIXTURE_EXISTS=NO
FP_05_EXECUTABLE_FIXTURE_EXISTS=NO
FC_01_EXECUTABLE_FIXTURE_EXISTS=NO
FC_02_EXECUTABLE_FIXTURE_EXISTS=NO
FC_03_EXECUTABLE_FIXTURE_EXISTS=NO
FC_04_EXECUTABLE_FIXTURE_EXISTS=NO
FC_05_EXECUTABLE_FIXTURE_EXISTS=NO
FC_06_EXECUTABLE_FIXTURE_EXISTS=NO
FC_07_EXECUTABLE_FIXTURE_EXISTS=NO

PRE_C3B_FORUM_RESET_TARGET_COUNT=3
POST_C3B_FORUM_RESET_TARGET_COUNT=0
FORUM_POST_RESET_TARGET_EXISTS=NO
FORUM_COMMENT_RESET_TARGET_EXISTS=NO
FORUM_LIKE_RESET_TARGET_EXISTS=NO

LEGACY_ACTOR_ADMIN_POST_C3B_CONSUMER_COUNT=1
LEGACY_ACTOR_FARMER_POST_C3B_CONSUMER_COUNT=0
LEGACY_ACTOR_BUYER_POST_C3B_CONSUMER_COUNT=0
LEGACY_ACTOR_ENTERPRISE_POST_C3B_CONSUMER_COUNT=0
LEGACY_ACTOR_SUPPLIER_POST_C3B_CONSUMER_COUNT=1
LEGACY_ACTOR_LOGISTICS_POST_C3B_CONSUMER_COUNT=0
LEGACY_ACTOR_COOP_POST_C3B_CONSUMER_COUNT=0
LEGACY_ACTOR_STATE_AGENCY_POST_C3B_CONSUMER_COUNT=0
FORUM_ONLY_LEGACY_ACTOR_PLUMBING_REMOVED=YES_FARMER_BUYER_COOP
LEGACY_USERS_DEPENDENCY_POST_C3B_REQUIRED=YES
LEGACY_USERS_OUTPUT_POST_C3B_CONSUMER_COUNT=5
LEGACY_USERS_OUTPUT_POST_C3B_ADS_SCALAR_CONSUMER_COUNT=2

PRE_C3B_CENTRAL_NORMAL_WRITE_METHOD_COUNT=3
POST_C3B_CENTRAL_NORMAL_WRITE_METHOD_COUNT=2
POST_C3B_CENTRAL_NORMAL_WRITE_METHODS=seedAdPackages;seedAdCampaigns
PRE_C3B_CENTRAL_BUSINESS_TABLE_COUNT=5
POST_C3B_CENTRAL_BUSINESS_TABLE_COUNT=2
POST_C3B_CENTRAL_BUSINESS_TABLES=ad_packages;ad_campaigns

NEW_FORUM_SEEDGROUPS=0
NEW_SEEDGROUPS=0
NEW_SEED_OUTPUT_KINDS=0
CENTRAL_FORUM_POST_TABLE_WRITE_OWNERS=0
CENTRAL_FORUM_COMMENT_TABLE_WRITE_OWNERS=0
CENTRAL_FORUM_LIKE_TABLE_WRITE_OWNERS=0

FORUM_DOMAIN_RUNTIME_CHANGES=0
FORUM_SCHEMA_CHANGES=0
ADS_BUSINESS_IMPLEMENTATION_CHANGES=0
CENTRAL_DEVSEEDSERVICE_RETIRED=NO
LEGACY_DEV_REMAINING_EXISTS=YES
P8_05C3C_IMPLEMENTATION_AUTHORIZED=NO
P8_05C4D_CENTRAL_RETIREMENT_AUTHORIZED=NO
SCHEMA_CHANGES=0
MIGRATIONS_CREATED=0
```

## 20. P8-05C3C1 Ads Identity And Fixture Policy Audit

This overlay is current authority for the post-PR #135 Ads baseline.
Merged PR #135 retired the Forum DEV writer, leaving only `seedAdPackages` and
`seedAdCampaigns` in the central continuation. This audit is static: it does
not execute the service, construct a DataSource, connect to a database, change
runtime payloads, or authorize C3C implementation.

### 20.1 Owner boundary and current central inventory

`AdsModule` registers `AdPackage`, `AdCampaign`, and `AdEvent`; the Ads
repository owns normal runtime access to all three. The central continuation
still writes only Packages and Campaigns. `ad_events` is not an ordinary DEV
fixture table.

```text
P8_05C3B_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_135
CENTRAL_NORMAL_WRITE_METHOD_COUNT=2
CENTRAL_NORMAL_WRITE_METHODS=seedAdPackages;seedAdCampaigns
CENTRAL_BUSINESS_TABLE_COUNT=2
CENTRAL_BUSINESS_TABLES=ad_packages;ad_campaigns

AD_PACKAGE_SEED_OWNER=ADS
AD_CAMPAIGN_SEED_OWNER=ADS
AD_EVENT_PERSISTENCE_OWNER=ADS
```

### 20.2 Ad Package fixture inventory

The documentation labels below are audit handles only. They are not persisted
identity. The source performs one whole-table `count()` guard and, when the
table is empty, saves all three rows with database-generated serial IDs.

| Label | Name | Type | Price | Duration | Description | Active | Other persisted fields | Current identity behavior |
| --- | --- | --- | ---: | ---: | --- | --- | --- | --- |
| `AP-01` | Banner chính (Carousel) | `BANNER` | 500000 | 30 days | Hiển thị trên carousel trang chủ | true | `maxImpressions=10000`; ORM timestamps | no lookup; whole-table guard; generated serial ID |
| `AP-02` | Sản phẩm nổi bật | `FEATURED` | 300000 | 14 days | Sản phẩm được gắn nhãn nổi bật | true | `maxImpressions=5000`; ORM timestamps | no lookup; whole-table guard; generated serial ID |
| `AP-03` | Spotlight tuần | `SPOTLIGHT` | 700000 | 7 days | Hiển thị spotlight nổi bật 7 ngày | true | `maxImpressions=20000`; ORM timestamps | no lookup; whole-table guard; generated serial ID |

```text
AD_PACKAGE_FIXTURE_COUNT=3
AD_PACKAGE_WHOLE_TABLE_GUARD_COUNT=1
AD_PACKAGE_CURRENT_LOOKUP_OR_GUARD=WHOLE_TABLE_COUNT_GT_ZERO_SKIP
AD_PACKAGE_CURRENT_GENERATED_ID=DATABASE_GENERATED_SERIAL
AD_PACKAGE_GENERATED_UUID_IDENTITY_USAGE=NO_SERIAL_PRIMARY_KEY_ONLY
AD_PACKAGE_PERSISTED_BUSINESS_ID_FIELD=NONE_PROVEN
AD_PACKAGE_SCHEMA_UNIQUE_COUNT=0
AD_PACKAGE_SCHEMA_SECONDARY_INDEX_COUNT=0
```

The entity, canonical baseline migration, Ads repository, DTOs, use cases,
controllers, and history expose no `packageCode`, `code`, `slug`, `externalId`,
`publicId`, `sku`, `planCode`, `packageKey`, `referenceCode`, or equivalent.
The serial primary key is generated at insertion and is not deterministic seed
identity.

### 20.3 Package mutability and reference classification

The current Ads application lists active packages and resolves one active
package by numeric ID when a supplier creates a Campaign. Campaign approval
uses `durationDays` to calculate the end date. There is no current Package
create/update/admin mutation path. That absence does not prove domain
immutability or one-row-per-value cardinality, and none of these fields has a
schema uniqueness constraint.

```text
AD_PACKAGE_NAME_MUTABLE=NO_CURRENT_APPLICATION_UPDATE_PATH;DOMAIN_IMMUTABILITY_NOT_PROVEN
AD_PACKAGE_TYPE_MUTABLE=NO_CURRENT_APPLICATION_UPDATE_PATH;DOMAIN_IMMUTABILITY_NOT_PROVEN
AD_PACKAGE_PRICE_MUTABLE=NO_CURRENT_APPLICATION_UPDATE_PATH;DOMAIN_IMMUTABILITY_NOT_PROVEN
AD_PACKAGE_DURATION_MUTABLE=NO_CURRENT_APPLICATION_UPDATE_PATH;DOMAIN_IMMUTABILITY_NOT_PROVEN
AD_PACKAGE_ACTIVE_STATE_MUTABLE=NO_CURRENT_APPLICATION_UPDATE_PATH;DOMAIN_IMMUTABILITY_NOT_PROVEN

AD_PACKAGE_REFERENCE_DATA_EVIDENCE=PUBLIC_ACTIVE_PACKAGE_CATALOG;CAMPAIGN_CREATION_REQUIRES_ACTIVE_PACKAGE;CAMPAIGN_APPROVAL_DERIVES_END_DATE_FROM_DURATION_DAYS
AD_PACKAGE_CURRENT_CLASSIFICATION_JUSTIFIED=RECLASSIFICATION_REQUIRES_HUMAN_DECISION
AD_PACKAGE_CLASSIFICATION_RESOLVED=NO
```

The Packages behave like service-plan/configuration rows required by normal
application behavior, but Git history introduced these exact declarations as
screenshot demo content. Reference-like usefulness does not prove REFERENCE
classification, while lack of deterministic identity is not by itself a basis
for retirement.

### 20.4 Package composite identity candidates

| Candidate key | Fields | Immutable business identity | Mutable payload included | Schema unique support | Domain cardinality support | Edit behavior | Collision risk | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| package name | `name` | not proven | human-facing label | none | none | no current update path; immutability unproven | renames/localization or duplicate labels | `PLAUSIBLE_BUT_UNPROVEN` |
| package type | `adType` | no | configuration category | none | enum has three values but does not limit rows per type | no current update path | multiple plans may share a type | `REJECTED` |
| name + type | `name,adType` | not proven | label and category | none | none | no current update path; immutability unproven | duplicate/versioned plan possible | `PLAUSIBLE_BUT_UNPROVEN` |
| type + duration | `adType,durationDays` | no | duration is plan payload | none | none | no current update path | same type/duration at different price or limits | `REJECTED` |
| name + duration | `name,durationDays` | not proven | label and duration payload | none | none | no current update path; immutability unproven | renamed or versioned plan | `PLAUSIBLE_BUT_UNPROVEN` |
| name + price | `name,price` | no | price is mutable business payload | none | none | no current update path | price revisions change lookup identity | `REJECTED` |
| name + type + duration | `name,adType,durationDays` | not proven | label/category/duration payload | none | none | no current update path; immutability unproven | duplicate/versioned plans remain possible | `PLAUSIBLE_BUT_UNPROVEN` |
| complete persisted payload | every persisted non-ID field | no | price, limits, description, active state, and timestamps | none | none | operational fields can evolve | any payload change loses identity | `REJECTED` |

```text
AD_PACKAGE_IDENTITY_DECISION=IDENTITY_REMAINS_UNRESOLVED
AD_PACKAGE_IDENTITIES_RESOLVED=NO
```

### 20.5 Ad Campaign fixture inventory

All four rows use the supplier scalar. The `adminId` parameter is never read.
The Package query has no ordering or business-key predicate; parent selection
uses `packages[0]`, `packages[1]`, and `packages[2]`. The three active rows use
execution-relative dates. One whole-table `count()` guard skips the complete
Campaign set when any Campaign already exists.

| Label | Owner actor | Package parent expression | Title | Image URL | Status | Start / end | Target / placement | Other persisted fields | Current identity behavior |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `AC-01` | `supplier@agrilink.vn` | `packages[0]` | Nông sản sạch Đà Lạt | `https://images.unsplash.com/photo-1558350319-de0b7d50a49e?w=1200&q=80` | `ACTIVE` | execution time -5 / +25 days | `targetProvinces=[]`; package placement unresolved | `linkUrl=https://agrilink.vn/products`; impressions 4500; clicks 230; moderation fields null; ORM timestamps | no lookup; whole-table guard; generated UUID |
| `AC-02` | `supplier@agrilink.vn` | `packages[1]` | Đặc sản vùng miền — Khuyến mãi tháng 7 | `https://images.unsplash.com/photo-1595855759920-86582396756a?w=800&q=80` | `ACTIVE` | execution time -5 / +25 days | `targetProvinces=[]`; package placement unresolved | `linkUrl=null`; impressions 2100; clicks 98; moderation fields null; ORM timestamps | no lookup; whole-table guard; generated UUID |
| `AC-03` | `supplier@agrilink.vn` | `packages[2]` | Sầu riêng Ri6 chính vụ | `https://images.unsplash.com/photo-1547514701-42782101795e?w=800&q=80` | `ACTIVE` | execution time -5 / +25 days | `targetProvinces=[]`; package placement unresolved | `linkUrl=null`; impressions 7800; clicks 420; moderation fields null; ORM timestamps | no lookup; whole-table guard; generated UUID |
| `AC-04` | `supplier@agrilink.vn` | `packages[0]` | Phân bón hữu cơ — Giảm 15% | `https://images.unsplash.com/photo-1585314062340-f1a5a7c9328d?w=1200&q=80` | `PENDING_APPROVAL` | null / null | `targetProvinces=[]`; package placement unresolved | `linkUrl=null`; impressions 0; clicks 0; moderation fields null; ORM timestamps | no lookup; whole-table guard; generated UUID |

```text
AD_CAMPAIGN_FIXTURE_COUNT=4
AD_CAMPAIGN_WHOLE_TABLE_GUARD_COUNT=1
AD_CAMPAIGN_CURRENT_LOOKUP_OR_GUARD=WHOLE_TABLE_COUNT_GT_ZERO_SKIP
AD_CAMPAIGN_CURRENT_GENERATED_ID=DATABASE_GENERATED_UUID
AD_CAMPAIGN_GENERATED_UUID_IDENTITY_USAGE=YES_GENERATED_ONLY_NOT_DETERMINISTIC
AD_CAMPAIGN_PERSISTED_BUSINESS_ID_FIELD=NONE_PROVEN
AD_CAMPAIGN_SCHEMA_UNIQUE_COUNT=0
AD_CAMPAIGN_SCHEMA_SECONDARY_INDEX_COUNT=0
```

No `campaignCode`, `code`, `slug`, `externalId`, `publicId`, `referenceCode`,
`campaignKey`, or equivalent is present. Current runtime creates Campaigns with
generated UUIDs, changes status through pause/resume/moderation, and changes
approval dates and derived start/end dates during moderation. Title, image,
and dates are payload, not source-proven identity.

### 20.6 Campaign composite identity and Package parent consequence

| Candidate key | Fields | Immutable business identity | Mutable payload included | Schema unique support | Domain cardinality support | Edit behavior | Collision risk | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| owner + title | `supplierId,title` | no | title is mutable business payload absent contrary domain proof | none | none | no current title update path, which does not prove immutability | repeated campaign title per supplier | `REJECTED` |
| owner + package + title | `supplierId,packageId,title` | no | mutable title; unresolved generated parent ID | none | none | no current title/package update path, which does not prove immutability | repeated/versioned campaign; parent unstable | `REJECTED` |
| owner + package + start | `supplierId,packageId,startDate` | no | mutable/relative date; unresolved parent | none | none | moderation writes start date | same-day campaigns collide | `REJECTED` |
| owner + title + start | `supplierId,title,startDate` | no | title and mutable/relative date | none | none | moderation writes start date | repeated titles/dates collide | `REJECTED` |
| package + title | `packageId,title` | no | mutable title; unresolved generated parent ID | none | none | no current title/package update path, which does not prove immutability | suppliers may reuse titles | `REJECTED` |
| owner + package + status | `supplierId,packageId,status` | no | status is mutable lifecycle payload | none | none | pause/resume/moderation update status | many campaigns collide | `REJECTED` |
| complete persisted payload | every persisted non-ID field | no | status, dates, counters, URLs, moderation, timestamps | none | none | runtime changes lifecycle and counters | any operational update loses identity | `REJECTED` |

```text
AD_CAMPAIGN_PACKAGE_FIELD=packageId
AD_CAMPAIGN_PACKAGE_RELATION_KIND=TYPEORM_MANY_TO_ONE_PLUS_DATABASE_FOREIGN_KEY_ON_DELETE_RESTRICT
AD_CAMPAIGN_PARENT_PACKAGE_ID_REQUIRED=YES
AD_CAMPAIGN_PARENT_PACKAGE_IDENTITY_RESOLVED=NO
AD_CAMPAIGN_PARENT_IDENTITY_RESOLVED=NO
AD_CAMPAIGN_IDENTITY_DECISION=IDENTITY_REMAINS_UNRESOLVED
AD_CAMPAIGN_IDENTITIES_RESOLVED=NO
```

The source-position pattern suggests the conceptual labels
`AC-01 -> AP-01`, `AC-02 -> AP-02`, `AC-03 -> AP-03`, and `AC-04 -> AP-01`,
but `.find()` supplies no order guarantee and the numeric IDs are generated.
Those mappings are candidates for human approval only; they are not current
deterministic identity.

### 20.7 User actors and remaining aliases

`legacy.dev.remaining` resolves five aliases from `users.dev.users` through
`user.id.by-email`. Only the supplier ID is read into a persisted Ads field.
`ADMIN` is passed to `seedAdCampaigns` but its parameter is unused, so it has
one dead argument pass and zero executable consumers. No Users repository is
used.

| Alias | Email | Executable Ads consumers | Classification | Evidence |
| --- | --- | ---: | --- | --- |
| `ADMIN` | `admin@agrilink.vn` | 0 | `UNRELATED_LEGACY_DEBT` | one positional argument pass; `adminId` is never read |
| `SUPPLIER` | `supplier@agrilink.vn` | 1 | `ADS_REQUIRED` | persisted as every fixture's `supplierId` |
| `ENTERPRISE` | `enterprise@agrilink.vn` | 0 | `UNRELATED_LEGACY_DEBT` | no remaining consumer |
| `LOGISTICS` | `logistics@agrilink.vn` | 0 | `UNRELATED_LEGACY_DEBT` | no remaining consumer |
| `STATE_AGENCY` | `state_agency@sandbox.com` | 0 | `UNRELATED_LEGACY_DEBT` | no remaining consumer |

```text
ADS_REQUIRED_USER_IDENTITIES=supplier@agrilink.vn
ADS_REQUIRED_UNIQUE_USER_EMAIL_COUNT=1
ADS_USER_SEED_OUTPUT_SUFFICIENT=YES_USERS_DEV_USERS_AND_USER_ID_BY_EMAIL
LEGACY_ACTOR_ADMIN_CURRENT_CONSUMER_COUNT=0
LEGACY_ACTOR_ADMIN_CURRENT_ARGUMENT_PASS_COUNT=1
LEGACY_ACTOR_ADMIN_CLASSIFICATION=UNRELATED_LEGACY_DEBT
LEGACY_ACTOR_SUPPLIER_CURRENT_CONSUMER_COUNT=1
LEGACY_ACTOR_SUPPLIER_CLASSIFICATION=ADS_REQUIRED
LEGACY_ACTOR_ENTERPRISE_CURRENT_CONSUMER_COUNT=0
LEGACY_ACTOR_ENTERPRISE_CLASSIFICATION=UNRELATED_LEGACY_DEBT
LEGACY_ACTOR_LOGISTICS_CURRENT_CONSUMER_COUNT=0
LEGACY_ACTOR_LOGISTICS_CLASSIFICATION=UNRELATED_LEGACY_DEBT
LEGACY_ACTOR_STATE_AGENCY_CURRENT_CONSUMER_COUNT=0
LEGACY_ACTOR_STATE_AGENCY_CLASSIFICATION=UNRELATED_LEGACY_DEBT
```

### 20.8 `ad_events` classification

There is no `ad_events` insert in any ordinary DEV group or in the isolated
clean-v2 test fixture. The canonical migration creates its schema and FK but
does not backfill data. Normal application event tracking has one repository
write source, `TypeOrmAdsRepository.recordEvent`. Because Phase 8 `resetAll`
still deletes the table despite there being no ordinary DEV writer, the
Phase 8 classification is reset-only legacy debt; this does not deny its
separate normal runtime ownership.

```text
AD_EVENTS_NORMAL_DEV_WRITE_SOURCE_COUNT=0
AD_EVENTS_CURRENT_NORMAL_DEV_WRITER=NONE
AD_EVENTS_RESET_TARGET_EXISTS=YES
AD_EVENTS_MIGRATION_OR_BACKFILL_SOURCE_COUNT=0
AD_EVENTS_RUNTIME_WRITE_SOURCE_COUNT=1
AD_EVENTS_PHASE8_CLASSIFICATION=RESET_ONLY_LEGACY_DEBT
```

### 20.9 History, downstream consumers, future shape, and reset debt

Both fixture sets were introduced together by
`becf869fb4bec1642b016c6f3ce7565cd82671c3` (`feat: add comprehensive dev
seed service for screenshots`) and merged by
`06c2846790bc1e8fa96494e36dddbb5dfbb80765` (`Feature/dev seed data (#72)`).
No later history establishes business IDs or canonical reference status.

```text
AD_PACKAGE_ORIGINAL_FIXTURE_INTENT=SCREENSHOT_DEMO_CONTENT
AD_CAMPAIGN_ORIGINAL_FIXTURE_INTENT=SCREENSHOT_DEMO_CONTENT

AD_PACKAGE_DOWNSTREAM_SEED_ID_CONSUMER_COUNT=0
AD_CAMPAIGN_DOWNSTREAM_SEED_ID_CONSUMER_COUNT=0
AD_EVENT_DOWNSTREAM_SEED_ID_CONSUMER_COUNT=0
AD_PACKAGE_INTERNAL_CAMPAIGN_PARENT_CONSUMER_COUNT=1

ADS_FUTURE_SEEDGROUP_SHAPE=UNRESOLVED;SINGLE_OWNER_GROUP_PLAUSIBLE_IF_FIXTURES_RETAINED
CURRENT_ADS_RESET_TARGETS=ad_campaigns;ad_packages;ad_events
NORMAL_WRITER_RESET_TARGETS=ad_campaigns;ad_packages
RESET_ONLY_DEBT_TARGETS=ad_events
```

The downstream counts exclude the internal Package-to-Campaign dependency.
The isolated `clean-v2-runtime-baseline` test fixture is not an ordinary DEV
seed consumer or a public owner output. If retained, a single Ads-owned group
could depend on `users.dev.users` and build Packages before Campaigns, but the
classification and identity decisions must come first.

### 20.10 P8-05C3C1 human decisions required

These choices are intentionally unselected. An approved retained identity
must name a real persisted field/composite and its domain cardinality, or add a
new domain identifier in a later authorized schema slice. Audit labels and
generated IDs are not acceptable answers.

```text
AD_PACKAGE_CLASSIFICATION_DECISION=KEEP_DEV;or RECLASSIFY_AS_REFERENCE;or RETIRE_CURRENT_DEV_FIXTURES;or DEFER
AD_PACKAGE_IDENTITY_POLICY_DECISION=APPROVE_EXISTING_COMPOSITE:<ordered_fields_and_cardinality_rule>;or ADD_DOMAIN_PACKAGE_IDENTIFIER;or RETIRE_CURRENT_DEV_FIXTURES;or DEFER
AP_01_DECISION=RETAIN_UNDER_<approved_identity>;or RETIRE;or DEFER
AP_02_DECISION=RETAIN_UNDER_<approved_identity>;or RETIRE;or DEFER
AP_03_DECISION=RETAIN_UNDER_<approved_identity>;or RETIRE;or DEFER

AD_CAMPAIGN_IDENTITY_POLICY_DECISION=APPROVE_EXISTING_COMPOSITE:<ordered_fields_and_cardinality_rule>;or ADD_DOMAIN_CAMPAIGN_IDENTIFIER;or RETIRE_CURRENT_DEV_FIXTURES;or DEFER
AD_CAMPAIGN_PACKAGE_PARENT_MAPPING_DECISION=APPROVE_AC_01_TO_AP_01_AC_02_TO_AP_02_AC_03_TO_AP_03_AC_04_TO_AP_01_UNDER_APPROVED_PACKAGE_IDENTITIES;or RETIRE_CAMPAIGNS;or DEFER
AC_01_DECISION=RETAIN_UNDER_<approved_identity_and_parent>;or RETIRE;or DEFER
AC_02_DECISION=RETAIN_UNDER_<approved_identity_and_parent>;or RETIRE;or DEFER
AC_03_DECISION=RETAIN_UNDER_<approved_identity_and_parent>;or RETIRE;or DEFER
AC_04_DECISION=RETAIN_UNDER_<approved_identity_and_parent>;or RETIRE;or DEFER
```

### 20.11 Authorization, future C4D consequence, and boundaries

```text
AD_PACKAGE_IDENTITY_DECISION=IDENTITY_REMAINS_UNRESOLVED
AD_CAMPAIGN_IDENTITY_DECISION=IDENTITY_REMAINS_UNRESOLVED
AD_PACKAGE_IDENTITIES_RESOLVED=NO
AD_CAMPAIGN_IDENTITIES_RESOLVED=NO
AD_CAMPAIGN_PARENT_IDENTITY_RESOLVED=NO
AD_PACKAGE_CLASSIFICATION_RESOLVED=NO

P8_05C3C1_ADS_DECISION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_05C3C_IMPLEMENTATION_STATUS=NOT_STARTED
P8_05C3C_IMPLEMENTATION_AUTHORIZED=NO
P8_05C3C_BLOCKERS=AD_PACKAGE_CLASSIFICATION_DECISION_REQUIRED;AD_PACKAGE_IDENTITY_POLICY_DECISION_REQUIRED;AP_01_DECISION_REQUIRED;AP_02_DECISION_REQUIRED;AP_03_DECISION_REQUIRED;AD_CAMPAIGN_IDENTITY_POLICY_DECISION_REQUIRED;AD_CAMPAIGN_PACKAGE_PARENT_IDENTITY_UNRESOLVED;AD_CAMPAIGN_PACKAGE_PARENT_MAPPING_DECISION_REQUIRED;AC_01_DECISION_REQUIRED;AC_02_DECISION_REQUIRED;AC_03_DECISION_REQUIRED;AC_04_DECISION_REQUIRED

EXPECTED_POST_C3C_CENTRAL_NORMAL_WRITE_METHOD_COUNT=0
P8_05C4D_CENTRAL_RETIREMENT_AUTHORIZED=NO

ADS_BUSINESS_IMPLEMENTATION_CHANGES=0
CENTRAL_DEVSEEDSERVICE_RUNTIME_CHANGES=0
LEGACY_DEV_REMAINING_CHANGES=0
RUNTIME_FILES_CHANGED=0
SCHEMA_CHANGES=0
MIGRATIONS_CREATED=0

PROTECTED_LOCAL_DB_ACCESSED=NO
PRODUCTION_DB_ACCESSED=NO
DATABASE_CONNECTIONS=0
DATASOURCE_CONSTRUCTED=NO
DATASOURCE_INITIALIZE_CALLS=0
SQL=0
DDL=0
DML=0
SEEDS_EXECUTED=0
MIGRATIONS_EXECUTED=0
SYNCHRONIZE=NO
DESTRUCTIVE_RESET_EXECUTED=NO
```

The expected zero-method state is a future consequence only if both Ads
writers are later migrated or retired under approved decisions. C4D must then
separately evaluate `DevSeedService`, `legacy.dev.remaining`, `resetAll`, the
residual `ad_events` reset target, unused actor aliases, and the remaining
Users output dependency. None of those changes is authorized here.

## 21. P8-05C3C1 Human Review Decision Overlay

Human review accepts the complete section 20 audit without rewriting its
historical findings. The exact Package declarations originated as screenshot
demo content, while current application contracts now consume active Packages
as configuration. Human review therefore approves a future reclassification
to REFERENCE, retains all three Package concepts pending a real domain
identifier, and rejects retirement without replacement.

The four Campaign declarations remain screenshot demo fixtures with generated
UUIDs, mutable or execution-relative lifecycle payload, positional Package
parents, and no downstream ordinary DEV seed consumers. Human review retires
all four instead of inventing Campaign identity. This is a documentation
decision only; neither retirement nor Package migration is implemented here.

### 21.1 Accepted audit evidence

```text
AD_PACKAGE_FIXTURE_COUNT=3
AD_PACKAGE_PERSISTED_BUSINESS_ID_FIELD=NONE_PROVEN
AD_PACKAGE_SCHEMA_UNIQUE_COUNT=0
AD_PACKAGE_SCHEMA_SECONDARY_INDEX_COUNT=0
AD_PACKAGE_REFERENCE_DATA_EVIDENCE=PUBLIC_ACTIVE_PACKAGE_CATALOG;CAMPAIGN_CREATION_REQUIRES_ACTIVE_PACKAGE;CAMPAIGN_APPROVAL_DERIVES_END_DATE_FROM_DURATION_DAYS

AD_CAMPAIGN_FIXTURE_COUNT=4
AD_CAMPAIGN_PERSISTED_BUSINESS_ID_FIELD=NONE_PROVEN
AD_CAMPAIGN_PACKAGE_FIELD=packageId
AD_CAMPAIGN_PACKAGE_RELATION_KIND=TYPEORM_MANY_TO_ONE_PLUS_DATABASE_FOREIGN_KEY_ON_DELETE_RESTRICT
AD_CAMPAIGN_PARENT_PACKAGE_ID_REQUIRED=YES

AD_EVENTS_NORMAL_DEV_WRITE_SOURCE_COUNT=0
AD_EVENTS_RUNTIME_WRITE_SOURCE_COUNT=1
AD_EVENTS_PHASE8_CLASSIFICATION=RESET_ONLY_LEGACY_DEBT
```

The accepted audit continues to state
`AD_PACKAGE_IDENTITY_DECISION=IDENTITY_REMAINS_UNRESOLVED` and
`AD_CAMPAIGN_IDENTITY_DECISION=IDENTITY_REMAINS_UNRESOLVED` as the
pre-decision evidence. The following decisions are the trailing current
authority.

### 21.2 Package classification and identity policy

```text
AD_PACKAGE_CLASSIFICATION_DECISION=RECLASSIFY_AS_REFERENCE
AD_PACKAGE_CURRENT_CLASSIFICATION_DECISION=DEV_CLASSIFICATION_TO_BE_RETIRED_AFTER_REFERENCE_MIGRATION
AD_PACKAGE_REFERENCE_CLASSIFICATION_APPROVED=YES
AD_PACKAGE_RETIRE_WITHOUT_REPLACEMENT_AUTHORIZED=NO

AD_PACKAGE_IDENTITY_POLICY_DECISION=ADD_DOMAIN_PACKAGE_IDENTIFIER
AD_PACKAGE_EXISTING_COMPOSITE_IDENTITY_APPROVED=NO
AD_PACKAGE_SYNTHETIC_SEED_IDENTITY_APPROVED=NO
AD_PACKAGE_SERIAL_PRIMARY_KEY_AS_SEED_IDENTITY_APPROVED=NO
AD_PACKAGE_SEED_ONLY_KEY_APPROVED=NO
AD_PACKAGE_IDENTITIES_RESOLVED=PENDING_DOMAIN_PACKAGE_IDENTIFIER_DECISION

AD_PACKAGE_IDENTIFIER_FIELD_NAME_DECISION=REQUIRED
AD_PACKAGE_IDENTIFIER_ASSIGNMENT_AUTHORITY_DECISION=REQUIRED
AD_PACKAGE_IDENTIFIER_IMMUTABILITY_DECISION=REQUIRED
AD_PACKAGE_IDENTIFIER_UNIQUENESS_SCOPE_DECISION=REQUIRED
AP_01_REFERENCE_IDENTIFIER_VALUE_REQUIRED=YES
AP_02_REFERENCE_IDENTIFIER_VALUE_REQUIRED=YES
AP_03_REFERENCE_IDENTIFIER_VALUE_REQUIRED=YES
```

No identifier name or value is approved. In particular, `code`,
`packageCode`, `slug`, `adType`, generated serial IDs, and seed-only keys are
not silently promoted to domain identity. A later human-authorized decision
and schema slice must establish the field, assignment authority,
immutability, uniqueness scope, and exact retained values.

### 21.3 Retained Package concepts and content authority

| Fixture | Decision | Name | Type | Price | Duration | Description | Active | Maximum impressions |
| --- | --- | --- | --- | ---: | ---: | --- | --- | ---: |
| `AP-01` | `RETAIN_PENDING_APPROVED_REFERENCE_IDENTITY` | Banner chính (Carousel) | `BANNER` | 500000 | 30 days | Hiển thị trên carousel trang chủ | true | 10000 |
| `AP-02` | `RETAIN_PENDING_APPROVED_REFERENCE_IDENTITY` | Sản phẩm nổi bật | `FEATURED` | 300000 | 14 days | Sản phẩm được gắn nhãn nổi bật | true | 5000 |
| `AP-03` | `RETAIN_PENDING_APPROVED_REFERENCE_IDENTITY` | Spotlight tuần | `SPOTLIGHT` | 700000 | 7 days | Hiển thị spotlight nổi bật 7 ngày | true | 20000 |

```text
AP_01_DECISION=RETAIN_PENDING_APPROVED_REFERENCE_IDENTITY
AP_02_DECISION=RETAIN_PENDING_APPROVED_REFERENCE_IDENTITY
AP_03_DECISION=RETAIN_PENDING_APPROVED_REFERENCE_IDENTITY
AD_PACKAGE_APPROVED_RETAIN_COUNT=3
AD_PACKAGE_APPROVED_RETIRE_COUNT=0
AD_PACKAGE_DEV_FIXTURE_DISPOSITION=MIGRATE_TO_REFERENCE_AFTER_DOMAIN_IDENTITY_APPROVAL
```

These exact payload values are approved for preservation during the upcoming
identity/design decision. Retention does not make name, type, price, duration,
description, active state, or maximum impressions immutable identity.

### 21.4 Campaign retirement decision

```text
AD_CAMPAIGN_IDENTITY_POLICY_DECISION=RETIRE_CURRENT_DEV_FIXTURES
AD_CAMPAIGN_NEW_DOMAIN_IDENTIFIER_AUTHORIZED=NO
AD_CAMPAIGN_EXISTING_COMPOSITE_IDENTITY_APPROVED=NO
AD_CAMPAIGN_SYNTHETIC_IDENTITY_APPROVED=NO
AD_CAMPAIGN_SEED_ONLY_KEY_APPROVED=NO

AC_01_DECISION=RETIRE
AC_01_DEV_FIXTURE_DISPOSITION=RETIRE_FROM_ORDINARY_DEV_SEED
AC_01_REASON=SCREENSHOT_DEMO_CAMPAIGN_HAS_NO_PROVEN_DETERMINISTIC_BUSINESS_IDENTITY_AND_USES_EXECUTION_RELATIVE_OR_MUTABLE_LIFECYCLE_PAYLOAD
AC_02_DECISION=RETIRE
AC_02_DEV_FIXTURE_DISPOSITION=RETIRE_FROM_ORDINARY_DEV_SEED
AC_02_REASON=SCREENSHOT_DEMO_CAMPAIGN_HAS_NO_PROVEN_DETERMINISTIC_BUSINESS_IDENTITY_AND_USES_EXECUTION_RELATIVE_OR_MUTABLE_LIFECYCLE_PAYLOAD
AC_03_DECISION=RETIRE
AC_03_DEV_FIXTURE_DISPOSITION=RETIRE_FROM_ORDINARY_DEV_SEED
AC_03_REASON=SCREENSHOT_DEMO_CAMPAIGN_HAS_NO_PROVEN_DETERMINISTIC_BUSINESS_IDENTITY_AND_USES_EXECUTION_RELATIVE_OR_MUTABLE_LIFECYCLE_PAYLOAD
AC_04_DECISION=RETIRE
AC_04_DEV_FIXTURE_DISPOSITION=RETIRE_FROM_ORDINARY_DEV_SEED
AC_04_REASON=SCREENSHOT_DEMO_CAMPAIGN_HAS_NO_PROVEN_DETERMINISTIC_BUSINESS_IDENTITY_AND_USES_EXECUTION_RELATIVE_OR_MUTABLE_LIFECYCLE_PAYLOAD

AD_CAMPAIGN_APPROVED_RETAIN_COUNT=0
AD_CAMPAIGN_APPROVED_RETIRE_COUNT=4
AD_CAMPAIGN_IDENTITIES_RESOLVED=NOT_REQUIRED_FIXTURES_RETIRED
AD_CAMPAIGN_RETIREMENT_DECISION_RESOLVED=YES
```

### 21.5 Campaign parent and actor consequences

Because no Campaign fixture is retained, no canonical Package parent mapping
is approved or required. The `AC-01 -> AP-01`, `AC-02 -> AP-02`,
`AC-03 -> AP-03`, and `AC-04 -> AP-01` relationships remain historical
positional evidence only.

```text
AD_CAMPAIGN_PACKAGE_PARENT_MAPPING_DECISION=NOT_REQUIRED_CAMPAIGN_FIXTURES_RETIRED
AD_CAMPAIGN_PARENT_PACKAGE_IDENTITY_RESOLVED=NOT_REQUIRED_CAMPAIGN_FIXTURES_RETIRED
AD_CAMPAIGN_PARENT_IDENTITY_RESOLVED=NOT_REQUIRED_CAMPAIGN_FIXTURES_RETIRED

ADS_REQUIRED_USER_IDENTITIES=supplier@agrilink.vn
LEGACY_ACTOR_SUPPLIER_CURRENT_CONSUMER_COUNT=1
ADS_CAMPAIGN_USER_DEPENDENCY_REQUIRED=NO
```

The current supplier dependency remains executable until a later authorized
Campaign retirement is implemented. `ADMIN`, `ENTERPRISE`, `LOGISTICS`, and
`STATE_AGENCY` remain unrelated legacy debt, and no alias or Users dependency
is removed by this documentation change.

### 21.6 Ad Events and next decision slice

```text
AD_EVENTS_NORMAL_DEV_WRITE_SOURCE_COUNT=0
AD_EVENTS_CURRENT_NORMAL_DEV_WRITER=NONE
AD_EVENTS_RUNTIME_WRITE_SOURCE_COUNT=1
AD_EVENTS_RESET_TARGET_EXISTS=YES
AD_EVENTS_PHASE8_CLASSIFICATION=RESET_ONLY_LEGACY_DEBT
AD_EVENT_SEEDGROUP_REQUIRED=NO
AD_EVENT_FIXTURE_MIGRATION_REQUIRED=NO

NEXT_DECISION_SLICE=P8_05C3C2_AD_PACKAGE_REFERENCE_IDENTITY_DECISION
```

P8-05C3C2 must decide the exact persisted Package identifier, prove why it is
domain/configuration identity instead of seed metadata, define assignment
authority, immutability, and uniqueness scope, assign exact AP-01/AP-02/AP-03
values, determine schema/migration impact, design the owner-local REFERENCE
group, and decide whether generated numeric IDs remain internal primary keys.
This PR performs none of that work.

The conceptual future architecture, conditional on C3C2 approval, is:

```text
ads.reference.packages
CLASSIFICATION=REFERENCE
CAMPAIGN_DEV_FIXTURES=NONE
POTENTIAL_POST_C3C_CENTRAL_NORMAL_WRITE_METHOD_COUNT=0
```

### 21.7 Authorization and boundaries

Campaign retirement is resolved as a decision, but partial runtime work is not
authorized. Package REFERENCE migration remains blocked on the full domain
identifier decision.

```text
P8_05C3C1_ADS_HUMAN_REVIEW_STATUS=FINALIZED_PENDING_HUMAN_MERGE
AD_CAMPAIGN_RETIREMENT_DECISION_RESOLVED=YES
AD_PACKAGE_REFERENCE_MIGRATION_DECISION_RESOLVED=NO

P8_05C3C_IMPLEMENTATION_AUTHORIZED=NO
P8_05C3C_BLOCKERS=AD_PACKAGE_DOMAIN_IDENTIFIER_DECISION_REQUIRED;AD_PACKAGE_IDENTIFIER_ASSIGNMENT_AUTHORITY_DECISION_REQUIRED;AD_PACKAGE_IDENTIFIER_IMMUTABILITY_DECISION_REQUIRED;AD_PACKAGE_IDENTIFIER_UNIQUENESS_SCOPE_DECISION_REQUIRED;AP_01_REFERENCE_IDENTIFIER_VALUE_REQUIRED;AP_02_REFERENCE_IDENTIFIER_VALUE_REQUIRED;AP_03_REFERENCE_IDENTIFIER_VALUE_REQUIRED

P8_05C4D_CENTRAL_RETIREMENT_AUTHORIZED=NO
P8_05C4D_BLOCKERS=P8_05C3C2_PACKAGE_REFERENCE_IDENTITY_NOT_RESOLVED;PACKAGE_OWNER_MIGRATION_NOT_IMPLEMENTED;CAMPAIGN_RETIREMENT_NOT_IMPLEMENTED;CENTRAL_NORMAL_WRITERS_NOT_ZERO;AD_EVENTS_RESET_ONLY_DEBT_NOT_HANDLED;LEGACY_ALIAS_AND_USERS_DEPENDENCY_REEVALUATION_NOT_COMPLETE

RUNTIME_FILES_CHANGED=0
ADS_BUSINESS_IMPLEMENTATION_CHANGES=0
CENTRAL_DEVSEEDSERVICE_RUNTIME_CHANGES=0
LEGACY_DEV_REMAINING_CHANGES=0
SCHEMA_CHANGES=0
MIGRATIONS_CREATED=0
NEW_SEEDGROUPS=0

PROTECTED_LOCAL_DB_ACCESSED=NO
PRODUCTION_DB_ACCESSED=NO
DATABASE_CONNECTIONS=0
DATASOURCE_CONSTRUCTED=NO
DATASOURCE_INITIALIZE_CALLS=0
SQL=0
DDL=0
DML=0
SEEDS_EXECUTED=0
MIGRATIONS_EXECUTED=0
SYNCHRONIZE=NO
DESTRUCTIVE_RESET_EXECUTED=NO
```

## 22. P8-05C3C2 Ad Package Reference Identity Decision

Merged PR #136 is the accepted C3C1 authority. Its audit and human decisions
remain historical evidence: the three Package concepts are retained for
future REFERENCE migration, all four Campaign DEV fixtures are approved for
retirement, and `ad_events` remains reset-only Phase 8 debt. This C3C2 slice
defines a complete Package identifier recommendation for human review without
changing runtime code, schema, migrations, seeds, reset behavior, or Campaign
fixtures.

### 22.1 Merged handoff and current authority

```text
P8_05C3C1_ADS_HUMAN_REVIEW_STATUS=FINALIZED_BY_MERGED_PR_136
P8_05C3C1_ADS_DECISION_STATUS=IMPLEMENTED_BY_MERGED_PR_136
AD_PACKAGE_CLASSIFICATION_DECISION=RECLASSIFY_AS_REFERENCE
AD_PACKAGE_REFERENCE_CLASSIFICATION_APPROVED=YES
AD_PACKAGE_IDENTITY_POLICY_DECISION=ADD_DOMAIN_PACKAGE_IDENTIFIER
AD_PACKAGE_IDENTITIES_RESOLVED=PENDING_DOMAIN_PACKAGE_IDENTIFIER_DECISION
AD_PACKAGE_APPROVED_RETAIN_COUNT=3
AD_PACKAGE_APPROVED_RETIRE_COUNT=0
AD_CAMPAIGN_RETIREMENT_DECISION_RESOLVED=YES
AD_EVENTS_PHASE8_CLASSIFICATION=RESET_ONLY_LEGACY_DEBT
P8_05C3C_IMPLEMENTATION_AUTHORIZED=NO
P8_05C4D_CENTRAL_RETIREMENT_AUTHORIZED=NO
```

### 22.2 Current numeric primary-key role

`AdPackage.id` is a database-generated PostgreSQL `SERIAL` integer primary
key. Current production contracts consume it in six distinct roles; repository
implementation statements and tests that merely implement or mirror these
contracts are not counted again.

| Runtime contract role | Source evidence |
| --- | --- |
| Package catalog/read identity | `AdPackageModel.id` |
| Campaign create transport | `CreateAdCampaignDto.packageId` |
| Campaign create application input | `CreateAdCampaignInput.packageId` |
| Active-Package validation lookup | `AdsRepositoryPort.findActivePackageById(number)` |
| Campaign persisted parent FK | `AdCampaign.packageId` |
| Campaign read identity | `AdCampaignModel.packageId` |

```text
AD_PACKAGE_PRIMARY_KEY_FIELD=id
AD_PACKAGE_PRIMARY_KEY_TYPE=INTEGER
AD_PACKAGE_PRIMARY_KEY_GENERATION=DATABASE_GENERATED_POSTGRESQL_SERIAL
AD_PACKAGE_NUMERIC_ID_RUNTIME_CONSUMER_COUNT=6
AD_PACKAGE_NUMERIC_ID_ROLE=INTERNAL_SURROGATE_PRIMARY_KEY_WITH_EXISTING_PUBLIC_NUMERIC_REFERENCE
AD_PACKAGE_NUMERIC_PRIMARY_KEY_DECISION=RETAIN_INTERNAL_SURROGATE_PRIMARY_KEY
```

The numeric key remains the relational identity and current API/FK reference.
It is not deterministic REFERENCE seed identity and does not need replacement.

### 22.3 Identifier field-name candidates

Repository convention favors aggregate-specific business code names:
`orderCode`/`order_code` and `contractCode`/`contract_code` are globally unique
business identifiers. Geography REFERENCE reconciliation uses `code`, while
Product Category REFERENCE reconciliation uses `slug`. Ads consistently calls
the concept Package in `/ads/packages`, `AdPackage`, and `packageId`; neither
current source nor history uses Plan terminology.

| Candidate | Semantic fit | Public API fit | Domain vocabulary fit | Repository convention fit | Collision with existing fields | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| `packageCode` | explicit immutable Package catalog code | clear read-only field beside numeric `id` | exact current Package vocabulary | matches aggregate-specific `orderCode` and `contractCode` | none | `PREFERRED` |
| `code` | valid catalog code | understandable but generic in nested models/logs | acceptable | Geography uses a generic reference `code` | none | `ACCEPTABLE` |
| `planCode` | could identify a billing/service plan | clear if the API used Plan vocabulary | current Ads contracts never call Packages plans | aggregate-specific code shape fits, noun does not | none | `REJECTED` |
| `packageKey` | could identify configuration | risks looking like framework/seed metadata | `key` is not current Ads business vocabulary | `key` is used for System Config and technical operation identities | none | `REJECTED` |
| `slug` | suitable for URL/display routing | would imply public URL lookup | Packages have no slug route and names are localized | Category/Province slugs serve human-readable resources | none | `REJECTED` |

```text
AD_PACKAGE_IDENTIFIER_FIELD_NAME_DECISION=packageCode
PROPOSED_IDENTIFIER_COLUMN=package_code
```

No prior Git history establishes a Package/Plan code, key, or slug. The field
name is therefore a design recommendation grounded in current vocabulary and
repository convention, not a recovered legacy contract.

### 22.4 Identifier semantics and design policy

```text
AD_PACKAGE_IDENTIFIER_SEMANTICS=IMMUTABLE_ADVERTISING_PACKAGE_REFERENCE_CATALOG_CODE
AD_PACKAGE_IDENTIFIER_IS_DOMAIN_OR_CONFIGURATION_IDENTITY=YES
AD_PACKAGE_IDENTIFIER_ASSIGNMENT_AUTHORITY=SYSTEM_DEFINED_REFERENCE_CATALOG
AD_PACKAGE_IDENTIFIER_ASSIGNMENT_AUTHORITY_DECISION=SYSTEM_DEFINED_REFERENCE_CATALOG
AD_PACKAGE_IDENTIFIER_IMMUTABILITY=IMMUTABLE_AFTER_CREATION
AD_PACKAGE_IDENTIFIER_IMMUTABILITY_DECISION=IMMUTABLE_AFTER_CREATION
AD_PACKAGE_IDENTIFIER_UNIQUENESS_SCOPE=GLOBAL_UNIQUE
AD_PACKAGE_IDENTIFIER_UNIQUENESS_SCOPE_DECISION=GLOBAL_UNIQUE
AD_PACKAGE_IDENTIFIER_NULLABILITY_POLICY=TRANSITIONAL_NULLABLE_THEN_NOT_NULL
AD_PACKAGE_IDENTIFIER_DISTINCT_FROM_AD_TYPE=YES
```

These are explicit proposed design decisions for human approval, not claims
about the current model. System assignment follows the approved REFERENCE
catalog direction, current absence of Package administration flows, and the
need for stable reconciliation. Global uniqueness is required for one-row
lookup without `adType`, active-state, or payload qualifiers. Immutability
means the code survives display-name, price, duration, limit, description, and
active-state changes.

The transition permits existing rows to be reviewed and backfilled before a
future migration validates NOT NULL. The final canonical contract does not
permit null Package codes.

### 22.5 Exact retained identifier values

The proposed values use uppercase machine-readable catalog vocabulary. They
do not contain localized names, price, duration, generated IDs, or audit
labels. Each adds concept/placement meaning beyond `AdType`, so it does not
impose one-Package-per-type cardinality.

| Fixture | Candidate | Evidence | Verdict |
| --- | --- | --- | --- |
| `AP-01` | `HOMEPAGE_CAROUSEL` | source description says homepage carousel; delivery documentation names `ad-carousel-home`; `AdType.BANNER` remains a separate placement category | `PREFERRED_PENDING_HUMAN_REVIEW` |
| `AP-02` | `FEATURED_PRODUCT` | source name and description identify a featured Product concept; the value omits price and 14-day duration | `PREFERRED_PENDING_HUMAN_REVIEW` |
| `AP-03` | `SPOTLIGHT_PLACEMENT` | source name, description, and `AdType.SPOTLIGHT` establish Spotlight placement; the value deliberately omits “weekly” and seven-day duration | `PREFERRED_PENDING_HUMAN_REVIEW` |

```text
AP_01_REFERENCE_IDENTIFIER_CANDIDATE=HOMEPAGE_CAROUSEL
AP_01_REFERENCE_IDENTIFIER_EVIDENCE=SOURCE_DESCRIPTION_HOMEPAGE_CAROUSEL;DELIVERY_VOCABULARY_AD_CAROUSEL_HOME
AP_01_REFERENCE_IDENTIFIER_VERDICT=PREFERRED_PENDING_HUMAN_REVIEW
AP_02_REFERENCE_IDENTIFIER_CANDIDATE=FEATURED_PRODUCT
AP_02_REFERENCE_IDENTIFIER_EVIDENCE=SOURCE_NAME_AND_DESCRIPTION_FEATURED_PRODUCT_CONCEPT
AP_02_REFERENCE_IDENTIFIER_VERDICT=PREFERRED_PENDING_HUMAN_REVIEW
AP_03_REFERENCE_IDENTIFIER_CANDIDATE=SPOTLIGHT_PLACEMENT
AP_03_REFERENCE_IDENTIFIER_EVIDENCE=SOURCE_NAME_DESCRIPTION_AND_AD_TYPE_SPOTLIGHT;DURATION_EXCLUDED
AP_03_REFERENCE_IDENTIFIER_VERDICT=PREFERRED_PENDING_HUMAN_REVIEW

AP_01_REFERENCE_IDENTIFIER_VALUE_DECISION=HOMEPAGE_CAROUSEL
AP_02_REFERENCE_IDENTIFIER_VALUE_DECISION=FEATURED_PRODUCT
AP_03_REFERENCE_IDENTIFIER_VALUE_DECISION=SPOTLIGHT_PLACEMENT
```

The `*_VALUE_DECISION` entries are the exact recommendation presented to
human review. They become implementation authority only after this decision
PR is human-reviewed and merged.

### 22.6 Versioning and API consequence

```text
AD_PACKAGE_VERSIONING_MODEL=SINGLE_IMMUTABLE_REFERENCE_PER_CODE_WITH_MUTABLE_PAYLOAD
AD_PACKAGE_IDENTIFIER_API_EXPOSURE=PUBLIC_READ_ONLY_FIELD
```

Current source does not guarantee one Package per `AdType`; future codes may
share a type. Price, duration, impression limits, description, and active state
may be reconciled under one stable code. A materially distinct tier or
placement receives a new code. The present schema has no historical pricing
version model; this decision does not invent one.

Because `/ads/packages` is public catalog output, a future `packageCode` is
recommended as a read-only response field. Campaign creation continues to
accept the numeric `packageId`; no public code-based lookup or mutation route
is approved in this slice.

### 22.7 Campaign FK preservation

```text
AD_CAMPAIGN_PACKAGE_FK_DECISION=RETAIN_NUMERIC_PACKAGE_ID_FOREIGN_KEY
AD_CAMPAIGN_PACKAGE_FK_SCHEMA_CHANGE_REQUIRED=NO
```

The Package code supplies catalog identity and deterministic seed lookup. It
does not replace `ad_campaigns.package_id`, the TypeORM `ManyToOne`, or the
database FK to `ad_packages.id`. This preserves all six current numeric-ID
contract roles and avoids an unsupported string FK migration.

### 22.8 Future Ads REFERENCE seed design

```text
AD_PACKAGE_REFERENCE_SEED_GROUP_ID=ads.reference.packages
AD_PACKAGE_REFERENCE_SEED_OWNER=ADS
AD_PACKAGE_REFERENCE_SEED_CLASSIFICATION=REFERENCE
AD_PACKAGE_REFERENCE_SEED_DEPENDENCIES=NONE
AD_PACKAGE_REFERENCE_STABLE_KEY=packageCode
AD_PACKAGE_REFERENCE_IDEMPOTENCY_POLICY=LOOKUP_BY_PACKAGE_CODE_CREATE_IF_ABSENT_RECONCILE_APPROVED_PAYLOAD_FAIL_CLOSED_ON_DUPLICATE_OR_AMBIGUOUS_IDENTITY_NEVER_USE_WHOLE_TABLE_COUNT_OR_GENERATED_ID_AS_LOOKUP
```

Package rows have no User or owner scalar dependency. The future group should
follow existing Geography/Product Category REFERENCE patterns: explicit
REFERENCE selection, per-record lookup by stable identity, create if absent,
and reconcile approved payload when present. A duplicate or ambiguous code is
an error, not a first-row selection. No group or writer is created here.

### 22.9 Schema and existing-row design consequences

```text
AD_PACKAGE_SCHEMA_CHANGE_REQUIRED=YES
PROPOSED_IDENTIFIER_COLUMN=package_code
PROPOSED_IDENTIFIER_TYPE=varchar
PROPOSED_IDENTIFIER_LENGTH=64
PROPOSED_IDENTIFIER_NULLABILITY=TRANSITIONAL_NULLABLE_THEN_NOT_NULL
PROPOSED_IDENTIFIER_UNIQUE_SCOPE=GLOBAL_UNIQUE
PROPOSED_INDEX_OR_CONSTRAINT=UQ_ad_packages_package_code
AD_PACKAGE_EXISTING_ROW_MIGRATION_POLICY=BACKFILL_ONLY_MATCHED_CANONICAL_ROWS_FAIL_CLOSED_ON_AMBIGUITY
```

A later schema slice must add the column without making unsafe assumptions
about deployed data. It may assign the three approved values only when a row
is unambiguously proven to be the corresponding retained concept. Unknown,
custom, duplicate, or semantically ambiguous rows require bounded manual data
review; they must not be guessed from `AdType`, name alone, position, serial
ID, price, duration, or active state. Only after mapping validation may a
future migration enforce global uniqueness and NOT NULL. No database was
queried and no exact deployed-row state is asserted here.

### 22.10 Authorization and minimal safe next sequence

The recommendation is complete enough for human review but is not yet merged
design authority. Schema and seed implementation remain separate,
human-reviewed slices.

```text
P8_05C3C2_AD_PACKAGE_REFERENCE_IDENTITY_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
AD_PACKAGE_DOMAIN_IDENTIFIER_DECISION_RESOLVED=NO_PENDING_HUMAN_REVIEW
AD_PACKAGE_REFERENCE_MIGRATION_DECISION_RESOLVED=NO_IMPLEMENTATION_NOT_STARTED
P8_05C3C2_IMPLEMENTATION_AUTHORIZED=NO_PENDING_HUMAN_REVIEW_AND_SEPARATE_SCHEMA_SLICE
P8_05C3C_IMPLEMENTATION_AUTHORIZED=NO
P8_05C4D_CENTRAL_RETIREMENT_AUTHORIZED=NO
```

Minimal safe sequence:

1. `P8-05C3C2A` — implement the approved `package_code` schema/migration with
   fail-closed existing-row handling and validation.
2. `P8-05C3C2B` — implement `ads.reference.packages`, keyed by `packageCode`,
   only after the schema slice is merged.
3. `P8-05C3C3` — retire the four approved Campaign DEV fixtures and their
   supplier dependency plumbing; no partial retirement is authorized here.
4. `P8-05C3C4` — retire the central Package DEV writer only after the
   owner-local REFERENCE replacement is implemented and verified.
5. `P8-05C4D` — evaluate retirement of `DevSeedService`,
   `legacy.dev.remaining`, reset-only `ad_events` debt, Users dependency, and
   unused aliases only after central ordinary writer count reaches zero.

```text
NEXT_IMPLEMENTATION_SLICE_1=P8_05C3C2A_AD_PACKAGE_IDENTIFIER_SCHEMA_MIGRATION
NEXT_IMPLEMENTATION_SLICE_2=P8_05C3C2B_ADS_REFERENCE_PACKAGE_SEED
NEXT_IMPLEMENTATION_SLICE_3=P8_05C3C3_CAMPAIGN_DEV_FIXTURE_RETIREMENT
NEXT_IMPLEMENTATION_SLICE_4=P8_05C3C4_LEGACY_PACKAGE_DEV_WRITER_RETIREMENT
NEXT_IMPLEMENTATION_SLICE_5=P8_05C4D_CENTRAL_CONTINUATION_AND_RESET_DEBT_RETIREMENT
```

### 22.11 Documentation-only boundary and safety

```text
RUNTIME_FILES_CHANGED=0
ADS_BUSINESS_IMPLEMENTATION_CHANGES=0
CENTRAL_DEVSEEDSERVICE_RUNTIME_CHANGES=0
LEGACY_DEV_REMAINING_CHANGES=0
NEW_SEEDGROUPS=0
SCHEMA_CHANGES=0
MIGRATIONS_CREATED=0

PROTECTED_LOCAL_DB_ACCESSED=NO
PRODUCTION_DB_ACCESSED=NO
DATABASE_CONNECTIONS=0
DATASOURCE_CONSTRUCTED=NO
DATASOURCE_INITIALIZE_CALLS=0
SQL=0
DDL=0
DML=0
SEEDS_EXECUTED=0
MIGRATIONS_EXECUTED=0
SYNCHRONIZE=NO
DESTRUCTIVE_RESET_EXECUTED=NO
```

## 23. P8-05C3C2 Human Review Decision Overlay

Human review accepts the complete section 22 identifier recommendation and
clarifies the transitional nullability contract. `packageCode` and the three
exact catalog values are now approved design authority. Schema and REFERENCE
seed implementation have not started. In particular, the nullable expansion,
bounded existing-row backfill, and NOT NULL contract must not be collapsed
into one blind migration.

### 23.1 Approved Package identity

```text
AD_PACKAGE_IDENTIFIER_FIELD_NAME_DECISION=packageCode
AD_PACKAGE_IDENTIFIER_SEMANTICS=IMMUTABLE_ADVERTISING_PACKAGE_REFERENCE_CATALOG_CODE
AD_PACKAGE_IDENTIFIER_ASSIGNMENT_AUTHORITY_DECISION=SYSTEM_DEFINED_REFERENCE_CATALOG
AD_PACKAGE_IDENTIFIER_IMMUTABILITY_DECISION=IMMUTABLE_AFTER_CREATION
AD_PACKAGE_IDENTIFIER_UNIQUENESS_SCOPE_DECISION=GLOBAL_UNIQUE
AD_PACKAGE_IDENTIFIER_NULLABILITY_POLICY=TRANSITIONAL_NULLABLE_THEN_NOT_NULL
AD_PACKAGE_IDENTIFIER_IS_DOMAIN_OR_CONFIGURATION_IDENTITY=YES
AD_PACKAGE_IDENTIFIER_DISTINCT_FROM_AD_TYPE=YES
AD_PACKAGE_VERSIONING_MODEL=SINGLE_IMMUTABLE_REFERENCE_PER_CODE_WITH_MUTABLE_PAYLOAD
AD_PACKAGE_IDENTIFIER_API_EXPOSURE=PUBLIC_READ_ONLY_FIELD
AD_PACKAGE_DOMAIN_IDENTIFIER_DECISION_RESOLVED=YES
```

The code is the stable system-defined advertising Package catalog identity.
It remains unchanged when display name, type-adjacent presentation, price,
duration, limits, description, or active state change. `AdType` continues to
classify placement behavior and does not acquire one-Package-per-type
cardinality.

### 23.2 Approved exact catalog codes

```text
AP_01_REFERENCE_IDENTIFIER_VALUE_DECISION=HOMEPAGE_CAROUSEL
AP_02_REFERENCE_IDENTIFIER_VALUE_DECISION=FEATURED_PRODUCT
AP_03_REFERENCE_IDENTIFIER_VALUE_DECISION=SPOTLIGHT_PLACEMENT
```

These are canonical catalog identifiers. Localized display names, price,
duration, generated numeric ID, fixture labels, and `AdType` alone are not
identity.

### 23.3 Numeric PK and Campaign FK decisions

```text
AD_PACKAGE_NUMERIC_PRIMARY_KEY_DECISION=RETAIN_INTERNAL_SURROGATE_PRIMARY_KEY
AD_CAMPAIGN_PACKAGE_FK_DECISION=RETAIN_NUMERIC_PACKAGE_ID_FOREIGN_KEY
AD_CAMPAIGN_PACKAGE_FK_SCHEMA_CHANGE_REQUIRED=NO
```

`packageCode` neither replaces `AdPackage.id` nor changes
`AdCampaign.packageId`. It supplies reference-catalog identity and deterministic
seed lookup alongside the existing relational key.

### 23.4 Approved final schema contract

```text
PROPOSED_IDENTIFIER_COLUMN=package_code
PROPOSED_IDENTIFIER_TYPE=varchar
PROPOSED_IDENTIFIER_LENGTH=64
PROPOSED_IDENTIFIER_UNIQUE_SCOPE=GLOBAL_UNIQUE
PROPOSED_INDEX_OR_CONSTRAINT=UQ_ad_packages_package_code
PACKAGE_CODE_FINAL_NULLABILITY=NOT_NULL
AD_PACKAGE_EXISTING_ROW_MIGRATION_POLICY=BACKFILL_ONLY_MATCHED_CANONICAL_ROWS_FAIL_CLOSED_ON_AMBIGUITY
```

The current repository contains no trusted deployed-row inventory proving that
every `ad_packages` row is AP-01, AP-02, or AP-03. The final NOT NULL contract
is approved, but it may be enforced only after nullable expansion, bounded
mapping, and validation.

### 23.5 Explicit expand and contract strategy

#### Stage A1: schema expand

`P8_05C3C2A1_AD_PACKAGE_IDENTIFIER_SCHEMA_EXPAND` must:

- add nullable `package_code varchar(64)`;
- establish global uniqueness for non-null values using PostgreSQL unique
  constraint/index null behavior;
- update persistence representation only as needed for transitional schema
  support;
- leave existing rows unguessed;
- not enforce NOT NULL.

```text
C3C2A1_PACKAGE_CODE_NULLABILITY=NULLABLE_TRANSITIONAL
C3C2A1_EXISTING_ROW_AUTOMATIC_GUESSING=PROHIBITED
```

#### Stage A2: validated backfill and contract

`P8_05C3C2A2_AD_PACKAGE_IDENTIFIER_BACKFILL_AND_CONTRACT` must:

- recognize only unambiguous canonical legacy rows;
- map AP-01 to `HOMEPAGE_CAROUSEL`;
- map AP-02 to `FEATURED_PRODUCT`;
- map AP-03 to `SPOTLIGHT_PLACEMENT`;
- fail closed on duplicate or ambiguous canonical matches;
- require an explicit human mapping for unknown/custom rows;
- validate uniqueness and require a valid code for every Package row;
- enforce NOT NULL only after all validation succeeds.

```text
C3C2A2_AMBIGUOUS_ROW_POLICY=FAIL_CLOSED
C3C2A2_UNKNOWN_CUSTOM_ROW_POLICY=REQUIRE_EXPLICIT_HUMAN_MAPPING_BEFORE_NOT_NULL
C3C2A2_FINAL_PACKAGE_CODE_NULLABILITY=NOT_NULL
```

A bounded A2 migration may use an exact legacy payload fingerprint only to
recognize a known legacy row for one-time backfill. Such a fingerprint is not
future domain identity and must not become a normal reconciliation key.

```text
AD_PACKAGE_BACKFILL_MATCHING_IS_DOMAIN_IDENTITY=NO
AD_PACKAGE_CANONICAL_DOMAIN_IDENTITY=packageCode
```

Name, `adType`, price, duration, description, maximum impressions, serial ID,
and row position remain prohibited as Package identity.

### 23.6 Approved future REFERENCE group authority

```text
AD_PACKAGE_REFERENCE_SEED_GROUP_ID=ads.reference.packages
AD_PACKAGE_REFERENCE_SEED_OWNER=ADS
AD_PACKAGE_REFERENCE_SEED_CLASSIFICATION=REFERENCE
AD_PACKAGE_REFERENCE_SEED_DEPENDENCIES=NONE
AD_PACKAGE_REFERENCE_STABLE_KEY=packageCode
AD_PACKAGE_REFERENCE_IDEMPOTENCY_POLICY=LOOKUP_BY_PACKAGE_CODE_CREATE_IF_ABSENT_RECONCILE_APPROVED_PAYLOAD_FAIL_CLOSED_ON_DUPLICATE_OR_AMBIGUOUS_IDENTITY_NEVER_USE_WHOLE_TABLE_COUNT_OR_GENERATED_ID_AS_LOOKUP
```

The group is approved as design only and may be implemented only after A2 is
merged and reviewed. This PR creates no SeedGroup.

### 23.7 Human-review resolution and implementation authorization

```text
P8_05C3C2_AD_PACKAGE_REFERENCE_IDENTITY_STATUS=IMPLEMENTED_PENDING_HUMAN_MERGE
P8_05C3C2_DECISION_BLOCKERS=NONE
AD_PACKAGE_DOMAIN_IDENTIFIER_DECISION_RESOLVED=YES
AD_PACKAGE_REFERENCE_MIGRATION_DECISION_RESOLVED=YES_DESIGN_APPROVED_IMPLEMENTATION_NOT_STARTED

P8_05C3C2A1_IMPLEMENTATION_AUTHORIZED=YES_AFTER_P8_05C3C2_PR_137_MERGE
P8_05C3C2A2_IMPLEMENTATION_AUTHORIZED=NO_WAITING_FOR_C3C2A1_MERGE_AND_REVIEW
P8_05C3C2B_IMPLEMENTATION_AUTHORIZED=NO_WAITING_FOR_C3C2A2_MERGE_AND_REVIEW
P8_05C3C_IMPLEMENTATION_AUTHORIZED=NO
P8_05C4D_CENTRAL_RETIREMENT_AUTHORIZED=NO
```

Only A1 becomes authorized after this PR is human-reviewed and merged. A2 and
the REFERENCE group require their own predecessor merges and reviews.

### 23.8 Updated safe sequence

1. `P8-05C3C2A1` — Ad Package identifier nullable schema expand.
2. `P8-05C3C2A2` — validated legacy-row backfill and NOT NULL contract.
3. `P8-05C3C2B` — Ads-owned REFERENCE Package seed.
4. `P8-05C3C3` — Campaign DEV fixture retirement.
5. `P8-05C3C4` — legacy Package DEV writer retirement after replacement.
6. `P8-05C4D` — central continuation and reset-only debt retirement review.

```text
NEXT_IMPLEMENTATION_SLICE_1=P8_05C3C2A1_AD_PACKAGE_IDENTIFIER_SCHEMA_EXPAND
NEXT_IMPLEMENTATION_SLICE_2=P8_05C3C2A2_AD_PACKAGE_IDENTIFIER_BACKFILL_AND_CONTRACT
NEXT_IMPLEMENTATION_SLICE_3=P8_05C3C2B_ADS_REFERENCE_PACKAGE_SEED
NEXT_IMPLEMENTATION_SLICE_4=P8_05C3C3_CAMPAIGN_DEV_FIXTURE_RETIREMENT
NEXT_IMPLEMENTATION_SLICE_5=P8_05C3C4_LEGACY_PACKAGE_DEV_WRITER_RETIREMENT
NEXT_IMPLEMENTATION_SLICE_6=P8_05C4D_CENTRAL_CONTINUATION_AND_RESET_DEBT_RETIREMENT
```

### 23.9 Preserved C3C1 authority and boundaries

```text
AD_PACKAGE_CLASSIFICATION_DECISION=RECLASSIFY_AS_REFERENCE
AD_PACKAGE_APPROVED_RETAIN_COUNT=3
AD_CAMPAIGN_IDENTITY_POLICY_DECISION=RETIRE_CURRENT_DEV_FIXTURES
AD_CAMPAIGN_APPROVED_RETIRE_COUNT=4
AD_CAMPAIGN_RETIREMENT_DECISION_RESOLVED=YES
AD_EVENTS_PHASE8_CLASSIFICATION=RESET_ONLY_LEGACY_DEBT

RUNTIME_FILES_CHANGED=0
ADS_BUSINESS_IMPLEMENTATION_CHANGES=0
CENTRAL_DEVSEEDSERVICE_RUNTIME_CHANGES=0
LEGACY_DEV_REMAINING_CHANGES=0
SCHEMA_CHANGES=0
MIGRATIONS_CREATED=0
NEW_SEEDGROUPS=0

PROTECTED_LOCAL_DB_ACCESSED=NO
PRODUCTION_DB_ACCESSED=NO
DATABASE_CONNECTIONS=0
DATASOURCE_CONSTRUCTED=NO
DATASOURCE_INITIALIZE_CALLS=0
SQL=0
DDL=0
DML=0
SEEDS_EXECUTED=0
MIGRATIONS_EXECUTED=0
SYNCHRONIZE=NO
DESTRUCTIVE_RESET_EXECUTED=NO
```

`DevSeedService`, `legacy.dev.remaining`, `resetAll`, `ad_events`, the Users
dependency, legacy actor aliases, Package/Campaign runtime persistence, and
all current executable fixtures remain unchanged.

## 24. P8-05C3C2A1 Ad Package Identifier Schema Expand Implementation Overlay

Merged PR #137 is the current design authority. A1 implements only its
nullable expand stage: the Ads-owned `AdPackage` persistence entity now maps
`packageCode` to nullable `package_code varchar(64)`, and the new ordered V2
migration adds the explicitly named global unique constraint
`UQ_ad_packages_package_code`. PostgreSQL ordinary UNIQUE semantics preserve
multiple NULL values during this transition.

The migration contains no row update, catalog-code assignment, payload
fingerprint, or NOT NULL contract. Its DOWN path drops the A1 constraint and
then its column. Numeric `AdPackage.id`, `AdCampaign.packageId`, and the
existing ManyToOne/FK contract remain unchanged.

```text
P8_05C3C2_AD_PACKAGE_REFERENCE_IDENTITY_STATUS=IMPLEMENTED_BY_MERGED_PR_137
AD_PACKAGE_DOMAIN_IDENTIFIER_DECISION_RESOLVED=YES
AD_PACKAGE_IDENTIFIER_FIELD_NAME_DECISION=packageCode
AD_PACKAGE_IDENTIFIER_ASSIGNMENT_AUTHORITY_DECISION=SYSTEM_DEFINED_REFERENCE_CATALOG
AD_PACKAGE_IDENTIFIER_IMMUTABILITY_DECISION=IMMUTABLE_AFTER_CREATION
AD_PACKAGE_IDENTIFIER_UNIQUENESS_SCOPE_DECISION=GLOBAL_UNIQUE
AD_PACKAGE_IDENTIFIER_NULLABILITY_POLICY=TRANSITIONAL_NULLABLE_THEN_NOT_NULL

P8_05C3C2A1_IMPLEMENTATION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_05C3C2A1_BLOCKERS=NONE
C3C2A1_PACKAGE_CODE_NULLABILITY=NULLABLE_TRANSITIONAL
C3C2A1_EXISTING_ROW_AUTOMATIC_GUESSING=PROHIBITED

AD_PACKAGE_ENTITY_PACKAGE_CODE_EXISTS=YES
AD_PACKAGE_ENTITY_PACKAGE_CODE_COLUMN=package_code
AD_PACKAGE_ENTITY_PACKAGE_CODE_TYPE=varchar
AD_PACKAGE_ENTITY_PACKAGE_CODE_LENGTH=64
AD_PACKAGE_ENTITY_PACKAGE_CODE_NULLABLE=YES
AD_PACKAGE_ENTITY_PACKAGE_CODE_UNIQUE=YES
AD_PACKAGE_PACKAGE_CODE_UNIQUE_CONSTRAINT=UQ_ad_packages_package_code

MIGRATION_UPDATE_STATEMENTS=0
MIGRATION_BACKFILL_STATEMENTS=0
MIGRATION_PACKAGE_CODE_NOT_NULL_ENFORCEMENT=NO
MIGRATION_DOWN_REVERSIBLE_FOR_A1=YES
EXISTING_PACKAGE_ROWS_MODIFIED=0
AP_01_ROW_BACKFILLED=NO
AP_02_ROW_BACKFILLED=NO
AP_03_ROW_BACKFILLED=NO

AD_PACKAGE_NUMERIC_PRIMARY_KEY_DECISION=RETAIN_INTERNAL_SURROGATE_PRIMARY_KEY
AD_PACKAGE_PRIMARY_KEY_CHANGED=NO
AD_CAMPAIGN_PACKAGE_FK_DECISION=RETAIN_NUMERIC_PACKAGE_ID_FOREIGN_KEY
AD_CAMPAIGN_PACKAGE_FK_SCHEMA_CHANGE_REQUIRED=NO
AD_CAMPAIGN_PACKAGE_FK_CHANGED=NO

AD_PACKAGE_PUBLIC_API_PACKAGE_CODE_EXPOSED=NO
NEW_PACKAGE_CODE_MUTATION_PATHS=0
NEW_AD_PACKAGE_REFERENCE_SEEDGROUPS=0
NEW_SEEDGROUPS=0
NEW_SEED_OUTPUT_KINDS=0
CENTRAL_NORMAL_WRITE_METHOD_COUNT=2
CENTRAL_NORMAL_WRITE_METHODS=seedAdPackages;seedAdCampaigns
CENTRAL_DEVSEEDSERVICE_RUNTIME_CHANGES=0
RESET_ALL_CHANGES=0
AD_EVENTS_PHASE8_CLASSIFICATION=RESET_ONLY_LEGACY_DEBT
AD_EVENTS_RESET_TARGET_EXISTS=YES

SCHEMA_CHANGES=1
MIGRATIONS_CREATED=1
P8_05C3C2A2_IMPLEMENTATION_AUTHORIZED=NO_WAITING_FOR_C3C2A1_MERGE_AND_REVIEW
P8_05C3C2B_IMPLEMENTATION_AUTHORIZED=NO_WAITING_FOR_C3C2A2_MERGE_AND_REVIEW
P8_05C3C_IMPLEMENTATION_AUTHORIZED=NO
P8_05C4D_CENTRAL_RETIREMENT_AUTHORIZED=NO
```

`packageCode` remains application-immutable by design. A1 adds no creation or
mutation endpoint and deliberately keeps it out of the public Package model;
public read-only exposure follows validated A2 canonical population.

No database was contacted and no migration or seed was executed while
creating this implementation source.

```text
PROTECTED_LOCAL_DB_ACCESSED=NO
PRODUCTION_DB_ACCESSED=NO
DATABASE_CONNECTIONS=0
DATASOURCE_CONSTRUCTED=NO
DATASOURCE_INITIALIZE_CALLS=0
SQL_EXECUTED=0
DDL_EXECUTED=0
DML_EXECUTED=0
MIGRATIONS_EXECUTED=0
SEEDS_EXECUTED=0
SYNCHRONIZE=NO
DESTRUCTIVE_RESET_EXECUTED=NO
```

## 25. P8-05C3C2A2 Ad Package Identifier Backfill And Contract Implementation Overlay

Merged PR #138 is the A1 implementation authority. A2 adds one ordered V2
migration that recognizes only the three approved legacy Package payloads,
assigns their approved catalog codes only when the full fingerprint is unique
and `package_code` is NULL, validates every existing row, and then contracts
the column to NOT NULL.

All ambiguity, unexpected-code, mismatched-code, and claimed-code conflicts
are checked before the first UPDATE. Zero fingerprint matches are allowed. A
remaining NULL after bounded recognition fails closed and requires explicit
human mapping; A2 never invents an identity. The three fingerprints exclude
numeric ID, timestamps, and row position and are one-time migration evidence,
not domain identity.

```text
P8_05C3C2A1_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_138
P8_05C3C2A2_IMPLEMENTATION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_05C3C2A2_BLOCKERS=NONE
AD_PACKAGE_REFERENCE_MIGRATION_DECISION_RESOLVED=YES_A1_A2_IMPLEMENTED_PENDING_HUMAN_REVIEW

C3C2A2_AMBIGUOUS_ROW_POLICY=FAIL_CLOSED
C3C2A2_UNKNOWN_CUSTOM_ROW_POLICY=REQUIRE_EXPLICIT_HUMAN_MAPPING_BEFORE_NOT_NULL
C3C2A2_FINAL_PACKAGE_CODE_NULLABILITY=NOT_NULL
UNEXPECTED_EXISTING_PACKAGE_CODE_POLICY=FAIL_CLOSED
UNKNOWN_OR_CUSTOM_NULL_ROW_POLICY=FAIL_CLOSED_REQUIRE_EXPLICIT_HUMAN_MAPPING
AP_01_ZERO_MATCH_POLICY=ALLOWED
AP_02_ZERO_MATCH_POLICY=ALLOWED
AP_03_ZERO_MATCH_POLICY=ALLOWED

AP_01_REFERENCE_IDENTIFIER_VALUE_DECISION=HOMEPAGE_CAROUSEL
AP_02_REFERENCE_IDENTIFIER_VALUE_DECISION=FEATURED_PRODUCT
AP_03_REFERENCE_IDENTIFIER_VALUE_DECISION=SPOTLIGHT_PLACEMENT
BACKFILL_BY_NUMERIC_ID=NO
BACKFILL_BY_ROW_POSITION=NO
BACKFILL_BY_AD_TYPE_ONLY=NO
BACKFILL_BY_NAME_ONLY=NO
AD_PACKAGE_BACKFILL_MATCHING_IS_DOMAIN_IDENTITY=NO
AD_PACKAGE_CANONICAL_DOMAIN_IDENTITY=packageCode

MIGRATION_BOUNDED_UPDATE_STATEMENTS=3
MIGRATION_AMBIGUITY_PREFLIGHTS=3
MIGRATION_UNRESOLVED_NULL_VALIDATION=YES
MIGRATION_UNEXPECTED_CODE_VALIDATION=YES
MIGRATION_SET_NOT_NULL=YES_AFTER_VALIDATION
A2_DOWN_DROPS_NOT_NULL=YES
A2_DOWN_PRESERVES_PACKAGE_CODE_VALUES=YES

AD_PACKAGE_ENTITY_PACKAGE_CODE_COLUMN=package_code
AD_PACKAGE_ENTITY_PACKAGE_CODE_TYPE=varchar
AD_PACKAGE_ENTITY_PACKAGE_CODE_LENGTH=64
AD_PACKAGE_ENTITY_PACKAGE_CODE_NULLABLE=NO
AD_PACKAGE_ENTITY_PACKAGE_CODE_UNIQUE=YES
AD_PACKAGE_PRIMARY_KEY_CHANGED=NO
AD_CAMPAIGN_PACKAGE_FK_CHANGED=NO
AD_PACKAGE_PUBLIC_API_PACKAGE_CODE_EXPOSED=NO
NEW_PACKAGE_CODE_MUTATION_PATHS=0

NEW_AD_PACKAGE_REFERENCE_SEEDGROUPS=0
NEW_SEEDGROUPS=0
NEW_SEED_OUTPUT_KINDS=0
CENTRAL_NORMAL_WRITE_METHOD_COUNT=2
CENTRAL_NORMAL_WRITE_METHODS=seedAdPackages;seedAdCampaigns
CENTRAL_DEVSEEDSERVICE_RUNTIME_CHANGES=0
RESET_ALL_CHANGES=0
AD_EVENTS_PHASE8_CLASSIFICATION=RESET_ONLY_LEGACY_DEBT
AD_EVENTS_RESET_TARGET_EXISTS=YES

SCHEMA_CHANGES=1
MIGRATIONS_CREATED=1
P8_05C3C2B_IMPLEMENTATION_AUTHORIZED=NO_WAITING_FOR_C3C2A2_MERGE_AND_REVIEW
P8_05C3C_IMPLEMENTATION_AUTHORIZED=NO
P8_05C4D_CENTRAL_RETIREMENT_AUTHORIZED=NO
```

The A2 DOWN path drops only NOT NULL and preserves every assigned
`package_code`, plus the A1 column and unique constraint. The public Package
model, Campaign persistence, central fixtures, `resetAll`, and `ad_events`
remain unchanged.

This implementation created DML/DDL source text but did not execute it or
connect to a database.

```text
PROTECTED_LOCAL_DB_ACCESSED=NO
PRODUCTION_DB_ACCESSED=NO
DATABASE_CONNECTIONS=0
DATASOURCE_CONSTRUCTED=NO
DATASOURCE_INITIALIZE_CALLS=0
SQL_EXECUTED=0
DDL_EXECUTED=0
DML_EXECUTED=0
MIGRATIONS_EXECUTED=0
SEEDS_EXECUTED=0
SYNCHRONIZE=NO
DESTRUCTIVE_RESET_EXECUTED=NO
```

## 26. P8-05C3C2A2 Corrective Compatibility Review Overlay

Review found two A2 gaps after the original implementation report. First, the
retained `seedAdPackages` writer omitted the now-required identity on a fresh
post-A2 database. Second, an approved code on a noncanonical payload could
pass when its canonical fingerprint row was absent. This corrective patch
keeps A2 in the same PR and resolves both without moving final Package seed
ownership.

The three existing Package fixtures now carry only their already-approved
canonical codes. Their names, types, prices, durations, descriptions, active
flags, and maximum impressions remain byte-for-byte equivalent. The A2
preflight now binds each approved code to its exact fingerprint and rejects an
unknown/custom NULL row before the first UPDATE. The post-update assertion is
retained defensively.

```text
A2_REVIEW_BLOCKER_FOUND=LEGACY_PACKAGE_WRITER_INCOMPATIBLE_WITH_NOT_NULL_ON_EMPTY_DATABASE
A2_REVIEW_BLOCKER_RESOLVED=YES_TRANSITIONAL_CANONICAL_PACKAGE_CODES_ADDED_TO_LEGACY_WRITER
A2_APPROVED_CODE_PAYLOAD_BINDING_GAP_FOUND=YES
A2_APPROVED_CODE_PAYLOAD_BINDING_GAP_RESOLVED=YES_FAIL_CLOSED_CODE_TO_FINGERPRINT_PREFLIGHT

TRANSITIONAL_LEGACY_PACKAGE_CODE_BRIDGE=YES
TRANSITIONAL_LEGACY_PACKAGE_WRITER_FINAL_AUTHORITY=NO
AD_PACKAGE_FINAL_SEED_OWNER=ADS
AD_PACKAGE_FINAL_SEED_CLASSIFICATION=REFERENCE
AD_PACKAGE_FINAL_SEED_GROUP_ID=ads.reference.packages
NEW_AD_PACKAGE_REFERENCE_SEEDGROUPS=0

CENTRAL_AD_PACKAGE_FIXTURE_COUNT=3
CENTRAL_AD_PACKAGE_PACKAGE_CODE_ASSIGNMENT_COUNT=3
CENTRAL_AP_01_PACKAGE_CODE=HOMEPAGE_CAROUSEL
CENTRAL_AP_02_PACKAGE_CODE=FEATURED_PRODUCT
CENTRAL_AP_03_PACKAGE_CODE=SPOTLIGHT_PLACEMENT
CENTRAL_AD_PACKAGE_NON_IDENTITY_PAYLOAD_CHANGES=0
POST_A2_CURRENT_SEED_PACKAGE_CODE_REQUIRED=YES
POST_A2_CURRENT_SEED_MISSING_PACKAGE_CODE_FIXTURES=0
FRESH_DB_A2_THEN_LEGACY_PACKAGE_SEED_STATIC_COMPATIBILITY=PASS

APPROVED_CODE_ON_WRONG_FINGERPRINT_POLICY=FAIL_CLOSED
APPROVED_CODE_FINGERPRINT_PREFLIGHT_COUNT=3
UNKNOWN_CUSTOM_NULL_PREFLIGHT_BEFORE_FIRST_UPDATE=YES
PRE_UPDATE_FAIL_CLOSED_VALIDATION_COMPLETE=YES
MIGRATION_AMBIGUITY_PREFLIGHTS=3
MIGRATION_BOUNDED_UPDATE_STATEMENTS=3
MIGRATION_SET_NOT_NULL=YES_AFTER_ALL_VALIDATION
A2_DOWN_DROPS_NOT_NULL=YES
A2_DOWN_PRESERVES_PACKAGE_CODE_VALUES=YES

CENTRAL_NORMAL_WRITE_METHOD_COUNT=2
CENTRAL_NORMAL_WRITE_METHODS=seedAdPackages;seedAdCampaigns
CENTRAL_DEVSEEDSERVICE_RUNTIME_CHANGES=1_TRANSITIONAL_PACKAGE_CODE_BRIDGE_ONLY
AD_CAMPAIGN_FIXTURE_CHANGES=0
AD_CAMPAIGN_PACKAGE_FK_CHANGED=NO
RESET_ALL_CHANGES=0
AD_EVENTS_PHASE8_CLASSIFICATION=RESET_ONLY_LEGACY_DEBT
AD_PACKAGE_PUBLIC_API_PACKAGE_CODE_EXPOSED=NO
NEW_PACKAGE_CODE_MUTATION_PATHS=0

P8_05C3C2A2_IMPLEMENTATION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_05C3C2A2_BLOCKERS=NONE
P8_05C3C2B_IMPLEMENTATION_AUTHORIZED=NO_WAITING_FOR_C3C2A2_MERGE_AND_REVIEW
P8_05C3C_IMPLEMENTATION_AUTHORIZED=NO
P8_05C4D_CENTRAL_RETIREMENT_AUTHORIZED=NO
```


## P8-05C3C2A2 Merged Status Authority Overlay

PR #139 merged the reviewed A2 identity contract into `develop`. This
trailing overlay advances only current authority; all earlier pending-review
and waiting states remain historical evidence.

~~~text
P8_05C3C2A1_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_138
P8_05C3C2A2_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_139
AD_PACKAGE_DOMAIN_IDENTIFIER_DECISION_RESOLVED=YES
AD_PACKAGE_CANONICAL_DOMAIN_IDENTITY=packageCode
C3C2A2_FINAL_PACKAGE_CODE_NULLABILITY=NOT_NULL
AD_PACKAGE_APPROVED_CODES=HOMEPAGE_CAROUSEL;FEATURED_PRODUCT;SPOTLIGHT_PLACEMENT
AD_PACKAGE_REFERENCE_SEED_GROUP_ID=ads.reference.packages
AD_PACKAGE_REFERENCE_SEED_OWNER=ADS
AD_PACKAGE_REFERENCE_SEED_CLASSIFICATION=REFERENCE
AD_PACKAGE_REFERENCE_SEED_DEPENDENCIES=NONE
AD_PACKAGE_REFERENCE_STABLE_KEY=packageCode
P8_05C3C2B_IMPLEMENTATION_AUTHORIZED=YES_AFTER_P8_05C3C2A2_PR_139_MERGE
~~~

## P8-05C3C2B Ads Reference Package Seed Implementation Overlay

The Ads owner now provides the single final REFERENCE writer for the three
canonical Packages. It performs per-record lookup by `packageCode`, creates
missing records, and reconciles only mutable approved payload on existing
records. It returns no scalar outputs. The same-payload central Package writer
and positional Campaign writer remain transitional until their separately
approved retirement slices.

~~~text
P8_05C3C2A2_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_139
P8_05C3C2B_IMPLEMENTATION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_05C3C2B_BLOCKERS=NONE

AD_PACKAGE_REFERENCE_SEED_GROUP_COUNT=1
AD_PACKAGE_REFERENCE_SEED_GROUP_ID=ads.reference.packages
AD_PACKAGE_REFERENCE_SEED_OWNER=ADS
AD_PACKAGE_REFERENCE_SEED_CLASSIFICATION=REFERENCE
AD_PACKAGE_REFERENCE_SEED_DEPENDENCY_COUNT=0
AD_PACKAGE_REFERENCE_RECORD_COUNT=3
AD_PACKAGE_REFERENCE_LOOKUP_KEY=packageCode
AD_PACKAGE_REFERENCE_WRITER_OWNER=ADS

REFERENCE_SEED_PER_RECORD_RECONCILIATION=YES
REFERENCE_SEED_CREATE_IF_ABSENT=YES
REFERENCE_SEED_RECONCILE_IF_PRESENT=YES
REFERENCE_SEED_WHOLE_TABLE_SHORT_CIRCUIT=NO
REFERENCE_SEED_NUMERIC_PK_REPLACEMENT=NO
PACKAGE_CODE_MUTATED_DURING_RECONCILIATION=NO
WHOLE_TABLE_GUARD_USED=NO
GENERATED_NUMERIC_ID_USED_AS_LOOKUP=NO
NAME_USED_AS_LOOKUP=NO
AD_TYPE_USED_AS_LOOKUP=NO

NEW_AD_PACKAGE_REFERENCE_SEED_OUTPUT_KINDS=0
REFERENCE_GROUP_DISCOVERABLE_BY_ORCHESTRATOR=YES
CENTRAL_RUNNER_PACKAGE_TABLE_WRITES_ADDED=0
CROSS_OWNER_ENTITY_IMPORTS=0
CROSS_OWNER_REPOSITORY_ACCESS=0

LEGACY_SEED_AD_PACKAGES_EXISTS=YES
TRANSITIONAL_LEGACY_PACKAGE_CODE_BRIDGE=YES
LEGACY_REFERENCE_PACKAGE_CODE_PARITY=PASS
LEGACY_REFERENCE_PACKAGE_PAYLOAD_PARITY=PASS
FINAL_PACKAGE_SEED_OWNER_COUNT=1
FINAL_PACKAGE_SEED_OWNER=ADS
TRANSITIONAL_LEGACY_WRITER_PENDING_RETIREMENT=YES

AD_CAMPAIGN_FIXTURE_CHANGES=0
AD_CAMPAIGN_SEEDGROUPS_CREATED=0
LEGACY_CAMPAIGN_PACKAGE_SELECTION_CHANGED=NO
RESET_ALL_CHANGES=0
AD_EVENTS_PHASE8_CLASSIFICATION=RESET_ONLY_LEGACY_DEBT
AD_EVENTS_RESET_TARGET_EXISTS=YES
AD_PACKAGE_PUBLIC_API_PACKAGE_CODE_EXPOSED=NO
SCHEMA_CHANGES=0
MIGRATIONS_CREATED=0

P8_05C3C3_IMPLEMENTATION_AUTHORIZED=NO_WAITING_FOR_C3C2B_MERGE_AND_REVIEW
P8_05C3C4_IMPLEMENTATION_AUTHORIZED=NO_WAITING_FOR_C3C3_MERGE_AND_REVIEW
P8_05C3C_IMPLEMENTATION_AUTHORIZED=NO
P8_05C4D_CENTRAL_RETIREMENT_AUTHORIZED=NO
~~~
+



## P8-05C3C2B Merged Status Authority Overlay

PR #140 merged the reviewed Ads-owned Package REFERENCE seed into
`develop`. This trailing overlay advances current C3C3 authority while all
earlier pending-review and waiting states remain historical evidence.

~~~text
P8_05C3C2A2_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_139
P8_05C3C2B_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_140
AD_PACKAGE_REFERENCE_SEED_GROUP_ID=ads.reference.packages
AD_PACKAGE_REFERENCE_SEED_OWNER=ADS
AD_PACKAGE_REFERENCE_SEED_CLASSIFICATION=REFERENCE
AD_CAMPAIGN_IDENTITY_POLICY_DECISION=RETIRE_CURRENT_DEV_FIXTURES
AC_01_DECISION=RETIRE
AC_02_DECISION=RETIRE
AC_03_DECISION=RETIRE
AC_04_DECISION=RETIRE
AD_CAMPAIGN_APPROVED_RETAIN_COUNT=0
AD_CAMPAIGN_APPROVED_RETIRE_COUNT=4
AD_CAMPAIGN_IDENTITIES_RESOLVED=NOT_REQUIRED_FIXTURES_RETIRED
AD_CAMPAIGN_PARENT_IDENTITY_RESOLVED=NOT_REQUIRED_CAMPAIGN_FIXTURES_RETIRED
P8_05C3C3_IMPLEMENTATION_AUTHORIZED=YES_AFTER_P8_05C3C2B_PR_140_MERGE
~~~

## P8-05C3C3 Campaign DEV Fixture Retirement Implementation Overlay

The four approved legacy Campaign DEV fixtures and their central writer are
retired without replacement. Their positional Package-parent dependency and
the `ad_campaigns` reset target retire with them. Normal Campaign domain
persistence remains unchanged. The central Package writer, Package/Event reset
debt, Ads-owned Package REFERENCE group, legacy actor map, and Users dependency
remain for their separately bounded follow-up slices.

~~~text
P8_05C3C2B_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_140
P8_05C3C3_IMPLEMENTATION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_05C3C3_BLOCKERS=NONE

CENTRAL_SEED_AD_CAMPAIGNS_METHOD_EXISTS=NO
CENTRAL_AD_CAMPAIGN_REPOSITORY_ACCESS=0
CENTRAL_AD_CAMPAIGN_WRITE_CALLS=0
AD_CAMPAIGN_EXECUTABLE_FIXTURE_COUNT=0
AC_01_EXECUTABLE_FIXTURE_EXISTS=NO
AC_02_EXECUTABLE_FIXTURE_EXISTS=NO
AC_03_EXECUTABLE_FIXTURE_EXISTS=NO
AC_04_EXECUTABLE_FIXTURE_EXISTS=NO
LEGACY_CAMPAIGN_PACKAGE_POSITIONAL_SELECTION_EXISTS=NO
CENTRAL_PACKAGES_ARRAY_USED_FOR_CAMPAIGN_PARENT_SELECTION=NO

NEW_AD_CAMPAIGN_SEEDGROUPS=0
NEW_AD_CAMPAIGN_SEED_OUTPUT_KINDS=0
AD_CAMPAIGN_FINAL_DEV_FIXTURE_DISPOSITION=RETIRED_NO_REPLACEMENT

LEGACY_SEED_AD_PACKAGES_EXISTS=YES
CENTRAL_AD_PACKAGE_FIXTURE_COUNT=3
CENTRAL_AD_PACKAGE_PACKAGE_CODE_ASSIGNMENT_COUNT=3
CENTRAL_AD_PACKAGE_NON_IDENTITY_PAYLOAD_CHANGES=0
TRANSITIONAL_LEGACY_PACKAGE_CODE_BRIDGE=YES
REFERENCE_PACKAGE_SEED_CHANGES=0
REFERENCE_PACKAGE_PAYLOAD_CHANGES=0
AD_PACKAGE_REFERENCE_SEED_GROUP_COUNT=1
AD_PACKAGE_REFERENCE_SEED_GROUP_ID=ads.reference.packages
AD_PACKAGE_REFERENCE_RECORD_COUNT=3
FINAL_PACKAGE_SEED_OWNER=ADS

CAMPAIGN_LEGACY_USER_ALIAS_CONSUMERS=SUPPLIER_BUSINESS_ID;ADMIN_UNUSED_PARAMETER_PLUMBING
CAMPAIGN_USERS_OUTPUT_CONSUMER_COUNT_PRE_C3C3=2
CAMPAIGN_BUSINESS_USER_ID_CONSUMER_COUNT_PRE_C3C3=1
POST_C3C3_BUSINESS_USER_ID_CONSUMER_COUNT=0
C4D_LEGACY_ACTOR_OR_DEPENDENCY_DEBT=LEGACY_ACTOR_MAP_AND_USERS_DEPENDENCY_REMAIN_STRUCTURALLY_PRESENT

AD_CAMPAIGN_RESET_TARGET_EXISTS=NO
AD_PACKAGE_RESET_TARGET_EXISTS=YES
AD_EVENTS_RESET_TARGET_EXISTS=YES
AD_EVENTS_PHASE8_CLASSIFICATION=RESET_ONLY_LEGACY_DEBT

CENTRAL_NORMAL_WRITE_METHOD_COUNT=1
CENTRAL_NORMAL_WRITE_METHODS=seedAdPackages
CENTRAL_BUSINESS_TABLE_COUNT=1
CENTRAL_BUSINESS_TABLES=ad_packages
CENTRAL_AD_CAMPAIGN_TABLE_WRITE_OWNERS=0

AD_CAMPAIGN_DOMAIN_RUNTIME_CHANGES=0
AD_CAMPAIGN_SCHEMA_CHANGES=0
AD_CAMPAIGN_PACKAGE_FK_CHANGED=NO
SCHEMA_CHANGES=0
MIGRATIONS_CREATED=0

P8_05C3C4_IMPLEMENTATION_AUTHORIZED=NO_WAITING_FOR_C3C3_MERGE_AND_REVIEW
P8_05C3C_IMPLEMENTATION_AUTHORIZED=NO
P8_05C4D_CENTRAL_RETIREMENT_AUTHORIZED=NO
~~~

## P8-05C3C3 Merged Status Authority Overlay

PR #141 merged the reviewed Campaign DEV fixture retirement into `develop`.
This trailing overlay authorizes C3C4; all earlier pending-review and waiting
states remain historical evidence.

~~~text
P8_05C3C2B_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_140
P8_05C3C3_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_141
P8_05C3C4_IMPLEMENTATION_AUTHORIZED=YES_AFTER_P8_05C3C3_PR_141_MERGE
AD_PACKAGE_REFERENCE_SEED_GROUP_ID=ads.reference.packages
AD_PACKAGE_REFERENCE_SEED_OWNER=ADS
AD_PACKAGE_REFERENCE_SEED_CLASSIFICATION=REFERENCE
AD_PACKAGE_REFERENCE_RECORD_COUNT=3
CENTRAL_NORMAL_WRITE_METHOD_COUNT=1
CENTRAL_NORMAL_WRITE_METHODS=seedAdPackages
CENTRAL_BUSINESS_TABLE_COUNT=1
CENTRAL_BUSINESS_TABLES=ad_packages
CENTRAL_SEED_AD_CAMPAIGNS_METHOD_EXISTS=NO
AD_CAMPAIGN_EXECUTABLE_FIXTURE_COUNT=0
~~~

## P8-05C3C4 Legacy Package DEV Writer Retirement Implementation Overlay

The final central normal writer and its transitional Package-code bridge are
retired. The Ads-owned REFERENCE group remains the only executable seed writer
for `ad_packages`. `DevSeedService`, `legacy.dev.remaining`, its Users
dependency and actor map, `resetAll`, and the `ad_events` reset-only target
remain as the exact C4D structural debt.

~~~text
P8_05C3C3_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_141
P8_05C3C4_IMPLEMENTATION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_05C3C4_BLOCKERS=NONE

CENTRAL_SEED_AD_PACKAGES_METHOD_EXISTS=NO
CENTRAL_AD_PACKAGE_REPOSITORY_ACCESS=0
CENTRAL_AD_PACKAGE_WRITE_CALLS=0
CENTRAL_AD_PACKAGE_EXECUTABLE_FIXTURE_COUNT=0
TRANSITIONAL_LEGACY_PACKAGE_CODE_BRIDGE_EXISTS=NO
TRANSITIONAL_LEGACY_WRITER_PENDING_RETIREMENT=NO

REFERENCE_PACKAGE_SEED_RUNTIME_CHANGES=0
REFERENCE_PACKAGE_PAYLOAD_CHANGES=0
REFERENCE_PACKAGE_IDENTITY_CHANGES=0
AD_PACKAGE_REFERENCE_SEED_GROUP_COUNT=1
AD_PACKAGE_REFERENCE_SEED_GROUP_ID=ads.reference.packages
AD_PACKAGE_REFERENCE_SEED_OWNER=ADS
AD_PACKAGE_REFERENCE_SEED_CLASSIFICATION=REFERENCE
AD_PACKAGE_REFERENCE_RECORD_COUNT=3
AD_PACKAGE_REFERENCE_LOOKUP_KEY=packageCode
NEW_AD_PACKAGE_REFERENCE_SEED_OUTPUT_KINDS=0
REFERENCE_PACKAGE_FINAL_OWNER_READY=YES
FINAL_PACKAGE_SEED_OWNER_COUNT=1
FINAL_PACKAGE_SEED_OWNER=ADS
AD_PACKAGE_EXECUTABLE_SEED_WRITER_COUNT=1
AD_PACKAGE_EXECUTABLE_SEED_WRITER=ads.reference.packages
LEGACY_AD_PACKAGE_EXECUTABLE_WRITER_COUNT=0

CENTRAL_SEED_AD_CAMPAIGNS_METHOD_EXISTS=NO
AD_CAMPAIGN_EXECUTABLE_FIXTURE_COUNT=0
NEW_AD_CAMPAIGN_SEEDGROUPS=0

AD_PACKAGE_RESET_TARGET_EXISTS=NO
AD_CAMPAIGN_RESET_TARGET_EXISTS=NO
AD_EVENTS_RESET_TARGET_EXISTS=YES
AD_EVENTS_PHASE8_CLASSIFICATION=RESET_ONLY_LEGACY_DEBT

CENTRAL_NORMAL_WRITE_METHOD_COUNT=0
CENTRAL_NORMAL_WRITE_METHODS=NONE
CENTRAL_BUSINESS_TABLE_COUNT=0
CENTRAL_BUSINESS_TABLES=NONE
CENTRAL_ORDINARY_BUSINESS_WRITES=0

CENTRAL_DEVSEEDSERVICE_RETIRED=NO
LEGACY_DEV_REMAINING_EXISTS=YES
LEGACY_USERS_DEPENDENCY_EXISTS=YES
POST_C3C4_BUSINESS_USER_ID_CONSUMER_COUNT=0
C4D_LEGACY_ACTOR_OR_DEPENDENCY_DEBT=LEGACY_ACTOR_MAP_AND_USERS_DEPENDENCY_REMAIN_STRUCTURALLY_PRESENT
C4D_REMAINING_DEBT=DEVSEEDSERVICE;LEGACY_DEV_REMAINING;LEGACY_USERS_DEPENDENCY;LEGACY_ACTOR_MAP;RESET_ALL;AD_EVENTS_RESET_TARGET

ADS_DOMAIN_RUNTIME_CHANGES=0
AD_PACKAGE_SCHEMA_CHANGES=0
AD_CAMPAIGN_SCHEMA_CHANGES=0
SCHEMA_CHANGES=0
MIGRATIONS_CREATED=0

AD_PACKAGE_REFERENCE_STARTUP_REGISTRATION=YES
AD_PACKAGE_REFERENCE_CLI_REGISTRATION=YES
CENTRAL_RUNNER_PACKAGE_TABLE_WRITES=0

P8_05C3C_IMPLEMENTATION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_05C4D_CENTRAL_RETIREMENT_AUTHORIZED=NO_WAITING_FOR_C3C4_MERGE_AND_REVIEW
~~~

## P8-05C3C4 Merged Status Authority Overlay

PR #142 merged the reviewed final central Package DEV writer retirement into
`develop`. This trailing overlay advances C4D authority while preserving every
earlier pending-review and waiting state as historical evidence.

~~~text
P8_05C3C3_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_141
P8_05C3C4_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_142
P8_05C3C_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_142
P8_05C4D_IMPLEMENTATION_AUTHORIZED=YES_AFTER_P8_05C3C4_PR_142_MERGE
CENTRAL_NORMAL_WRITE_METHOD_COUNT=0
CENTRAL_NORMAL_WRITE_METHODS=NONE
CENTRAL_BUSINESS_TABLE_COUNT=0
CENTRAL_BUSINESS_TABLES=NONE
CENTRAL_ORDINARY_BUSINESS_WRITES=0
AD_PACKAGE_EXECUTABLE_SEED_WRITER_COUNT=1
AD_PACKAGE_EXECUTABLE_SEED_WRITER=ads.reference.packages
POST_C3C4_BUSINESS_USER_ID_CONSUMER_COUNT=0
C4D_REMAINING_DEBT=DEVSEEDSERVICE;LEGACY_DEV_REMAINING;LEGACY_USERS_DEPENDENCY;LEGACY_ACTOR_MAP;RESET_ALL;AD_EVENTS_RESET_TARGET
~~~

## P8-05C4D Central Continuation And Reset Debt Retirement Implementation Overlay

The transition-only central service, its legacy SeedGroup adapter, obsolete
Users-output dependency and actor resolver, and the last central destructive
reset target are retired without replacement. Canonical owner-local groups and
the seed safety guard remain. The Ads-owned `ad_events` entity, repository,
recording use case, controller path, registry entry, and schema remain normal
runtime persistence outside seed ownership.

~~~text
P8_05C3C4_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_142
P8_05C3C_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_142
P8_05C4D_IMPLEMENTATION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_05C4D_BLOCKERS=NONE

DEVSEEDSERVICE_SOURCE_EXISTS=NO
DEVSEEDSERVICE_RUNTIME_REFERENCE_COUNT=0
DEVSEEDSERVICE_PROVIDER_REGISTRATION_COUNT=0
CENTRAL_DEVSEEDSERVICE_RETIRED=YES
CENTRAL_RESET_ALL_METHOD_EXISTS=NO

LEGACY_DEV_REMAINING_EXISTS=NO
LEGACY_DEV_REMAINING_RUNTIME_REFERENCE_COUNT=0
LEGACY_GROUP_METADATA_COUNT=0
LEGACY_ACTOR_MAP_EXISTS=NO
LEGACY_ACTOR_RESOLVER_EXISTS=NO
LEGACY_CONTINUATION_INTERFACE_EXISTS=NO
LEGACY_USERS_DEPENDENCY_EXISTS=NO
LEGACY_USER_ID_OUTPUT_LOOKUP_COUNT=0

USERS_DEV_SEED_GROUP_REMOVED=NO
USERS_DEV_SEED_RUNTIME_CHANGES=0
USERS_DEV_OUTPUT_CONTRACT_CHANGES=0

AD_EVENTS_RESET_TARGET_EXISTS=NO
CENTRAL_DESTRUCTIVE_RESET_METHOD_COUNT=0
CENTRAL_DESTRUCTIVE_RESET_TARGET_COUNT=0
AD_EVENTS_RUNTIME_TABLE_RETIRED=NO
AD_EVENTS_RUNTIME_PERSISTENCE_CHANGED=NO
AD_EVENTS_SCHEMA_CHANGED=NO

CENTRAL_NORMAL_WRITE_METHOD_COUNT=0
CENTRAL_NORMAL_WRITE_METHODS=NONE
CENTRAL_DESTRUCTIVE_RESET_METHOD_COUNT=0
CENTRAL_PERSISTENCE_CAPABLE_METHOD_COUNT=0
CENTRAL_BUSINESS_TABLE_COUNT=0
CENTRAL_BUSINESS_TABLES=NONE
CENTRAL_RESET_TARGET_COUNT=0

OWNER_LOCAL_SEED_GROUP_METADATA_COUNT=8
MISSING_DEPENDENCY_COUNT=0
DUPLICATE_SEED_GROUP_ID_COUNT=0
DEPENDENCY_CYCLE_COUNT=0

AD_PACKAGE_REFERENCE_SEED_GROUP_COUNT=1
AD_PACKAGE_REFERENCE_RECORD_COUNT=3
AD_PACKAGE_REFERENCE_LOOKUP_KEY=packageCode
REFERENCE_PACKAGE_SEED_RUNTIME_CHANGES=0
REFERENCE_PACKAGE_PAYLOAD_CHANGES=0
REFERENCE_PACKAGE_IDENTITY_CHANGES=0
AD_CAMPAIGN_EXECUTABLE_FIXTURE_COUNT=0

CANONICAL_SEED_ORCHESTRATOR_REMAINS=YES
SEED_ENVIRONMENT_GUARD_REMAINS=YES
LEGACY_GROUP_STARTUP_REGISTRATION=NO
LEGACY_GROUP_CLI_REGISTRATION=NO

BUSINESS_DOMAIN_RUNTIME_CHANGES=0
SCHEMA_CHANGES=0
MIGRATIONS_CREATED=0

P8_05_CENTRAL_DEV_SEED_DECOMPOSITION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
IDEMPOTENCY_VERIFIED=NOT_YET_VERIFIED
DISPOSABLE_DB_SEED_RUN_PASS=NOT_YET_VERIFIED
SECOND_SEED_RUN_NO_DUPLICATES=NOT_YET_VERIFIED
PHASE_08_COMPLETE=NO
~~~
