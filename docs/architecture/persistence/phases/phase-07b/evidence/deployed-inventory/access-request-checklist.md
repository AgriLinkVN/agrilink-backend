# Phase 7B Inventory Access Request Checklist

Status: `TEMPLATE_NOT_AUTHORIZATION`

## Production Execution Closure Record

The current production access record is closed successfully. This closure does
not modify the reusable checklist or prior expired-window history.

- Production accessed: `YES`.
- Access: `DEDICATED_READ_ONLY_INVENTORY`.
- Reviewed statements: `59`; executed: `33`; skipped table absent: `22`;
  skipped not applicable: `4`; failed: `0`.
- DDL: `0`; DML: `0`; transaction: `ROLLED_BACK`.
- Connection: `CLOSED_WITHIN_APPROVED_WINDOW`.
- Application credential: `NOT_USED`; credential values: `NOT_RECORDED`.
- Sanitization: `PRODUCTION_JSON_MANUAL_REVIEW_CONFIRMED=true` and
  `PRODUCTION_JSON_AUTOMATED_SCAN_CLEAN=true`.

Complete this checklist outside the repository approval workflow for each required
environment. It must not contain a credential, connection string or sensitive
infrastructure value.

## Scope And Ownership

- [ ] Environment alias: `[safe alias]`
- [ ] Environment existence confirmed: `[YES/NO]`
- [ ] Approved rollout applicability confirmed: `[YES/NO]`
- [ ] Business reason: resolve P7B-11/P7B-15 read-only inventory gates
- [ ] Tables required: `quality_certificates`, `product_certifications`,
      `traceability_records`, `incident_reports`, `audit_logs`, plus related-name
      metadata discovery
- [ ] Metadata-only scope approved
- [ ] Aggregate-only scope approved
- [ ] Operational owner: `[accountable role]`
- [ ] Operator: `[authorized operator]`
- [ ] Approver: `[authorized approver]`

## Access Controls

- [ ] Dedicated read-only credential confirmed, or database operator execution
      approved
- [ ] Repeatable-read, read-only transaction required
- [ ] `transaction_read_only = on` verification required
- [ ] Statement, lock and idle-transaction timeouts accepted
- [ ] Allowed command classes restricted to the reviewed query pack
- [ ] Credential expiry: `[timestamp or managed-session end]`
- [ ] Allowed IP/device policy, if applicable: `[confirmed without sensitive value]`
- [ ] Start time: `[ISO timestamp]`
- [ ] End time: `[ISO timestamp]`
- [ ] Access revocation owner: `[accountable role]`

## Data Handling

- [ ] No raw rows
- [ ] No URLs or private file identifiers
- [ ] No descriptions, notes, JSON changes, network values or personal data
- [ ] Exact counts used only when operationally safe
- [ ] Catalog estimates labeled `ESTIMATED`
- [ ] Output uses `operator-output-template.json`
- [ ] Schema metadata hash contains sanitized metadata only
- [ ] Output sanitization reviewer assigned
- [ ] Approved evidence recipient/channel recorded outside this template

## Closure

- [ ] Transaction rolled back
- [ ] Zero schema-changing statements confirmed
- [ ] Zero row-changing statements confirmed
- [ ] Zero raw rows exported confirmed
- [ ] Zero secrets exposed confirmed
- [ ] Credential/session expired or revoked
- [ ] Revocation confirmed by: `[accountable role]`
- [ ] Sanitized output reviewed and accepted
- [ ] Remaining blockers recorded

Approval of this checklist authorizes only the bounded inventory session. It does
not approve migration, seed, synchronization, application startup, implementation
or deployment.

## Linked Production Approval Record

The generic checklist above remains a secret-free reusable template. The approved
production decision is recorded separately in the
[Phase 7B production inventory access approval](production-access-approval.md).

- Environment alias: `production`.
- Exists: `YES`.
- Phase 7B rollout: `YES`.
- Operator: `APPROVED_PRODUCTION_INVENTORY_OPERATOR`.
- Approver: `PROJECT_ARCHITECTURE_AND_DATABASE_OWNER`.
- Execution method: `DEDICATED_POSTGRESQL_READ_ONLY_CREDENTIAL`.
- Purpose: `PHASE_7B_PRODUCTION_CREDENTIAL_PROVISIONING_AND_READ_ONLY_INVENTORY`.
- Dedicated role: `agrilink_inventory_reader`.
- Credential alias only: `AGRILINK_PRODUCTION_READONLY_DATABASE_URL`.
- Credential provision status: `EXECUTED_FOR_APPROVED_INVENTORY`.
- Application credential: `DATABASE_URL = PROHIBITED_FOR_INVENTORY`.
- Access window: `2026-08-08T19:00:00+07:00` through
  `2026-08-08T23:00:00+07:00`, timezone `Asia/Ho_Chi_Minh`, maximum 240 minutes.
- Production accessed: `YES`.
- Railway accessed: `NO`.
- Metadata-only approval: `YES`.
- Aggregate-only approval: `YES`.
- Output policy: `SANITIZED_JSON_MANUAL_REVIEW_BEFORE_COMMIT`.
- Transaction closure: `ROLLBACK` required.
- Connection closure: required immediately after rollback.
- Secret persistence: prohibited in terminal history, files, logs and screenshots.
- Credential lifecycle closure:
  `CREDENTIAL_LOGIN_VALIDITY=EXPIRED_BY_CONFIGURED_VALID_UNTIL`.
- `CREDENTIAL_VALID_UNTIL=2026-08-08T23:00:00+07:00`.
- `FURTHER_PRODUCTION_CONNECTION_AUTHORIZED=NO`.
- `CREDENTIAL_VALUE_PERSISTED=NO`.
- `ROLE_OBJECT_POST_WINDOW_STATE=NOT_RECHECKED_NO_CONNECTION_AUTHORIZED`.
- `ROLE_OBJECT_RETENTION_DECISION=NO_IMMEDIATE_ACTION_REQUIRED_FOR_INVENTORY_CLOSURE`.
- Inventory completed: `YES`.
- Production inventory: `COMPLETE_AND_REVIEWED`.

The configured login validity ended at the approved window boundary. This record
does not claim the role was dropped or no longer exists, and no post-window
database verification was performed or authorized.

Previous access-window history:

- Window: `2026-08-07T21:00:00+07:00` through
  `2026-08-07T22:00:00+07:00`.
- Result: `EXPIRED_WITHOUT_CONNECTION`.
- Production accessed: `NO`.
- Railway accessed: `NO`.
- SQL executed: `0`.
- Credential provisioned: `NO`.
- Role created: `NO`.
- Production inventory executed: `NO`.
- Migration: `0`.
- Renewal reason: the approved 2026-08-07 window expired before dedicated
  PostgreSQL read-only credential provisioning and production inventory were
  performed. No production connection, SQL execution, role creation, credential
  provisioning, migration or inventory occurred during that window.

Earlier access-window history:

- Window: `2026-08-06T21:00:00+07:00` through
  `2026-08-06T22:00:00+07:00`.
- Result: `EXPIRED_WITHOUT_CONNECTION`.
- Production accessed: `NO`.
- Railway accessed: `NO`.
- SQL executed: `0`.
- Credential provisioned: `NO`.
- Role created: `NO`.
- Migration: `0`.
- Renewal reason: the approved window expired before dedicated PostgreSQL
  read-only credential provisioning was completed. No production connection, SQL
  execution, role creation or credential provisioning occurred.

Older access-window history:

- Window: `2026-08-05T21:00:00+07:00` through
  `2026-08-05T22:00:00+07:00`.
- Result: `EXPIRED_WITHOUT_CONNECTION`.
- Production accessed: `NO`.
- SQL executed: `0`.
- Credential provisioned: `NO`.
- Renewal reason: the previous approved window expired before dedicated credential
  provisioning was completed. No production connection, SQL execution or
  credential provisioning occurred.

Oldest access-window history:

- Window: `2026-08-04T23:00:00+07:00` through
  `2026-08-05T00:00:00+07:00`.
- Result: `EXPIRED_WITHOUT_CONNECTION`.
- Production accessed: `NO`.
- SQL executed: `0`.
- Credential provisioned: `NO`.
- Renewal reason: the window expired before the dedicated PostgreSQL read-only
  credential was provisioned.

Bounded access is approved, but execution remains blocked until the dedicated
credential is externally provisioned and its PostgreSQL-level restrictions are
validated. The application `DATABASE_URL` remains prohibited.

After this authorization PR is reviewed and merged, Stage A may create only
`agrilink_inventory_reader`, configure read-only settings, grant database
`CONNECT`, grant schema `USAGE`, revoke direct schema `CREATE`, grant `SELECT` only
on approved existing inventory tables, and perform catalog-based privilege
validation. Stage B must use `AGRILINK_PRODUCTION_READONLY_DATABASE_URL` in a
repeatable-read, read-only transaction and end with `ROLLBACK`. Provisioning and
inventory connections must remain separate.

Production inventory is `COMPLETE_AND_REVIEWED`. P7B-11 is
`RECONCILIATION_REQUIRED_SOURCE_CONSUMER_DISPOSITION_PENDING`; P7B-15 is
`STAGED_RECONCILIATION_REQUIRED_ENVIRONMENT_DIVERGENCE_CONFIRMED`; implementation
is `BLOCKED_PENDING_RECONCILIATION_DECISIONS`.
