# Phase 7B Inventory Operator Instructions

Status: `PREPARATION_ONLY`

These instructions do not authorize a connection. They apply only after the
[environment worksheet](environment-scope-worksheet.md) and
[access request](access-request-checklist.md) are approved for one safe environment
alias.

## Authorized Operator

Only one of the following may run the inventory:

- the database/platform operator named in the approved access request; or
- an explicitly delegated operator using a dedicated credential that the Database
  Owner has confirmed cannot write.

Project-level P7B-19 approval alone is insufficient. A developer must not substitute
an application credential merely because it can connect. Credential provisioning,
role creation and permission changes are separate operational/DBA tasks and are not
part of this repository task.

## Preconditions

The operator must confirm all of the following before connecting:

1. The safe environment alias exists and its rollout applicability is approved.
2. The operational owner and operator are named.
3. The access window and output recipient are approved.
4. The credential is dedicated read-only, or a database operator has accepted
   responsibility for enforcing a read-only transaction.
5. The query pack has not been edited outside review.
6. Output will use the sanitized JSON template only.

If any item is missing, do not connect. Record the matching blocker in the
environment worksheet.

## Session Procedure

1. Open a database client without application bootstrap, ORM metadata loading,
   schema synchronization, seeds or migrations.
2. Start the transaction exactly as shown in the
   [operator query pack](operator-query-pack.md).
3. Run the read-only check immediately.
4. Continue only when `transaction_read_only` returns `on` and the isolation level
   is `repeatable read`.
5. Apply the three transaction-local timeouts from the pack.
6. Run metadata queries first.
7. Run an aggregate only after its paired preflight returns true for every referenced
   table and column.
8. Prefer the catalog estimate when an exact count may be expensive.
9. End the transaction with the pack's rollback statement even after successful
   collection.

## Fail-Closed Rules

Stop immediately and roll back when:

- read-only mode is not enforced;
- the connection or authorization does not match the approved safe alias;
- a statement does not begin with an approved command class from the pack;
- a preflight is false or the deployed schema is unexpected;
- a query requests a raw row, document value, URL, identifier, description, note,
  JSON payload, network value or personal data;
- a query times out, requires a heavy scan or creates unexpected lock pressure;
- client output reveals a secret or infrastructure detail.

After a timeout, roll back the transaction. Do not raise the timeout or retry an
exact count without a new operational decision; use the catalog estimate instead.

## Output Sanitization

Populate [operator-output-template.json](operator-output-template.json) with:

- safe aliases, metadata and aggregate counts only;
- PostgreSQL major version, not the full server banner;
- table/column/constraint/index/trigger summaries;
- `EXACT`, `ESTIMATED` or `NOT_RUN` row-count classification;
- a hash of sanitized schema metadata;
- query status and explicit blockers.

Before delivery, remove connection strings, hostnames, ports, real database/user
names, provider identifiers, shell history, screenshots, raw rows, business values,
URLs, private file identifiers, JSON documents, IP addresses and personal data.
Never send credentials with the evidence artifact.

Confirm these counters in the output:

- `ddlCount` is zero;
- `dmlCount` is zero;
- `rawRowsExported` is zero;
- `secretsExposed` is zero.

## Submission

Send only the completed sanitized JSON and a signed access checklist to the approved
review channel. The reviewer must validate JSON parsing and sanitization before the
artifact is committed under the safe environment alias.

## Not-Applicable Handling

An operator cannot declare an environment not applicable. The environment owner
must complete the owner-decision entry in the worksheet with existence, rollout
scope, rationale, approver capacity and approval date. Until then, keep the status
`UNKNOWN_TOPOLOGY` or `NOT_APPLICABLE_APPROVAL_REQUIRED`.
