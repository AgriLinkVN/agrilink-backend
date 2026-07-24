# P3 Cooperative Module Execution Roadmap

## Purpose

This document is the operational source of truth for completing P3:

- cooperative membership and join requests;
- cooperative dashboard and member administration;
- bulk listings and farmer contributions;
- harvest schedules and actual harvest recording;
- cooperative production reports and CSV/XLSX export;
- public bulk-listing pages and marketplace integration;
- integration, E2E, staging, and production verification.

It is intentionally explicit so an execution agent with limited reasoning can
complete one phase without inventing business rules, changing another member's
module, or reporting a task as done merely because UI or unmerged code exists.

Read these documents in order:

1. This roadmap.
2. `clean-architecture-rules.md`.
3. `storage-roadmap.md`.
4. `storage-policy.md`.
5. `adr/0001-storage-provider-and-access-policy.md`.
6. `../ci-quality-gates.md`.

For frontend work, also read `AGENTS.md` in the frontend repository and the
relevant versioned Next.js documentation under `node_modules/next/dist/docs/`.
The sprint workbook says Next.js 14, but the audited frontend uses Next.js
16.2.6. Repository code and repository-local documentation take precedence
over that stale workbook entry.

If a task, existing implementation, or workbook status conflicts with this
roadmap or the architecture/storage policy documents, stop and report the
conflict. Do not silently choose a new status transition, public data shape,
storage asset type, identifier type, or cross-role contract.

## Scope Boundaries

### In scope

- P3 behavior listed in the sprint workbook across Iterations 1-4.
- P3-owned backend and frontend code.
- Stable application contracts needed from P1, P2, P4, P5, and P6.
- Migration, authorization, privacy, concurrency, and test work required to
  make the P3 flows production-ready.
- Compatibility only where an existing frontend route is already used.

### Out of scope

- Orders, payments, checkout, and delivery orchestration.
- Rewriting Auth, Product, Geography, Notification, or Infrastructure modules.
- Introducing a new image/document storage asset type for bulk listings.
- Publishing business licenses, KYC documents, or certification files.
- Adding a message broker, microservice split, or generic repository framework.
- Deploying production before the integration and migration gates pass.

The MVP continues to connect buyers and sellers through approved contact
information. It does not add an order/payment flow.

## Evidence Snapshot

Audit date: **2026-07-24**.

| Source | Audited revision/state | Meaning |
| --- | --- | --- |
| Sprint workbook | `AgriLink_Sprint_Plan (1).xlsx` | Planning claims, dates, SP, and self-reported Done flags |
| Backend `origin/develop` | `06c2846` | Latest integrated backend; Storage Phase 8 merged and development seed data added |
| Frontend `origin/develop` | `70a8306` | Latest integrated frontend; P4 map-demo merge included |
| Local P3 backend candidate | `8e9bf2f` | P3 WIP plus security/data-integrity follow-up; not merged |
| Local P3 frontend candidate | `f621e28` | P3 WIP plus navigation/privacy follow-up; not merged |
| Current backend checkout | `07aa83f` plus untracked P3 boundary files | Partial, uncommitted clean-architecture attempt |
| Storage roadmap | Phase 9 still pending | Consumer migration/legacy-removal work remains |

The workbook covers 2026-05-27 through 2026-06-23. Its Done flags are historical
claims, not current acceptance evidence.

### Branch divergence

- Backend P3 security branch is 2 commits ahead and 16 commits behind current
  `origin/develop`; merge base: `e6c269e`.
- Frontend P3 security branch is 2 commits ahead and 21 commits behind current
  `origin/develop`; merge base: `750334c`.
- Backend P3 WIP commit `0697b4b`/`3eeedf2` mixes P3 work with unrelated Docker,
  OTP, Product certification migration, dependency, and database-config edits.
- Do **not** merge or cherry-pick the whole WIP commit. Reconstruct the required
  P3 behavior phase by phase from the latest `origin/develop`.

## Completion Rubric

Use only these states:

| State | Required meaning |
| --- | --- |
| `DONE` | Acceptance criteria map to merged code and automated evidence; lint, build, unit, contract/E2E, and migration checks pass; no required deploy evidence is missing |
| `PARTIAL` | Some UI/backend behavior exists, but a required layer, boundary, test, migration proof, merge, or environment proof is missing |
| `NOT_STARTED` | No meaningful implementation/evidence exists for the task |
| `BLOCKED` | A named external decision, contract, access, or previously merged phase is missing |

Code presence is not the same as completion. A frontend that calls a stub API,
an unmerged branch, a test that mocks away the changed contract, or a successful
build without behavioral tests is not `DONE`.

## Executive Status

### Three views of progress

| View | Result | Interpretation |
| --- | --- | --- |
| Workbook self-report | 5/14 tasks; 12/29 SP = 41.4% | Iteration 1 and three Iteration 2 feature rows are marked Done |
| Local implementation presence | 10/14 tasks have full or partial code = about 71% | Most screens/endpoints exist only in divergent local branches or call unsupported APIs |
| Strict repository Definition of Done | 0/14 tasks | No P3 task has merged end-to-end contract, migration proof, required tests, and deploy evidence |

Current strict state: **10 PARTIAL, 4 NOT_STARTED, 0 DONE**.

### Verification evidence

Latest integrated revisions:

- Backend clean install with npm 10, P3 lint, build, 72/73 unit tests
  (1 intentionally skipped), and 80/80 E2E tests pass.
- Those suites contain no cooperative/P3 contract test, and
  `CooperativesService` on `origin/develop` still throws `TODO` for every
  exposed behavior.
- Frontend clean install with npm 10, lint, and production build pass.
- P3 pages build, but the integrated backend cannot satisfy their contracts.

Local P3 candidates:

- Backend build and P3 lint pass.
- Focused P3 service tests pass 6/6.
- The local full unit suite passes 12/13 suites and 58/59 tests; one unrelated
  Auth test times out and Jest reports an open-handle/worker shutdown problem.
- Frontend npm 10 clean install, lint, and production build pass.
- There is no frontend unit/component/E2E test command for P3.

Use Node 20/npm 10 to reproduce CI. npm 11 reports optional-package lock
incompatibilities that are not reproduced by the repository's Node 20 CI
runtime.

## Iteration Task Ledger

| ID | Acceptance ID | Workbook task | SP | Workbook | Evidence-based state | Main gap | Target phase |
| --- | --- | --- | ---: | --- | --- | --- | --- |
| P3-I1-01 | `AC-P3-I1-01` | DB entity HTX + seed data | 2 | Done | `PARTIAL` | Integrated entities are duplicated/inconsistent; no accepted P3 migration or seed; local migration is unverified | 1 |
| P3-I1-02 | `AC-P3-I1-02` | API member management + join request | 2 | Done | `PARTIAL` | Integrated service is all `TODO`; local behavior is legacy architecture and lacks REST/E2E coverage | 2 |
| P3-I2-01 | `AC-P3-I2-01` | Cooperative dashboard + member UI | 3 | Done | `PARTIAL` | UI exists, but its backend contract is absent on `develop`; no role/cross-owner E2E | 3 |
| P3-I2-02 | `AC-P3-I2-02` | Bulk listing CRUD + contributions | 3 | Done | `PARTIAL` | Local behavior exists; no merged API, concurrency proof, clean Product boundary, or contract tests | 4-5 |
| P3-I2-03 | `AC-P3-I2-03` | Basic harvest schedule | 2 | Done | `PARTIAL` | Local CRUD/UI exists; integrated backend is stubbed; no ownership/date contract tests | 6-7 |
| P3-I2-04 | `AC-P3-I2-04` | Deploy HTX service to staging | 1 | Not done | `NOT_STARTED` | No staging URL, migration log, smoke-test evidence, or rollback record | 9 |
| P3-I3-01 | `AC-P3-I3-01` | Full harvest calendar UI | 3 | Not done | `PARTIAL` | Calendar UI exists; no integrated API/E2E and no complete timezone/date acceptance | 7-8 |
| P3-I3-02 | `AC-P3-I3-02` | Public bulk-listing page | 2 | Not done | `PARTIAL` | UI/local API exists; no integrated contract and only narrow privacy unit coverage | 4-5, 8 |
| P3-I3-03 | `AC-P3-I3-03` | Cooperative production summary | 2 | Not done | `PARTIAL` | Local report UI/API exists; no verified query model, export security, or contract tests | 6-7 |
| P3-I3-04 | `AC-P3-I3-04` | HTX ↔ Product integration test | 2 | Not done | `NOT_STARTED` | No test proves Product ownership/status/category/unit through the full P3 flow | 8 |
| P3-I4-01 | `AC-P3-I4-01` | Show bulk listings in marketplace | 2 | Not done | `PARTIAL` | Separate bulk route/link exists; unified search/filter/card contract with P2 is incomplete | 5, 8 |
| P3-I4-02 | `AC-P3-I4-02` | Export production Excel/CSV | 2 | Not done | `PARTIAL` | Local endpoints/UI exist; unmerged and missing CSV-injection/header/content tests | 6-8 |
| P3-I4-03 | `AC-P3-I4-03` | E2E and bug fix entire P3 flow | 2 | Not done | `NOT_STARTED` | No Playwright flow or backend cooperative E2E suite exists | 8 |
| P3-I4-04 | `AC-P3-I4-04` | Deploy P3 production | 1 | Not done | `NOT_STARTED` | No release, migration, smoke, monitoring, or rollback evidence | 9 |

An acceptance ID is closed only when the target phase's implementation and
objective evidence satisfy its Definition of Done. Workbook checkmarks never
close an acceptance ID by themselves.

## Critical Findings

### P0: Blocks a truthful Done status

1. **Integrated backend is a runtime stub.**
   `src/modules/cooperatives/cooperatives.service.ts` on `origin/develop`
   throws `TODO` from every member, bulk-listing, and harvest method.

2. **Frontend and backend contracts are split across revisions.**
   Frontend pages call `/cooperatives/me/...`, join, contribution, report,
   public listing, publish/archive, and full harvest endpoints. Integrated
   backend exposes only a small controller surface backed by stubs.

3. **The current P3 implementation violates the mandatory architecture.**
   The local service is a large legacy service that injects TypeORM
   repositories and `DataSource`, imports Product infrastructure entities,
   throws Nest HTTP exceptions in business behavior, and mixes commands,
   reports, mapping, transactions, and notifications.

4. **The untracked clean-architecture attempt is not executable.**
   It contains persistence entities and two underspecified repository ports,
   but no domain model, use cases, adapters, mapping, registration, or tests.
   It also reuses `ProductStatus` for bulk listings. Do not commit it as a
   completed phase.

5. **Migration safety is not proven.**
   The local migration creates/alters multiple legacy tables, fills missing
   harvest dates with the current date, can derive a farmer ID from a
   cooperative ID, and has an incomplete semantic rollback. A new migration
   must be written from the actual latest schema; already shared migrations
   must not be edited.

6. **No P3 REST/E2E contract suite exists.**
   Six local service tests cover a useful privacy/suspension subset, but not
   join/approve/reject, cross-cooperative access, transitions, contribution
   races, harvest ownership, reports, or frontend-to-backend contracts.

7. **No deploy evidence exists.**
   A local build is not a staging or production deployment.

8. **Current development seed data confirms the province-contract conflict.**
   `src/modules/geography/entities/province.entity.ts` has UUID primary keys,
   while the `06c2846` development seed inserts numeric `province_id` values
   into legacy address/profile tables. Phase 1 must not choose or coerce a
   province type until D2 is accepted by the Geography owner and consumers.

### P1: Must be resolved during implementation

1. Bulk listings currently reuse `ProductStatus`; P3 needs its own domain
   status/policy so Product changes cannot silently alter P3 behavior.
2. Local `publishBulkListing` changes draft/pending/rejected directly to active.
   The workbook does not assign bulk moderation to P1. Decision D1 below must
   be accepted before Phase 4.
3. Province entities disagree on integer versus UUID identifiers. P3 must use
   the canonical Geography contract, not choose a type inside its module.
4. Contribution total checks are transaction-based locally but are not proven
   safe under concurrent requests. Use locking/conditional persistence and
   add a race test.
5. Public contribution responses must not expose farmer IDs, product IDs,
   private profile fields, KYC/business-license URLs, or internal notes.
6. CSV/XLSX exports need formula-injection protection, correct headers,
   bounded date ranges, deterministic timezone rules, and failure tests.
7. Marketplace integration is currently navigation to a separate list, not a
   proven unified P2 search/filter result.
8. The sprint workbook's Next.js 14 and infrastructure assumptions are stale;
   use the checked-in runtime and CI files.

## Decisions And External Contracts

No implementation phase may invent these answers.

| ID | Owner(s) | Required decision/contract | Recommended resolution | Blocking phase |
| --- | --- | --- | --- | --- |
| D1 | P1 + P3 + product owner | Can a verified cooperative self-publish a bulk listing, or must Admin/State Agency approve it? | Because no sprint task assigns bulk moderation to P1, prefer verified cooperative self-publication and remove misleading `pending_approval`; otherwise add explicit P1 approval endpoints/UI/tests | 4 |
| D2 | P4 Geography + P1/P2 consumers | Canonical province identifier and public province DTO | Standardize on the active Geography UUID contract; migrate legacy integer references through an owned migration plan | 1 |
| D3 | P2 Product + P3 | Product lookup contract for contribution validation | A stable application/query port returning only `id`, `sellerId`, `categoryId`, `unit`, and `status`; P3 must not import Product TypeORM entities | 4 |
| D4 | P5 Notification + P3 | P3 notification event names and payloads | Stable publisher contract for member request/approved/rejected/suspended and listing events; publish only after commit | 2, 4 |
| D5 | P1 Profiles + P3 | What proves an account is an active/verified cooperative? | Stable profile/account eligibility query using JWT `sub`; role alone is insufficient for publication | 2, 4 |
| D6 | P6 Infra + P3 | Staging URL, DB migration authority, secrets, backup, rollback, and Playwright ownership | P6 owns environment/platform; P3 owns its migration, feature smoke tests, and evidence | 8-9 |

### Phase 0 Decision Register

This is an audit record, not an approval made by the implementation agent.
`PENDING_ACCEPTANCE` means the required owner must add a named person and
calendar date in the Phase 0 PR discussion before the dependent phase starts.

| ID | Required owner to confirm | Current status | Required by | Blocking evidence recorded in this audit |
| --- | --- | --- | --- | --- |
| D1 | P1 lead, P3 owner, product owner | `PENDING_ACCEPTANCE` | Before creating the Phase 4 branch | No accepted bulk-publication/moderation policy is recorded in current P3 code or architecture docs; the recommended self-publication policy is not approval. |
| D2 | P4 Geography lead, P3 owner, P1/P2 consumer owners | `PENDING_ACCEPTANCE` | Before creating the Phase 1 branch | Active Geography `Province.id` is UUID, while legacy profile/address entities and the `06c2846` development seed use numeric `province_id` values. |
| D3 | P2 Product lead, P3 owner | `PENDING_ACCEPTANCE` | Before creating the Phase 4 branch | No accepted P3-facing Product eligibility query contract is exported; direct Product infrastructure imports are prohibited. |
| D4 | P5 Notification lead, P3 owner | `PENDING_ACCEPTANCE` | Before creating the Phase 2 branch | P3 event names/payloads and post-commit publication adapter are not accepted contracts. |
| D5 | P1 Profiles lead, P3 owner | `PENDING_ACCEPTANCE` | Before creating the Phase 2 branch | Role-only eligibility is insufficient; no accepted profile/account query contract proves cooperative verification. |
| D6 | P6 Infra lead, P3 owner | `PENDING_ACCEPTANCE` | Before creating the Phase 8 branch | No recorded staging URL, migration authority, non-production actors, Playwright owner, backup, or rollback contract. |

Phase 0 cannot be marked `DONE` until the required reviewers either accept the
decision or replace the recommendation with an explicit accepted contract. A
draft Phase 0 PR may be used to obtain that review; Phase 1 and Phase 4 remain
`BLOCKED` until D2 and D1 respectively are accepted.

If D1 or D2 is not accepted, mark the affected phase `BLOCKED`; do not choose a
status or column type based on the current WIP.

## Non-Negotiable Invariants

### Identity and authorization

- JWT `sub` is the authenticated account ID.
- Presentation guards authenticate and constrain coarse roles.
- Use cases enforce resource ownership and business authorization.
- A cooperative may read or mutate only its own private members, listings,
  contributions, schedules, and reports.
- A farmer may mutate only their own membership request, contribution, or
  harvest schedule, subject to active-membership rules.
- Role checks never replace `resourceId + ownerId` queries.
- Client-supplied `ownerId`, `cooperativeId`, `farmerId`, or role is never
  trusted when identity already supplies it.

### Membership

Allowed transitions:

| From | Action | To | Actor |
| --- | --- | --- | --- |
| none/rejected/left | request join | pending | farmer |
| none/rejected/left | invite | pending | target cooperative |
| pending | approve | active | owning cooperative |
| pending | reject | rejected | owning cooperative |
| active | suspend | suspended | owning cooperative |
| suspended | reactivate | active | owning cooperative |
| pending/active/suspended | leave | left | member farmer |

- Repeating the same accepted request must be idempotent or return a typed
  conflict; it must not create a duplicate membership.
- Historical contributions are immutable when a member is suspended or leaves.
- Force actions must be explicit, audited, and tested.

### Bulk listings and contributions

- Use a P3-owned `BulkListingStatus`; do not reuse Product persistence/domain
  enums.
- Only active public listings are visible anonymously.
- Draft/rejected/private listings are visible only to the owning cooperative
  and authorized reviewers if D1 adds moderation.
- A contribution requires an active membership and an eligible Product owned
  by that farmer.
- Product unit/category and listing unit/category must match the accepted D3
  contract.
- Contribution sum must never exceed the listing target under retries or
  concurrency.
- Provider/database entities are never returned as REST payloads.
- Public contribution DTOs expose aggregate-safe fields only.

### Harvest and reports

- Farmer schedules are owner-scoped.
- Cooperative access is limited to active members of that cooperative.
- Actual date/quantity must be validated against accepted date and quantity
  rules and cannot be silently fabricated during migration.
- Reports use read/query ports and do not hydrate unrelated aggregates.
- CSV/XLSX exports are generated on demand and streamed. They are not stored in
  Cloudinary/Supabase unless a future approved storage policy adds that asset.

### Storage/privacy

- P3 introduces no new storage asset type in this roadmap.
- Business licenses, KYC files, and certifications remain private.
- Public cooperative/bulk pages may display only explicitly public profile
  fields and approved contact data; they never expose private file URLs.
- P3 must not call legacy raw-path storage endpoints.
- If a later requirement adds bulk-listing media, stop and add a reviewed
  Storage policy/ADR change before implementation.

### Architecture and side effects

```text
presentation -> application use cases -> domain
                         |
                         v
                 outbound ports
                         ^
                         |
                 infrastructure adapters
```

- Application/domain import no controller DTOs, TypeORM, `DataSource`,
  provider SDKs, or another module's infrastructure.
- Controllers validate/map/call; they do not implement business behavior.
- Transactions are exposed through an application-owned abstraction when
  multiple writes/invariants require atomicity.
- Persist/commit first; publish notification/side effect second.
- New/changed use cases have unit tests; changed public contracts have E2E
  tests.

## Target Module Topology

Use this topology as a destination, not as permission to create empty layers:

```text
src/modules/cooperatives/
  domain/
    models/
    policies/
    errors/
  application/
    models/
    ports/
      inbound/
      outbound/
    use-cases/
  infrastructure/
    persistence/
      entities/
      repositories/
    adapters/
  presentation/
    controllers/
    dto/
    mappers/
  cooperatives.module.ts
```

Minimum outbound capabilities:

- cooperative-member repository;
- bulk-listing repository;
- contribution repository;
- harvest repository;
- production-report query port;
- Product eligibility query port (D3);
- cooperative eligibility/profile query port (D5);
- notification publisher adapter (D4);
- unit-of-work/transaction port where required.

Do not create one generic repository. Define behavior-oriented methods including
owner-aware lookups and conditional status updates.

## Target REST Contract

Keep one canonical route per behavior. Retain an old alias only when a current
frontend caller needs a short migration window; mark it deprecated and remove
it in Phase 9 after zero usage.

### Membership

| Method and route | Actor | Result |
| --- | --- | --- |
| `POST /cooperatives/:cooperativeId/join-requests` | FARMER | Pending membership |
| `GET /cooperatives/me/my-cooperatives` | FARMER | Paginated owned memberships |
| `POST /cooperatives/:cooperativeId/members/leave` | FARMER | Left membership |
| `GET /cooperatives/me/members` | COOPERATIVE | Paginated owned members |
| `POST /cooperatives/members/:farmerId/invite` | COOPERATIVE | Pending membership |
| `PATCH /cooperatives/me/members/:id/approve` | COOPERATIVE | Active member |
| `PATCH /cooperatives/me/members/:id/reject` | COOPERATIVE | Rejected member |
| `PATCH /cooperatives/me/members/:id/suspend` | COOPERATIVE | Suspended member |
| `PATCH /cooperatives/me/members/:id/reactivate` | COOPERATIVE | Active member |

### Bulk listings

| Method and route | Actor | Result |
| --- | --- | --- |
| `POST /cooperatives/me/bulk-listings` | COOPERATIVE | New owned listing |
| `GET /cooperatives/me/bulk-listings` | COOPERATIVE | Paginated owned listings |
| `GET /cooperatives/me/bulk-listings/:id` | COOPERATIVE | Owned detail |
| `PATCH /cooperatives/me/bulk-listings/:id` | COOPERATIVE | Updated allowed-state listing |
| `PATCH /cooperatives/me/bulk-listings/:id/publish` | COOPERATIVE or D1 reviewer | Validated transition |
| `PATCH /cooperatives/me/bulk-listings/:id/archive` | COOPERATIVE | Archived listing |
| `POST /cooperatives/me/bulk-listings/:id/contributions` | COOPERATIVE | Contribution for an active member |
| `GET /cooperatives/me/bulk-listings/:id/contributions` | COOPERATIVE | Private owned contribution detail |
| `POST /cooperatives/bulk-listings/:id/contributions` | FARMER | Own contribution |
| `GET /cooperatives/bulk-listings` | Public | Active listings, paginated |
| `GET /cooperatives/bulk-listings/:id` | Public | Active public detail |
| `GET /cooperatives/bulk-listings/:id/contributions` | Public | Privacy-safe aggregates |

### Harvest and reports

| Method and route | Actor | Result |
| --- | --- | --- |
| `GET /cooperatives/harvest-schedules` | FARMER/COOPERATIVE | Owner-scoped schedule page |
| `POST /cooperatives/harvest-schedules` | FARMER/COOPERATIVE | Created eligible schedule |
| `GET /cooperatives/harvest-schedules/:id` | FARMER/COOPERATIVE | Owner-scoped detail |
| `PATCH /cooperatives/harvest-schedules/:id` | FARMER/COOPERATIVE | Updated schedule |
| `PATCH /cooperatives/harvest-schedules/:id/actual` | FARMER/COOPERATIVE | Recorded actual harvest |
| `DELETE /cooperatives/harvest-schedules/:id` | FARMER/COOPERATIVE | Idempotent delete/204 |
| `GET /cooperatives/me/reports/production` | COOPERATIVE | Bounded report read model |
| `GET /cooperatives/me/reports/production.csv` | COOPERATIVE | Safe streamed CSV |
| `GET /cooperatives/me/reports/production.xlsx` | COOPERATIVE | Safe streamed XLSX |

Every route needs a runtime request schema, explicit response DTO, Swagger
metadata, typed error mapping, and contract/E2E test.

## Mandatory One-Phase Workflow

Only one phase may be active. The previous phase must be merged before the next
phase starts.

Because the existing P3 checkouts contain divergent and untracked work, create
a clean worktree from the exact latest `origin/develop`. Do not stash, reset,
delete, or overwrite the current user's work.

```powershell
git fetch origin --prune
git status --short
git rev-parse origin/develop
git worktree add ..\<repo>-p3-phase-N -b <exact-phase-branch> origin/develop
Set-Location ..\<repo>-p3-phase-N
git status --short
git rev-parse HEAD
node --version
npm --version
```

Required preconditions:

- Previous phase PR is `MERGED`.
- New worktree status is empty.
- HEAD equals the recorded `origin/develop` commit.
- CI-aligned runtime is Node 20/npm 10.
- All required decisions/contracts for the phase are accepted.

After implementation:

```powershell
git diff --check
npm ci
npm run lint
npm test -- --runInBand
npm run test:e2e -- --runInBand
npm run build
git status --short
```

For frontend phases, run:

```powershell
npm ci
npm run lint
npm run build
npx playwright test <phase-specs>
```

If Playwright is not installed/configured, the phase is `PARTIAL`; do not claim
the E2E gate passed.

Stage only phase files, open the PR, and stop. Do not merge the PR and do not
start the next phase.

Use this handoff format:

```text
P3 phase:
Repository:
Base develop commit:
Branch:
Commit:
Files changed:
Acceptance IDs closed:
Focused checks:
Full CI-aligned checks:
Migration up/down evidence:
PR URL and state:
Known debt/blockers:
Next phase:
Next phase blocked until:
```

## Phase Tracker

| Phase | Repository | Branch | Deliverable | Gate |
| --- | --- | --- | --- | --- |
| 0 | Backend docs | `codex/p3-role-roadmap` | Accepted audit, decisions, contracts, and roadmap | This document reviewed |
| 1 | Backend | `codex/p3-phase-1-persistence-boundaries` | Canonical schema, safe migration, domain/ports/adapters | Phase 0 merged; D2 accepted |
| 2 | Backend | `codex/p3-phase-2-membership-backend` | Membership use cases, API, notification adapter, tests | Phase 1 merged; D4/D5 accepted |
| 3 | Frontend | `codex/p3-phase-3-membership-frontend` | Farmer/cooperative membership UI on accepted API | Phase 2 merged and deployed to test env |
| 4 | Backend | `codex/p3-phase-4-bulk-contributions-backend` | Bulk/listing/contribution use cases and API | Phase 2 merged; D1/D3/D4 accepted |
| 5 | Frontend | `codex/p3-phase-5-bulk-marketplace-frontend` | Cooperative and public bulk UI; P2 marketplace integration | Phase 4 merged and test API available |
| 6 | Backend | `codex/p3-phase-6-harvest-reports-backend` | Harvest CRUD/actuals, reports, safe exports | Phase 4 merged |
| 7 | Frontend | `codex/p3-phase-7-harvest-reports-frontend` | Calendar, actuals, reports, downloads | Phase 6 merged and test API available |
| 8 | Both, separate PRs | `codex/p3-phase-8-backend-quality-gates`; `codex/p3-phase-8-frontend-e2e` | Contract, migration, security, concurrency, Playwright | Phases 1-7 merged; D6 ready |
| 9 | Both/Infra, separate PRs | `codex/p3-phase-9-backend-rollout`; `codex/p3-phase-9-frontend-rollout` | Staging, observability, production, legacy removal | Phase 8 merged; release approval |

The tracker describes gates, not live GitHub state. Verify the prior PR before
starting.

## Phase 0: Audit And Contract Freeze

Goal: make scope, evidence, decisions, and public contracts explicit.

Required:

- Review this roadmap with P1-P6 owners.
- Resolve D1-D6 or record a named owner/date/blocker.
- Record the exact backend/frontend `develop` commits.
- Confirm the canonical API and status transition tables.
- Confirm no new P3 storage asset is needed.
- Create issue/acceptance IDs matching the Iteration Task Ledger.

Definition of Done:

- No unresolved D1/D2 remains for Phase 1/4.
- Every workbook task maps to a target phase and objective evidence.
- Reviewers accept that spreadsheet Done flags are not repository DoD.

## Phase 1: Persistence And Architecture Boundaries

Goal: create a safe foundation on current `develop` without importing the old
monolithic implementation wholesale.

In scope:

- P3-owned domain models/statuses/errors.
- Behavior-oriented repository/query/UoW ports.
- TypeORM persistence entities and adapters under infrastructure.
- Explicit mapping between persistence and application/domain models.
- One new migration after all current migration timestamps.
- Preflight queries for duplicate memberships, orphan foreign keys, invalid
  quantities/dates, and inconsistent province IDs.
- Database constraints/indexes for ownership, uniqueness, status, date, and
  contribution lookup.
- Repository integration tests and migration up/down tests on a disposable DB.
- Module registration without duplicate entity ownership.

Do not:

- Edit an already shared migration.
- Backfill an unknown farmer/date with cooperative ID/current date.
- Reuse `ProductStatus` for bulk listings.
- Import Product/Geography infrastructure.
- copy unrelated OTP, Docker, or Product certification changes.

Definition of Done:

- Application/domain compile with no TypeORM or infrastructure imports.
- Migration runs against empty and representative legacy schemas.
- Invalid legacy rows produce a report and explicit operator decision, not
  fabricated data.
- Build, lint, focused tests, and full backend gates pass.

## Phase 2: Membership Backend

Goal: implement the complete membership lifecycle through use cases.

Required use cases:

- request join;
- invite farmer;
- list own memberships;
- list cooperative members;
- approve/reject;
- suspend/reactivate;
- leave;
- inspect active dependencies before force suspend/leave.

Required tests:

- each transition happy path and invalid transition;
- anonymous/wrong-role/cross-cooperative/cross-farmer access;
- duplicate request and retry behavior;
- owner-aware not-found behavior;
- contribution history preserved on force action;
- notification only after persistence/commit succeeds;
- REST validation, pagination, and response mapping.

Definition of Done:

- P3-I1-02 backend acceptance is evidenced.
- No TypeORM entity crosses REST or notification boundaries.
- P1/P5 contracts are adapter-level dependencies only.

## Phase 3: Membership Frontend

Goal: make farmer and cooperative membership flows usable on the accepted API.

In scope:

- Cooperative overview counts and pending members.
- Member filters/pagination and approve/reject/suspend/reactivate states.
- Farmer join/leave flow without requiring users to manually paste a UUID when
  a discoverable cooperative selector/search is available.
- Loading, empty, retryable error, permission, success, and conflict states.
- Accessible confirmation dialogs and keyboard/focus behavior.
- Responsive behavior at 375, 768, 1024, and desktop widths.
- Query invalidation scoped to membership keys.

Definition of Done:

- No request targets an alias absent from Swagger.
- No private field is rendered.
- npm 10 clean install, lint, build, and membership Playwright specs pass.

## Phase 4: Bulk Listings And Contributions Backend

Goal: implement safe listing lifecycle and atomic contributions.

In scope:

- create/list/detail/update/publish/archive;
- private and public query models;
- cooperative and farmer contribution paths;
- D1 publication policy;
- D3 Product eligibility adapter;
- atomic quantity invariant with lock/conditional update;
- idempotent retry policy;
- privacy-safe public contribution mapper;
- post-commit P5 notification events.

Required tests:

- every allowed/forbidden listing transition;
- owner and cross-owner behavior;
- anonymous sees active only;
- Product owner/status/category/unit mismatch;
- inactive member cannot contribute;
- duplicate and concurrent contribution requests;
- target cannot be exceeded;
- public payload contains no forbidden identity/private fields;
- no event on failed persistence.

Definition of Done:

- P3-I2-02 backend and P3-I3-02 backend criteria are evidenced.
- A 50-request concurrency test cannot exceed target quantity.

## Phase 5: Bulk And Marketplace Frontend

Goal: complete cooperative, farmer, buyer, and public bulk experiences.

In scope:

- Cooperative create/list/detail/update/publish/archive.
- Private contribution detail and permitted actions.
- Public list/detail using only public DTOs.
- P2-owned marketplace contract for source filter/card/search.
- Empty/error/loading/retry/pagination states.
- Route and query-key consistency.
- Responsive and keyboard-accessible forms/dialogs.

Definition of Done:

- Marketplace supports the accepted meaning of filter `"Từ HTX"`; a mere link
  to another page is not sufficient if D1/P2 contract requires unified search.
- Public pages do not fetch private contribution endpoints.
- Bulk Playwright specs pass against the test API.

## Phase 6: Harvest And Reports Backend

Goal: implement owner-safe schedules, actual harvests, aggregate reports, and
safe streaming exports.

In scope:

- bounded list/create/detail/update/actual/delete behavior;
- farmer/cooperative ownership policy;
- deterministic date/timezone and quantity validation;
- optimized report query port;
- CSV escaping and spreadsheet-formula neutralization;
- XLSX generation with typed dates/numbers;
- safe filenames and response headers;
- date-range limits and pagination/aggregation limits;
- no persistent storage for generated exports.

Required tests:

- farmer self and other-farmer access;
- cooperative active-member and non-member access;
- invalid/reversed/unreasonable dates and quantities;
- report totals reconcile with source contributions/schedules;
- CSV cells beginning with `=`, `+`, `-`, or `@`;
- content type, disposition, bytes, empty reports, and generator failure.

Definition of Done:

- P3-I2-03, P3-I3-03, and P3-I4-02 backend criteria are evidenced.

## Phase 7: Harvest And Report Frontend

Goal: deliver the complete calendar/report UI on the accepted Phase 6 contract.

In scope:

- Month navigation and bounded date requests.
- Farmer/product filters.
- Expected versus actual display and recording.
- Loading/empty/error/retry and mutation feedback.
- Production summary reconciliation.
- Authenticated CSV/XLSX blob download using the shared API base.
- Accessible/responsive calendar alternative on small screens.

Definition of Done:

- No browser alert is the only error feedback.
- Download failure does not create/click an invalid blob.
- Calendar and report Playwright specs pass.

## Phase 8: Integration And Quality Gates

Goal: prove all P3 interactions and cross-role contracts.

Backend additions:

- `test/cooperatives.e2e-spec.ts`;
- repository/migration integration suite;
- contribution concurrency test;
- architecture/import-boundary test;
- OpenAPI contract snapshot or explicit schema assertions;
- P3 test script wired to CI.

Frontend additions:

- Playwright setup owned with P6;
- seeded users for FARMER, COOPERATIVE, BUYER/public, wrong role, and second
  tenant/cooperative;
- API-contract fixtures generated from the accepted schema, not handwritten
  success mocks;
- responsive critical-path checks.

Mandatory scenario:

```text
Farmer requests cooperative membership
-> Cooperative approves
-> Farmer creates/owns an eligible Product
-> Farmer/cooperative creates a harvest schedule
-> Cooperative creates and publishes a bulk listing
-> Farmer contributes without exceeding the target
-> Buyer/public sees privacy-safe listing and progress
-> Cooperative sees report and downloads CSV/XLSX
-> Cross-tenant and wrong-role attempts fail
```

Definition of Done:

- P3-I3-04 and P3-I4-03 pass in CI.
- Backend lint/unit/E2E/storage gates/build all pass.
- Frontend lint/build/Playwright all pass.
- Migration up/down evidence is attached.
- No critical/high security finding remains.

## Phase 9: Rollout, Deployment, And Legacy Removal

Goal: prove the flow in staging, release safely, and remove temporary aliases.

Required staging evidence:

- exact backend/frontend commit and image/version;
- migration preflight, backup, up log, and rollback rehearsal;
- staging URLs;
- seeded non-production accounts for all scenario actors;
- full Phase 8 smoke flow;
- log/metric checks with no sensitive data;
- feature flag/rollback owner;
- P1-P6 sign-off for their contracts.

Production gate:

- release approval;
- backup verified;
- migration executed once;
- smoke test with non-sensitive production test accounts;
- error rate and P3 endpoint latency observed;
- rollback trigger/window recorded.

Legacy removal:

- measure deprecated endpoint usage;
- migrate all frontend callers;
- remove aliases only after zero usage;
- confirm P3 never uses raw-path Storage endpoints.

Definition of Done:

- P3-I2-04 and P3-I4-04 have URLs, timestamps, revisions, command results,
  smoke evidence, and rollback information.
- “Deployed” is never inferred from a successful local build.

## Required Security And Interaction Matrix

At minimum, automated tests must cover:

| Flow | Anonymous | FARMER owner | Other FARMER | Owning COOPERATIVE | Other COOPERATIVE | ADMIN/STATE | Public response |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Join request | reject | allow | own request only | read/decide own | reject | per explicit review contract | none |
| Private member list | reject | reject | reject | allow | reject | only if explicitly required | none |
| Bulk private CRUD | reject | reject | reject | allow own | reject | per D1 | none |
| Farmer contribution | reject | allow if active/eligible | reject for another farmer | allow own member path | reject | no implicit mutation | none |
| Public bulk list/detail | allow | allow | allow | allow | allow | allow | active listing only |
| Public contributions | allow | allow | allow | allow | allow | allow | aggregate-safe fields only |
| Harvest schedule | reject | own only | reject | active own members only | reject | explicit read-only only | none |
| Reports/exports | reject | reject | reject | own only | reject | explicit oversight only | none |

Each test must also assert that another tenant's UUID cannot be used to read or
mutate a resource.

## Final Definition Of Done

P3 is complete only when:

- all 14 ledger rows are `DONE`;
- all accepted decisions and cross-role contracts are implemented;
- backend/frontend changes are merged from current `develop`;
- migration and rollback are verified;
- no P3 application code imports TypeORM or another module's infrastructure;
- REST and public DTOs do not expose persistence/private fields;
- ownership, role, status, idempotency, and concurrency tests pass;
- frontend critical paths pass Playwright;
- backend full quality gates and frontend lint/build pass in CI;
- staging and production evidence exists for deploy tasks;
- storage/privacy invariants remain satisfied;
- the final report contains real commands/results, revisions, URLs, and known
  limitations.

Until then, report the exact task as `PARTIAL`, `NOT_STARTED`, or `BLOCKED`.

## Low-Effort Agent Execution Prompt

Use this prompt verbatim for one phase at a time:

```text
Execute only Phase <N> of
docs/architecture/p3-cooperative-execution-roadmap.md.

Before editing:
1. Read the entire roadmap and every document in its required read order.
2. Verify the previous phase PR is MERGED.
3. Fetch origin and create a clean worktree/branch from exact origin/develop.
4. Confirm Node 20/npm 10 and clean git status.
5. Confirm all decisions/contracts listed as gates for Phase <N>.
6. Audit existing P3/local WIP only as reference. Do not cherry-pick the whole
   P3 WIP commit and do not include unrelated files.

Implement only the Phase <N> in-scope items. Follow the non-negotiable
invariants, target REST contract, architecture topology, and required tests.
Do not invent a missing business rule. If a gate/contract conflicts or is
missing, stop and report BLOCKED with the exact decision owner.

Run every focused and full verification command required by the phase. Never
claim a command passed unless it ran successfully. Update the Iteration Task
Ledger only for acceptance IDs proven by code and tests.

Commit only phase files, open a PR, output the required handoff block, and stop.
Do not merge and do not start the next phase.
```
