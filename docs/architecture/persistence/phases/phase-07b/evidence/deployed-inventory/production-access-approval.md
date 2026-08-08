# Phase 7B Production Inventory Access Approval

Status: `EXECUTED_CLOSED_COMPLETE_AND_REVIEWED`

## Execution Closure

- Production accessed: `YES`.
- Access: `DEDICATED_READ_ONLY_INVENTORY`.
- Reviewed statements: `59`; executed: `33`; skipped table absent: `22`;
  skipped not applicable: `4`; failed: `0`.
- DDL: `0`; DML: `0`; migration: `0`; raw rows exported: `0`; PII read: `0`.
- Transaction: `REPEATABLE_READ_READ_ONLY`, terminated with `ROLLBACK`.
- Connection: `CLOSED_WITHIN_APPROVED_WINDOW`.
- Application credential: `NOT_USED`; DBA credential used for inventory: `NO`;
  credential values: `NOT_RECORDED`.
- `PRODUCTION_JSON_MANUAL_REVIEW_CONFIRMED=true`.
- `PRODUCTION_JSON_AUTOMATED_SCAN_CLEAN=true`.
- `PRODUCTION_INVENTORY_STATUS=COMPLETE_AND_REVIEWED`.

Production evidence records `quality_certificates=TABLE_NOT_PRESENT`,
`product_certifications=PRESENT`, `traceability_records=TABLE_NOT_PRESENT`,
`incident_reports=PRESENT`, and `audit_logs=PRESENT`.

`P7B_11_STATUS=RECONCILIATION_REQUIRED_SOURCE_CONSUMER_DISPOSITION_PENDING`:
`DATABASE_DEPLOYMENT_STATE=ABSENT_IN_LOCAL_PROTECTED_AND_PRODUCTION` while
`SOURCE_CONSUMER_STATE=STILL_PRESENT`. No source consumer is retired by this
record.

`P7B_15_STATUS=STAGED_RECONCILIATION_REQUIRED_ENVIRONMENT_DIVERGENCE_CONFIRMED`:
`LOCAL_PROTECTED=PRESENT_MAPPING_A_LIKE` and `PRODUCTION=TABLE_NOT_PRESENT`.
No canonical mapping is selected by this record.

`P7B_18_STATUS=P7B-18_POLICY_MODEL_APPROVED` remains unchanged:
`RETENTION_DURATION_NOT_CONFIGURED`; `RETENTION_CLEANUP_DISABLED`;
`LEGAL_HOLD_REQUIRED`; `CASCADE_HARD_DELETE_PROHIBITED`.

`PHASE_7B_IMPLEMENTATION_STATUS=BLOCKED_PENDING_RECONCILIATION_DECISIONS`.

## Approval Record

- Approval date: 2026-08-04.
- Current access-window renewal date: 2026-08-08.
- Approver: `PROJECT_ARCHITECTURE_AND_DATABASE_OWNER`.
- Approval capacity:
  - Project Owner.
  - Architecture Owner.
  - Database Owner for this academic project.
  - Production Environment Owner.
  - Production Inventory Operator.
- Environment alias: `production`.
- Environment exists: `YES`.
- Platform: Railway PostgreSQL connected to the deployed AgriLink backend.
- Part of Phase 7B rollout: `YES`.
- Inventory decision: `REQUIRED`.
- Purpose: `PHASE_7B_PRODUCTION_CREDENTIAL_PROVISIONING_AND_READ_ONLY_INVENTORY`.
- Execution method: `DEDICATED_POSTGRESQL_READ_ONLY_CREDENTIAL`.
- Dedicated role: `agrilink_inventory_reader`.
- Credential provision status: `EXECUTED_FOR_APPROVED_INVENTORY`.

## Scope

This approval permits metadata and aggregate inventory only for:

- `quality_certificates`;
- `product_certifications`;
- `traceability_records`;
- `incident_reports`;
- `audit_logs`;
- related-name catalog metadata discovery.

## Approved Operator

`APPROVED_PRODUCTION_INVENTORY_OPERATOR`

## Access Window

- Start: `2026-08-08T19:00:00+07:00`.
- End: `2026-08-08T23:00:00+07:00`.
- Timezone: `Asia/Ho_Chi_Minh`.
- Maximum duration: 240 minutes.
- Production accessed: `YES`.
- Railway accessed: `NO`.
- Production inventory: `COMPLETE_AND_REVIEWED`.

No connection is permitted before or after this window.

Reason for renewal: the approved 2026-08-07 window expired before dedicated
PostgreSQL read-only credential provisioning and production inventory were
performed. No production connection, SQL execution, role creation, credential
provisioning, migration or inventory occurred during that window.

## Access Window History

- Previous start: `2026-08-07T21:00:00+07:00`.
- Previous end: `2026-08-07T22:00:00+07:00`.
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

- Previous start: `2026-08-06T21:00:00+07:00`.
- Previous end: `2026-08-06T22:00:00+07:00`.
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

- Previous start: `2026-08-05T21:00:00+07:00`.
- Previous end: `2026-08-05T22:00:00+07:00`.
- Previous result: `EXPIRED_WITHOUT_CONNECTION`.
- Production accessed: `NO`.
- SQL executed: `0`.
- Credential provisioned: `NO`.
- Reason: The previous approved window expired before dedicated credential
  provisioning was completed. No production connection, SQL execution or
  credential provisioning occurred.

Oldest access-window history:

- Previous start: `2026-08-04T23:00:00+07:00`.
- Previous end: `2026-08-05T00:00:00+07:00`.
- Previous result: `EXPIRED_WITHOUT_CONNECTION`.
- Production accessed: `NO`.
- SQL executed: `0`.
- Credential provisioned: `NO`.

## Credential Requirements

- A dedicated PostgreSQL read-only credential is required.
- Dedicated role: `agrilink_inventory_reader`.
- Credential alias: `AGRILINK_PRODUCTION_READONLY_DATABASE_URL`.
- Application credential: `DATABASE_URL = PROHIBITED_FOR_INVENTORY`.
- The credential value must never be committed, printed or copied into evidence.
- The application `DATABASE_URL` is prohibited.
- Credential provisioning is an external Railway/PostgreSQL operational task.
- This repository task does not create users, roles, grants or permissions.

## Authorized Provisioning Scope

Only after this authorization PR is reviewed and merged, and only during the
approved access window, Stage A may:

- create the single dedicated role `agrilink_inventory_reader`;
- configure read-only role settings;
- grant database `CONNECT`;
- grant application-schema `USAGE`;
- revoke direct schema `CREATE` from the dedicated role;
- grant table `SELECT` only for approved inventory tables that exist;
- validate privileges using catalog metadata.

These are approved credential-provisioning operations only. They do not authorize
application schema changes. The provisioning connection and inventory connection
must remain separate, and the DBA connection must not run inventory queries.

## Required PostgreSQL-Level Controls

The credential owner and operator must confirm that the credential:

- is not a superuser;
- cannot create databases;
- cannot create roles;
- cannot replicate;
- cannot bypass row-level security;
- cannot create objects in the application schema;
- has no `INSERT` privilege;
- has no `UPDATE` privilege;
- has no `DELETE` privilege;
- has no `TRUNCATE` privilege;
- has no `REFERENCES` privilege unless explicitly required;
- has no `TRIGGER` privilege;
- has `SELECT` limited to the approved inventory scope.

No write operation may be attempted to test these controls. Privilege validation
must use catalog or privilege metadata only.

## Transaction Controls

The production inventory session must begin with the reviewed query pack and this
PostgreSQL-enforced transaction:

```sql
BEGIN TRANSACTION
ISOLATION LEVEL REPEATABLE READ
READ ONLY;
```

The operator must verify:

```text
transaction_read_only = on
transaction_isolation = repeatable read
```

Bounded transaction-local timeouts are required. The session must end with:

```sql
ROLLBACK;
```

`COMMIT` is not approved for this inventory.

## Output Policy

Policy: `SANITIZED_JSON_MANUAL_REVIEW_BEFORE_COMMIT`.

Only the future production inventory task may create `production.json`. This
documentation-only authorization task must not create it. The artifact must be
generated from the existing sanitized output template.

Before commit, a human must manually review it for:

- hostnames;
- ports;
- credential material;
- connection strings;
- provider identifiers;
- database usernames;
- raw UUIDs;
- private file identifiers;
- URLs;
- JSON payloads;
- IP addresses;
- personal data;
- raw business rows.

The manual review decision must be recorded before commit.

## Session Closure

After `ROLLBACK`:

- close the database client connection;
- remove temporary shell or session variables where applicable;
- confirm the credential was not stored in shell history;
- confirm no `.env` file was created or modified;
- confirm no credential was written to logs;
- confirm no screenshot contains connection details;
- close or revoke the bounded session according to the operator process.

Closure policy: `ROLLBACK_CLOSE_CONNECTION_CONFIRM_NO_CREDENTIAL_PERSISTENCE`.

## Credential Lifecycle Closure

- `CREDENTIAL_LOGIN_VALIDITY=EXPIRED_BY_CONFIGURED_VALID_UNTIL`.
- `CREDENTIAL_VALID_UNTIL=2026-08-08T23:00:00+07:00`.
- `FURTHER_PRODUCTION_CONNECTION_AUTHORIZED=NO`.
- `CREDENTIAL_VALUE_PERSISTED=NO`.
- `ROLE_OBJECT_POST_WINDOW_STATE=NOT_RECHECKED_NO_CONNECTION_AUTHORIZED`.
- `ROLE_OBJECT_RETENTION_DECISION=NO_IMMEDIATE_ACTION_REQUIRED_FOR_INVENTORY_CLOSURE`.

The dedicated credential's already-validated configured login validity ended at
the approved window boundary. This record does not claim the PostgreSQL role was
dropped or no longer exists. No post-window database verification was performed;
no production connection is authorized to perform one.

## Prohibited Operations

- application `DATABASE_URL` usage;
- backend startup;
- NestJS bootstrap;
- TypeORM initialization with synchronization hooks;
- migration CLI;
- migration generation;
- seed;
- synchronize;
- onboarding apply;
- `INSERT`;
- `UPDATE`;
- `DELETE`;
- `TRUNCATE`;
- application schema `CREATE`, `ALTER` or `DROP`;
- role creation other than the single approved dedicated role;
- grants outside database `CONNECT`, schema `USAGE` and approved-table `SELECT`;
- permission changes outside the dedicated role;
- `COPY`;
- `CALL`;
- `DO`;
- `VACUUM`;
- `ANALYZE`;
- raw-row export.

## Approval Boundary

After this authorization PR is reviewed and merged, this approval authorizes only
the bounded Stage A credential provisioning and Stage B read-only production
inventory activities documented above. Stage B must use
`AGRILINK_PRODUCTION_READONLY_DATABASE_URL`; it must not use the DBA connection.

It does not authorize:

- Phase 7B implementation;
- migration design;
- migration execution;
- deployment;
- data correction;
- schema change;
- credential creation through this repository task.

## Phase Status

- Phase verdict: `PHASE_7B_PRODUCTION_INVENTORY_RECORDED_READY_FOR_REVIEW`.
- Credential status: `EXECUTED_FOR_APPROVED_INVENTORY`.
- Production inventory: `COMPLETE_AND_REVIEWED`.
- P7B-11: `RECONCILIATION_REQUIRED_SOURCE_CONSUMER_DISPOSITION_PENDING`.
- P7B-15: `STAGED_RECONCILIATION_REQUIRED_ENVIRONMENT_DIVERGENCE_CONFIRMED`.
- P7B-18: `P7B-18_POLICY_MODEL_APPROVED`.
- Retention duration: `RETENTION_DURATION_NOT_CONFIGURED`.
- Retention cleanup: `RETENTION_CLEANUP_DISABLED`.
- Legal hold: `LEGAL_HOLD_REQUIRED`.
- Cascade hard-delete: `CASCADE_HARD_DELETE_PROHIBITED`.
- Migration: `NOT_AUTHORIZED`.
- Implementation branch: `NOT_AUTHORIZED`.
