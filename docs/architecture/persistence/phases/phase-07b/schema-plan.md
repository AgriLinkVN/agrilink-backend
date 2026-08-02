# Phase 7B Schema Plan

Status: `READY_FOR_REVIEW`. This document contains no executable SQL.

## Verified Baseline

Canonical baseline v2 currently contains `incident_reports` and `audit_logs`.
It does not contain `disputes`, `quality_certificates` or
`traceability_records`.

| Table                  | Runtime registry    | Baseline v2 | Known local snapshot                               | Planning conclusion                                                  |
| ---------------------- | ------------------- | ----------- | -------------------------------------------------- | -------------------------------------------------------------------- |
| `incident_reports`     | yes, baseline-owned | present     | baseline reconciliation exercises it               | preserve physical table; move ownership only after contract approval |
| `disputes`             | no                  | absent      | no checked-in deployed evidence                    | do not create from legacy entity                                     |
| `quality_certificates` | no                  | absent      | conditional legacy migration only                  | do not create from legacy entity                                     |
| `traceability_records` | yes, non-baseline   | absent      | preserved extra, 0 rows in captured local snapshot | reconcile schema before enabling writes                              |
| `audit_logs`           | yes, baseline-owned | present     | baseline table                                     | preserve for technical audit; compliance evidence decision open      |

The local snapshot is not production evidence. Phase 7B implementation must use a
fresh approved read-only inventory for every deployed environment before planning
backfill or destructive retirement.

## Candidate Canonical Models

Every item marked `proposal` requires approval before migration generation.

### Incident

| Concern     | Existing                               | Proposal                                                                                     | Status            |
| ----------- | -------------------------------------- | -------------------------------------------------------------------------------------------- | ----------------- |
| Table/PK    | `incident_reports.id` UUID             | retain                                                                                       | supported         |
| Subject FK  | required `shipment_id`, no baseline FK | retain scalar initially; FK only after Logistics activation decision                         | decision required |
| Reporter    | required `reported_by`, no baseline FK | scalar user ID with Users existence checked through a port; physical FK decision separate    | proposal          |
| Status      | varchar(50), default open              | approved state constraint                                                                    | decision required |
| Evidence    | `text[] evidence_urls`                 | private evidence link model using `stored_file_id`; preserve old column during compatibility | proposal          |
| Concurrency | none                                   | integer version or compare-and-set status                                                    | decision required |
| Time        | created/resolved only                  | add updated/closed timestamps only if state contract needs them                              | decision required |
| Delete      | unspecified                            | retained; no cascade delete                                                                  | proposal          |
| Indexes     | PK only                                | `(status, created_at, id)` and subject/reporter query indexes after query approval           | proposal          |

### Dispute

`disputes` is absent from baseline v2. No table is approved.

If the capability is approved, the minimum proposal is UUID PK, `order_id`, opener
and respondent scalar IDs, structured status/outcome, reason, opened/resolved
timestamps, expected version and operation key. Candidate uniqueness is based on
the approved eligibility scope, not automatically one dispute per order. Exact
nullability, FKs, window snapshot and refund linkage are P0 decisions.

### Quality Certificate

The active canonical product certificate is `product_certifications`, owned by
Products. The legacy `quality_certificates` declaration must not recreate a second
table merely because it exists in source.

Preferred migration intent is to retire the legacy declaration if all required
quality-certificate use cases are product-scoped. If organization/person
credentials are approved as distinct, design a separately named Compliance table
with immutable versions and private `stored_file_id`; do not reuse ambiguous
`quality_certificates` until deployed evidence and naming are reviewed.

### Audit Evidence

`audit_logs` currently has UUID PK, actor, action, target, method/path, JSON changes,
IP and created time. It has no FK, correlation ID, operation key, retention/legal
hold field or update/delete prevention.

The review must choose between:

1. Extend `audit_logs` as the single append-only evidence ledger.
2. Keep it as technical request audit and add a separately owned compliance event
   store.

No schema intent is approved until retention, PII, query and failure requirements
select one option.

## Traceability Conflict

| Concern      | Runtime module mapping (A)                             | Central legacy mapping (B)          | Canonical proposal                                           | Data-loss risk | Backfill                           | Status            |
| ------------ | ------------------------------------------------------ | ----------------------------------- | ------------------------------------------------------------ | -------------- | ---------------------------------- | ----------------- |
| Product      | required `product_id`                                  | nullable `product_id`               | required scalar product ID after orphan inventory            | high           | yes if nulls exist                 | decision required |
| Producer     | required `producer_id`                                 | absent                              | required producer/organization ID after evidence             | critical       | likely                             | decision required |
| Order item   | absent                                                 | nullable `order_item_id`            | optional provenance link or separate event                   | medium         | preserve                           | decision required |
| Batch        | absent                                                 | nullable `batch_code`               | stable required lot/batch identifier                         | high           | generate only with approved source | decision required |
| Plant date   | `planted_date` date                                    | `planting_date` string/date mapping | one date field                                               | medium         | copy/verify                        | proposal          |
| Harvest date | `harvested_date` date                                  | `harvest_date` string/date mapping  | one date field                                               | medium         | copy/verify                        | proposal          |
| Agronomy     | farming method, pesticides, JSON certifications, notes | seed, fertilizer, pesticides        | append-only typed events or private detail projection        | high           | preserve all source values         | proposal          |
| Location     | free-text farm location                                | absent                              | structured location reference plus optional display snapshot | high           | evidence required                  | decision required |
| Quality test | absent                                                 | result/lab/URL                      | evidence event with private file reference                   | high           | preserve                           | proposal          |
| Lifecycle    | mutable row with `updated_at`                          | issued/created timestamps           | immutable batch plus append-only events                      | critical       | copy/verify/finalize               | proposal          |
| Identifier   | unique `qr_code`                                       | unique `qr_code`                    | retain unique QR; format/rotation policy open                | low            | verify duplicates                  | proposal          |

## Constraint And Index Intent

The implementation review should consider, but must not generate before approval:

- State check constraints matching approved state machines.
- Unique operation keys for replay-safe commands.
- Unique QR identifiers and approved batch identity scope.
- Version checks or compare-and-set predicates for terminal transitions.
- Foreign keys only where the owning/dependent lifecycle is approved; evidence and
  history relationships must not cascade delete.
- Composite indexes derived from approved list/filter/order queries, always ending
  with `id` for deterministic pagination.
- Private-file FKs with `NO ACTION`; provider objects remain Storage-owned.

## Conditional Migration Sequence

1. **Inventory:** approved read-only table, column, constraint, index, row-count,
   duplicate and orphan evidence for every deployed environment.
2. **Additive:** create new structures/columns only from approved contracts; keep
   old mappings readable.
3. **Copy:** deterministic, restartable batches with operation evidence; never
   invent missing producer, batch or authority values.
4. **Verify:** row counts, per-field reconciliation, duplicate/orphan reports and
   application read parity.
5. **Compatibility:** old API reads from an approved adapter while writes target one
   canonical owner. Dual-write is prohibited unless separately approved.
6. **Finalize:** add validated constraints and retire old mappings only after parity
   and rollback evidence pass.

## Rollback Intent

- Additive migration down removes only unused new objects after verifying no new
  canonical writes would be lost.
- Copy rollback retains source columns/tables and evidence until sign-off.
- Constraint rollback drops only the new constraint/index, not retained evidence.
- API compatibility rollback restores the old adapter, not the duplicate writable
  mapping.
- No down migration may hard-delete incident, dispute, certificate, audit or trace
  evidence.

## Migration Gate

Migration generation remains blocked until all P0 schema decisions are approved,
fresh deployed inventories are attached and an exact up/down data-loss review is
accepted. The baseline migration already merged must not be edited.
