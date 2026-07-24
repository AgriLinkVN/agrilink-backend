# Storage Asset Policy

## Status

Accepted for all new Storage module work. This policy describes the target
contract; legacy endpoints remain supported only until their callers migrate.

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
| `CERTIFICATION` | Supabase private bucket | Private until approved for publication | PDF, JPEG, PNG | 10 MB | Product/seller owner or admin | Owner and authorized reviewers; public only when an explicit product policy permits it |

The listed limits must be enforced both at the HTTP ingress and at the storage
provider. A MIME value supplied by a client is a claim, not proof of content.

## Identity, Ownership, And Keys

Clients may submit asset type, target resource, original filename, declared
MIME type, and declared size. They must never submit an object path, Cloudinary
folder, Cloudinary public ID, or another user's owner ID.

The server generates an opaque UUID and a provider key using this convention:

```text
{environment}/owners/{ownerId}/{assetType}/{resourceId}/{uuid}.{extension}
```

`resourceId` may be `pending` only while the upload intent is being completed.
The server stores provider keys separately from public URLs. Cloudinary deletion
uses the persisted public ID; it must not attempt to reconstruct an ID from a
delivery URL.

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

```text
PENDING -> UPLOADED -> ACTIVE -> DELETED
                 \-> QUARANTINED
                 \-> FAILED
```

`PENDING` records expire if upload completion does not occur. `DELETED` is a
soft-delete state until the provider cleanup succeeds. A scheduled cleanup job
removes expired pending objects and retries failed provider deletions.

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

## API Direction

The target API uses opaque file IDs rather than raw paths:

```text
POST   /storage/uploads/intents
POST   /storage/uploads/:id/complete
GET    /storage/files/:id/download-url
DELETE /storage/files/:id
```

The current `path`-based presign, upload, and download routes are legacy
contracts. They must be deprecated after the intent-based API has migrated all
callers.

## Definition Of Done

- A user cannot access, overwrite, or request a signed URL for another user's
  private object.
- A private document has no permanent delivery URL.
- Oversized or disallowed content is rejected before it can become active.
- Every active provider object has a corresponding metadata record and every
  metadata record identifies its provider object.
- Unit, integration, and end-to-end tests cover authorization, validation,
  provider failure, and lifecycle cleanup.
