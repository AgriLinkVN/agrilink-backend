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
