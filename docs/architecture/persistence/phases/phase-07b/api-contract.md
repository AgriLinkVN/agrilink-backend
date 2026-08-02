# Phase 7B API Contract

Status: `READY_FOR_REVIEW`. Paths below are proposals, not implementation approval.

## Existing Compatibility Surface

| Method/path                                | Current behavior                                                      | Compatibility requirement                                                            |
| ------------------------------------------ | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `GET /api/v1/admin/disputes`               | Lists `IncidentReport` rows                                           | Preserve response during deprecation; do not silently switch to real disputes        |
| `PATCH /api/v1/admin/disputes/{id}/status` | Writes arbitrary incident status                                      | Freeze expansion; replace with validated incident transition endpoint before removal |
| `GET /api/v1/admin/audit-logs`             | Admin/State Agency technical audit list                               | Preserve; private changes require redaction policy                                   |
| `GET /api/v1/trace/{qrCode}`               | Public route reaches an explicitly unimplemented service method       | Keep path contract only after a safe public projection is approved                   |
| `GET /api/v1/trace/product/{productId}`    | Public route reaches an explicitly unimplemented service method       | Pagination and visibility must be approved before implementation                     |
| `POST /api/v1/trace`                       | Farmer/Cooperative/Admin route reaches an unimplemented create method | Validate product ownership and idempotency before enabling writes                    |

Deprecation must be explicit in OpenAPI and release notes. Existing paths cannot be
repurposed to different resources while clients still consume them.

## Proposed Use-Case Surface

| Use case                  | Method     | Endpoint                                                        | Actor                               | Request                                                        | Response                  | Errors                                                   |
| ------------------------- | ---------- | --------------------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------- | ------------------------- | -------------------------------------------------------- |
| Submit incident           | POST       | `/api/v1/compliance/incidents`                                  | approved reporter                   | `CreateIncidentRequest` plus `Idempotency-Key`                 | `IncidentResponse`        | invalid subject/evidence, duplicate operation, forbidden |
| List incidents            | GET        | `/api/v1/compliance/incidents`                                  | owner/participant or oversight role | cursor, status, subject filters                                | redacted page             | forbidden, invalid cursor                                |
| Get incident              | GET        | `/api/v1/compliance/incidents/{id}`                             | owner/participant or oversight role | path UUID                                                      | role-specific projection  | not found, forbidden                                     |
| Transition incident       | POST       | `/api/v1/compliance/incidents/{id}/transitions`                 | Admin/State Agency                  | action, expectedVersion, reason                                | updated incident          | invalid transition, version conflict                     |
| Open dispute              | POST       | `/api/v1/compliance/disputes`                                   | eligible order participant          | orderId, reason, evidence IDs plus `Idempotency-Key`           | `DisputeResponse`         | not eligible/window expired/duplicate                    |
| Add dispute evidence      | POST       | `/api/v1/compliance/disputes/{id}/evidence`                     | participant/oversight               | storedFileIds plus operation key                               | evidence metadata         | immutable/forbidden/duplicate                            |
| Resolve dispute           | POST       | `/api/v1/compliance/disputes/{id}/resolution`                   | approved resolver                   | outcome, reason, refund intent, expectedVersion, operation key | resolved dispute          | invalid transition/version/payment conflict              |
| Submit certificate        | POST       | existing Products path or approved Compliance path              | owner                               | certificate metadata and storedFileId                          | private owner projection  | invalid file/duplicate                                   |
| Verify/reject certificate | POST/PATCH | existing Products path or approved authority path               | State Agency/approved authority     | decision, reason, expectedVersion                              | authority projection      | invalid transition/version conflict                      |
| Revoke certificate        | POST       | `/api/v1/compliance/certificates/{id}/revocation`               | approved authority                  | reason, expectedVersion, operation key                         | revoked metadata          | already revoked/forbidden/version conflict               |
| Public certificate        | GET        | `/api/v1/public/certificates/{id}`                              | public                              | identifier                                                     | approved metadata only    | not found/expired/revoked policy                         |
| Create trace batch        | POST       | `/api/v1/trace` compatibility or `/api/v1/traceability/batches` | producer/admin                      | `CreateTraceBatchRequest`, operation key                       | private batch projection  | product forbidden/duplicate                              |
| Append trace event        | POST       | `/api/v1/traceability/batches/{id}/events`                      | owner/approved system               | type, occurredAt, payload, evidence IDs, operation key         | event projection          | conflict/forbidden/duplicate                             |
| Correct trace event       | POST       | `/api/v1/traceability/events/{id}/corrections`                  | owner/oversight                     | replacement facts, reason, operation key                       | superseding event         | immutable/forbidden/conflict                             |
| Public trace              | GET        | `/api/v1/trace/{qrCode}`                                        | public                              | QR path                                                        | redacted ordered timeline | not found                                                |

Endpoint family, dispute existence, certificate location and correction authority
remain P0 decisions. They must not be added to OpenAPI until approved.

## DTO Proposals

### CreateIncidentRequest

- `subjectType` and `subjectId`: required only after subject decision; UUID where applicable.
- `incidentType`: approved enum, never arbitrary text.
- `description`: trimmed, bounded non-empty text.
- `evidenceFileIds`: unique UUID array; every file must be private, active and
  authorized for the caller.
- Request does not accept reporter ID, status, provider URL or timestamps.

### IncidentTransitionRequest

- `action`: approved transition action enum.
- `expectedVersion`: non-negative integer.
- `reason`: required and bounded for resolution, close or reopen as approved.
- Request does not accept resolver ID or next status directly.

### OpenDisputeRequest

- `orderId`: UUID.
- `reasonCode`: approved enum plus bounded `description`.
- `evidenceFileIds`: authorized private file IDs.
- Request does not accept opener/respondent IDs, payment amount or status.

### ResolveDisputeRequest

- `outcome`: approved structured enum.
- `reason`: required bounded text.
- `refundAmount`: exact VND string only if the approved outcome allows it.
- `expectedVersion`: required integer.
- Refund execution remains Payments-owned.

### Certificate Requests

- Submission reuses the active Products DTO when the certificate is product-scoped.
- A new DTO is allowed only if a distinct credential aggregate is approved.
- Verification/revocation requests require expected version, decision/reason and no
  client-supplied actor or timestamps.

### Trace Requests

- Batch creation accepts approved product/batch/location fields only.
- Event append accepts a discriminated event payload; arbitrary JSON is not a
  public contract.
- Corrections reference the superseded event and require a reason; update-in-place
  is not exposed.

## Response And Privacy

- Public certificate responses exclude `storedFileId`, document URL, private notes,
  reviewer identity details and rejection/revocation internal notes.
- Public trace responses expose approved provenance facts only. Pesticide, location,
  lab and producer data require field-level privacy approval.
- Participant responses may expose evidence metadata but obtain downloads through
  the Storage authorization endpoint, never raw provider keys.
- Admin/State Agency responses still redact secrets and unrelated personal data.
- Raw ORM entities and database errors are never returned.
- List endpoints use deterministic cursor ordering `(createdAt DESC, id DESC)` or
  an approved event sequence and enforce bounded page sizes.

## Authorization Contract

Authentication uses the existing JWT guard and source roles. `certifier` is not an
existing role and cannot appear in decorators until identity/role governance adds
it. Object-level authorization verifies order participation, product ownership,
evidence access and resource scope through application ports.

## Error Contract

The current global exception filter returns status/message/error but has no stable
application `code`. Phase 7B recommends adding a backward-compatible optional
`code` field through the established presentation error mapper pattern. This is a
cross-cutting API decision and requires approval.

| HTTP | Candidate code                | Trigger                                   | Client-safe message                              | Retry            |
| ---- | ----------------------------- | ----------------------------------------- | ------------------------------------------------ | ---------------- |
| 404  | `INCIDENT_NOT_FOUND`          | Visible incident does not exist           | Incident not found                               | no               |
| 409  | `INCIDENT_INVALID_TRANSITION` | Action not valid for current state        | Incident state changed or action is invalid      | reload           |
| 409  | `DISPUTE_ALREADY_EXISTS`      | Approved uniqueness scope conflicts       | A matching dispute already exists                | replay/read      |
| 422  | `DISPUTE_WINDOW_EXPIRED`      | Approved opening window elapsed           | Dispute opening period has ended                 | no               |
| 409  | `DISPUTE_ALREADY_RESOLVED`    | Terminal dispute mutation                 | Dispute has already been resolved                | read             |
| 404  | `CERTIFICATE_NOT_FOUND`       | Visible certificate missing               | Certificate not found                            | no               |
| 409  | `CERTIFICATE_ALREADY_REVOKED` | Duplicate incompatible revoke             | Certificate has already been revoked             | read/replay      |
| 410  | `CERTIFICATE_EXPIRED`         | Policy denies an expired active operation | Certificate has expired                          | no               |
| 409  | `TRACEABILITY_CONFLICT`       | QR, operation key or event order conflict | Traceability record conflicts with current state | reload/replay    |
| 409  | `EVIDENCE_IMMUTABLE`          | Update/delete of retained fact            | Submitted evidence cannot be modified            | no               |
| 409  | `VERSION_CONFLICT`            | Expected version mismatch                 | Resource changed; reload and retry               | yes after reload |
| 403  | `EVIDENCE_ACCESS_DENIED`      | Caller cannot use/view private file       | Evidence access denied                           | no               |

Names and the optional envelope field are `RECOMMENDED_DECISION`, not yet an
existing repository convention.

## Backward Compatibility Gate

- Snapshot current OpenAPI before implementation and fail on unapproved removals.
- Add contract tests for old Admin and `/trace` paths before replacing adapters.
- Never return a real `Dispute` payload from the legacy incident route without a
  versioned/deprecated transition.
- Frontend State dashboard currently consumes incident fields from
  `/admin/disputes`; its migration is a separate frontend task.
