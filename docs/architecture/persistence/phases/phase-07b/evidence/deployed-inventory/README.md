# Phase 7B Read-Only Deployed Inventory

Status: `PHASE_7B_INVENTORY_BLOCKED`

This evidence package records the post-specification inventory attempt authorized
by P7B-19. It contains source/catalog comparison and explicit access blockers. No
PostgreSQL connection was opened because no environment satisfied both operational
authorization and dedicated read-only credential requirements.

## Phase Dependency

- Phase 7B specification PR: #91, merged into `develop`.
- Merge commit: `b135d7ba1e0d8ed92c820b3af6637348da683ec1`.
- Backend Quality Gate on PR #91: `SUCCESS`.
- Inventory branch base: the same merge commit.

## Evidence Window

- Audit started: 2026-08-03T23:34:38+07:00.
- Database session started: `NO`.
- Protected database accessed: `NO`.
- Railway accessed: `NO`.
- Historical checked-in snapshots were treated as discovery evidence only, not as
  current deployed inventory.

## Authorization Matrix

| Environment alias | Repository evidence                                  | Operational authorization | Dedicated read-only credential | Transaction enforcement | Inventory status                                   |
| ----------------- | ---------------------------------------------------- | ------------------------- | ------------------------------ | ----------------------- | -------------------------------------------------- |
| `local-protected` | Local Docker topology and protected database records | yes, inventory policy     | no                             | not attempted           | `BLOCKED_READ_ONLY_CREDENTIAL_REQUIRED`            |
| `staging`         | Mentioned as a deployment class; deployment unproven | no environment approval   | no                             | not attempted           | `BLOCKED_OPERATIONAL_AUTHORIZATION_REQUIRED`       |
| `production`      | Railway topology documented; deployment unproven     | no environment approval   | no                             | not attempted           | `BLOCKED_OPERATIONAL_AUTHORIZATION_AND_CREDENTIAL` |

P7B-19 is policy authorization for read-only inventory. It does not prove that an
environment exists, grant infrastructure access or convert a writable application
credential into an approved inventory credential.

## Planned Command Allowlist

| Purpose                    | Category    | Planned command class                                | Executed |
| -------------------------- | ----------- | ---------------------------------------------------- | -------- |
| Open stable snapshot       | transaction | `BEGIN ... REPEATABLE READ READ ONLY`                | no       |
| Confirm read-only settings | session     | `SHOW` and safe `SELECT current_setting(...)`        | no       |
| Apply bounded timeouts     | session     | `SET LOCAL` inside the read-only transaction         | no       |
| Read catalog metadata      | metadata    | `SELECT` from `information_schema` and `pg_catalog`  | no       |
| Read aggregate evidence    | aggregate   | bounded `SELECT` counts/null/duplicate/orphan checks | no       |
| End snapshot               | transaction | `ROLLBACK` or `COMMIT`                               | no       |

No statement outside `SELECT`, `SHOW`, `BEGIN`, `SET LOCAL`, `COMMIT` and
`ROLLBACK` was planned. Because the credential gate failed before connection, the
statement count is zero.

## Safety Record

| Control                         | Result            |
| ------------------------------- | ----------------- |
| Read-only transaction confirmed | no session opened |
| Allowlisted statements executed | 0                 |
| DDL executed                    | 0                 |
| DML executed                    | 0                 |
| Migration executed              | 0                 |
| Seed/synchronize executed       | 0                 |
| Application bootstrap executed  | 0                 |
| Raw rows exported               | 0                 |
| Secrets recorded                | 0                 |

No per-environment JSON was created because no environment was eligible for an
inventory session. Creating a JSON document with assumed database results would
misrepresent blocked evidence as observed evidence.

## Contents

- [Inventory summary](inventory-summary.md)
- [Conditional gate resolution](conditional-gate-resolution.md)

## Operator Handoff

For each required rollout environment, an authorized operator must provide a
dedicated read-only credential or run the approved allowlisted queries in a
repeatable-read, read-only transaction. Returned evidence must be sanitized to
metadata and aggregates and must not contain connection details, raw rows, private
file identifiers, URLs, JSON payloads or personal data.
