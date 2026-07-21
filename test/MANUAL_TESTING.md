# Manual + integration test log — P6 (Forum, State Agency, Sentry)

Scope: everything dev6 (Trung) shipped in P6 — Forum module, State Agency
oversight endpoints, Sentry instrumentation. This is a record of what was
actually exercised against a real running server + Postgres instance, not
just `npm run build`. Automated e2e contract tests live in
[`forum.e2e-spec.ts`](./forum.e2e-spec.ts) and
[`admin-state-agency.e2e-spec.ts`](./admin-state-agency.e2e-spec.ts); this
file documents the scenarios that need a real database, and the bugs each
round of testing found.

## How to reproduce this locally

```bash
docker run -d --name agrilink-test-pg \
  -e POSTGRES_USER=agrilink -e POSTGRES_PASSWORD=agrilink_dev_2025 \
  -e POSTGRES_DB=agrilink_db -p 5434:5432 postgres:16-alpine

cd agrilink-backend
DB_PORT=5434 SUPABASE_URL=http://localhost:54321 SUPABASE_SERVICE_KEY=dummy \
  npm run start:dev
```

`SUPABASE_URL`/`SUPABASE_SERVICE_KEY` only need to be non-empty — the
storage module fails fast on boot otherwise, unrelated to P6.

---

## Round 1 — first live pass (found 3 bugs, all fixed in PR #59)

| # | Scenario | Steps | Result before fix | Result after fix |
|---|---|---|---|---|
| 1 | Unauthenticated request to a protected route | `curl /api/v1/admin/audit-logs` with no `Authorization` header | **Whole Nest process crashed** (`AllExceptionsFilter` re-threw `HttpException`, uncaught) | `401 {"message":"Invalid or expired token"}`, server stays up |
| 2 | Anonymous browse of forum | `curl /api/v1/forum/posts` with no token | `401` (missing `@Public()`) — forum unusable for guests | `200`, empty/populated list |
| 3 | State agency views suspended products | Register `state_agency` user, login, `GET /admin/products/violating` | `500 Internal server error` (`relations: ['seller']` doesn't exist on `Product`) | `200`, `seller.fullName` correctly attached |

Full walkthrough for #3, which needed a real row to prove the fix:

```bash
# 1. Register + login a farmer, create a product
curl -X POST localhost:3001/api/v1/auth/register -H 'Content-Type: application/json' \
  -d '{"phone":"+84901234567","password":"Test@1234","fullName":"Nguyen Van A","role":"farmer"}'
curl -X POST localhost:3001/api/v1/auth/login -H 'Content-Type: application/json' \
  -d '{"phone":"+84901234567","password":"Test@1234"}'
curl -X POST localhost:3001/api/v1/products -H "Authorization: Bearer $FARMER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Rau cai xanh","description":"San pham test","pricePerUnit":10000,"unit":"kg","availableQuantity":100}'

# 2. Force it into a violating state directly (no moderation UI in scope yet)
docker exec agrilink-test-pg psql -U agrilink -d agrilink_db -c \
  "UPDATE products SET status='suspended', rejection_reason='Vi phạm chính sách chất lượng' WHERE id='<id>';"

# 3. Register + login a state_agency user, fetch violating products
curl localhost:3001/api/v1/admin/products/violating -H "Authorization: Bearer $STATE_TOKEN"
# => data[0].seller.fullName === "Nguyen Van A"
```

## Round 2 — writing the e2e suite surfaced a 4th bug

While writing `forum.e2e-spec.ts`, the "forwards category/search filters"
test failed against the real `ValidationPipe` config
(`whitelist: true, forbidNonWhitelisted: true` in `main.ts`), not just the
mocked-service harness:

| # | Scenario | Steps | Result before fix | Result after fix |
|---|---|---|---|---|
| 4 | Forum category filter / search | `curl '/api/v1/forum/posts?category=market&search=gia'` | `400 {"message":["property category should not exist","property search should not exist"]}` — filter and search **completely non-functional** | `200`, filters applied |

Root cause: `listPosts(@Query() pagination: PaginationDto, @Query('category') category?, @Query('search') search?)`
mixed a whitelisted DTO param with two loose `@Query('x')` params. Nest's
global pipe validates the *entire* incoming query string against the DTO
param, so `category`/`search` looked like unrecognized extra keys. Fixed by
introducing `ListForumPostsDto extends PaginationDto` with `category`/
`search` as validated optional fields, and binding the whole query to that
one DTO.

Verified live:

```bash
curl "localhost:3001/api/v1/forum/posts?category=market&search=gia" -w '\n%{http_code}\n'
# => 200 {"data":{"data":[],"total":0}, ...}
```

---

## Scenario matrix — what's covered where

| Area | Scenario | Covered by |
|---|---|---|
| Forum | Public browse (list/detail/comments) reachable with no token | `forum.e2e-spec.ts`, live curl |
| Forum | Category filter + search work together | `forum.e2e-spec.ts` (`ListForumPostsDto`), live curl (Round 2) |
| Forum | Create post — title/content length, category enum, imageUrls URL validation | `forum.e2e-spec.ts` |
| Forum | Create post rejects server-controlled fields (`isHidden`, `likeCount`) from client input | `forum.e2e-spec.ts` |
| Forum | Update/delete only by the post's author (403 otherwise) | `forum.e2e-spec.ts`, live curl |
| Forum | Moderation (`/moderate`) restricted to `admin`/`state_agency` | `forum.e2e-spec.ts` |
| Forum | Like toggles on/off idempotently and updates `likeCount` | `forum.e2e-spec.ts` (mocked), live curl (real counter increment/decrement) |
| Forum | Comment add/delete, `commentCount` increments/decrements | live curl (real DB) |
| Forum | View count increments on `GET /posts/:id` | live curl (real DB) |
| Forum | Comment on a missing post 404s, not crashes | `forum.e2e-spec.ts` |
| Admin | RBAC: `admin`/`state_agency` allowed, other roles 403 | `admin-state-agency.e2e-spec.ts`, live curl |
| Admin | `audit-logs` reachable by `state_agency` (previously admin-only) | `admin-state-agency.e2e-spec.ts`, live curl |
| Admin | `products/violating` returns `seller.fullName` from a plain `sellerId` FK | `admin-state-agency.e2e-spec.ts` (mocked), live curl (real join via `attachSellers`) |
| Admin | `products/violating` / `cooperatives-enterprises` handle empty results without erroring | `admin-state-agency.e2e-spec.ts`, live curl |
| Admin | `products/violating` with a seller that no longer resolves → `seller: null`, not a crash | `admin-state-agency.e2e-spec.ts` |
| Admin | PDF export streams `application/pdf` with correct headers | `admin-state-agency.e2e-spec.ts` (mocked bytes), live curl (real pdfkit output, verified with `file` — "PDF document, version 1.3, 1 page(s)") |
| Admin | PDF export failure surfaces as 500 without crashing the process | `admin-state-agency.e2e-spec.ts` |
| Cross-cutting | Any 401/403/404 from a protected route no longer crashes the process | `forum.e2e-spec.ts`, `admin-state-agency.e2e-spec.ts`, live curl (this was the Round 1 #1 regression) |
| Sentry | `initSentry()` no-ops without `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN` set | live boot log: `[Sentry] SENTRY_DSN not set — error tracking disabled` |
| SEO | `/sitemap.xml`, `/robots.txt` build and serve | `agrilink-frontend`: `npm run build` route table (both listed), manual browser check |

## Known gaps (not covered, flagged for whoever picks this up next)

- No automated test creates a *real* suspended product end-to-end through
  the moderation flow — Round 1 #3's reproduction forced the state directly
  in Postgres because there's no `PATCH /products/:id/status` exposed to
  `state_agency` in this scope. If that endpoint is added, extend the e2e
  suite to drive suspension through the API instead of raw SQL.
- Forum image upload (Cloudinary) is frontend-only in this scope; no
  backend test exercises `uploadToCloudinary`.
- Load/concurrency behavior of `likeCount`/`commentCount` increment-decrement
  (potential race under concurrent requests) was not tested — TypeORM's
  `increment`/`decrement` use atomic SQL (`col = col + 1`), which is safe
  against races, but this wasn't verified under actual concurrent load.
