# Phase 7B Production Inventory Access Approval

Status: `APPROVED_PENDING_DEDICATED_READ_ONLY_CREDENTIAL`

## Approval Record

- Approval date: 2026-08-04.
- Current access-window renewal date: 2026-08-08.
- Approver: Mai Nguyễn Tiến Đạt.
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
- Credential provision status: `PENDING_EXTERNAL_OPERATIONAL_PROVISIONING`.

## Scope

This approval permits metadata and aggregate inventory only for:

- `quality_certificates`;
- `product_certifications`;
- `traceability_records`;
- `incident_reports`;
- `audit_logs`;
- related-name catalog metadata discovery.

## Approved Operator

Mai Nguyễn Tiến Đạt

## Access Window

- Start: `2026-08-08T19:00:00+07:00`.
- End: `2026-08-08T23:00:00+07:00`.
- Timezone: `Asia/Ho_Chi_Minh`.
- Maximum duration: 240 minutes.
- Production accessed: `NO`.
- Railway accessed: `NO`.
- Production inventory: `NOT_STARTED`.

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

## Revocation And Expiry

The dedicated credential should be time-limited or revoked after inventory unless
it is retained under an approved read-only operational policy.

The revocation or retention decision must be recorded without exposing
infrastructure details. Its current status is `PENDING`.

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

- Phase verdict: `PHASE_7B_INVENTORY_BLOCKED`.
- Credential status: `PENDING_EXTERNAL_OPERATIONAL_PROVISIONING`.
- Production inventory: `NOT_STARTED`.
- P7B-11: `BLOCKED_PENDING_PRODUCTION_INVENTORY`.
- P7B-15: `BLOCKED_PENDING_PRODUCTION_INVENTORY`.
- P7B-18: `P7B-18_POLICY_MODEL_APPROVED`.
- Retention duration: `RETENTION_DURATION_NOT_CONFIGURED`.
- Retention cleanup: `RETENTION_CLEANUP_DISABLED`.
- Legal hold: `LEGAL_HOLD_REQUIRED`.
- Cascade hard-delete: `CASCADE_HARD_DELETE_PROHIBITED`.
- Migration: `NOT_AUTHORIZED`.
- Implementation branch: `NOT_AUTHORIZED`.
