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
