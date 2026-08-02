# Persistence Phase 7B: Compliance And Traceability Specification

- Status: Owner decisions recorded on 2026-08-02
- Implementation status: Blocked pending specification PR merge, approved read-only
  inventories and conditional gates
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

## Owner Decision Summary

- Approver: Mai Nguyễn Tiến Đạt.
- Capacity: Project Owner, Product Owner, Architecture Owner, Database Owner and
  Security/Compliance Owner for this academic project.
- Approval date: 2026-08-02.
- Incident, evidence, certificate and Traceability contracts have recorded outcomes.
- Dispute implementation, schema, resolution and refund coordination are deferred.
- Legacy certificate retirement and Traceability reconciliation remain conditional
  on approved read-only deployed inventories.
- Retention cleanup remains disabled until exact per-class durations are configured
  and approved.
- No Payment Owner authority was exercised; no payment behavior was approved.

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
- P7B-19 authorizes deployed inventory collection in read-only mode for each rollout
  environment, subject to operational access authorization and secret-safe capture.
- Any approved Traceability migration must follow inventory, additive, copy,
  verify, compatibility and finalize stages with evidence-preserving rollback.

## Exit Criteria

The applicable, non-deferred Phase 7B scope may move to an implementation branch
only when:

1. PR #91 is reviewed and merged into a current `develop`.
2. Approved read-only inventories resolve the P7B-11 and P7B-15 conditional branches.
3. The implementation scope explicitly excludes Dispute and every payment side effect.
4. Exact per-class retention durations are approved before cleanup is enabled.
5. Any proposed migration has inventory-derived up/down, reconciliation and
   data-loss evidence and receives a separate review; P7B-19 is not migration approval.
6. API compatibility and public/private projections are represented by executable
   contract and security tests.

Until these exit criteria pass, no implementation branch, migration or schema
change is authorized.
