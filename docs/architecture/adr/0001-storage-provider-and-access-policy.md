# ADR 0001: Storage Provider And Access Policy

## Status

Accepted

## Context

AgriLink currently uses Cloudinary for images and Supabase Storage for files.
The existing module has useful provider adapters, but its public HTTP contract
accepts client-selected paths and maps some identity documents to Cloudinary.
That makes it difficult to enforce ownership, prevent accidental disclosure,
and safely delete provider objects.

The backend architecture rules require application code to depend on stable
ports rather than external provider or HTTP DTO details. The storage design must
also support moderation, KYC review, product certification, and user-requested
deletion without exposing provider credentials.

## Decision

AgriLink will retain a two-provider model:

- Cloudinary stores only public images: products, reviews, ads, and avatars.
- Supabase Storage stores all private documents in a private bucket: identity
  documents, business licenses, and certifications until they are explicitly
  published by product policy.

The server owns authorization, object-key generation, metadata, and lifecycle.
Clients request an upload intent and receive only a scoped upload mechanism.
They do not submit paths, folders, provider public IDs, or raw provider delete
targets.

All private file access uses an authenticated authorization check followed by a
short-lived signed URL. Provider keys and Cloudinary public IDs are saved as
metadata and are never recovered by parsing a delivery URL.

New application use cases depend on storage ports in `application/ports/outbound`.
Cloudinary and Supabase remain infrastructure adapters. Presentation DTOs are
mapped to application input models before use cases are invoked.

## Consequences

### Positive

- KYC and business documents remain private by default.
- Ownership checks are consistent across upload, download, and deletion.
- A provider can be changed without changing application use cases.
- Metadata enables cleanup, audit logs, retention, and moderation workflows.
- Object-name collisions and brittle Cloudinary URL parsing are removed.

### Costs

- The backend needs a storage metadata table and lifecycle cleanup job.
- Existing frontend callers must migrate from path-based endpoints to file IDs.
- Direct browser uploads require a completion step and failure handling.
- Provider-level MIME and size settings must be maintained alongside code.

## Implementation Sequence

1. Protect ingress and stop accepting unrestricted client paths.
2. Validate provider configuration and bucket restrictions at startup/deploy.
3. Add metadata, ownership authorization, and upload intents.
4. Add content verification, lifecycle cleanup, observability, and migration.

## Rollback

The legacy routes remain available behind a compatibility layer until all
callers use file IDs. Rollback disables the new intent endpoint through a
feature flag; it does not make private documents public or remove existing
metadata.
