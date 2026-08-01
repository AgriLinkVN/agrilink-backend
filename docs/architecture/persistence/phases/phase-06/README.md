# Persistence Phase 6: Commerce And Transaction Boundaries

- Status: Complete, awaiting merge
- Historical blocker audit: PR #86
- Implementation branch: `refactor/persistence-phase-6-commerce-implementation`
- Dependency: Phase 5, PR #85, merged

## Result

Phase 6 implements greenfield Orders, Payments, Contracts and Purchase
Requests with module-owned persistence, typed cross-module read ports, exact
VND/quantity arithmetic, database-backed idempotency and local PostgreSQL
transactions.

Canonical lineage v2 contains the six approved commercial tables plus the
reviewed `commerce_operations` supporting table. External payment providers,
callbacks, saga/outbox and disputes remain deferred.

## References

- [Accepted ADR 0008](../../../adr/0008-commerce-boundaries-and-transactions.md)
- [Approved Commerce decision pack](decision-pack.md)
- [Implementation report](implementation-report.md)
- [Implementation evidence](implementation-evidence.json)
- [Historical evidence audit](evidence/commerce-evidence.json)

Phase 7A may begin only after the Phase 6 implementation PR is merged into
`develop`.
