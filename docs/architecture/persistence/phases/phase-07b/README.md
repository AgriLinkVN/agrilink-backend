# Persistence Phase 7B: Compliance And Traceability Specification

- Status: Specification ready for review
- Implementation status: Blocked pending P0 approvals
- Phase type: planning and contract definition
- Base: `develop` at `4a16970`
- Dependencies: Phase 6 PR #89 and Phase 7A PR #90, both merged with successful CI
- Planned implementation branch: `refactor/persistence-phase-7b-compliance`

## Objective

Define reviewable ownership, domain, persistence, authorization, API and test
contracts for incidents, disputes, quality certificates, compliance evidence and
traceability. This specification does not approve implementation or database
changes.

## Scope

- Reconcile the `incident_reports` runtime behavior with the misleading Admin
  dispute routes.
- Decide whether `disputes` and `quality_certificates` are real capabilities or
  legacy-only declarations.
- Separate technical audit logging from legally or operationally retained
  compliance evidence.
- Resolve the two incompatible `traceability_records` mappings and preserve the
  existing public API until a compatibility decision is approved.
- Define candidate state, transaction, concurrency, authorization and error
  contracts without treating legacy fields as approved business rules.

## Out Of Scope

- Production code, repository adapters, ORM consolidation and migrations.
- Protected database access, seed execution, DDL, DML or schema synchronization.
- Payment-provider disputes, automatic refunds, outbox processing and public
  certificate documents until their respective decisions are approved.
- React/frontend implementation. Frontend references are discovery evidence only.

## Evidence Summary

| Capability          | Evidence                                                                                       | Current classification    |
| ------------------- | ---------------------------------------------------------------------------------------------- | ------------------------- |
| Incident            | Canonical baseline table and active Admin repository access                                    | `ACTIVE_BUT_MISNAMED`     |
| Dispute             | Legacy entity and enum; no runtime registry, repository or table in baseline v2                | `UNVERIFIED_LEGACY`       |
| Quality certificate | Legacy entity; active product certification capability is a different table                    | `BOUNDARY_CONFLICT`       |
| Audit evidence      | Canonical `audit_logs`; request interceptor does not persist                                   | `PARTIAL_TECHNICAL_AUDIT` |
| Traceability        | Mounted API, explicitly unimplemented service, runtime-only mapping and incompatible duplicate | `SCHEMA_CONFLICT`         |

The checked-in local reconciliation snapshot records `traceability_records` as a
known preserved extra with zero rows. It is evidence about that captured local
environment, not evidence about production.

## Documents

- [Decision pack](decision-pack.md)
- [Schema plan](schema-plan.md)
- [API contract](api-contract.md)
- [Acceptance criteria](acceptance-criteria.md)
- [Implementation plan](implementation-plan.md)
- [Open decisions](open-decisions.md)

## Database Safety Record

- Protected database accessed: `NO`.
- Railway production accessed: `NO`.
- DDL or DML executed: `NO`.
- Migration generated or applied: `NO`.
- Seed, schema synchronization or onboarding apply executed: `NO`.
- The merged canonical baseline migration was not modified and must remain immutable.
- Deployed inventory may be collected read-only only after P7B-19 approval and
  operational authorization.
- Any approved Traceability migration must follow inventory, additive, copy,
  verify, compatibility and finalize stages with evidence-preserving rollback.

## Exit Criteria

Phase 7B may receive implementation approval only when:

1. Every P0 decision in `open-decisions.md` has an approver and recorded outcome.
2. Incident and dispute semantics are separated, including the dependency on the
   currently deferred Logistics capability.
3. The fate of `quality_certificates` versus `product_certifications` is approved.
4. The canonical traceability model and compatibility/backfill strategy are approved.
5. Evidence immutability, retention and private-file access are approved by the
   compliance/security owners.
6. API compatibility and stable error-envelope changes are approved.
7. Migration up/down and protected-data verification plans are reviewable without
   requiring production access during development.

Until all exit criteria pass, no implementation branch, migration or schema change
is authorized.
