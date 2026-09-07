# Persistence Phase 4 Implementation Report

## A. Synchronization

- Phase 3 PR `#82`: merged, CI success.
- Documentation reorganization PR `#83`: merged, CI success.
- Source develop:
  `a6571ac846aab53171b5e940f061d5bc5e811e13`.
- Branch: `refactor/persistence-phase-4-profiles-admin`.
- Initial worktree: clean.

## B. Canonical Schema

The central runtime mappings were the base and the v2 catalog supplied the
three missing compatibility columns. The canonical classes now live under
`src/modules/profiles/infrastructure/persistence/entities`.

| Table                  | Writable mappings before/after | Baseline metadata completed                               |
| ---------------------- | ------------------------------ | --------------------------------------------------------- |
| `farmer_profiles`      | 2 / 1                          | `farm_name`, `experience_years`, two file FKs and indexes |
| `cooperative_profiles` | 2 / 1                          | `member_count`, five file FKs and indexes                 |
| `enterprise_profiles`  | 2 / 1                          | one file FK and index                                     |
| `supplier_profiles`    | 2 / 1                          | scalar User FK plus one file FK and index                 |

Central and old Profiles-local files are decorator-free compatibility
re-exports. The generator emits only those re-exports.

Local-only fields such as farm area/type/region, profile phone/media,
registration/establishment fields, website/logo, district extensions,
description, and certifications were not restored. They have no canonical
baseline, active runtime, or verified deployed-schema evidence.

## C. Ownership And Read Model

Admin Profile registrations and repository injections are both zero. Profiles
exports only typed reader and verification-manager tokens. Admin composes
pending and organization responses from scalar profile `userId` values and
one batched Users summary lookup.

No TypeORM entity, repository, query builder, DataSource, EntityManager, or
QueryRunner crosses the Profiles port. Product and Incident registrations
remain assigned to later phases.

## D. Verification Lifecycle

The existing fields define three states:

- pending: false plus null rejection reason;
- approved: true plus null rejection reason;
- rejected: false plus non-null rejection reason.

Approval and rejection are allowed only from pending. Owner upsert remains the
resubmission path and resets verification metadata. Repository conditional
updates include the pending predicate. A zero-row result becomes HTTP 409, so
two concurrent reviewers have exactly one winner.

## E. KYC, Storage, And Audit

Internal review projections contain only opaque StoredFile IDs required for
authorized review. Public farm output excludes identity numbers, document
URLs, file IDs, reviewer IDs, and rejection evidence.

Profile status is authoritative. Storage review follows the conditional
profile transition. On failure, only files changed by the request are restored
and the profile returns to pending only if a predicate proves the same
reviewer/result still owns that transition. Existing profile-upsert tests
continue to prove new-file detach and old-file preservation.

AuditLog remains Admin-owned. Its typed payload contains before/after state,
reason, actor, profile identity, and transition time, but no document
reference or signed/provider data. A deterministic ID and bounded idempotent
upsert retry protect the post-commit audit write.

## F. Schema And Migration

- Migration: `NONE`.
- Baseline migration: unchanged.
- Baseline tables: 26.
- Canonical catalog: 499/499, diff 0.
- TypeORM raw/reviewed: 6/6, reduced from 28/28.
- Unexpected/stale/catalog mismatch: 0/0/0.
- Profile compatibility entries retired: 22.

The local protected database is a reconciliation fixture, not production
truth. It has 33 tables, no migration ledger, zero rows in all four profile
tables, and retains its pre-v2 143-object drift. No DDL or DML was applied.
Its catalog fingerprint and normalized schema hash were identical before and
after Phase 4 verification.

## G. API And Queries

- OpenAPI: 88 paths, 99 operations.
- Fingerprint:
  `5637fed8d1ae886ea9cb8fabc5b9f7813454990c5f52ac5c5cded8fcb0a0157f`.
- Public farm read: 2 queries before, 1 after.
- Four pending persistence queues: 4 queries before and after.
- Admin user enrichment: one batch lookup independent of result size.
- No Users or Storage N+1.

## H. Validation

Final command results are recorded in the Phase 4 pull request. Focused Phase
4 tests cover ownership, generator/registry boundaries, all four
approval/rejection paths, missing reason, invalid transitions, concurrent
reviewers, batched Users lookup, KYC public exclusion, Storage compensation,
audit retry, and stale conflict mapping.

## I. Deferred Work

- Product and Review persistence boundaries: Phase 5.
- Protected local database v2 reconciliation.
- No new KYC download endpoint was created; authorized private access remains
  the existing Storage capability contract.
