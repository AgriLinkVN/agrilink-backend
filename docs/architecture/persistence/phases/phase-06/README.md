# Persistence Phase 6: Commerce And Transaction Boundaries

- Status: Blocked during pre-implementation evidence audit
- Source develop commit:
  `b9013935bab4eb62caf9a0fa281ef8c576835537`
- Branch: `refactor/persistence-phase-6-commerce`
- Dependency: Phase 5, PR #85, merged as `b901393`

## Scope

Phase 6 owns the planned Orders, Payments and Contracts persistence
boundaries. The source inventory covers `orders`, `order_items`,
`order_status_history`, `payments`, `contracts` and `purchase_requests`.

## Evidence Decision

All six declarations are dormant central mappings. They are not mounted,
registered, consumed by a repository or API, included in canonical baseline
v2, or present in the protected local PostgreSQL fixture. No deployed schema
evidence was supplied.

The declarations are not a sufficient canonical contract. In particular,
Commerce state transitions, currency and rounding, idempotency semantics,
provider callbacks, contract source cardinality and several referenced ID
types remain unverified. Phase 6 therefore met roadmap stop conditions 4, 6,
8 and 9 before ownership implementation.

No entity, registry, migration, API, operation-key table or outbox was
created. Purchase-completed review eligibility remains deferred and existing
Review behavior is unchanged.

## Required Unblock Evidence

Phase 6 can resume after an approved Commerce contract supplies:

- canonical table schemas and referenced ID types;
- deployed table, row, constraint, duplicate and orphan evidence, if any
  environment already uses Commerce;
- order, payment, contract and purchase-request transition policies;
- currency, rounding and provider amount-unit rules;
- operation-key replay/fingerprint semantics;
- payment provider callback identity, signature and reconciliation rules;
- purchase-request-to-contract cardinality and authorization rules.

## References

- [Commerce decision pack](decision-pack.md)
- [Evidence inventory](evidence/commerce-evidence.json)
- [Blocked implementation report](implementation-report.md)
- [ADR 0002](../../../adr/0002-entity-ownership-and-persistence-boundaries.md)
- [ADR 0003](../../../adr/0003-cross-module-transaction-policy.md)
- [ADR 0004](../../../adr/0004-canonical-schema-baseline-and-onboarding.md)
