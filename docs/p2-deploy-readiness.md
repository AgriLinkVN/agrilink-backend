# P2 Product Deploy Readiness

Generated: 2026-07-18

Status: deploy is intentionally deferred. This document records what must be ready before turning the P2 Product module loose on staging or production.

## Current Decision

- `I2-10 Tự deploy product service lên staging`: FALSE, deferred.
- `I3-8 Cấu hình Cloudinary production key`: FALSE, deferred until production secrets are available.
- `I4-8 Deploy product module production + test search`: FALSE, deferred.

## Backend Readiness

Use `.env.example` as the source checklist for deployment variables.

P2-critical variables:

- `APP_PORT`
- `CORS_ORIGINS`
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS`
- `DB_SYNCHRONIZE=false`
- `JWT_SECRET`, `JWT_REFRESH_SECRET`
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_BUCKET`

Supporting variables:

- `ESMS_API_KEY`, `ESMS_SECRET_KEY` for OTP flows.
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` when Firebase Admin is not using application default credentials.
- `SENTRY_DSN` for error reporting.

## Pre-Deploy Checks

Run these before creating a staging or production release:

```bash
npm ci
npm run build
npm run migration:run
```

Production requirements:

- Keep `NODE_ENV=production`.
- Keep `DB_SYNCHRONIZE=false`.
- Use managed PostgreSQL or a backed-up VPS database.
- Make the frontend origin the only public frontend value in `CORS_ORIGINS`.
- Do not commit real service-account JSON files or API secrets.

## P2 Smoke Test

After deploy, verify these flows with real environment values:

1. Login as seller and confirm JWT-protected endpoints work.
2. `POST /api/v1/products` creates a draft product.
3. `POST /api/v1/products/:id/images` stores product images.
4. `POST /api/v1/products/:id/certifications` stores certification metadata/document paths.
5. `GET /api/v1/products/me` returns seller-owned products across all statuses.
6. `PATCH /api/v1/products/:id/status` supports `draft -> pending_approval`.
7. Login as admin/state agency and verify `GET /api/v1/products/certifications/pending`.
8. `PATCH /api/v1/products/certifications/:certId/verify` supports approve/reject.
9. Public `GET /api/v1/products` and `GET /api/v1/products/:id` still expose active products only.

## Known Gaps

- Product backend behavior is functionally present, but the Product module is still architecturally PARTIAL under `docs/architecture/clean-architecture-rules.md`.
- Product-specific contract/e2e tests are not in place yet. Add them before refactoring Product service boundaries.
- Production Cloudinary, Supabase, and DB secrets are not available in this workspace.
- No staging or production URL has been provided yet.

See `docs/p2-product-architecture-audit.md` for the Phase 0 architecture baseline and refactor plan.
