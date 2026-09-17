# ADR 0006: Profiles Verification And Admin Read Model

- Status: Accepted
- Date: 2026-07-26
- Owners: Profiles and Admin capabilities
- Scope: Persistence Phase 4

## Context

Admin previously registered and wrote all four profile persistence entities.
Three queues loaded a User ORM relation, while Supplier used a scalar user ID
and a separate Users lookup. Verification used read-mutate-save, so concurrent
reviewers could both report success. Profile and Storage review also relied on
unconditional persistence compensation.

The canonical v2 schema already represents profile lifecycle with a verified
boolean, reviewer metadata, optional rejection reason, and private StoredFile
references. It has no version column or profile status enum.

## Decision

Profiles owns all persistence and lifecycle behavior for farmer, cooperative,
enterprise, and supplier profiles.

Admin uses two typed Profiles capabilities:

- a read capability for pending queues, statistics, and organization
  projections;
- a command capability for verification transitions and narrowly scoped
  compensation.

Profiles projections contain scalar `userId` values. Admin resolves all users
through one batched Users port call and composes the existing `user` response
property. No profile entity imports User persistence, and no TypeORM entity
crosses the module boundary.

The existing lifecycle is interpreted as:

| State    | Persistence predicate                              |
| -------- | -------------------------------------------------- |
| pending  | verified is false and rejection reason is null     |
| approved | verified is true and rejection reason is null      |
| rejected | verified is false and rejection reason is non-null |

Only pending profiles may transition directly to approved or rejected.
Resubmission occurs through the existing owner upsert flow, which resets the
profile to pending. Approval and rejection use a conditional update containing
the pending predicate. Zero affected rows is a stale-reviewer conflict.

Profile status is authoritative. Private StoredFile review follows the profile
transition. If Storage fails, only files changed by that operation are restored
and Profiles returns to pending only when a conditional predicate proves the
same reviewer and result still own the transition. A failed compensation is
surfaced as a reconciliation incident.

Admin writes the AuditLog after profile and Storage success. The audit payload
contains only typed transition metadata. It uses a deterministic transition
identifier and bounded idempotent upsert retries. Audit failure is surfaced;
it does not weaken profile authorization or expose private evidence.

## Privacy

Private URLs, provider keys, signed URLs, file contents, and raw KYC data do
not cross the Profiles port or enter AuditLog. Internal verification
projections may carry opaque StoredFile IDs needed by authorized reviewers.
Public profile projections contain none of those fields.

## Schema

The canonical v2 profile schema is unchanged. Class relocation and metadata
completion require no migration. Legacy module-local fields without baseline,
runtime, or deployed evidence are not restored.

## Consequences

- Admin no longer owns or injects profile repositories.
- Concurrent reviewers have one database winner.
- Supplier and the other profile types use the same scalar-ID read model.
- User enrichment is one batch query rather than relation hydration or N+1.
- Cross-database/provider atomicity is intentionally not claimed; explicit
  conditional compensation protects the current Storage workflow.
