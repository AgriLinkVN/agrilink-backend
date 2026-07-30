# Persistence Phase 6 Implementation Report

## A. Synchronization

PR #85 was merged with successful CI. `develop` and `origin/develop` were
equal at `b9013935bab4eb62caf9a0fa281ef8c576835537`, and the Phase 5 merge
commit was an ancestor before this branch was created.

## B. Commerce Inventory

| Table | Approved owner | Runtime | Baseline v2 | Protected DB | Decision |
| --- | --- | --- | --- | --- | --- |
| `orders` | orders | unmounted | excluded Group C | absent | blocked |
| `order_items` | orders | unmounted | excluded Group C | absent | blocked |
| `order_status_history` | orders | unmounted | excluded Group C | absent | blocked |
| `payments` | payments | unmounted | excluded Group C | absent | blocked |
| `contracts` | contracts | unmounted | excluded Group C | absent | blocked |
| `purchase_requests` | contracts | unmounted | excluded Group C | absent | blocked |

The approved ownership direction is clear, but the canonical schemas and
active capability contracts are not.

## C. Workflow Inventory

No Orders, Payments, Contracts or Commerce module, endpoint, use case,
repository, provider adapter, callback, operation-key implementation or
outbox exists. Selecting transaction, saga or outbox behavior without those
contracts would invent business behavior.

## D. Schema And State Blockers

- `product_category_id`, `category_id` and `province_id` are `int` in dormant
  declarations, while their current canonical owners use UUID identifiers.
- Payment has no currency field, rounding rule, callback event identity or
  unique provider reference.
- Order and Contract enums do not define allowed transitions, terminal states
  or actor permissions.
- Purchase Request uses a free-text status with only the default `open`.
- History has no from-status or operation/event key.
- Money columns are declared as PostgreSQL numeric but application properties
  use JavaScript `number`; no canonical arithmetic rule exists.

## E. Protected Database Safety

The read-only verifier reported 33 public tables, no migration ledger and
catalog fingerprint
`2e8fee7ecf69c92a8ae7d8964d27be6a66957774758629fe1a289856bf5772e4`.
All six Commerce tables and all candidate operation/outbox tables are absent.
No DDL, DML, migration, seed or onboarding apply was run.

## F. Decision

Phase 6 is blocked by stop conditions 4, 6, 8 and 9:

1. Canonical Commerce schema cannot be determined.
2. Required deployed evidence has not been supplied.
3. Money precision semantics are incomplete.
4. Order, payment, contract and purchase-request state machines are unknown.

No ownership code was changed because a module-local decorated mapping would
incorrectly promote the dormant declarations to canonical contracts.
Migration is `NONE`; baseline v2 remains 26 tables.

ADR 0008 was not created because no durable Commerce transaction,
idempotency or outbox design was safe to accept. Review purchase eligibility
remains deferred, so current Review authorization and API behavior do not
change.

## G. Resume Contract

Resume on this phase only after the unblock evidence listed in
[README.md](README.md) is reviewed and the
[Commerce Decision Pack](decision-pack.md) records the required approvals.
Then regenerate the evidence pack before moving entities or changing the
registry. Do not start Phase 7A while Phase 6 is blocked.
