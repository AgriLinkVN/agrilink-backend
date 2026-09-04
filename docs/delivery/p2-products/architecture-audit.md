# P2 Product Architecture Audit

Generated: 2026-07-18

Baseline: `develop` at `b706b52`

Phase: `0-9 completed; Product core final acceptance recorded`

Scope: backend P2 Product module and adjacent P2 upload/storage boundary. Frontend SEO, image optimization, skeleton loading, mobile responsive work, and deploy work are tracked separately.

## Executive Summary

P2 Product core is functionally broad enough for the current sprint acceptance and meets the backend Clean Architecture rules in the touched Product scope. Storage/upload remains a separate partial boundary and is not included in this Product-core conclusion.

The original highest-risk file was `src/modules/products/application/products.service.ts`, which mixed product CRUD, catalog queries, seller product management, images, certifications, wishlist, status transitions, notifications, raw SQL projections, TypeORM repositories, transactions, and seed data. Phases 1-8 moved runtime product behavior behind application models, outbound ports, infrastructure adapters, focused use cases, domain policies, an opt-in development seed service, and infrastructure-owned persistence entities. `ProductsService` is now a controller compatibility facade only.

The safest refactor path is incremental:

1. Preserve current behavior with contract tests.
2. Introduce application models and use-case input/result types.
3. Move TypeORM and raw SQL behind outbound ports.
4. Split the large service into focused use cases.
5. Move persistence entities out of the domain layer only after tests and ports are stable.

Phase 0 intentionally changed documentation only. Phases 1-4 preserve the public API contract while changing internal boundaries.

## Current Refactor Progress

| Phase | Status | Result |
| --- | --- | --- |
| 0 - Audit and baseline docs | Complete | Scope, risks, acceptance matrix, and incremental plan documented. |
| 1 - Product contract tests | Complete | Product REST contract tests and product unit tests protect the public flow. |
| 2 - Application models | Complete | Application uses product input/result models and does not import presentation DTOs. |
| 3 - Repository and query ports | Complete | TypeORM/query builder/raw SQL code is isolated in `infrastructure/repositories`. |
| 4 - Focused use cases | Complete | Product CRUD, catalog, images, certifications, status, wishlist, and categories each have a focused use-case class. |
| 5 - Domain rules and typed errors | Complete | Seller role, status transition, certification verification, and wishlist policy are pure domain policies; controllers map typed errors to HTTP exceptions. |
| 6 - Transaction and side-effect hardening | Complete | Atomic Product creation is explicit through `createAtomically`, status notification occurs only after persistence, and wishlist writes use conflict-safe insertion. |
| 7 - Seed and dev flow cleanup | Complete | Seed orchestration lives in infrastructure, startup is opt-in, reset is explicitly gated, and seed endpoints are removed from the public API. |
| 8 - Persistence split | Complete | TypeORM entities are in infrastructure persistence; application ports and use cases expose only application models. |
| 9 - Final acceptance docs | Complete | Product core accepted as Clean Architecture compliant; Storage/upload and deploy remain explicitly separate. |

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
- `src/modules/products/application/models/product.model.ts`
- `src/modules/products/infrastructure/persistence/entities/*`
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
| Presentation to application dependency | Compliant | Controllers use a thin `ProductsService` compatibility facade that delegates to focused use cases and maps typed application errors to HTTP exceptions; it has no Product business logic. | Preserve the thin boundary or remove it in a future non-functional cleanup. |
| Application independent from presentation | Compliant | Application uses `application/models` and has no presentation DTO/schema imports. | Preserve this boundary. |
| Application independent from TypeORM | Compliant | Product application code accesses persistence through outbound ports only. | Preserve this boundary. |
| Raw SQL placement | Compliant | Seller/profile/location projections are implemented by the infrastructure query adapter. | Preserve this boundary. |
| Domain persistence separation | Compliant | TypeORM entities live in `infrastructure/persistence/entities`; the Product domain contains only policies and typed errors. | Preserve the boundary. |
| Application persistence contract | Compliant | Repository/query ports and focused use cases use `application/models/product.model.ts`, never persistence entity types. | Add a mapper only if a future persistence shape diverges. |
| Use-case size | Compliant | Focused use cases own runtime behavior; domain policies own seller role, status, certification, and wishlist rules; the compatibility facade delegates only. Development seed orchestration lives in infrastructure. | Preserve the split. |
| Cross-module notification | Compliant | `ChangeProductStatusUseCase` publishes through `NOTIFICATION_PUBLISHER` after persistence succeeds, covered by a unit test. | Preserve the order when adding transactions in Phase 6. |
| Storage/upload boundary | Partial | Storage has image/file interfaces and infrastructure adapters, but ports are under `domain/interfaces`; application imports `CLOUDINARY_FOLDERS` and `PresignDto`; controller imports infrastructure config. | Move storage ports to `application/ports/outbound`; use application input models; keep Cloudinary/Supabase details in infrastructure. |
| Product tests | Compliant | Product use-case, repository, development-seed, and REST contract tests cover the accepted behavior. | Add real-database integration coverage when deployment work begins. |

## P2 Task Acceptance Matrix

| Iteration | Task | Functional Status | Architecture Status | Notes |
| --- | --- | --- | --- | --- |
| I1-8 | DB entity + seed product categories | TRUE | TRUE | Accepted: entities are infrastructure-owned and development seeding is opt-in with no public endpoint. |
| I1-9 | Cloudinary config + upload service | TRUE | PARTIAL | Cloudinary/Supabase adapters exist behind interfaces, but Storage still has legacy boundary issues. This does not block Product refactor, but should be cleaned when Storage is touched. |
| I1-10 | Basic Product CRUD API | TRUE | TRUE | Accepted: seller-aware CRUD uses ports, focused use cases, typed errors, presentation error mapping, and atomic persistence. |
| I2-7 | Product search and filters | TRUE | TRUE | Accepted: public catalog remains active-only and catalog querying is behind an infrastructure query port. |
| I2-9 | Wishlist API | TRUE | TRUE | Accepted: add/remove/list/ids use focused use cases, an active-product policy, and conflict-safe persistence. |
| I3-5 | Product status flow | TRUE | TRUE | Accepted: transition policy is domain-owned and notification is published only after persistence. |
| I3-7 | Certification badge + verify flow | TRUE for backend verify flow | TRUE | Accepted: pending/verify behavior uses a dedicated verification policy and presentation error mapping. |
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

Status: Complete

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

Status: Complete

Deliverables:

- Use an explicit transaction abstraction only where atomicity is required. Product creation uses the narrow `ProductRepositoryPort.createAtomically` contract rather than a generic `UnitOfWorkPort`, because it is one aggregate persistence operation.
- Product create with images/certifications is atomic.
- Status update persists before notification publishing.
- Wishlist add/remove remains idempotent and safe under duplicate calls.

Acceptance:

- No controllers open transactions.
- Product creation retains a narrow atomic persistence contract; no generic Unit of Work is introduced without a multi-repository workflow.
- Notification side effects are covered by unit tests with mocked ports.

### Phase 7 - Seed and Dev Flow Cleanup

Recommended branch: `feature/p2-product-seed-cleanup`

Status: Complete

Deliverables:

- Move Product seed orchestration out of `ProductsService`.
- Replace public dev seed endpoints with a safer dev-only or admin-only mechanism.
- Stop `main.ts` from depending on a concrete Product application service for startup seed behavior.

Acceptance:

- Seed behavior remains available for local development.
- Production cannot trigger seed/reset through public endpoints.

### Phase 8 - Persistence Split

Recommended branch: `feature/p2-product-persistence-split`

Status: Complete

Deliverables:

- Moved TypeORM entities from `domain/entities` to `infrastructure/persistence/entities`.
- Added application-facing Product, category, image, certification, and wishlist models for all repository/query port contracts.
- Kept application/domain free of TypeORM decorators. The current persistence and application shapes are structurally compatible, so an extra mapper would only duplicate data without protecting a distinct shape.

Acceptance:

- `rg -n "from 'typeorm'|from \"typeorm\"" src/modules/products/domain` returns no matches.
- Product unit, repository, and REST contract tests pass.

### Phase 9 - Final Acceptance Docs

Recommended branch: `feature/p2-product-acceptance-docs`

Status: Complete

Deliverables:

- Added `final-acceptance.md` with a Product-core acceptance decision and verification evidence.
- Marked accepted Product-core backend tasks as architecture `TRUE` after Phase 8 boundary checks and Product tests passed.
- Kept Storage/upload `PARTIAL` and deploy items `FALSE` until their own conditions are met.

Acceptance:

- Sprint docs distinguish functional completion from architecture completion.
- Remaining FE/deploy work is not mixed with backend architecture status.

## Recommended Immediate Next Step

No additional Product-core architecture phase is required. Use `final-acceptance.md` as the acceptance record; handle Storage and deployment in their dedicated scopes.
