# Phase 7B Environment Scope Worksheet

Status: `ENVIRONMENT_DECISIONS_RECORDED`

## Approval Record

- Decision date: 2026-08-04
- Approver: Mai Nguyễn Tiến Đạt
- Approval capacity: Project Owner, Architecture Owner, Database Owner for this
  academic project, and Environment Operator for `local-protected`
- Production access approval capacity: Project Owner, Architecture Owner, Database
  Owner for this academic project, Production Environment Owner, and Production
  Inventory Operator

These decisions define Phase 7B inventory scope. They do not authorize migration,
implementation or deployment. A production connection is authorized only under the
linked bounded approval, after the dedicated credential is provisioned and
validated, and during the approved access window.

## Worksheet

| Environment alias | Exists | Phase 7B rollout evidence | Decision                  | Operational owner   | Operator            | Execution method                              | P7B-11 required | P7B-15 required | Inventory performed | Status                                               |
| ----------------- | ------ | ------------------------- | ------------------------- | ------------------- | ------------------- | --------------------------------------------- | --------------- | --------------- | ------------------- | ---------------------------------------------------- |
| `local-protected` | YES    | YES                       | `REQUIRED`                | Mai Nguyễn Tiến Đạt | Mai Nguyễn Tiến Đạt | `APPROVED_OPERATOR_RUN_READ_ONLY_TRANSACTION` | YES             | YES             | YES                 | `REQUIRED_INVENTORY_COMPLETED_WITH_SCHEMA_BLOCKERS`  |
| `staging`         | NO     | NO                        | `NOT_APPLICABLE_APPROVED` | `NOT_APPLICABLE`    | `NOT_APPLICABLE`    | `NOT_APPLICABLE`                              | NO              | NO              | NO                  | `NOT_APPLICABLE_APPROVED`                            |
| `production`      | YES    | YES, future rollout       | `REQUIRED`                | Mai Nguyễn Tiến Đạt | Mai Nguyễn Tiến Đạt | `DEDICATED_POSTGRESQL_READ_ONLY_CREDENTIAL`   | YES             | YES             | NO                  | `REQUIRED_READ_ONLY_CREDENTIAL_PROVISIONING_PENDING` |

## Local-Protected Authorization

- Status before execution: `REQUIRED_READY`.
- Authorization: metadata and aggregate inventory only.
- Read-only enforcement: PostgreSQL `READ ONLY` transaction required.
- Isolation: `REPEATABLE READ`.
- Application bootstrap, TypeORM CLI, migration, seed, synchronization and raw-row
  export were prohibited.
- Final capture: 45 allowlisted statements, explicit rollback, zero DDL, zero DML,
  zero raw rows and zero secrets.
- Evidence: [sanitized local inventory](local-protected.json).

The local inventory is complete for review. Schema-dependent aggregate checks that
were not type-safe are recorded as blockers rather than rewritten or forced.
Preliminary parser diagnostics remained allowlisted and read-only, but one catalog
query was not byte-identical to the reviewed pack. Its 2026-08-04 review concluded
`PROCESS_DEVIATION_REVIEWED_AND_ACCEPTED`: the difference was whitespace-only,
the output did not influence committed evidence, and no clean rerun is required.

## Staging Decision

- Exists: `NO`.
- Part of rollout: `NO`.
- Decision: `NOT_APPLICABLE_APPROVED`.
- Approval date: 2026-08-04.
- Rationale: the project has no separate staging database. The current topology has
  a local database and one Railway database connected directly to the backend
  deployment.

Staging is not an inventory blocker and was not connected.

## Production Decision

- Exists: `YES`.
- Platform classification: Railway PostgreSQL connected directly to the backend.
- Part of future Phase 7B rollout: `YES`.
- Decision: `REQUIRED`.
- Operational authorization: `BOUNDED_ACCESS_APPROVED`.
- Execution method: `DEDICATED_POSTGRESQL_READ_ONLY_CREDENTIAL`.
- Credential alias: `AGRILINK_PRODUCTION_READONLY_DATABASE_URL`.
- Credential provision: `PENDING_EXTERNAL_OPERATIONAL_PROVISIONING`.
- Access window: `2026-08-04T23:00:00+07:00` through
  `2026-08-05T00:00:00+07:00`, maximum 60 minutes.
- Output policy: `SANITIZED_JSON_MANUAL_REVIEW_BEFORE_COMMIT`.
- Session closure: `ROLLBACK_CLOSE_CONNECTION_CONFIRM_NO_CREDENTIAL_PERSISTENCE`.
- Status: `REQUIRED_READ_ONLY_CREDENTIAL_PROVISIONING_PENDING`.
- Inventory performed: `NO`.
- Connection attempted: `NO`.

The bounded access decision is recorded in the
[production access approval](production-access-approval.md). The dedicated
credential has not been provisioned or validated, so production execution remains
blocked. The application credential was not inspected or used and remains
prohibited.

## Remaining Access Decision

Only production remains in the required inventory set. Its bounded access is
approved, while credential provisioning and privilege validation remain external
operational/DBA tasks. P7B-19 remains read-only inventory authorization and is not
migration approval.
