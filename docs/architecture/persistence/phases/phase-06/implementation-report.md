# Persistence Phase 6 Implementation Report

## A. Scope And Ownership

The historical blocker audit remains preserved in PR #86 and
`evidence/commerce-evidence.json`. The resumed implementation approves and
owns:

| Table | Owner | Purpose |
| --- | --- | --- |
| `orders`, `order_items`, `order_status_history` | orders | order aggregate and immutable transition history |
| `payments` | payments | manual VND payment and refund state |
| `purchase_requests`, `contracts` | contracts | enterprise demand, allocation and bilateral contracts |
| `commerce_operations` | commerce | durable operation-key claim and result replay |

Legacy central declarations are decorator-free compatibility re-exports. The
runtime/CLI/test registry has one writable mapping for every scoped table.

## B. Domain And Application

- Money accepts only non-negative integer decimal strings and uses bigint.
- Quantity accepts positive values with at most three decimal places and uses
  bigint thousandths.
- Orders, Payments, Purchase Requests and Contracts enforce explicit state
  machines, terminal states, actor rules and immutable commercial terms.
- Mutations are split into focused use cases. Buyer, seller, enterprise and
  changed-by identity are derived from the authenticated principal.
- DTOs document money and quantity as strings; persistence entities never
  leave infrastructure.

## C. Transactions And Idempotency

`CommerceUnitOfWork` exposes only `execute`. The shared TypeORM transaction
context keeps EntityManager inside infrastructure and shares the active
manager through AsyncLocalStorage.

The operation ledger is unique by actor, operation type and key. Canonical
SHA-256 fingerprints support same-request replay and conflicting-payload
rejection. PostgreSQL `RETURNING` determines the claim winner; this avoids the
false TypeORM identifier signal observed under concurrent `ON CONFLICT`.

Order writes include items/history/operation result atomically. Payment and
contract changes use conditional versions. Purchase Request allocation uses a
row lock and exact decimal arithmetic.

## D. Cross-Module Boundaries

- Products exports `ProductCommerceReader` with scalar snapshot fields.
- Orders exports `OrderPaymentReader` and `CompletedPurchaseReader`.
- Payments derives amount and ownership from the Order projection.
- Reviews imports only `CompletedPurchaseReader`; a delivered qualifying order
  sets `isVerifiedPurchase=true`, while reader failure never becomes true.
- Architecture audit reports zero cross-module infrastructure violations.

## E. Migration And Catalog

`CreateCommerceBoundariesV21800000001000` adds the six business tables and
the approved operation ledger. It uses UUID keys/FKs, `numeric(18,0)` money,
`numeric(15,3)` quantity, explicit checks/indexes, restrictive deletes and
version columns. Baseline and legacy migrations remain unchanged.

Disposable PostgreSQL verification result:

- first run: both v2 migrations applied;
- second run: zero pending migrations;
- full down: zero business tables remain;
- rerun: both migrations apply;
- catalog: 33 tables, 644 objects, zero diff;
- TypeORM: one historical reviewed difference, zero unexpected/stale entries;
- OpenAPI: 19 intentional Commerce paths, 107 total paths and 118 operations;
- disposable databases removed after each run.

Catalog and TypeORM compatibility now have distinct command entry points and
assertions. `persistence:schema-parity` asserts the canonical catalog diff;
`persistence:typeorm-compatibility-parity` asserts unexpected TypeORM
operations, stale manifest entries and compatibility catalog mismatches.

## F. Test Evidence

- Domain/application focused suite: 67 tests across eight suites, including
  exact arithmetic, DTO alignment, authorization and independent parity gates.
- Real PostgreSQL concurrency uses `Promise.all` for same-key create-order,
  stale transitions, duplicate mark-paid, bounded refunds, contract allocation
  and same-side signatures.
- Commerce E2E covers create/list/detail orders, valid delivery transitions,
  cross-user denial, payments/refunds, requests/contracts, over-allocation,
  bilateral activation/completion and verified-purchase review. Review-fix
  coverage also verifies controller role rejection, ownership enforcement,
  zero-value DTO rejection and controlled incompatible product-price handling.
- Full-project gate results are recorded in `implementation-evidence.json`.

## G. Protected Database Safety

The safe verifier accessed local `agrilink_db` read-only. Before and after the
final gates it reported PostgreSQL 16.14, 33 public tables, no migration ledger
and the unchanged fingerprint
`2e8fee7ecf69c92a8ae7d8964d27be6a66957774758629fe1a289856bf5772e4`.
No Commerce migration, seed, onboarding apply, DDL or DML ran there. Railway
production was not accessed.

## H. Deferred Work

External payment providers, callbacks, saga/outbox, disputes, allocation
release/reopen and Phase 7A operational ownership are deliberately excluded.
Phase 7A must wait for this implementation PR to merge.
