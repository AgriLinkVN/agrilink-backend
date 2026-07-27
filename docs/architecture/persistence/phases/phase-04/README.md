# Persistence Phase 4: Profiles And Admin Read Model

- Status: Complete, pending pull request
- Source PR: pending
- Source develop commit:
  `a6571ac846aab53171b5e940f061d5bc5e811e13`
- Scope: `farmer_profiles`, `cooperative_profiles`,
  `enterprise_profiles`, `supplier_profiles`, and the Admin verification
  boundary.

## Canonical Owners

Profiles owns the four profile entities, persistence repositories, owner
upserts, verification state, private document references, and read
projections. Admin owns AuditLog and orchestrates authorized review through
typed Profiles, Users, and Storage capabilities.

## Key Decisions

- The central runtime schema plus canonical baseline v2 is the schema base.
- The incompatible Profiles-local mappings are retired, not unioned.
- Baseline fields `farm_name`, `experience_years`, and `member_count` are
  represented by canonical metadata.
- Fields with no baseline, runtime, or deployed evidence remain excluded.
- Every profile exposes scalar `userId`; no profile imports User persistence.
- Pending verification is verified=false plus null rejection reason.
- Conditional updates ensure one concurrent reviewer wins.
- Migration: `NONE`.

## References

- [Implementation report](implementation-report.md)
- [Evidence inventory](evidence/profiles-admin-evidence.json)
- [ADR 0002](../../../adr/0002-entity-ownership-and-persistence-boundaries.md)
- [ADR 0003](../../../adr/0003-cross-module-transaction-policy.md)
- [ADR 0004](../../../adr/0004-canonical-schema-baseline-and-onboarding.md)
- [ADR 0006](../../../adr/0006-profiles-verification-and-admin-read-model.md)

## Deferred Work

Product and Review profile reads remain Phase 5. The protected local database
still requires the existing v2 reconciliation process; Phase 4 does not apply
schema or data changes to it.

Phase 5 must not start until the Phase 4 pull request is merged into
`develop`.
