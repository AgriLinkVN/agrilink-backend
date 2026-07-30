# Persistence Phase 6 Commerce Decision Pack

- Status: Draft
- Requires Product, Architecture, Database and Payment approval
- Not an accepted ADR

This pack records the decisions required to resume Phase 6. It does not
approve a Commerce schema, workflow, provider, migration or API. Dormant
central entities are evidence of prior declarations only and are not treated
as canonical contracts.

## Decision D01: Commerce Product, Category And Geography ID Types

- Status: UNDECIDED
- Required approvers: Product, Architecture, Database, Products, Geography,
  Orders and Contracts owners
- Evidence: Dormant Commerce declarations use `int` for
  `contracts.product_category_id`, `purchase_requests.category_id` and
  `purchase_requests.province_id`. Current canonical Product Category and
  Province identifiers are UUIDs. Other observed Commerce references use UUID.
- Conflict: Copying the dormant declarations would create incompatible scalar
  references to current owner capabilities. No deployed schema evidence
  establishes a compatibility requirement.
- Options:
  - Option A: Commerce uses identifier types of the current canonical owners.
  - Option B: Commerce stores an immutable scalar snapshot and a canonical
    external identifier.
  - Option C: Introduce a separately reviewed compatibility mapping and
    additive migration.
- Recommended direction: Approve one PostgreSQL type and one ownership
  contract for every reference before approving table schemas. Do not infer a
  type from the dormant mapping.
- Consequences: The choice controls cross-module ports, FK feasibility,
  snapshot design and existing-environment reconciliation.
- Migration impact: PENDING. Any type conversion requires deployed row,
  duplicate and orphan evidence before a migration can be designed.
- API impact: PENDING. Public identifier formats must remain consistent with
  the owning capability.
- Security impact: Identifier validation and authorization must not rely on
  type coercion or accept references outside the caller's permitted scope.
- Required tests: Identifier contract tests, FK tests, invalid-reference
  tests, cross-owner port tests and existing-environment preflight tests.
- Final approved decision: PENDING APPROVAL

| Reference | Dormant declaration | Canonical owner evidence | Required PostgreSQL type |
| --- | --- | --- | --- |
| `order_items.product_id` | `uuid` | Products uses UUID | PENDING |
| Purchase Request product | No direct product field | Business relationship undefined | PENDING |
| `contracts.product_category_id` | `int` | Product Category uses UUID | PENDING |
| `purchase_requests.category_id` | `int` | Product Category uses UUID | PENDING |
| `purchase_requests.province_id` | `int` | Province uses UUID | PENDING |
| Order buyer/seller IDs | `uuid` | Users uses UUID | PENDING |
| Contract buyer/seller IDs | `uuid` | Users uses UUID | PENDING |
| Purchase Request enterprise ID | `uuid` | Party semantics require approval | PENDING |

## Decision D02: Canonical Commerce Tables

- Status: UNDECIDED
- Required approvers: Product, Architecture, Database, Orders, Payments and
  Contracts owners
- Evidence: Six dormant mappings exist, but none is runtime registered,
  mounted, included in baseline v2 or present in the protected local database.
  No deployed schema evidence was supplied.
- Conflict: Phase 6 ownership direction is accepted, but neither MVP inclusion
  nor canonical columns and constraints are approved.
- Options:
  - Approve a table for an active MVP workflow with a reviewed schema.
  - Exclude the table and its workflow from MVP.
  - Defer the table pending deployed-environment reconciliation.
- Recommended direction: Decide MVP workflow inclusion first, then approve the
  minimum table contract required by each included workflow.
- Consequences: Approved tables become retained commercial records and require
  explicit ownership, lifecycle, indexes and delete behavior.
- Migration impact: PENDING. New lineage-v2 tables require additive migrations
  and existing-environment preflight.
- API impact: PENDING. No endpoint should be introduced solely to activate a
  persistence declaration.
- Security impact: Party authorization, private contract content and payment
  metadata require explicit access and redaction policies.
- Required tests: Catalog parity, TypeORM parity, FK and constraint tests,
  retention tests, authorization tests and clean-v2 migration tests.
- Final approved decision: PENDING APPROVAL

| Table | Required For MVP | Canonical Schema Approved | Owner | Evidence |
| --- | --- | --- | --- | --- |
| `orders` | PENDING | PENDING | orders | Dormant declaration only |
| `order_items` | PENDING | PENDING | orders | Dormant declaration only |
| `order_status_history` | PENDING | PENDING | orders | Dormant declaration only |
| `payments` | PENDING | PENDING | payments | Dormant declaration only |
| `contracts` | PENDING | PENDING | contracts | Dormant declaration only |
| `purchase_requests` | PENDING | PENDING | contracts | Dormant declaration only |

For every table approved for MVP, the final decision must state the primary
key type, required and nullable columns, FKs, unique constraints, checks,
indexes, delete/retention behavior and audit requirements.

## Decision D03: Order State Machine

- Status: UNDECIDED
- Required approvers: Product, Architecture, Orders, Payments and Operations
  owners
- Evidence: Source enum values are `pending`, `confirmed`, `preparing`,
  `handed_to_logistics`, `shipping`, `delivered`, `cancelled` and `disputed`.
  No transition service, actor policy or terminal-state contract exists.
- Conflict: Enum membership does not prove allowed transitions or side
  effects, and Phase 7A owns Logistics.
- Options:
  - Approve a reduced MVP state machine.
  - Approve the observed enum with an explicit transition matrix.
  - Exclude Order workflow from MVP.
- Recommended direction: Approve initial state, allowed transitions, terminal
  states and actor/precondition rules together. Keep Phase 7A interactions
  outside this decision unless separately approved.
- Consequences: The matrix controls conditional updates, history records,
  permissions, idempotency scope and event semantics.
- Migration impact: PENDING. Enum/check changes and history columns depend on
  the approved matrix.
- API impact: PENDING. Transition commands and conflict responses must follow
  the approved actor and state rules.
- Security impact: Buyer, seller and admin actions need ownership checks and
  auditable actor identity.
- Required tests: Every approved transition, invalid and terminal transitions,
  actor authorization, concurrent one-winner behavior, rollback with history
  failure and idempotent replay.
- Final approved decision: PENDING APPROVAL

The final matrix must also specify payment-dependent transitions,
cancellation conditions and required history evidence.

| From | To | Actor | Preconditions | Side Effects | Idempotency Scope |
| --- | --- | --- | --- | --- | --- |
| PENDING | PENDING | PENDING | PENDING | PENDING | PENDING |

## Decision D04: Payment State Machine And Provider

- Status: UNDECIDED
- Required approvers: Product, Payment, Architecture, Database and Security
- Evidence: Dormant statuses are `unpaid`, `paid`, `refunded` and
  `partially_refunded`. No mounted payment flow, provider adapter, callback,
  signature verifier, currency field or reconciliation service exists.
- Conflict: Callback idempotency and terminal-state safety cannot be designed
  without an approved provider and event contract.
- Options:
  - No provider in MVP.
  - Mock provider for internal testing.
  - One approved real provider.
- Recommended direction: Select the MVP provider position first. If a real
  provider is selected, approve its initiation, callback and reconciliation
  contracts before schema design.
- Consequences: A real provider introduces non-atomic external calls, retry
  windows, signature validation, correlation and operational reconciliation.
- Migration impact: PENDING. Provider reference, event identity, amount,
  currency, status and uniqueness fields depend on this decision.
- API impact: PENDING. Callback/webhook and status endpoints require explicit
  contracts; no required public header should be inferred.
- Security impact: Approve the signature algorithm, replay protection,
  credential storage, payload redaction and callback authentication. Secrets
  and credentials must not enter this document.
- Required tests: Provider unavailable, valid/invalid signature, unknown
  reference, amount/currency mismatch, duplicate/concurrent callback,
  conflicting terminal callback and reconciliation retry.
- Final approved decision: PENDING APPROVAL

The final approval must identify the provider, initiation flow,
callback/webhook endpoint, signature algorithm, provider event/reference ID,
local correlation ID, amount unit, currency, terminal states, refund/cancel
policy and reconciliation process.

## Decision D05: Money And Rounding

- Status: UNDECIDED
- Required approvers: Product, Finance, Architecture, Database and Payment
- Evidence: Dormant declarations contain `numeric(10,2)` and
  `numeric(15,2)` columns, while application properties use JavaScript
  `number`. Currency and rounding rules are absent.
- Conflict: PostgreSQL numeric storage does not make floating-point
  application calculations deterministic.
- Options:
  - Explicit money value object backed by a decimal-safe representation.
  - Integer minor units with an approved currency and conversion boundary.
  - Another reviewed decimal-safe representation.
- Recommended direction: Use an explicit money value object or decimal-safe
  representation. Precision and scale remain pending Product, Finance and
  Database approval.
- Consequences: The choice affects totals, comparisons, serialization,
  provider conversion and backwards compatibility.
- Migration impact: PENDING. No precision, scale or currency column change is
  approved.
- API impact: PENDING. Amount serialization and currency fields require a
  stable contract.
- Security impact: Reject overflow, malformed decimal and provider amount-unit
  ambiguity; do not log sensitive payment payloads.
- Required tests: Exact addition/multiplication, boundary precision, rounding,
  tax/discount/shipping behavior, amount comparison and one-time provider
  minor-unit conversion.
- Final approved decision: PENDING APPROVAL

| Field | PostgreSQL Type | Application Type | Rounding Rule | Currency |
| --- | --- | --- | --- | --- |
| Order subtotal | PENDING (`numeric(15,2)` observed) | PENDING | PENDING | PENDING |
| Shipping fee | PENDING (`numeric(15,2)` observed) | PENDING | PENDING | PENDING |
| Platform fee/discount/tax | PENDING | PENDING | PENDING | PENDING |
| Order total | PENDING (`numeric(15,2)` observed) | PENDING | PENDING | PENDING |
| Item quantity | PENDING (`numeric(10,2)` observed) | PENDING | PENDING | N/A or PENDING |
| Item unit/line price | PENDING (`numeric(15,2)` observed) | PENDING | PENDING | PENDING |
| Payment amount | PENDING (`numeric(15,2)` observed) | PENDING | PENDING | PENDING |
| Contract quantity/value | PENDING (`numeric(15,2)` observed) | PENDING | PENDING | PENDING |
| Purchase Request target price | PENDING (field absent) | PENDING | PENDING | PENDING |

## Decision D06: Operation-Key And Idempotency Contract

- Status: UNDECIDED
- Required approvers: Product, Architecture, Database, Orders, Payments and
  Contracts owners
- Evidence: No operation/idempotency table, public header, fingerprint,
  retention policy or repository exists. `order_code` and `contract_code` are
  unique declarations but are not approved operation keys.
- Conflict: Same-key replay and different-payload conflict behavior cannot be
  guaranteed without a persistence and fingerprint contract.
- Options:
  - Aggregate-owned operation key for a single workflow.
  - Commerce-owned operation record for multiple approved workflows.
  - No idempotent command because the workflow is excluded from MVP.
- Recommended direction: Decide independently for each active workflow and
  choose the narrowest persistence guard that enforces the approved scope.
- Consequences: The decision defines retry behavior, conflict responses,
  retention, concurrency guarantees and result replay.
- Migration impact: PENDING. Unique guards or an operation table require an
  additive migration and duplicate preflight.
- API impact: PENDING. An optional `Idempotency-Key` or provider identity must
  be approved before documentation or endpoint changes.
- Security impact: Fingerprints must exclude secrets and unnecessary PII;
  operation logs must be redacted and bounded by retention.
- Required tests: Same key/same fingerprint replay, same key/different
  fingerprint conflict, concurrent same-key winner, rollback and retry after
  failure.
- Final approved decision: PENDING APPROVAL

| Workflow | Key Source | Scope | Replay Result | Conflict Rule | Retention |
| --- | --- | --- | --- | --- | --- |
| Create order | PENDING | PENDING | PENDING | PENDING | PENDING |
| Transition order | PENDING | PENDING | PENDING | PENDING | PENDING |
| Initiate payment | PENDING | PENDING | PENDING | PENDING | PENDING |
| Process payment callback | PENDING | PENDING | PENDING | PENDING | PENDING |
| Accept purchase request | PENDING | PENDING | PENDING | PENDING | PENDING |
| Create contract | PENDING | PENDING | PENDING | PENDING | PENDING |

## Decision D07: Purchase Request To Contract Cardinality

- Status: UNDECIDED
- Required approvers: Product, Architecture, Database and Contracts owner
- Evidence: The dormant declarations contain no approved source relation,
  acceptance workflow, source uniqueness or contract cardinality.
- Conflict: An idempotency key or unique source FK cannot be selected until
  the business cardinality is known.
- Options:
  - One purchase request produces zero or one contract.
  - One purchase request produces multiple contracts.
  - Multiple purchase requests produce one contract.
  - Manual contract is independent from a purchase request.
- Recommended direction: Product must approve the supported cardinalities and
  whether multiple modes can coexist before persistence design.
- Consequences: The choice controls source fields, unique constraints,
  aggregate boundaries and duplicate prevention.
- Migration impact: PENDING. Source FKs, join structures and uniqueness depend
  on the approved cardinality.
- API impact: PENDING. Create/accept/reject commands and returned linkage must
  represent the selected model.
- Security impact: Approve who may accept or reject and verify party ownership
  in the same command.
- Required tests: Authorized and unauthorized transition, expiry, partial
  acceptance if approved, concurrent accept/reject, contract creation once,
  rollback on contract failure and retry.
- Final approved decision: PENDING APPROVAL

The approval must state who may accept/reject, expiry behavior, partial
acceptance, contract creation timing, transaction boundary and duplicate
prevention.

## Decision D08: Coordination Mode

- Status: UNDECIDED
- Required approvers: Architecture, Product, Database and participating
  capability owners
- Evidence: No active Commerce workflow, external provider call, transaction
  coordinator or reliable event contract exists.
- Conflict: Selecting a transaction, saga or outbox without a workflow would
  create unused infrastructure and unproven reliability claims.
- Options:
  - Same-database transaction.
  - Saga with explicit compensation and reconciliation.
  - Transactional outbox with at-least-once delivery.
  - No workflow in MVP.
- Recommended direction: Select a mode per active workflow after its writes,
  external calls, atomicity and post-commit delivery requirements are
  approved.
- Consequences: Each mode carries different failure windows, retry semantics,
  operational ownership and rollback limits.
- Migration impact: PENDING. Outbox or operation persistence must not be
  created unless an approved workflow requires it.
- API impact: PENDING. Conflict/retry/reconciliation responses depend on the
  selected mode.
- Security impact: Compensation and events must preserve commercial evidence
  and exclude secrets or raw provider payloads.
- Required tests: Atomic rollback, process-crash windows, compensation retry,
  event deduplication and concurrent command behavior as applicable.
- Final approved decision: PENDING APPROVAL

| Workflow | Participants | External Call | Required Atomicity | Proposed Mode | Approval |
| --- | --- | --- | --- | --- | --- |
| Order + items + history | Orders | No known call | PENDING | PENDING | PENDING |
| Purchase Request acceptance + Contract | Contracts | No known call | PENDING | PENDING | PENDING |
| Payment terminal state + Order transition | Payments, Orders | Provider contract unknown | PENDING | PENDING | PENDING |
| Payment terminal state + notification/event | Payments, event consumer | Provider/event contract unknown | PENDING | PENDING | PENDING |

## Decision D09: Review Purchase Eligibility

- Status: UNDECIDED
- Required approvers: Product, Architecture, Reviews and Orders owners
- Evidence: Phase 5 does not require a completed purchase to create a review.
  `isVerifiedPurchase` remains false and no Commerce eligibility reader exists.
- Conflict: Enforcing purchase eligibility now would change existing behavior
  without an approved Order completion contract.
- Options:
  - Keep current review behavior.
  - Require a completed purchase.
  - Require a completed and non-refunded purchase.
  - Require purchase completion within an approved review window.
- Recommended direction: Product must explicitly approve whether eligibility
  is an authorization rule, a verification badge, or both.
- Consequences: A stricter rule may reject existing users and requires a
  typed, read-only Commerce port.
- Migration impact: PENDING. Historical reviews and verification flags need an
  explicit policy if behavior changes.
- API impact: PENDING. Define eligibility errors and whether response payloads
  expose the qualifying order.
- Security impact: The eligibility reader must not expose another user's
  orders or payment details.
- Required tests: Current compatibility, qualifying/non-qualifying purchase,
  refunded/cancelled behavior, review window, historical review handling and
  read-only concurrency.
- Final approved decision: PENDING APPROVAL

No Reviews source or API changes are part of this documentation pull request.

## Decision D10: Existing-Environment Evidence

- Status: UNDECIDED
- Required approvers: Environment owner, Database, Architecture, Security and
  relevant capability owners
- Evidence: The protected local `agrilink_db` contains none of the six
  Commerce tables and is not production truth. No deployed evidence was
  supplied.
- Conflict: Greenfield creation and existing-table reconciliation require
  different migration preflight and rollback strategies.
- Options:
  - Confirm Commerce is greenfield in every deployed environment.
  - Supply redacted, read-only catalog and aggregate evidence.
  - Defer schema onboarding until an environment owner can attest lineage.
- Recommended direction: Obtain an environment-owner attestation and
  read-only aggregate evidence before migration design.
- Consequences: Existing rows may constrain nullability, uniqueness, FK,
  precision, enum and retention decisions.
- Migration impact: PENDING. No existing-environment migration is approved.
- API impact: None for evidence collection; later compatibility decisions may
  affect API rollout.
- Security impact: Do not collect credentials, secrets, bank data, private
  contract content, raw callbacks or row-level PII in Markdown.
- Required tests: Read-only target guard, preflight blockers, schema/ledger
  fingerprint equality and redaction review.
- Final approved decision: PENDING APPROVAL

Missing evidence includes deployed schema/table existence, row counts,
constraints, duplicates, orphans, status distributions, money values and
provider-reference distributions.

| Evidence Item | Environment Owner | Evidence Collection Method | Read-Only Query | Redaction Requirement | Approval |
| --- | --- | --- | --- | --- | --- |
| Table and column catalog | PENDING | Catalog export | `information_schema`/`pg_catalog` metadata only | Remove connection data | PENDING |
| Row counts | PENDING | Aggregate query | `COUNT(*)` per approved table | No rows or PII | PENDING |
| Constraints and indexes | PENDING | Catalog export | `pg_constraint` and `pg_indexes` | Metadata only | PENDING |
| Duplicate references | PENDING | Grouped aggregate | Count duplicate approved key candidates | No raw references | PENDING |
| Orphan references | PENDING | Aggregate anti-join | Count only | No IDs or row payloads | PENDING |
| Status distributions | PENDING | Grouped aggregate | Status and count only | Review low-count disclosure | PENDING |
| Money distributions | PENDING | Aggregate range/scale | Min/max/scale counts only | No customer/order details | PENDING |
| Provider references | PENDING | Redacted aggregate | Null/duplicate counts only | Never return raw references | PENDING |

## Phase 6 Resume Gate

Phase 6 remains blocked until all of the following are satisfied:

1. All six table schemas are approved, or each excluded table is explicitly
   removed from MVP.
2. Commerce reference ID types are approved.
3. Order, Payment, Contract and Purchase Request state machines are approved
   for every active workflow.
4. Money, currency and rounding rules are approved.
5. Operation-key and fingerprint semantics are approved per active workflow.
6. The Payment provider/callback contract is approved, or Payment provider
   integration is formally excluded from MVP.
7. Purchase Request to Contract cardinality is approved.
8. Coordination mode is approved for every active workflow.
9. Deployed evidence is supplied, or the environment owner confirms that the
   Commerce schema is greenfield.
10. Product, Architecture and Database owners record approval.

Completing this pack does not itself resume Phase 6. Approved decisions must
be converted into an accepted ADR and implementation plan before source,
schema or migration work begins.
