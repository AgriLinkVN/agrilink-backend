# Storage Module Execution Roadmap

## Purpose

This is the operational source of truth for completing the AgriLink Storage
module. It is intentionally explicit so an execution agent with limited
reasoning can complete one phase without inventing architecture or silently
changing scope.

Read these documents in order:

1. This roadmap.
2. `storage-policy.md`.
3. `adr/0001-storage-provider-and-access-policy.md`.
4. `clean-architecture-rules.md`.

If code, a task description, or another document conflicts with the first three
documents, stop and report the conflict. Do not choose a new provider, widen
access, publish a private asset, or alter lifecycle states without a reviewed
ADR update.

## Mandatory One-Phase Workflow

Only one phase may be active. Perform these steps before starting any phase:

```powershell
git fetch origin --prune
gh pr view <previous-pr-number> --json state,mergedAt,mergeCommit,url
git status --short
git switch develop
git pull --ff-only origin develop
git rev-parse HEAD
git rev-parse origin/develop
git switch -c <exact-phase-branch>
```

Required preconditions:

- The previous phase PR state is `MERGED` and `mergedAt` is not null.
- `git status --short` is empty. Never stash, discard, or include unrelated
  changes without explicit user direction.
- Local `develop` and `origin/develop` resolve to the same commit.
- The new branch is created from that exact `develop` commit.

If the previous PR number is unknown, resolve it by branch:

```powershell
gh pr list --state merged --head <previous-phase-branch> --json number,state,mergedAt,url
```

After implementation:

```powershell
git diff --check
npm run build
npx eslint "src/modules/storage/**/*.ts"
npm test -- --runInBand
git status --short
git add <only-the-phase-files>
git commit -m "<phase commit message>"
git push -u origin <exact-phase-branch>
gh pr create --base develop --head <exact-phase-branch>
```

Run focused tests listed by the phase before the full test command. Record every
command and result in the PR body. Open the PR and stop. Do not merge the PR and
do not start the next phase.

Use this handoff format after every phase:

```text
Phase:
Base develop commit:
Branch:
Commit:
Files changed:
Focused checks:
Full build/lint/test:
PR URL and state:
Next phase:
Next phase blocked until:
```

## Phase Tracker

| Phase | Branch | Deliverable | Gate |
| --- | --- | --- | --- |
| 0 | `docs/storage-phase-0-policy` | Policy, ADR, and this roadmap | PR #61 merged |
| 1 | `fix/storage-phase-1-ingress-security` | Bounded uploads and legacy path isolation | Phase 0 merged |
| 2 | `fix/storage-phase-2-provider-config` | Validated provider configuration | Phase 1 merged |
| 3 | `feat/storage-phase-3-file-metadata` | Metadata, ownership, and upload intents | Phase 2 merged |
| 4 | `feat/storage-phase-4-content-validation` | Content verification and quarantine | Phase 3 merged |
| 5 | `refactor/storage-phase-5-boundaries` | Clean Architecture and OCR boundary | Phase 4 merged |
| 6 | `feat/storage-phase-6-lifecycle` | Cleanup, retry, and deletion lifecycle | Phase 5 merged |
| 7 | `feat/storage-phase-7-observability` | Audit, metrics, timeout, and retry | Phase 6 merged |
| 8 | `test/storage-phase-8-quality-gates` | Security, integration, and load tests | Phase 7 merged |
| 9 | `chore/storage-phase-9-rollout` | Caller migration and legacy removal | Phase 8 merged |

The tracker describes gates, not live GitHub state. Always verify the previous
PR through GitHub before starting.

## Non-Negotiable Invariants

- KYC, business-license, and certification objects remain private.
- Client input never determines another owner's ID, provider key, folder, or
  Cloudinary public ID.
- JWT `sub` is the authenticated account ID.
- Reviewer roles are `ADMIN` and `STATE_AGENCY`.
- Role checks do not replace resource ownership checks.
- Signed URLs, upload tokens, provider secrets, identity numbers, and raw OCR
  payloads are never logged.
- The service-role Supabase key is backend-only.
- Existing public API behavior may be preserved temporarily only through an
  explicitly named compatibility path.

## Phase 0: Policy And Architecture Contract

Completion gate: PR #61 must be merged. After merge, Phase 0 is complete; do
not create another commit solely to edit this sentence.

Required deliverables:

- Asset/provider/visibility policy matrix.
- Concrete operational defaults and authority definitions.
- Provider/access ADR.
- Current-state deviation inventory.
- This execution roadmap.
- Explicit FPT Vision/OCR boundary.

Definition of Done:

- Documentation contains no undecided provider or visibility behavior.
- Every known deviation is assigned to a later phase.
- CI build/lint/test succeeds.
- PR #61 is merged into `develop`.

## Phase 1: Ingress Security And Legacy Isolation

Branch: `fix/storage-phase-1-ingress-security`

Goal: remove immediate denial-of-service and cross-owner path risks without
introducing metadata or the final upload-intent API.

In scope:

- Add byte, file-count, field-count, and filename-length limits at Multer
  interceptor level before complete memory buffering.
- Keep ParseFilePipe validation as defense in depth.
- Add storage-specific rate limiting using the policy defaults.
- Add `@nestjs/throttler` if it is absent, register `ThrottlerModule` once at
  application composition, and apply endpoint-specific limits.
- Read the owner ID only from `@CurrentUser('sub')`.
- Treat the legacy `path` field as a relative filename/path only. Reject
  absolute paths, traversal, backslashes, control characters, and explicit
  `users/` prefixes. The server always stores/reads it under
  `users/{JWT-sub}/{normalized-relative-path}`.
- Prevent `cccd`, `business_license`, and `document` image types from routing to
  public Cloudinary. The image endpoint must reject these values with HTTP 400
  and direct callers to the private file-upload endpoint.
- Redact source URLs and signed query strings from current FPT Vision logs.
- Add focused tests for file size, file count, traversal, cross-owner path,
  private asset routing, authentication, and rate limits.

Expected files:

- `src/modules/storage/presentation/decorators/*`
- `src/modules/storage/presentation/controllers/storage.controller.ts`
- `src/modules/storage/presentation/schemas/*`
- `src/modules/storage/application/storage.service.ts`
- A small path-policy helper under application/domain, not infrastructure.
- `src/app.module.ts`, `package.json`, and `package-lock.json` only if
  `@nestjs/throttler` must be installed and registered.
- Relevant Storage tests.
- FPT logging files only where needed to remove URL disclosure.

Out of scope:

- Database metadata.
- Upload-intent endpoints.
- Provider configuration refactor.
- Cloudinary public-ID migration.
- OCR implementation replacement.
- Removing all legacy endpoints.

Definition of Done:

- Oversized multipart payloads are rejected by Multer with HTTP 413 before the
  service receives a complete buffer.
- A user cannot request, overwrite, or download another user's legacy path.
- Private asset types cannot reach public Cloudinary upload.
- No storage or OCR log contains a source/signed URL.
- Existing public product/review/ad/avatar uploads still work.

## Phase 2: Provider Configuration

Branch: `fix/storage-phase-2-provider-config`

Goal: make configuration deterministic and fail fast without changing storage
API contracts.

In scope:

- Add typed environment validation for Supabase, Cloudinary, storage limits,
  URL TTL, environment prefix, and rate-limit defaults.
- Keep one backend Supabase secret variable and reject publishable credentials
  for server administration.
- Configure Cloudinary once through Nest dependency injection; do not create
  duplicate service instances.
- Validate bucket name and private status through a deployment/config-check
  command, not on every health request.
- Document provider-side MIME and file-size settings.
- Add unit tests for missing, malformed, and valid configuration.

Validated variables:

```text
SUPABASE_URL
SUPABASE_SERVICE_KEY
SUPABASE_BUCKET
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
STORAGE_ENV_PREFIX
STORAGE_MAX_IMAGE_BYTES
STORAGE_MAX_DOCUMENT_BYTES
STORAGE_MAX_FILES_PER_REQUEST
STORAGE_MAX_ORIGINAL_FILENAME_LENGTH
STORAGE_DOWNLOAD_URL_TTL_SECONDS
STORAGE_UPLOAD_INTENT_TTL_SECONDS
STORAGE_UPLOAD_INTENT_RATE_LIMIT_PER_MINUTE
STORAGE_MULTIPART_RATE_LIMIT_PER_MINUTE
STORAGE_DOWNLOAD_URL_RATE_LIMIT_PER_MINUTE
```

External provider changes:

- Never modify production bucket settings automatically.
- Report required Supabase Dashboard/SQL changes for explicit operator action.
- Confirm the bucket remains private after operator changes.

Out of scope: metadata, upload intents, content scanning, migrations.

Definition of Done: invalid config fails at startup with a non-secret error;
valid config builds and provider adapters receive one validated config object.

## Phase 3: Metadata, Ownership, And Upload Intents

Branch: `feat/storage-phase-3-file-metadata`

Goal: replace raw paths in new APIs with owned file records.

In scope:

- Add a `stored_files` persistence entity and migration with the fields defined
  by `storage-policy.md`.
- Add an outbound metadata repository port and TypeORM adapter.
- Implement server-generated file IDs and provider keys.
- Implement create-intent, complete, signed-download, and delete use cases.
- Add the four target controller endpoints.
- Validate resource ownership before attach, download, and delete.
- Preserve legacy endpoints as deprecated compatibility endpoints only.
- Add unit, repository integration, and authorization E2E tests.

Out of scope: malware integration, cleanup scheduler, removing legacy routes.

Definition of Done: new endpoints never accept raw provider paths, cross-owner
access returns 403/404, and every new provider object has an owned metadata
record.

## Phase 4: Content Validation And Quarantine

Branch: `feat/storage-phase-4-content-validation`

Goal: activate only content that matches policy.

In scope:

- Detect MIME from signature bytes.
- Verify supported image dimensions and reject decompression bombs.
- Normalize extensions from detected content, not original filenames.
- Calculate SHA-256 checksums.
- Move private documents through `QUARANTINED`.
- Implement authorized manual approve/reject transitions.
- Add malicious/spoofed/truncated fixture tests.

Prefer maintained parsing libraries instead of custom magic-byte or image
decoders. If `file-type` or `sharp` is added, pin it through `package.json` and
include its failure modes in tests.

Do not invent or purchase a malware provider. If no scanner has been approved,
manual review is the implemented fallback and private files remain quarantined.

Definition of Done: spoofed MIME and invalid transitions are rejected; private
documents cannot become active without an approved review path.

## Phase 5: Architecture And OCR Boundaries

Branch: `refactor/storage-phase-5-boundaries`

Goal: enforce inward dependency direction without changing HTTP behavior.

In scope:

- Move storage provider ports to `application/ports/outbound`.
- Replace presentation DTO and Cloudinary constant imports in application code
  with application input models and policy values.
- Keep Cloudinary/Supabase details in infrastructure adapters.
- Remove the dead duplicate
  `src/modules/storage/application/fpt-vision.service.ts`.
- Move the canonical OCR adapter behind a profile/KYC outbound port.
- Ensure OCR consumes authorized bytes or a private short-lived handle and
  never logs it.
- Add architecture/import-boundary tests where practical.

Definition of Done: application imports no presentation or infrastructure
module, and exactly one canonical FPT Vision adapter remains.

## Phase 6: Lifecycle And Cleanup

Branch: `feat/storage-phase-6-lifecycle`

Goal: reconcile database and provider state safely.

In scope:

- Enforce the lifecycle transition table.
- Expire pending intents after 900 seconds.
- Add orphan cleanup and failed-deletion retry jobs.
- Delete Cloudinary objects by persisted public ID, never parsed URL.
- Make completion and deletion idempotent.
- Add failure tests for provider-success/DB-failure and DB-success/provider-failure.

Definition of Done: retrying complete/delete is safe and scheduled reconciliation
leaves no untracked active object.

## Phase 7: Observability And Resilience

Branch: `feat/storage-phase-7-observability`

Goal: make failures measurable without leaking private data.

In scope:

- Structured audit events for intent, completion, private download, and delete.
- Provider latency, error, rejection, and byte-count metrics.
- Provider timeouts and bounded retry with backoff for transient failures only.
- Alerts/runbook for elevated failure rate and cleanup backlog.
- Tests proving secret and signed-URL redaction.

Definition of Done: operators can diagnose provider failure by file ID and
request correlation ID without seeing private URLs or OCR data.

## Phase 8: Quality Gates

Branch: `test/storage-phase-8-quality-gates`

Goal: prove security and resource behavior under realistic load.

In scope:

- Complete unit, integration, and E2E matrix for all policy asset types.
- Test anonymous, owner, cross-owner, reviewer, and admin behavior.
- Add provider contract tests against non-production resources.
- Add concurrent upload/load tests and record process memory.
- Add CI gates for Storage tests and architecture checks.

Definition of Done: security cases pass, memory stays within the documented test
budget, and CI blocks regression.

## Phase 9: Migration And Rollout

Branch: `chore/storage-phase-9-rollout`

Goal: migrate consumers and remove unsafe compatibility behavior.

In scope:

- Inventory backend/frontend callers of legacy path-based endpoints.
- Backfill metadata for retained provider objects.
- Migrate KYC/business documents away from public Cloudinary delivery.
- Update consumers to file IDs and intent completion.
- Add deprecation telemetry, then remove legacy routes after zero usage.
- Document feature flag, rollback, and production verification.

Definition of Done: no production caller uses raw paths, private assets have no
permanent public URL, legacy routes are removed, and rollback is documented.
