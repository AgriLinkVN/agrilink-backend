# Phase 7B Read-Only Deployed Inventory

Status: `PHASE_7B_INVENTORY_BLOCKED`

This evidence package records the post-specification inventory authorized by
P7B-19. Local-protected evidence is complete for review, staging is approved not
applicable, and production remains blocked by missing read-only access.

## Phase Dependency

- Phase 7B specification PR: #91, merged into `develop`.
- Merge commit: `b135d7ba1e0d8ed92c820b3af6637348da683ec1`.
- Backend Quality Gate on PR #91: `SUCCESS`.
- Inventory access-plan PR: #93, merged into `develop`.
- Access-plan merge commit: `0cf16e7f901b4969fc2bc356d072a402e6e8ea4a`.
- Inventory branch base: the access-plan merge commit.

## Evidence Window

- Audit started: 2026-08-03T23:34:38+07:00.
- Local inventory captured: 2026-08-04T01:05:18+07:00.
- Protected database accessed: `YES`, approved local-only read-only session.
- Railway accessed: `NO`.
- Historical checked-in snapshots were treated as discovery evidence only, not as
  current deployed inventory.

## Authorization Matrix

| Environment alias | Owner decision              | Operational authorization           | Connection | Inventory status                                    |
| ----------------- | --------------------------- | ----------------------------------- | ---------- | --------------------------------------------------- |
| `local-protected` | required                    | approved operator-run read-only     | completed  | `REQUIRED_INVENTORY_COMPLETED_WITH_REVIEW_BLOCKERS` |
| `staging`         | not applicable, approved    | not applicable                      | none       | `NOT_APPLICABLE_APPROVED`                           |
| `production`      | required for future rollout | application credential only; unsafe | none       | `REQUIRED_READ_ONLY_CREDENTIAL_MISSING`             |

The environment decisions were approved on 2026-08-04. P7B-19 does not convert the
production application credential into an approved inventory credential.

## Planned Command Allowlist

| Purpose                    | Category    | Planned command class                                | Executed |
| -------------------------- | ----------- | ---------------------------------------------------- | -------- |
| Open stable snapshot       | transaction | `BEGIN ... REPEATABLE READ READ ONLY`                | yes      |
| Confirm read-only settings | session     | `SHOW` and safe `SELECT current_setting(...)`        | yes      |
| Apply bounded timeouts     | session     | `SET LOCAL` inside the read-only transaction         | yes      |
| Read catalog metadata      | metadata    | `SELECT` from `information_schema` and `pg_catalog`  | yes      |
| Read aggregate evidence    | aggregate   | bounded `SELECT` counts/null/duplicate/orphan checks | partial  |
| End snapshot               | transaction | `ROLLBACK`                                           | yes      |

The final local capture executed 45 reviewed statements. Type-unsafe Traceability
orphan checks and schema-dependent queries with failed preconditions were not run.

## Safety Record

| Control                         | Result                    |
| ------------------------------- | ------------------------- |
| Read-only transaction confirmed | yes, local-protected only |
| Isolation                       | repeatable read           |
| Allowlisted statements executed | 45                        |
| Final transaction               | rolled back               |
| DDL executed                    | 0                         |
| DML executed                    | 0                         |
| Migration executed              | 0                         |
| Seed/synchronize executed       | 0                         |
| Application bootstrap executed  | 0                         |
| Raw rows exported               | 0                         |
| Secrets recorded                | 0                         |

Preliminary operator attempts encountered one type-incompatible reviewed aggregate
and client-side parsing issues. Every attempt was read-only and was rolled back or
closed with PostgreSQL rollback semantics. Only the final successful sanitized
capture is used as inventory evidence.

One preliminary catalog-only diagnostic remained inside the statement allowlist but
was not byte-identical to the reviewed estimate block. It returned metadata only and
is recorded as a process-review blocker; it is not part of the 45-statement final
evidence capture.

## Contents

- [Inventory summary](inventory-summary.md)
- [Conditional gate resolution](conditional-gate-resolution.md)
- [Sanitized local-protected inventory](local-protected.json)
- [Environment scope worksheet](environment-scope-worksheet.md)
- [Operator instructions](operator-instructions.md)
- [Operator read-only query pack](operator-query-pack.md)
- [Sanitized output template](operator-output-template.json)
- [Access request checklist](access-request-checklist.md)

## Operational Access Preparation

The local operator authorization has been exercised and closed. Staging is approved
not applicable. The operator pack remains preparation-only for production, which
must not be accessed with the application credential.

## Operator Handoff

Production requires a dedicated read-only credential or separately approved
database-operator execution. Until sanitized production evidence is reviewed,
P7B-11 and P7B-15 remain blocked across the complete rollout scope.
