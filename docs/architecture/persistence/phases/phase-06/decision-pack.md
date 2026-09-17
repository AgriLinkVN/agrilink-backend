# Persistence Phase 6 Commerce Decision Pack

- Status: APPROVED for the greenfield Commerce MVP
- Governing ADR: [ADR 0008](../../../adr/0008-commerce-boundaries-and-transactions.md)
- Historical blocker audit: PR #86
- External payment providers, disputes, saga and outbox remain out of scope.

Every approval below is backed by implementation, focused tests and the
reviewed v2 Commerce migration. Approval applies to the Phase 6 MVP only.

## D01: Identifier Types

- Status: APPROVED
- Decision: all Commerce primary and cross-capability identifiers are UUID.
- Product Category and Province references use the UUID contract of their
  canonical owners. Other modules receive scalar IDs or typed projections,
  never Commerce persistence entities.
- Evidence: module-owned entities, `ProductCommerceReader`,
  `OrderPaymentReader`, `CompletedPurchaseReader`, FK integration tests.

## D02: Canonical Tables

- Status: APPROVED
- Business tables: `orders`, `order_items`, `order_status_history`,
  `payments`, `purchase_requests`, `contracts`.
- Supporting technical table: `commerce_operations` owned by Commerce. It is
  approved because all nine mutation classes require durable idempotency.
- Delete policy: commercial records and actor/product references use
  `RESTRICT`; a removed history actor may become null through `SET NULL`.
- Evidence: `CreateCommerceBoundariesV21800000001000`, catalog manifest,
  entity registry and ownership catalog.

## D03: Order State Machine

- Status: APPROVED
- States: `pending`, `confirmed`, `preparing`, `handed_to_logistics`,
  `shipping`, `delivered`, `cancelled`.
- Seller advances through handoff; Logistics advances shipping and delivery;
  Buyer may cancel pending; Admin may perform only a valid transition.
- `delivered` and `cancelled` are terminal. `disputed` is Phase 7B.
- Every successful mutation uses a conditional version update and appends one
  immutable operation-keyed history record in the same transaction.

## D04: Payment State Machine And Provider

- Status: APPROVED
- States: `unpaid`, `paid`, `partially_refunded`, `refunded`.
- Methods: `cod`, `bank_transfer`, `manual`.
- Seller or Admin may confirm a manual payment; only Admin may refund.
- Payment amount is derived from `OrderPaymentReader` and must equal the order
  total. Refund totals cannot exceed the paid amount.
- No gateway, callback, webhook, provider reference or provider secret is part
  of Phase 6.

## D05: Money And Quantity

- Status: APPROVED
- Currency is fixed to VND. Money is a non-negative integer decimal string in
  APIs, `bigint` in Domain and `numeric(18,0)` in PostgreSQL.
- JavaScript number, fractions, exponent notation, implicit rounding and
  unsafe coercion are rejected.
- Quantity is a positive decimal string with at most three decimal places,
  stored as bigint thousandths in Domain and `numeric(15,3)` in PostgreSQL.
- Quantity multiplied by unit price must produce an exact integer VND result.

## D06: Idempotency

- Status: APPROVED
- Required header: `Idempotency-Key`, maximum 128 characters.
- Scope: `(actor_id, operation_type, idempotency_key)`.
- Fingerprint: SHA-256 of canonical JSON with stable key ordering. Tokens,
  secrets and private raw payloads are excluded.
- Same key and fingerprint replays the stored result. Same key with another
  fingerprint is a conflict. A failed transaction rolls back its claim.
- PostgreSQL unique constraints are the source of truth; no process-local
  cache or mutex is authoritative.

## D07: Purchase Request Cardinality

- Status: APPROVED
- One open Purchase Request may produce multiple Contracts.
- Each Contract consumes an exact quantity allocation. A row lock serializes
  allocation, so aggregate quantity cannot exceed `quantity_needed`.
- Closed or cancelled requests are terminal and cannot allocate again. Reopen
  and allocation release are not part of the approved MVP.

## D08: Coordination Mode

- Status: APPROVED
- Commerce writes use local PostgreSQL transactions through the application
  `CommerceUnitOfWork` port and shared infrastructure transaction context.
- EntityManager, QueryRunner, DataSource and TypeORM repositories never cross
  application/module boundaries.
- No external call participates in Phase 6, so saga, compensation and outbox
  infrastructure are intentionally deferred.

## D09: Review Purchase Eligibility

- Status: APPROVED
- Review creation remains compatible for active buyers. A review receives the
  verified-purchase badge only when `CompletedPurchaseReader` finds a
  `delivered` order for the same buyer containing the product.
- Reviews imports only the read-only Orders application port. Reader failures
  propagate and can never produce a false positive.
- No order, payment or persistence detail is exposed to Reviews.

## D10: Environment And Rollout

- Status: APPROVED for greenfield lineage-v2 verification.
- The protected local `agrilink_db` has no Commerce tables and is not a
  migration target. Read-only fingerprint evidence remains
  `2e8fee7ecf69c92a8ae7d8964d27be6a66957774758629fe1a289856bf5772e4`,
  with 33 public tables and no migration ledger.
- The two-migration v2 chain is verified only on automatically created and
  removed disposable PostgreSQL databases. A second run has no pending
  migration; full down/up succeeds.
- Railway production was not accessed. Deployment requires environment-owner
  review, backup confirmation and the existing guarded reconciliation process.

## Approval Evidence

| Decision | Implementation | Test evidence |
| --- | --- | --- |
| D01-D02 | Module entities, registry, migration | architecture audit, catalog parity |
| D03 | Orders Domain/use cases/repository | Domain, concurrency and E2E |
| D04-D05 | Payment/Commerce Domain and mapper | Domain, numeric integration and E2E |
| D06-D08 | operation ledger and transaction context | same-key, stale-version and rollback tests |
| D07 | Contracts repository row lock | concurrent over-allocation test |
| D09 | CompletedPurchaseReader and Reviews use case | application and E2E verified-review tests |
| D10 | guarded verifiers and catalog writer | clean v2 up/down/up and protected read-only checks |
