# P5 Clean Architecture Plan

Scope: P5 Ads, Notifications, Reviews, and the cross-module contracts they need.

Long-term backend rules: see `docs/architecture/clean-architecture-rules.md`.

## Architecture Direction

AgriLink should stay a modular monolith for now. The team is not at a point where splitting services is worth the operational cost, but each module should be designed as if it could be extracted later.

Target layering inside a backend module:

1. `presentation`: controllers, gateways, HTTP/WebSocket DTOs.
2. `application`: use cases and orchestration.
3. `domain`: domain types, entities, business rules, policies, and domain errors.
4. `infrastructure`: TypeORM repositories, storage, realtime adapters, external APIs.

Dependency rule:

- `presentation` calls `application`.
- `application` depends on inbound/outbound ports, not concrete TypeORM repositories or gateways.
- `infrastructure` implements application outbound ports, or domain abstractions only when the abstraction is truly a domain concept.
- Cross-module calls should use exported ports, not concrete services, when the dependency is part of a business event contract.

Practical compromise for this project:

- Existing legacy TypeORM entities may remain in module-level `entities` or `domain/entities` during the current sprint, but new P5 code should keep persistence entities inside `infrastructure/persistence`.
- Do not add a separate mapper layer everywhere yet. Add it only when persistence shape and API/domain shape start diverging heavily.
- New P5 work should introduce application ports first for repository, event publishing, and cross-module notification publishing.

## Phase Plan

### Phase 1 - Notification Contract And Ports

Branch: `feature/p5-notification-contract`

Status: Complete. Notification contract and Clean Architecture port work were merged through PRs #37, #39, and #41.

Goal:

- Make backend notification API match the FE contract.
- Introduce notification ports so other modules publish notifications through an interface.
- Keep legacy endpoints where already exposed.

Acceptance:

- `GET /notifications` returns paginated notifications.
- `GET /notifications/unread` returns unread notifications.
- `GET /notifications/count` returns `{ count }`.
- `PATCH /notifications/:id/read` marks one notification and emits `marked_read`.
- `PATCH /notifications/mark-all-read` marks all notifications.
- `PATCH /notifications/read-all` remains as legacy 204 endpoint.
- WebSocket namespace `/notifications` emits `new_notification`, `marked_read`, and `all_notifications_read`.
- P5 notification enum values exist: `new_review`, `review_reply`, `ad_approved`, `ad_rejected`.
- Product module uses `NOTIFICATION_PUBLISHER` instead of depending on the concrete notification service.
- Notification repository and realtime ports return/use notification models or DTO payloads, not TypeORM entities.
- Notification cross-module publisher is an application inbound port, while repository and realtime dependencies are application outbound ports.
- Notification application models and application errors are kept outside the domain layer because they represent use-case results and ownership-aware lookup failures rather than domain invariants.

### Phase 2 - Ads Backend Contract

Branch: `feature/p5-ads-backend-contract`

Status: Complete.

Goal:

- Port the useful Ads logic from `origin/Tinvv` onto current `develop` without merging stale branch structure.
- Align BE with existing FE calls.

Acceptance:

- Public package list works: `GET /ads/packages`.
- Supplier campaign CRUD works: `POST/GET /ads/campaigns`, `GET /ads/campaigns/:id`.
- Supplier pause/resume works: `PATCH /ads/campaigns/:id/pause|resume`.
- Public banners work: `GET /ads/banners`.
- Event tracking works: `POST /ads/events`.
- Ads service depends on repository ports, not direct repository usage from presentation.

Delivered:

- Replaced the Ads TODO service with focused application use cases and an `AdsRepositoryPort` implementation.
- Moved Ads TypeORM entities into `infrastructure/persistence/entities` and aligned their fields with the existing database/FE contract.
- Added supplier ownership checks, active-package validation, pause/resume state policies, active banner lookup, and best-effort anonymous event recording.
- Added unit and REST contract tests for the Phase 2 routes.
- Deliberately excluded admin moderation, approval notifications, analytics, Redis rate limiting, and package administration; they belong to later P5 phases.

### Phase 3 - Ads Moderation

Branch: `feature/p5-ads-moderation`

Status: Complete.

Goal:

- Complete admin approval flow for campaigns.

Acceptance:

- Admin list/detail works: `GET /ads/admin/campaigns`, `GET /ads/admin/campaigns/:id`.
- Admin approve/reject works.
- Approval emits `ad_approved`; rejection emits `ad_rejected`.
- Rejection reason is persisted and shown to supplier.

Delivered:

- Added admin-only moderation list/detail endpoints with pagination and optional status filtering.
- Added explicit approve/reject use cases, with the `pending_approval` transition rule kept in the Ads domain policy.
- Enforced that transition again in the persistence update, preventing concurrent moderators from recording two decisions.
- Persisted the moderation decision before publishing the cross-module notification through `NotificationPublisherPort`.
- Stored approver, approval timestamp, scheduled run dates, and rejection reason on the campaign.
- Added unit coverage for transition validation, persistence-before-publish ordering, and persistence failure; added REST contract coverage for all admin routes.

Next: Phase 4 - Reviews Contract.

### Phase 4 - Reviews Contract

Goal:

- Complete review API expected by FE.

Acceptance:

- Public product reviews work with pagination and rating stats.
- Buyer can create one review per product.
- Seller inbox works: `GET /reviews/seller/me`.
- Seller reply works with ownership check.
- Admin review moderation works: hide/unhide with reason.

### Phase 5 - Rating And Trust Score

Goal:

- Make reviews affect product and seller reputation.

Acceptance:

- Product `avg_rating` updates after review create/delete/hide/unhide.
- Seller/farmer `trust_score` updates after review changes.
- New review emits `new_review`; seller reply emits `review_reply`.

### Phase 6 - Frontend Integration Polish

Goal:

- Remove remaining P5 mocks and hardcoded placeholders where backend contracts exist.

Acceptance:

- Static ad slots use live banners when available.
- Admin/supplier ads pages handle empty/loading/error states consistently.
- Reviews pages and notification bell work against real backend responses.

### Phase 7 - Acceptance Tests And Docs

Goal:

- Lock P5 behavior with tests and update sprint status.

Acceptance:

- Smoke tests cover notification, ads, and reviews happy paths.
- Notification flow test covers `new_review`, `review_reply`, `ad_approved`, `ad_rejected`.
- Load test for WebSocket can be deferred if deploy is still intentionally skipped.
- Sprint status is updated with TRUE/PARTIAL/FALSE based on verified behavior.

## P2 Product Architecture Reference

Product core is now accepted as `TRUE` for the backend Clean Architecture scope. The completed audit and acceptance evidence are in `docs/p2-product-final-acceptance.md`.

Storage/upload remains a separate `PARTIAL` boundary, and deferred deployment items remain outside that Product-core acceptance. Do not use this P5 plan as the source of truth for P2 work.

## Decision

Use a pragmatic Clean Architecture approach:

- Interfaces/ports are required for new P5 infrastructure and cross-module communication.
- Existing P2 code does not need a risky rewrite during P5 delivery.
- Refactor P2 incrementally when a use case is touched or when direct TypeORM dependency blocks testing.
