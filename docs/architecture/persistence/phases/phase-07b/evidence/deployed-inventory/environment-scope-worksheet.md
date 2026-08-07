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
- Purpose: `PHASE_7B_PRODUCTION_CREDENTIAL_PROVISIONING_AND_READ_ONLY_INVENTORY`.
- Execution method: `DEDICATED_POSTGRESQL_READ_ONLY_CREDENTIAL`.
- Dedicated role: `agrilink_inventory_reader`.
- Credential alias: `AGRILINK_PRODUCTION_READONLY_DATABASE_URL`.
- Credential provision: `PENDING_EXTERNAL_OPERATIONAL_PROVISIONING`.
- Application credential: `DATABASE_URL = PROHIBITED_FOR_INVENTORY`.
- Access window: `2026-08-08T19:00:00+07:00` through
  `2026-08-08T23:00:00+07:00`, timezone `Asia/Ho_Chi_Minh`, maximum 240 minutes.
- Production accessed: `NO`.
- Railway accessed: `NO`.
- Output policy: `SANITIZED_JSON_MANUAL_REVIEW_BEFORE_COMMIT`.
- Session closure: `ROLLBACK_CLOSE_CONNECTION_CONFIRM_NO_CREDENTIAL_PERSISTENCE`.
- Status: `REQUIRED_READ_ONLY_CREDENTIAL_PROVISIONING_PENDING`.
- Inventory performed: `NO`.
- Production inventory: `NOT_STARTED`.
- Connection attempted: `NO`.

The bounded access decision is recorded in the
[production access approval](production-access-approval.md). The dedicated
credential has not been provisioned or validated, so production execution remains
blocked. The application credential was not inspected or used and remains
prohibited.

## Production Access Window History

- Previous window: `2026-08-07T21:00:00+07:00` through
  `2026-08-07T22:00:00+07:00`.
- Previous result: `EXPIRED_WITHOUT_CONNECTION`.
- Production accessed: `NO`.
- Railway accessed: `NO`.
- SQL executed: `0`.
- Credential provisioned: `NO`.
- Role created: `NO`.
- Production inventory executed: `NO`.
- Migration: `0`.
- Reason: The approved 2026-08-07 window expired before dedicated PostgreSQL
  read-only credential provisioning and production inventory were performed. No
  production connection, SQL execution, role creation, credential provisioning,
  migration or inventory occurred during that window.

Earlier access-window history:

- Previous window: `2026-08-06T21:00:00+07:00` through
  `2026-08-06T22:00:00+07:00`.
- Previous result: `EXPIRED_WITHOUT_CONNECTION`.
- Production accessed: `NO`.
- Railway accessed: `NO`.
- SQL executed: `0`.
- Credential provisioned: `NO`.
- Role created: `NO`.
- Migration: `0`.
- Reason: The approved window expired before dedicated PostgreSQL read-only
  credential provisioning was completed. No production connection, SQL execution,
  role creation or credential provisioning occurred.

Older access-window history:

- Previous window: `2026-08-05T21:00:00+07:00` through
  `2026-08-05T22:00:00+07:00`.
- Previous result: `EXPIRED_WITHOUT_CONNECTION`.
- Production accessed: `NO`.
- SQL executed: `0`.
- Credential provisioned: `NO`.
- Reason: The previous approved window expired before dedicated credential
  provisioning was completed. No production connection, SQL execution or
  credential provisioning occurred.

Oldest access-window history:

- Previous window: `2026-08-04T23:00:00+07:00` through
  `2026-08-05T00:00:00+07:00`.
- Previous result: `EXPIRED_WITHOUT_CONNECTION`.
- Production accessed: `NO`.
- SQL executed: `0`.
- Credential provisioned: `NO`.
- Renewal reason: the previous window expired before the dedicated PostgreSQL
  read-only credential was provisioned. No production connection or database query
  occurred during that window.

## Remaining Access Decision

Only production remains in the required inventory set. Its bounded access is
approved, while credential provisioning and privilege validation remain external
operational/DBA tasks. P7B-19 remains read-only inventory authorization and is not
migration approval.

After this authorization PR is reviewed and merged, Stage A may provision only the
dedicated `agrilink_inventory_reader` role using the bounded grants documented in
the production approval. Stage B must use the dedicated credential and reviewed
read-only query pack; the DBA connection must not run inventory queries.

The phase verdict remains `PHASE_7B_INVENTORY_BLOCKED`. P7B-11 and P7B-15 are
`BLOCKED_PENDING_PRODUCTION_INVENTORY`. P7B-18 remains
`P7B-18_POLICY_MODEL_APPROVED`, with `RETENTION_DURATION_NOT_CONFIGURED`,
`RETENTION_CLEANUP_DISABLED`, `LEGAL_HOLD_REQUIRED` and
`CASCADE_HARD_DELETE_PROHIBITED`. Migration and an implementation branch remain
`NOT_AUTHORIZED`.
