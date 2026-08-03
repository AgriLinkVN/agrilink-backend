# Phase 7B Environment Scope Worksheet

Status: `ENVIRONMENT_DECISIONS_RECORDED`

## Approval Record

- Decision date: 2026-08-04
- Approver: Mai Nguyễn Tiến Đạt
- Approval capacity: Project Owner, Architecture Owner, Database Owner for this
  academic project, and Environment Operator for `local-protected`

These decisions define Phase 7B inventory scope. They do not authorize migration,
implementation, deployment or a production connection.

## Worksheet

| Environment alias | Exists | Phase 7B rollout evidence | Decision                  | Operational owner   | Operator              | Execution method                              | P7B-11 required | P7B-15 required | Inventory performed | Status                                              |
| ----------------- | ------ | ------------------------- | ------------------------- | ------------------- | --------------------- | --------------------------------------------- | --------------- | --------------- | ------------------- | --------------------------------------------------- |
| `local-protected` | YES    | YES                       | `REQUIRED`                | Mai Nguyễn Tiến Đạt | Mai Nguyễn Tiến Đạt   | `APPROVED_OPERATOR_RUN_READ_ONLY_TRANSACTION` | YES             | YES             | YES                 | `REQUIRED_INVENTORY_COMPLETED_WITH_SCHEMA_BLOCKERS` |
| `staging`         | NO     | NO                        | `NOT_APPLICABLE_APPROVED` | `NOT_APPLICABLE`    | `NOT_APPLICABLE`      | `NOT_APPLICABLE`                              | NO              | NO              | NO                  | `NOT_APPLICABLE_APPROVED`                           |
| `production`      | YES    | YES, future rollout       | `REQUIRED`                | Mai Nguyễn Tiến Đạt | not approved for task | `APPLICATION_DATABASE_URL_ONLY`               | YES             | YES             | NO                  | `REQUIRED_READ_ONLY_CREDENTIAL_MISSING`             |

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
- Credential state: `APPLICATION_DATABASE_URL_ONLY`.
- Status: `REQUIRED_READ_ONLY_CREDENTIAL_MISSING`.
- Inventory performed: `NO`.
- Connection attempted: `NO`.

The application credential was not inspected or used. Production remains the
cross-environment blocker until a dedicated read-only credential or separately
approved database-operator execution is available.

## Remaining Access Decision

Only production remains in the required inventory set. Credential provisioning is
an operational/DBA task outside this repository. P7B-19 remains read-only inventory
authorization and is not migration approval.
