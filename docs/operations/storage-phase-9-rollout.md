# Storage Phase 9 Rollout Runbook

## Purpose

This runbook is the production gate for Storage Phase 9. The code change is not
ready for full traffic until every check in **Cutover Gate** passes.

Private documents covered by this rollout:

- Product certifications.
- Retained quality-certificate records, when that legacy table exists.
- Farmer CCCD front and back.
- Cooperative registration, business license, representative CCCD, and member
  list.
- Enterprise and supplier business licenses.

Never paste a legacy URL, signed URL, upload token, identity number, provider
secret, or raw OCR response into logs, pull requests, or tickets.

## Caller Inventory

| Consumer                   | Legacy behavior                                          | Phase 9 behavior                                                                           |
| -------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Product create page        | `POST /storage/files/upload` with a client path          | Create intent, upload to its scoped URL, complete, submit `storedFileId`                   |
| State certification review | Public URL or `GET /storage/files/download-url?path=...` | `GET /storage/files/:id/download-url` as an authorized reviewer                            |
| Farmer profile form        | CCCD sent through Cloudinary image upload                | `KYC_IDENTITY` upload intents and `cccd*FileId`                                            |
| B2B profile form           | Licenses and identity images sent through Cloudinary     | `BUSINESS_LICENSE` or `KYC_IDENTITY` intents and file IDs                                  |
| Product/profile services   | Persist and return URL fields                            | Validate ownership, attach metadata, persist file IDs; legacy URL columns are not selected |
| Legacy storage routes      | Raw relative paths                                       | No route; attempts end in 404 and emit `storage.legacy_route_rejected`                     |

The public image endpoint remains only for policy-approved public media.
`cccd`, `business_license`, and `document` are not valid image types.

## Deployment Flag

Provision the release-platform flag `storage-file-id-rollout-v1` before
deployment. This is a matched-stack flag: a user must reach the Phase 9
frontend and Phase 9 API together. Default it to off.

The flag controls deployment routing, not asset visibility. It must never:

- Make the Supabase bucket public.
- Restore a Cloudinary delivery URL for a private asset.
- bypass file ownership or review state.
- Delete metadata during rollback.

Recommended cohorts are internal operators, 5%, 25%, 50%, and 100%. Keep the
previous matched frontend/API revisions available until the observation window
has completed.

## Preconditions

1. Phase 8 PR is merged and the Phase 9 migration has been reviewed.
2. PostgreSQL backup and restore have been tested.
3. `DB_SYNCHRONIZE=false`; production schema changes are migration-only.
4. Supabase bucket is private and provider MIME/size controls match
   `storage-policy.md`.
5. `SUPABASE_SERVICE_KEY` is available only to the backend/operator shell.
6. Cloudinary access is available to an authorized operator who can identify
   exact legacy assets without parsing public IDs from URLs.
7. Gateway access logs show zero successful calls to the three legacy routes
   for the agreed observation window.

## Migration Sequence

Run commands from the backend repository. Do not start the API for these steps.

```powershell
npm run build
npm run typeorm -- migration:run -d src/database/data-source.ts
npm run storage:phase9:plan
```

The database migration creates idempotent placeholder metadata for retained
Supabase object paths, then adds nullable file-ID links and foreign keys. The
placeholder deliberately has `size_bytes=0` until the operator command reads
and validates the retained object. The migration does not copy an external URL
and does not delete a provider object.

Run the external-source copy only from a restricted operator shell:

```powershell
npm run storage:phase9:migrate
```

`storage:phase9:migrate` first downloads every retained Supabase object,
validates its bytes, and replaces placeholder size, MIME, extension, and
checksum values with detected metadata. For external sources it accepts only
approved HTTPS Cloudinary/Supabase hosts, validates every redirect, enforces the
10 MB limit while streaming, writes the object to the private Supabase bucket,
creates metadata, and links the record in one database transaction. It logs
record IDs and a one-way source fingerprint, never the source URL.

For each copied Cloudinary asset:

1. Use the Cloudinary Media Library or Admin API to resolve the exact provider
   asset ID.
2. Delete the original using that provider ID. Never derive a public ID by
   parsing the delivery URL.
3. Confirm the old URL returns HTTP 404 or 410.

Then clear legacy columns:

```powershell
npm run storage:phase9:finalize
npm run storage:phase9:verify
```

Finalize clears a retained Supabase path after it has a metadata link. It clears
an HTTP source only after the source returns 404 or 410. A reachable public
source blocks finalization.

## Cutover Gate

All checks must be true before setting `storage-file-id-rollout-v1` to 100%:

- `storage:phase9:verify` reports
  `legacySources=0 invalidLinks=0 invalidPrivateMetadata=0`.
- Linked metadata has a positive byte count, detected MIME, validated
  extension, checksum, owner, asset type, and matching resource attachment.
- No active frontend source references `files/presign`, `files/upload`,
  `files/download-url`, `documentUrl`, or private Cloudinary image types.
- Every linked private asset has `provider=SUPABASE` and
  `visibility=PRIVATE`.
- Owner, cross-owner, reviewer, and anonymous storage tests pass.
- A reviewer can open a quarantined document through a short-lived signed URL.
- An owner cannot open a quarantined document.
- Product/profile approval moves linked files to `ACTIVE`; rejection moves them
  to `FAILED`.
- Supabase bucket inspection still reports private.
- Legacy route success count is zero. Any
  `storage.legacy_route_rejected` event is investigated before increasing the
  cohort.
- Backend and frontend build/lint/test gates pass for the exact release commits.

## Production Smoke Test

Use non-sensitive test accounts and disposable files:

1. Farmer uploads both CCCD sides and saves a profile.
2. Enterprise or supplier uploads a business license and saves a profile.
3. Seller uploads a certification, creates a product certification record, and
   receives no permanent document URL.
4. Cross-owner download returns 404.
5. Reviewer opens each quarantined file and approves or rejects it.
6. Approved owner download uses a signed URL with the configured TTL.
7. Database checks show file IDs and no legacy URL/path values.
8. Logs contain file/correlation IDs only, with no signed URL or OCR payload.

## Rollback

1. Set `storage-file-id-rollout-v1` off so traffic returns to the previous
   matched frontend/API revisions.
2. Do not revert the additive migration and do not delete `stored_files`.
3. Do not republish a deleted Cloudinary private asset.
4. Keep the Supabase bucket private.
5. Stop new private-document writes while diagnosing a metadata or consumer
   issue.
6. If a previous revision requires a retained Supabase path, restore the legacy
   column from the linked `stored_files.object_key` in a reviewed SQL change.
   Never restore an HTTP delivery URL.
7. Re-run `storage:phase9:plan` and the focused security tests before attempting
   cutover again.

The migration `down()` removes application links but intentionally leaves
backfilled metadata. Deleting metadata would make retained provider objects
untracked and is not an acceptable rollback.

## Evidence To Attach To Release

- Backend and frontend commit SHAs.
- Migration execution ID and row counts by source key.
- Cloudinary deletion confirmation held in the restricted operations system.
- `storage:phase9:verify` output.
- Build, lint, focused test, full test, and E2E results.
- Flag cohort timestamps and legacy-route telemetry counts.
