# P5 Remaining Work Handoff

## Purpose

This document hands the remaining P5 work to another engineer without requiring
them to reconstruct the completed work. P5 owns Ads, Notifications, Reviews,
and their contracts across backend and frontend.

Read these documents before changing code:

1. `docs/architecture/clean-architecture-rules.md`
2. `clean-architecture-plan.md`
3. This handoff document.

## Current Baseline

Start every new phase from the latest `origin/develop`.

Completed and merged:

| Phase | Scope | Merge evidence |
| --- | --- | --- |
| 1 | Notification REST/WebSocket contract and ports | PRs #37, #39, #41 |
| 2 | Ads campaign, banner, and event-tracking backend contract | PR #52 |
| 3 | Ads administration and approval notifications | PR #53 |
| 4 | Reviews contract, seller reply, and review moderation | PR #55 |

Do not revive the stale `feature/p5-notification-contract` PR. Its intended
behavior was already merged and subsequently aligned with the architecture
rules through PRs #37, #39, and #41.

## Remaining Delivery Order

1. Phase 5: Review reputation and review notifications.
2. Phase 6A: Ads analytics backend contract and supplier dashboard integration.
3. Phase 6B: Replace P5 advertising placeholders and complete frontend states.
4. Phase 7: End-to-end acceptance, notification-flow verification, and sprint
   evidence.

Phase 6A is explicit here because the original P5 plan did not name the
Iteration 4 supplier analytics task even though it remains incomplete.

## Universal Delivery Rules

### Branch and merge protocol

Before starting a phase:

1. Fetch remotes: `git fetch origin --prune`.
2. Confirm the immediately previous phase is an ancestor of `origin/develop`.
3. If it is not merged, stop and report the missing merge instead of stacking a
   new phase on it.
4. Create a new branch from `origin/develop`; never branch from an old feature
   branch.
5. Use `feature/p5-*` for functionality and `test/p5-*` for test-only work.
   Do not use `codex/*` names.

Suggested branches:

| Work | Branch |
| --- | --- |
| Phase 5 | `feature/p5-review-reputation` |
| Phase 6A | `feature/p5-ads-analytics` |
| Phase 6B backend/frontend integration | `feature/p5-frontend-polish` |
| Phase 7 | `test/p5-acceptance` |

One PR should represent one cohesive capability. Split commits when doing so
keeps a migration, implementation, tests, and documentation understandable;
do not split a transactional behavior into separately mergeable PRs.

### Architecture rules

The backend is a modular monolith with this dependency direction:

```text
presentation -> application -> domain
infrastructure -> application/domain ports
```

Non-negotiable rules for touched P5 code:

- Controllers and gateways validate/translate transport input only. They must
  not query TypeORM, implement business decisions, or emit side effects.
- Application use cases inject ports, never `Repository<T>`, `DataSource`,
  `EntityManager`, `QueryRunner`, Socket.IO, or REST DTOs.
- Domain code must not import NestJS, TypeORM, transport DTOs, or infrastructure.
- Infrastructure implements outbound ports and owns entities, raw SQL, external
  services, storage, and realtime adapters.
- New persistence entities belong in `infrastructure/persistence/entities`.
- Cross-module calls use an exported application capability token, not a
  concrete service or another module's repository/entity.
- DI tokens are `Symbol`s. Export only the capability token needed by consumers.
- Ports, application models, and errors go under `application`; do not move
  them into `domain` merely to create more folders.
- New public REST/WebSocket contracts need runtime DTO validation and contract
  tests. Do not expose persistence entities.
- New code must not introduce `any`.

For the complete rules and examples, follow
`docs/architecture/clean-architecture-rules.md`; this document does not replace
it.

### Behavior and data rules

- Use the authenticated identity from JWT/current-user decorators. Never trust
  `sellerId`, `buyerId`, `userId`, or role values supplied by request bodies.
- Ownership is enforced in application/domain behavior and supported by
  ownership-aware repository queries.
- Validate -> persist/commit -> publish side effects. Never emit a notification
  or socket event before persistence succeeds.
- Put concurrency protection in persistence when an invariant can race: unique
  constraints, conditional updates, optimistic locking, or a transaction.
- Create a new migration for schema changes. Do not edit an existing migration
  that could already have run elsewhere.
- Keep compatibility with current frontend routes and response shapes unless a
  coordinated FE change is in the same PR set.

### Verification and Definition of Done

For every backend phase, run and report actual results:

```powershell
npm run lint
npm test -- --runInBand
npm run test:e2e -- --runInBand
npm run build
```

For frontend changes, run and report:

```powershell
npm run lint
npm run build
```

Add focused unit tests for use cases and e2e/contract tests for changed REST or
WebSocket routes. Do not say a command passed unless it ran. Existing
repository-wide warnings must be reported separately from warnings introduced
by the phase.

Mark a task `TRUE` only when every stated acceptance criterion is implemented
and verified. Use `PARTIAL` when behavior exists but a required flow, migration,
or verification is missing. Deploy tasks remain `FALSE` while deployment is
intentionally deferred.

## Phase 5: Review Reputation And Notifications

### Objective

Make a review affect the product's reputation, the seller/farmer reputation,
and the seller's realtime notification stream.

### Scope

Backend modules likely involved:

- `reviews`
- `products`
- profile/farmer-profile ownership for `trust_score`
- `notifications`

Expected behaviors:

1. A visible review contributes to the product average rating.
2. Creating, hiding, and unhiding a review refreshes the derived rating.
3. Creating a review updates the seller/farmer trust score according to an
   approved business formula.
4. Creating a review publishes `new_review` to the reviewed seller only.
5. Saving the first seller reply publishes `review_reply` to the reviewer only.
6. No notification is emitted if the review/reply persistence operation fails.

### Required design decision before implementation

The product requirements do not define the formula for `trust_score`. Do not
invent a percentage or weighting rule in code. Before implementation, record
and obtain team approval for:

- Which seller types have a trust score: farmer only, or farmer/cooperative/
  enterprise/supplier.
- The source reviews: visible only, verified purchases only, or both.
- The formula, bounds, rounding, and the value when there are no reviews.
- Whether a hidden review immediately removes its contribution.
- Whether historical reviews are backfilled when the migration is deployed.

Add the agreed decision to the PR description or an ADR. If this decision is
not available, the phase is `BLOCKED`, not silently guessed.

### Architecture direction

- Keep review use cases independent of TypeORM and Socket.IO.
- Reuse `NOTIFICATION_PUBLISHER` and `NotificationPublisherPort` for the two
  new notification types; do not inject a concrete notification service.
- Introduce a narrow, business-named application port for product rating and
  seller trust updates if Reviews needs to invoke those capabilities across
  module boundaries. The owner module exports its token, not a repository.
- If review persistence and reputation writes must be atomic, introduce a
  transaction/Unit-of-Work abstraction. Do not inject `DataSource` into a use
  case. Document why atomicity is necessary.
- Prefer recomputing from persisted qualifying reviews instead of incrementing
  a cached number, so hide/unhide and retry behavior remain correct.
- Protect one-review-per-buyer-per-product with the existing database unique
  constraint and handle its conflict deterministically.

### Implementation checklist

- [ ] Audit Product and profile schemas before choosing fields or migrations.
- [ ] Define and record the trust-score business formula.
- [ ] Add application ports/models/errors needed for reputation refresh.
- [ ] Implement qualifying-review aggregation in an infrastructure adapter or
      read-model query adapter.
- [ ] Update Product `avg_rating` after create/hide/unhide; include delete only
      if a delete capability exists and is part of the agreed contract.
- [ ] Update the approved seller/farmer trust-score projection.
- [ ] Publish `new_review` after successful creation and `review_reply` after
      successful reply persistence.
- [ ] Add/adjust migrations and a deterministic backfill strategy when fields
      are not already populated.
- [ ] Preserve the current Reviews REST response contract.

### Required tests

- Unit: qualifying-review aggregation and rounding.
- Unit: create/hide/unhide invokes reputation refresh only after persistence.
- Unit: notification publisher is called with the correct recipient/type/data.
- Unit: persistence failure results in no reputation side effect and no
  notification.
- Unit: seller cannot reply to someone else's review and cannot send a second
  reply.
- E2E/contract: review create/reply still returns the current FE shape.
- Integration: hidden reviews do not contribute to published rating/trust values.

### Acceptance evidence

Capture the relevant response/assertion for:

- A new review changing `avg_rating` and the agreed trust score.
- Hide/unhide restoring/removing the same contribution.
- `new_review` and `review_reply` being emitted to the right user room.
- A failed persistence path emitting nothing.

## Phase 6A: Ads Analytics Contract

### Objective

Complete Iteration 4 P5-17: supplier analytics with daily impressions/clicks,
CTR, totals, and days remaining.

The frontend page already requests:

```text
GET /ads/campaigns/:id/analytics
```

The backend endpoint does not yet exist. Implement the backend contract first;
do not replace the page with mock data.

### Required contract

The exact property names must be checked against `src/types/ads.ts` before
coding. The response should include, at minimum:

```text
{
  campaign,
  daily: [{ date, impressions, clicks }],
  ctr,
  daysLeft
}
```

### Architecture direction

- Add a read/query port such as `CampaignAnalyticsQueryPort`; it is a query,
  not a reason to load and aggregate every `AdEvent` in application memory.
- The TypeORM/raw-SQL aggregation belongs in an infrastructure query adapter.
- Use an application result model and a presentation response mapper/DTO.
- Enforce supplier ownership in the use case/query; a supplier must not inspect
  another supplier's campaign analytics.
- Define the time zone and date bucket explicitly, preferably `Asia/Ho_Chi_Minh`
  for the product's Vietnamese reporting expectations.
- Divide by zero safely: CTR is `0` when there are no impressions.

### Implementation checklist

- [ ] Audit `ad_events`, campaign dates, and current FE `CampaignAnalytics`
      type.
- [ ] Add `GET /ads/campaigns/:id/analytics` with supplier guard/ownership.
- [ ] Aggregate events by date in the database.
- [ ] Return zero-filled or clearly documented sparse daily periods.
- [ ] Calculate totals/CTR/days-left consistently with campaign status/date.
- [ ] Wire the existing frontend page to the verified contract; retain loading,
      empty, and error states.
- [ ] Add a focused migration/index only if the query plan needs it; do not add
      indexes speculatively.

### Required tests

- Unit: ownership, CTR with zero impressions, expired/upcoming campaign dates.
- Integration/e2e: supplier can access own analytics, another supplier receives
  forbidden/not-found behavior defined by the existing contract.
- Integration/e2e: daily bucket totals match seeded events.
- Frontend: type-check/build confirms the response shape used by Recharts.

## Phase 6B: Frontend Integration Polish

### Objective

Remove P5 placeholders and make current backend contracts the single source of
truth in the UI.

### Known gaps

- `BannerSlider` fetches live `/ads/banners` data and tracks events, but it is
  commented out on the homepage.
- The generic `ad-banner`, `ad-carousel-home`, and `ad-sidebar-home` components
  still contain mock advertising data.
- The supplier dashboard overview still contains hardcoded campaign metrics.
- Review and notification pages use real contracts, but all P5 pages need a
  route-by-route loading, empty, error, and unauthenticated-state check.

### Implementation checklist

- [ ] Agree placement/slot semantics with backend before replacing each mock
      component. Do not invent query parameters that `/ads/banners` ignores.
- [ ] Render live active banners on homepage and marketplace/listing placements
      using React Query query keys that include all filters.
- [ ] Track one impression per visible banner and a click before navigation;
      avoid repeated observer events generating duplicate impressions.
- [ ] Use real campaign data on supplier overview and analytics pages.
- [ ] Verify supplier campaign creation/image upload uses the shared upload
      contract and returns a persisted banner URL.
- [ ] Keep admin approval/rejection feedback and supplier campaign status in
      sync through query invalidation after mutations.
- [ ] Review `NotificationBell`, review section, seller review inbox, and admin
      review moderation for loading/empty/error/auth states.
- [ ] Do not add request-fetching `useEffect` loops. Use existing React Query
      patterns for server state; event handlers should update query/filter state
      atomically.

### Frontend rules

- Keep API calls in the established client/query hooks or components; do not
  duplicate endpoint strings in several unrelated views when a local shared
  helper already exists.
- Use `useQuery` for reads and `useMutation` for writes; invalidate or update
  the correct query key after mutations.
- Do not expose an action merely because the API supports it: preserve role and
  ownership conditions in the UI, while treating backend authorization as the
  source of truth.
- Preserve mobile layout behavior and avoid replacing a working UI with a
  cosmetic redesign during this phase.

### Required tests and QA

- Build and lint frontend.
- Manually verify authenticated supplier, admin, buyer, and guest states.
- Verify ad empty state, image failure state, API failure state, and no-banner
  state.
- Verify one impression/click request per intended user action.
- Verify review reply/hide/unhide refreshes the visible query state.

## Phase 7: Acceptance Tests And Sprint Evidence

### Objective

Prove the integrated P5 behavior, document limitations, and update the sprint
plan truthfully.

### Required scenario coverage

1. Supplier creates a campaign -> admin approves/rejects -> supplier receives
   `ad_approved`/`ad_rejected` -> active banner is returned and event tracking
   records interaction.
2. Buyer creates a review -> seller receives `new_review` -> seller replies ->
   buyer receives `review_reply`.
3. Admin hides/unhides a review -> product rating and trust score follow the
   agreed Phase 5 policy.
4. Notification list, unread count, mark-one-read, mark-all-read, and the
   corresponding socket events keep client state consistent.
5. Supplier cannot read or mutate another supplier's campaign/analytics; seller
   cannot reply to another seller's review.

### Testing approach

- Add backend e2e tests using the existing REST and WebSocket contract test
  patterns. Avoid a real external provider in CI.
- Add a frontend smoke checklist or Playwright tests where test infrastructure
  supports it. Do not claim browser coverage without running it.
- Run the complete backend and frontend checks listed above.
- Keep WebSocket load testing as a separate `PARTIAL`/deferred item if deploy
  is still intentionally skipped. A load test is not a replacement for contract
  tests.

### Sprint-plan update rules

After verification, update the P5 rows in `AgriLink_Sprint_Plan.xlsx` using
evidence rather than intent:

- `TRUE`: every task clause and its tests/QA pass.
- `PARTIAL`: one or more clauses remain, for example live homepage banner
  integration, review reporting, seed data, or deployment.
- `FALSE`: not implemented or intentionally deferred.

Current known incomplete P5 sprint items are documented in the P5 assessment;
do not mark deployment, WebSocket load test, analytics backend, notification
flow acceptance, or rating/trust updates as complete before evidence exists.

## PR Handoff Template

Use this in every remaining P5 PR:

```md
## Scope
- Phase: P5 Phase X
- Sprint rows affected: I?-??

## Architecture
- Ports introduced/used:
- Cross-module dependencies:
- Transaction/concurrency decision:

## Contract
- REST/WebSocket routes/events changed:
- FE consumers updated:

## Verification
- `npm run lint`:
- `npm test -- --runInBand`:
- `npm run test:e2e -- --runInBand`:
- `npm run build`:
- Frontend lint/build/manual QA:

## Deferred items
- None / list with reason.
```

## Final Handoff Rule

When requirements are incomplete, do not hide the uncertainty inside an
implementation. Record the open product decision, preserve existing contracts,
and mark the phase `BLOCKED` or `PARTIAL` until the missing decision or
verification is resolved.
