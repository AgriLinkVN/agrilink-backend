# P2 Product Architecture Audit

Generated: 2026-07-18

Baseline: `develop` at `7aac989`

Phase: `0 - audit, acceptance baseline, and refactor plan`

Scope: backend P2 Product module and adjacent P2 upload/storage boundary. Frontend SEO, image optimization, skeleton loading, mobile responsive work, and deploy work are tracked separately.

## Executive Summary

P2 Product is functionally broad enough for the current sprint acceptance, but it is only partially aligned with the backend Clean Architecture rules.

The highest-risk file is `src/modules/products/application/products.service.ts`. It currently acts as a large application service that mixes product CRUD, catalog queries, seller product management, images, certifications, wishlist, status transitions, notifications, raw SQL projections, TypeORM repositories, transactions, and seed data.

The safest refactor path is incremental:

1. Preserve current behavior with contract tests.
2. Introduce application models and use-case input/result types.
3. Move TypeORM and raw SQL behind outbound ports.
4. Split the large service into focused use cases.
5. Move persistence entities out of the domain layer only after tests and ports are stable.

Phase 0 intentionally changes documentation only. No runtime behavior is changed.

## Clean Architecture Baseline

The current project rule is documented in `docs/architecture/clean-architecture-rules.md`.

Relevant target rules:

- Presentation validates HTTP input and calls application use cases.
- Application must not import `presentation/dto`, `presentation/schemas`, TypeORM repositories, `DataSource`, `EntityManager`, `QueryRunner`, or REST response DTOs.
- Infrastructure owns TypeORM entities, repositories, raw SQL, query adapters, storage adapters, and external providers.
- Domain models must not have TypeORM, Swagger, or class-validator decorators.
- One use case should perform one main business behavior.
- Raw SQL belongs only in infrastructure.
- New or changed behavior should have use-case or contract tests.

## Current Module Map

Product module:

- `src/modules/products/products.module.ts`
- `src/modules/products/presentation/controllers/products.controller.ts`
- `src/modules/products/presentation/controllers/wishlist.controller.ts`
- `src/modules/products/presentation/schemas/*`
- `src/modules/products/application/products.service.ts`
- `src/modules/products/domain/entities/*`
- `src/modules/products/infrastructure/database/seeds/*`

Adjacent P2 upload/storage boundary:

- `src/modules/storage/storage.module.ts`
- `src/modules/storage/presentation/controllers/storage.controller.ts`
- `src/modules/storage/application/storage.service.ts`
- `src/modules/storage/domain/interfaces/*`
- `src/modules/storage/infrastructure/cloudinary/*`
- `src/modules/storage/infrastructure/supabase/*`

## Rule Compliance Scorecard

| Area | Current Status | Evidence | Target |
| --- | --- | --- | --- |
| Presentation to application dependency | Partial | Controllers inject concrete `ProductsService`; controllers are mostly thin, but `ProductsController.resolveSellerType` contains role-to-seller business mapping. | Controllers call focused use cases or a thin application facade. Role-to-seller policy moves to application/domain. |
| Application independent from presentation | Not compliant | `ProductsService` imports `CreateProductDto`, `UpdateProductDto`, `ProductFilterDto`, `WishlistQueryDto`, certification DTOs, and `ProductDetailResponse` from `presentation/schemas`. | Application receives application input models and returns application result models. |
| Application independent from TypeORM | Not compliant | `ProductsService` injects `Repository<T>`, `DataSource`, and uses `createQueryBuilder`, `transaction`, `manager`, and `query`. | TypeORM usage moves to infrastructure repository/query adapters behind outbound ports. |
| Raw SQL placement | Not compliant | Seller/profile/location projections use `dataSource.query` inside `ProductsService`. | Raw SQL moves to an infrastructure query adapter such as `ProductDetailQueryPort`. |
| Domain persistence separation | Legacy partial | `domain/entities/*` are TypeORM entities with decorators. | Keep temporarily during early phases; move to `infrastructure/persistence/entities` after ports and tests are stable. |
| Use-case size | Not compliant | `ProductsService` contains category, seed, create, list, mine, detail, update, status, image, certification, wishlist, and mock data behavior. | Split into focused use cases. |
| Cross-module notification | Mostly compliant | Product uses `NOTIFICATION_PUBLISHER` inbound port from Notification module. | Keep the port, but trigger notification from a focused status use case after persistence succeeds. |
| Storage/upload boundary | Partial | Storage has image/file interfaces and infrastructure adapters, but ports are under `domain/interfaces`; application imports `CLOUDINARY_FOLDERS` and `PresignDto`; controller imports infrastructure config. | Move storage ports to `application/ports/outbound`; use application input models; keep Cloudinary/Supabase details in infrastructure. |
| Product tests | Not compliant | No product-specific `*.spec.ts` or `*.e2e-spec.ts` files exist under `src/modules/products`. | Add contract/e2e tests before refactoring behavior. |

## P2 Task Acceptance Matrix

| Iteration | Task | Functional Status | Architecture Status | Notes |
| --- | --- | --- | --- | --- |
| I1-8 | DB entity + seed product categories | TRUE | PARTIAL | Entities and seed exist, but Product persistence entities are in `domain/entities`; seed logic is still reachable through `ProductsService` and startup logic. |
| I1-9 | Cloudinary config + upload service | TRUE | PARTIAL | Cloudinary/Supabase adapters exist behind interfaces, but Storage still has legacy boundary issues. This does not block Product refactor, but should be cleaned when Storage is touched. |
| I1-10 | Basic Product CRUD API | TRUE | PARTIAL | CRUD endpoints exist, seller authorization exists, but application uses presentation DTOs and TypeORM directly. |
| I2-7 | Product search and filters | TRUE | PARTIAL | Public catalog is active-only by default, matching the latest decision. Query logic is still in application service and lacks contract tests. |
| I2-9 | Wishlist API | TRUE | PARTIAL | Add/remove/list/ids endpoints exist. Wishlist behavior is mixed into `ProductsService` and lacks repository ports/tests. |
| I3-5 | Product status flow | TRUE | PARTIAL | Status transitions and notification publishing exist. Status policy and side effect should move to a focused use case with tests. |
| I3-7 | Certification badge + verify flow | TRUE for backend verify flow | PARTIAL | Admin/state-agency pending and verify endpoints exist. Certification behavior is mixed into `ProductsService` and lacks tests. |
| I2-10 | Product staging deploy | FALSE | OUT OF SCOPE | Deferred by project decision. |
| I3-8 | Cloudinary production key | FALSE | OUT OF SCOPE | Deferred until production secrets are available. |
| I4-8 | Product production deploy + search test | FALSE | OUT OF SCOPE | Deferred by project decision. |

Frontend P2 items such as multi-step product creation, marketplace page, detail/contact page, SEO metadata, image optimization, skeleton loading, and mobile responsive work are not evaluated in this backend architecture audit.

## Key Risks If Refactor Starts Without Phase 1 Tests

1. Public marketplace can accidentally expose non-active products.
2. Seller list behavior can lose access to draft, pending, rejected, or out-of-stock products.
3. Product detail can lose seller profile/contact projection because it currently relies on raw SQL.
4. Certification verify behavior can regress silently.
5. Wishlist idempotency can break without obvious compile errors.
6. Product status notification may be emitted before persistence succeeds if side effects are moved carelessly.
7. Startup seed behavior may change local development data unexpectedly.

## Architecture Decision

Decision: refactor P2 Product incrementally instead of moving all entities, ports, use cases, and adapters in one PR.

Options considered:

| Option | Pros | Cons | Decision |
| --- | --- | --- | --- |
| Big-bang rewrite | Ends with a cleaner final shape faster on paper. | High regression risk, hard PR review, likely to break FE contracts. | Rejected. |
| Contract tests first, then ports/use cases | Preserves behavior, smaller PRs, easier review. | Takes more phases and temporarily keeps legacy code. | Chosen. |
| Only document and leave as-is | Lowest short-term risk. | Product remains hard to maintain and hard to test. | Rejected after Phase 0. |

Rationale:

- Product is already used by FE marketplace, seller pages, wishlist, certification, and status flows.
- The current service has many reasons to change; splitting it gradually follows the project rule against large mixed application services.
- Moving persistence entities before tests would create broad import churn without proving behavior is preserved.

## Phase Plan

### Phase 0 - Audit and Baseline Docs

Branch: `feature/p2-product-architecture-audit`

Deliverables:

- Product architecture audit document.
- Updated deploy/readiness notes.
- Clear task status matrix.
- No runtime behavior changes.

Acceptance:

- Docs explain why P2 is functionally TRUE but architecturally PARTIAL.
- Docs identify the exact next phase.
- Build still passes.

### Phase 1 - Product Contract Tests

Recommended branch: `feature/p2-product-contract-tests`

Deliverables:

- E2E/contract tests for public product catalog:
  - `GET /api/v1/products` returns active products only for guest/public access.
  - Search, category, province, farming type, price, featured, sort, and pagination keep current behavior.
  - Public seller listing still stays active-only.
- E2E/contract tests for seller product management:
  - `POST /api/v1/products` creates draft product for seller roles.
  - `GET /api/v1/products/me` returns seller-owned products across statuses.
  - `PATCH /api/v1/products/:id` enforces ownership.
  - `DELETE /api/v1/products/:id` preserves current soft-delete/draft behavior.
- Tests for status flow:
  - Seller can submit `draft -> pending_approval`.
  - Admin/state agency can approve `pending_approval -> active`.
  - Invalid transitions are rejected.
  - Seller cannot update another seller's product.
- Tests for certification verify:
  - Admin/state agency can list pending certifications.
  - Verify supports approved/rejected with rejection reason rules.
- Tests for wishlist:
  - Add, remove, list, and ids endpoints keep current idempotency and active-product restriction.

Acceptance:

- Product tests fail on a known intentional contract break.
- Existing notification tests still pass.
- Build passes.

### Phase 2 - Application Models and Input Contracts

Recommended branch: `feature/p2-product-application-models`

Deliverables:

- Add `src/modules/products/application/models/*`.
- Add use-case input/result interfaces for product create/update/list/detail/status/certification/wishlist.
- Controller maps HTTP DTOs to application inputs.
- Application no longer imports `presentation/schemas`.

Acceptance:

- `rg -n "presentation/schemas|presentation/dto" src/modules/products/application` returns no matches.
- Product contract tests from Phase 1 pass.
- Public API response shape is unchanged.

### Phase 3 - Repository and Query Ports

Recommended branch: `feature/p2-product-repository-ports`

Deliverables:

- Add outbound ports under `src/modules/products/application/ports/outbound`.
- Move TypeORM repository/query builder/raw SQL behavior into infrastructure adapters.
- Add query ports for catalog listing, seller listing, detail projection, category tree, certification, wishlist, and image operations.

Acceptance:

- `rg -n "typeorm|DataSource|Repository<|InjectRepository|createQueryBuilder|\\.query\\(" src/modules/products/application` returns no matches.
- Public and seller query behavior remains unchanged.
- Product contract tests pass.

### Phase 4 - Focused Use Cases

Recommended branch: `feature/p2-product-use-cases`

Deliverables:

- Replace the large `ProductsService` with focused use cases:
  - `CreateProductUseCase`
  - `ListPublicProductsUseCase`
  - `GetProductDetailUseCase`
  - `ListSellerProductsUseCase`
  - `UpdateProductUseCase`
  - `DeleteProductUseCase`
  - `ChangeProductStatusUseCase`
  - `AddProductImageUseCase`
  - `RemoveProductImageUseCase`
  - `AddProductCertificationUseCase`
  - `RemoveProductCertificationUseCase`
  - `ListPendingProductCertificationsUseCase`
  - `VerifyProductCertificationUseCase`
  - `AddWishlistItemUseCase`
  - `RemoveWishlistItemUseCase`
  - `ListWishlistUseCase`
  - `ListWishlistedProductIdsUseCase`
  - `ListProductCategoriesUseCase`
  - `GetProductCategoryTreeUseCase`
- Controllers call use cases directly or through a thin facade.
- `ProductsModule` stops exporting concrete `ProductsService` unless a transitional seed compatibility adapter is still required.

Acceptance:

- `ProductsService` is removed or reduced to a temporary facade with no business logic.
- Use cases have independent unit tests where rules exist.
- Contract tests pass.

### Phase 5 - Domain Rules and Typed Errors

Recommended branch: `feature/p2-product-domain-rules`

Deliverables:

- Move seller role to seller type mapping out of controller.
- Extract status transition policy.
- Extract certification verification policy.
- Extract wishlist idempotency and active-product rule.
- Add application/domain errors:
  - `ProductNotFoundError`
  - `ProductForbiddenError`
  - `InvalidProductStatusTransitionError`
  - `ProductCertificationNotFoundError`
  - `InvalidProductCertificationVerificationError`
  - `WishlistProductUnavailableError`
- Controllers map typed errors to HTTP exceptions.

Acceptance:

- Application does not throw Nest HTTP exceptions in touched use cases.
- Ownership and invalid transition tests pass.

### Phase 6 - Transaction and Side-Effect Hardening

Recommended branch: `feature/p2-product-transactions`

Deliverables:

- Add `UnitOfWorkPort` only where atomicity is required.
- Product create with images/certifications is atomic.
- Status update persists before notification publishing.
- Wishlist add/remove remains idempotent and safe under duplicate calls.

Acceptance:

- No controllers open transactions.
- Application uses transaction abstraction only where needed.
- Notification side effects are covered by unit tests with mocked ports.

### Phase 7 - Seed and Dev Flow Cleanup

Recommended branch: `feature/p2-product-seed-cleanup`

Deliverables:

- Move Product seed orchestration out of `ProductsService`.
- Replace public dev seed endpoints with a safer dev-only or admin-only mechanism.
- Stop `main.ts` from depending on a concrete Product application service for startup seed behavior.

Acceptance:

- Seed behavior remains available for local development.
- Production cannot trigger seed/reset through public endpoints.

### Phase 8 - Persistence Split

Recommended branch: `feature/p2-product-persistence-split`

Deliverables:

- Move TypeORM entities from `domain/entities` to `infrastructure/persistence/entities`.
- Keep application/domain models free of TypeORM decorators.
- Add mappers only where persistence shape differs from application results.

Acceptance:

- `rg -n "from 'typeorm'|from \"typeorm\"" src/modules/products/domain` returns no matches.
- Product contract tests pass.

### Phase 9 - Final Acceptance Docs

Recommended branch: `feature/p2-product-acceptance-docs`

Deliverables:

- Update P2 acceptance status after refactor.
- Mark backend Product architecture status as TRUE only after Phase 8 acceptance passes.
- Keep deploy items FALSE until staging/production secrets and URLs exist.

Acceptance:

- Sprint docs distinguish functional completion from architecture completion.
- Remaining FE/deploy work is not mixed with backend architecture status.

## Recommended Immediate Next Step

Start Phase 1 next. Do not refactor Product behavior before Product contract tests exist.

Phase 1 should be the first code-changing PR because it gives the team a safety net for the later clean architecture work.
