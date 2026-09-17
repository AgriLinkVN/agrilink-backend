# ADR 0008: Commerce Boundaries And Transactions

- Status: Accepted
- Date: 2026-08-02
- Scope: Persistence Phase 6

## Context

Orders, Payments, Contracts and Purchase Requests existed only as dormant,
incompatible central declarations. Activating them required explicit domain,
money, authorization, transaction and idempotency contracts without depending
on an unverified deployed schema or an external payment provider.

## Decision

Orders, Payments and Contracts own their persistence entities and repositories.
Commerce owns the technical `commerce_operations` idempotency ledger. Cross
module reads use `ProductCommerceReader`, `OrderPaymentReader` and
`CompletedPurchaseReader`; no module imports another module's persistence.

All identifiers are UUID. VND values are integer decimal strings backed by
`bigint` and `numeric(18,0)`. Quantities use exact thousandths and
`numeric(15,3)`. State changes execute through Domain behavior, optimistic
versions and local PostgreSQL transactions. Purchase Request allocation uses a
row lock. Operation keys use a database unique constraint and canonical SHA-256
fingerprints.

The MVP includes manual/COD/bank-transfer records only. External providers,
callbacks, saga, outbox and disputes are deferred. Reviews receive a verified
badge through a read-only completed-purchase port when a delivered order proves
eligibility.

## Consequences

- Six commercial tables plus one supporting technical table enter lineage v2.
- Retried mutations replay deterministically or return a fingerprint conflict.
- Same-version concurrent state changes have one winner.
- Commercial records use restrictive deletion and remain auditable.
- `agrilink_db` and Railway production are not migration test targets.
- Phase 7A may start only after the Phase 6 implementation PR is merged.

## Verification

The accepted evidence is maintained in
`docs/architecture/persistence/phases/phase-06/implementation-evidence.json`
and the Phase 6 implementation report.
