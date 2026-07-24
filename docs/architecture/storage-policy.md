# Storage Asset Policy

## Status

Accepted when the pull request containing this document is merged into
`develop`. This policy describes the target contract; legacy endpoints remain
supported only through the controlled migration described in
`storage-roadmap.md`.

## Goals

- Keep public media fast to deliver while keeping identity and business
  documents private.
- Make the API, not the client, responsible for storage keys and ownership.
- Make every stored object traceable, revocable, and removable.

## Asset Matrix

| Asset type | Provider | Visibility | Accepted content | Size limit | Upload authority | Read authority |
| --- | --- | --- | --- | --- | --- | --- |
| `PRODUCT_IMAGE` | Cloudinary | Public | JPEG, PNG, WebP | 5 MB | Product owner or admin | Public |
| `REVIEW_IMAGE` | Cloudinary | Public | JPEG, PNG, WebP | 5 MB | Review author or admin | Public |
| `AD_IMAGE` | Cloudinary | Public | JPEG, PNG, WebP | 5 MB | Campaign owner or admin | Public |
| `AVATAR` | Cloudinary | Public | JPEG, PNG, WebP | 5 MB | Account owner or admin | Public |
| `KYC_IDENTITY` | Supabase private bucket | Private | PDF, JPEG, PNG | 10 MB | Account owner or admin | Account owner and authorized reviewers |
| `BUSINESS_LICENSE` | Supabase private bucket | Private | PDF, JPEG, PNG | 10 MB | Account owner or admin | Account owner and authorized reviewers |
| `CERTIFICATION` | Supabase private bucket | Private | PDF, JPEG, PNG | 10 MB | Product/seller owner or admin | Owner and authorized reviewers |

The listed limits must be enforced both at the HTTP ingress and at the storage
provider. A MIME value supplied by a client is a claim, not proof of content.

Certification publication is not part of the current roadmap. Certification
files remain private until a separate approved ADR defines publication,
redaction, and revocation behavior.

### Authority Terms

- The authenticated account ID is the JWT `sub` claim exposed through
  `@CurrentUser('sub')`.
- `Account owner` means the authenticated account whose `sub` owns the profile.
- `Resource owner` means the authenticated account matches the product seller,
  review author, campaign owner, or other persisted resource owner.
- `Authorized reviewers` means callers with `UserRole.ADMIN` or
  `UserRole.STATE_AGENCY`. A role match never replaces the resource-level check
  when an operation is owner-only.
- All other authenticated roles have no implicit access to private files.

### Default Operational Limits

| Control | Default |
| --- | --- |
| Image size | 5 MB |
| Private document size | 10 MB |
| Files per multipart request | 5 |
| Original filename length | 255 characters |
| Download signed URL TTL | 900 seconds |
| Upload intent TTL | 900 seconds |
| Upload intents | 10 per user per minute |
| Direct multipart uploads | 5 per user per minute |
| Download URL requests | 30 per user per minute |

These defaults may become environment variables in Phase 2. A later phase may
lower a limit without another ADR. Raising a limit or widening an allowed MIME
set requires a reviewed policy change.

## Identity, Ownership, And Keys

Clients may submit asset type, target resource, original filename, declared
MIME type, and declared size. They must never submit an object path, Cloudinary
folder, Cloudinary public ID, or another user's owner ID.

The server generates an opaque UUID and a provider key using this convention:

```text
{environment}/owners/{ownerId}/{assetType}/{fileId}.{extension}
```

The file metadata record links `fileId` to a resource after the server verifies
ownership. An upload may be unattached temporarily, but its key never contains
`pending` and is never renamed when attached. The server stores provider keys
separately from public URLs. Cloudinary deletion uses the persisted public ID;
it must not attempt to reconstruct an ID from a delivery URL.

## Metadata Contract

Phase 3 persists one record per provider object with these fields:

| Field | Required behavior |
| --- | --- |
| `id` | Server-generated UUID and public file identifier |
| `ownerId` | JWT `sub`; never accepted from client input |
| `assetType` | Value from the approved asset matrix |
| `provider` | `CLOUDINARY` or `SUPABASE` |
| `visibility` | `PUBLIC` or `PRIVATE`, derived from asset type |
| `status` | Approved lifecycle state |
| `resourceType`, `resourceId` | Nullable attachment to an authorized domain resource |
| `objectKey` | Unique server-generated provider key |
| `providerPublicId` | Cloudinary public ID; null for Supabase |
| `originalName` | Sanitized display/audit name, never used as provider key |
| `extension` | Derived from detected content |
| `declaredMime` | Untrusted client claim |
| `detectedMime` | Server-detected content type |
| `sizeBytes` | Actual provider/upload byte count |
| `checksumSha256` | Integrity value populated during validation |
| `expiresAt` | Required for pending upload intents |
| `createdAt`, `updatedAt`, `deletedAt` | Audit and soft-delete timestamps |

The database enforces uniqueness for `(provider, objectKey)` and indexes owner,
resource, status, and expiry lookup fields. Signed URLs and upload tokens are
never persisted.

## Access Rules

- Every storage action requires an authenticated user unless an explicitly
  public read endpoint serves a public asset.
- Authorization is evaluated against the file owner, the target resource, and
  the caller's role before a signed URL, upload token, delete, or metadata read
  is issued.
- Private Supabase objects are served only through short-lived signed URLs.
- Signed URLs and upload tokens are secrets: they are not persisted in logs,
  audit details, or database records.
- Public Cloudinary delivery is allowed only for asset types marked Public in
  the matrix.

## Lifecycle

Every file record follows this lifecycle:

| From | To | Trigger |
| --- | --- | --- |
| `PENDING` | `UPLOADED` | Completion endpoint verifies that the provider object exists |
| `PENDING` | `FAILED` | Upload/completion fails or the intent expires after 900 seconds |
| `PENDING` | `DELETED` | Owner cancels an unused intent and cleanup confirms no object remains |
| `UPLOADED` | `ACTIVE` | Public media passes content validation |
| `UPLOADED` | `QUARANTINED` | Private document awaits automated or authorized manual review |
| `UPLOADED` | `FAILED` | Content validation fails |
| `UPLOADED` | `DELETED` | Owner cancels before activation and provider cleanup succeeds |
| `QUARANTINED` | `ACTIVE` | Automated scan or authorized reviewer approves it |
| `QUARANTINED` | `FAILED` | Automated scan or authorized reviewer rejects it |
| `QUARANTINED` | `DELETED` | Owner or authorized reviewer removes the private document |
| `ACTIVE` | `DELETED` | Owner or authorized administrator requests deletion |
| `FAILED` | `DELETED` | Cleanup confirms the provider object is removed |

`DELETED` is a soft-delete state until provider cleanup succeeds. A scheduled
cleanup job removes expired pending objects and retries failed provider
deletions. Invalid state transitions must be rejected and tested.

Application workflows that update both a domain record and stored-file
metadata use compensating operations when the repositories cannot share one
database transaction. A compensation may restore a file from `ACTIVE` or
`FAILED` to `QUARANTINED` only when the same review request changed that file
and the corresponding domain write failed. This reverse transition is an
internal recovery operation, is not exposed by an HTTP endpoint, and must be
idempotent. A failed compensation is a consistency incident and must remain
visible as a server error for reconciliation.

Replacing a private profile document attaches and persists the new file before
retiring the previous file through the normal deletion-retry lifecycle.
Removing a product certification likewise retires its private file. Retired
metadata is retained for audit and cleanup; provider deletion must never be
implemented by dropping the metadata row.

## Security Controls

- HTTP upload endpoints use Multer limits before memory buffering, request rate
  limits, and a maximum file count.
- The server validates signature bytes, image dimensions, and final detected
  MIME type before activation.
- Private documents are scanned before activation when a malware scanning
  service is available; otherwise they remain unavailable to non-reviewer
  users until manual review.
- Provider secrets are server-only and validated at application startup.
- Supabase private buckets enforce allowed MIME types and file-size limits in
  addition to backend validation.

## OCR And FPT Vision Boundary

FPT Vision is a KYC/document-analysis adapter, not an image or file storage
provider. It belongs to the profile/KYC capability and must consume an
authorized byte stream or, only when technically required, a short-lived private
URL. A KYC object must never be made public for OCR.

The application must not log source URLs, signed URL query strings, identity
numbers, or raw OCR provider responses. The current duplicate
`src/modules/storage/application/fpt-vision.service.ts` is legacy/dead code and
must not become the canonical implementation. Its consolidation is assigned to
Phase 5 in the roadmap.

## API Direction

The target API uses opaque file IDs rather than raw paths:

```text
POST   /storage/uploads/intents
POST   /storage/uploads/:id/complete
GET    /storage/files/:id/download-url
DELETE /storage/files/:id
```

The current `path`-based presign, upload, and download routes are legacy
contracts. During Phase 1 they must reject paths outside the authenticated
owner's prefix. They must be deprecated after the intent-based API has migrated
all callers and must not gain new consumers.

## Known Current Deviations

This policy is not yet fully implemented. At the time of acceptance:

- Multipart uploads use memory storage without ingress-level byte limits.
- Legacy Supabase endpoints accept a client-selected path.
- Image type values such as `cccd` and `business_license` can route private
  documents to public Cloudinary delivery.
- There is no storage metadata table or upload-intent API.
- Application code imports a presentation DTO and Cloudinary folder constants.
- Cloudinary public IDs are derived from original filenames and deletion parses
  delivery URLs.
- The Supabase bucket is private but has no provider-level MIME or size limits.
- FPT Vision implementations are duplicated and may log private source URLs.

Each deviation is owned by an explicit roadmap phase. An execution agent must
not assume that a rule in this document is already enforced by code.

## Definition Of Done

- A user cannot access, overwrite, or request a signed URL for another user's
  private object.
- A private document has no permanent delivery URL.
- Oversized or disallowed content is rejected before it can become active.
- Every active provider object has a corresponding metadata record and every
  metadata record identifies its provider object.
- Unit, integration, and end-to-end tests cover authorization, validation,
  provider failure, and lifecycle cleanup.
