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
| `local-protected` | required                    | approved operator-run read-only     | completed  | `REQUIRED_INVENTORY_COMPLETED_WITH_SCHEMA_BLOCKERS` |
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
is not part of the 45-statement final evidence capture. The review below resolves
the process blocker without changing the capture artifact or its disclosed history.

## Process Deviation Review

- Decision: `PROCESS_DEVIATION_REVIEWED_AND_ACCEPTED`.
- Reviewer: Mai Nguyễn Tiến Đạt.
- Capacity: Project Owner / Architecture Owner / Database Owner.
- Review date: 2026-08-04.
- Statement class: `SELECT`, catalog estimate only.
- Catalog sources: `pg_catalog.pg_class` joined to
  `pg_catalog.pg_namespace`; no application table was read.
- Reason: isolate the reviewed table-size estimate while diagnosing the local
  client-side capture parser.
- Transaction evidence: `transaction_read_only = on`, isolation
  `repeatable read`, `statement_timeout = 30s`, `lock_timeout = 5s`,
  `idle_in_transaction_session_timeout = 60s`, followed by explicit `ROLLBACK`.
- Output classification: four metadata rows containing approved table aliases,
  the constant `ESTIMATED` label and catalog row estimates; zero business rows,
  PII, URLs, private identifiers, JSON payloads or secrets.
- Side effects: zero DDL, zero DML and no application bootstrap, migration, seed
  or synchronization operation.
- Artifact influence: none. The estimates were not copied into
  `local-protected.json`, whose per-table counts are independently captured exact
  counts or `NOT_RUN` for the absent table.
- Gate influence: none. P7B-11 remains based on reviewed table discovery, source
  consumer evidence and missing production inventory. P7B-15 remains based on
  reviewed schema metadata, exact counts and missing production inventory.
- Final capture provenance: the final capture began after this diagnostic, used
  45 reviewed statements from `operator-query-pack.md`, and ended with its own
  explicit rollback. The diagnostic is not one of those 45 statements.

Sanitized diagnostic SQL shape:

```sql
SELECT <relation_alias>, 'ESTIMATED', GREATEST(<catalog_row_estimate>, 0)
FROM pg_catalog.pg_class
JOIN pg_catalog.pg_namespace ON <namespace_oid_match>
WHERE <namespace> = current_schema()
  AND <relation_kind> IN ('r', 'p')
  AND <relation_name> IN (<five_approved_target_aliases>)
ORDER BY <relation_alias>;
```

The corresponding reviewed statement is the Section 4 catalog estimate in
`operator-query-pack.md`. The preliminary SQL placed all three selected expressions
on one line and all five `IN` values on one line without spaces after commas; the
reviewed SQL places those expressions and values on separate indented lines. Raw
SHA-256 values therefore differ (`37f822185d9fcf58604b9db441cd90b251be509ff9b233e97c30100f7d25d3b0`
versus `24d3b6d07d733aa24f4805f040d7f79ce71a35ae625456a852273c8cbe2ce9d7`),
while removing whitespace from both produces the same SHA-256
`dc6904b3d57a4e993738b10dff3a16e0fce5c9cdb8ad1de66024169e168b4896`.
There is no command, projection, catalog, join, predicate, ordering, timeout or
result-use difference.

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
