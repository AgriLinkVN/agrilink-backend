# Phase 7B Inventory Access Request Checklist

Status: `TEMPLATE_NOT_AUTHORIZATION`

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
- Operator: Mai Nguyễn Tiến Đạt.
- Approver: Mai Nguyễn Tiến Đạt.
- Execution method: `DEDICATED_POSTGRESQL_READ_ONLY_CREDENTIAL`.
- Credential alias only: `AGRILINK_PRODUCTION_READONLY_DATABASE_URL`.
- Credential provision status: `PENDING_EXTERNAL_OPERATIONAL_PROVISIONING`.
- Access window: `2026-08-06T21:00:00+07:00` through
  `2026-08-06T22:00:00+07:00`, timezone `Asia/Ho_Chi_Minh`, maximum 60 minutes.
- Metadata-only approval: `YES`.
- Aggregate-only approval: `YES`.
- Output policy: `SANITIZED_JSON_MANUAL_REVIEW_BEFORE_COMMIT`.
- Transaction closure: `ROLLBACK` required.
- Connection closure: required immediately after rollback.
- Secret persistence: prohibited in terminal history, files, logs and screenshots.
- Credential revocation or retention decision: `PENDING`.
- Inventory completed: `NO`.

Previous access-window history:

- Window: `2026-08-05T21:00:00+07:00` through
  `2026-08-05T22:00:00+07:00`.
- Result: `EXPIRED_WITHOUT_CONNECTION`.
- Production accessed: `NO`.
- SQL executed: `0`.
- Credential provisioned: `NO`.
- Renewal reason: the previous approved window expired before dedicated credential
  provisioning was completed. No production connection, SQL execution or
  credential provisioning occurred.

Earlier access-window history:

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
