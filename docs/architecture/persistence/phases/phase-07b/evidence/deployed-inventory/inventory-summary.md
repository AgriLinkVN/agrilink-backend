# Phase 7B Inventory Summary

Status: `BLOCKED_INCOMPLETE_DEPLOYED_INVENTORY`

## Evidence Classes

| Evidence class                   | Accepted use                               | Limitation                                      |
| -------------------------------- | ------------------------------------------ | ----------------------------------------------- |
| Current source and registries    | mapping, ownership and consumer evidence   | cannot prove deployed schema or rows            |
| Canonical baseline v2            | approved clean-database inclusion          | cannot prove an existing environment matches it |
| Historical local reconciliation  | prior local shape and zero-row observation | not current and not production evidence         |
| Current local-protected metadata | local schema and aggregate evidence        | captured read-only; not production evidence     |
| Current production metadata      | required for cross-environment conclusions | unavailable because safe access is missing      |

## Source-To-Database Comparison

| Capability                 | Source mapping                                                    | Runtime registered | CLI registered                  | Baseline included | Current deployed table | Rows    | Schema match | Conflict                                                         | Conclusion                                                                      |
| -------------------------- | ----------------------------------------------------------------- | ------------------ | ------------------------------- | ----------------- | ---------------------- | ------- | ------------ | ---------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Legacy quality certificate | one legacy declaration; Storage Phase 9 CLI consumer              | no                 | no entity; yes rollout consumer | no                | unknown                | unknown | unknown      | CLI dependency and deployed state unresolved                     | reconciliation review required; retirement is not eligible                      |
| Product certification      | one Products-owned writable mapping; central file is a re-export  | yes                | yes                             | yes               | unknown                | unknown | unknown      | deployed parity unverified                                       | canonical source owner confirmed; database inventory missing                    |
| Traceability               | two incompatible writable declarations                            | module mapping     | module mapping                  | no                | unknown                | unknown | unknown      | critical source divergence                                       | staged reconciliation required; deployed branch unresolved                      |
| Incident                   | one central writable mapping; approved future owner is Compliance | yes                | yes                             | yes               | unknown                | unknown | unknown      | current arbitrary status mapping differs from approved lifecycle | ownership/domain planning may continue; schema work remains reviewed separately |
| Technical audit            | one Admin-owned writable mapping                                  | yes                | yes                             | yes               | unknown                | unknown | unknown      | lacks approved compliance-ledger guarantees in source            | separate-ledger evidence gate remains; deployed metadata missing                |

Runtime and CLI entity registries use the same composition registry. The Storage
Phase 9 commands are a separate CLI data consumer and include a
`quality_certificates` source descriptor even though that entity is not registered.

## Local-Protected Inventory

| Capability                 | Table exists | Exact rows | Local schema status                                                                    | Local decision impact                                       |
| -------------------------- | ------------ | ---------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Legacy quality certificate | no           | not run    | table absent                                                                           | local evidence captured; production still required          |
| Product certification      | yes          | 0          | canonical table exists but `stored_file_id` and its relationship are absent            | local parity mismatch; no local rows require reconciliation |
| Traceability               | yes          | 0          | mapping-A shape; string product/producer IDs; mapping-B batch/order-item fields absent | staged reconciliation remains required                      |
| Incident                   | yes          | 0          | existing runtime mapping; no trigger or RLS protection                                 | no local lifecycle data; domain/schema review still needed  |
| Technical audit            | yes          | 0          | no compliance correlation, operation, retention or legal-hold columns                  | compliance-ledger gate remains                              |

The final local session used 45 reviewed statements in a repeatable-read, read-only
transaction and ended with explicit rollback. Direct Traceability orphan queries
were not run because the observed ID types were incompatible or not proven safe.
The exact zero-row result means no local orphan row exists, but that implication is
recorded separately from query output.

## Process Deviation Review

Decision: `PROCESS_DEVIATION_REVIEWED_AND_ACCEPTED`.

The preliminary diagnostic was the Section 4 catalog estimate expressed with
different whitespace only. It selected relation aliases, a constant classification
and catalog row estimates from `pg_catalog.pg_class` and
`pg_catalog.pg_namespace`. It completed under the approved read-only,
repeatable-read transaction and timeout policy and was rolled back. It returned
metadata rather than application rows and did not enter this inventory's exact
counts, schema hash, findings or conditional-gate conclusions.

The final evidence capture was a later, independent 45-statement run sourced from
the reviewed pack. The committed `local-protected.json` remains unchanged so the
original deviation disclosure and final capture provenance remain auditable.

## Source References

| Evidence                                | Source                                                                                                      |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Runtime/CLI registry parity             | `src/database/entity-registry.ts:111`, `src/database/data-source.ts:43`, `src/config/database.config.ts:30` |
| Incident registration                   | `src/database/entity-registry.ts:64`                                                                        |
| Technical audit registration            | `src/database/entity-registry.ts:69`                                                                        |
| Product certification registration      | `src/database/entity-registry.ts:91`                                                                        |
| Traceability non-baseline registration  | `src/database/entity-registry.ts:97`                                                                        |
| Legacy quality certificate declaration  | `src/database/entities/quality-certificate.entity.ts:8`                                                     |
| Legacy quality certificate CLI consumer | `src/scripts/storage-phase9-rollout.ts:77`, `package.json:42`                                               |
| Canonical product certification mapping | `src/modules/products/infrastructure/persistence/entities/product-certification.entity.ts:13`               |
| Traceability mapping A                  | `src/modules/traceability/entities/traceability-record.entity.ts:3`                                         |
| Traceability mapping B                  | `src/database/entities/traceability-record.entity.ts:3`                                                     |
| Unimplemented Traceability service      | `src/modules/traceability/traceability.service.ts:15`                                                       |
| Incident mapping                        | `src/database/entities/incident-report.entity.ts:4`                                                         |
| Technical audit mapping                 | `src/modules/admin/entities/audit-log.entity.ts:3`                                                          |

## Source Findings

### Legacy Quality Certificates

- Baseline v2 excludes `quality_certificates`.
- Application runtime and CLI entity registries do not register its entity.
- The Storage Phase 9 `plan`, `apply`, `finalize` and `verify` command family
  contains a `quality_certificates` source descriptor.
- The descriptor is consumer evidence only. It does not prove table existence,
  rows, product scope or a production dependency.
- `local-protected` has no `quality_certificates` table. This does not authorize
  retirement because the CLI consumer remains and production is not inventoried.

### Product Certifications

- Products is the canonical source owner and both runtime and CLI registries use
  its module mapping.
- Baseline v2 includes the table and private stored-file relationship.
- The central declaration is a compatibility re-export, not a second mapping.
- `local-protected` contains the table with zero rows, but its schema lacks
  `stored_file_id`, the related index and foreign key expected by the canonical
  mapping. Production parity remains unknown.

### Traceability

- Mapping A is runtime/CLI registered and models product, producer, location,
  agronomy JSON/text, `created_at` and mutable `updated_at`.
- Mapping B is unregistered legacy source and models product, order item, batch,
  agronomy/test fields, `issued_at` and `created_at`.
- Baseline v2 excludes `traceability_records`.
- The mounted service throws explicit unimplemented errors before repository work,
  so active application writes are not proven.
- Current `local-protected` evidence confirms a mapping-A-like schema and zero rows.
- QR duplicate and mapping-A null aggregates are zero. Mapping-B batch/order-item
  fields are absent.
- Direct orphan queries were skipped after the reviewed product query exposed an
  incompatible UUID/string comparison. The exact empty table independently proves
  no local orphan rows, but production data-loss risks remain unknown.

### Incident Reports

- Runtime/CLI and baseline include the existing mapping.
- Source persists shipment/reporter IDs, mutable string status, private-unsafe URL
  array and created/resolved timestamps.
- `local-protected` contains zero rows. All reviewed null, evidence-reference,
  lifecycle-status and timestamp-consistency aggregates are zero.

### Audit Logs

- Runtime/CLI and baseline include the Admin technical-audit mapping.
- Source has no correlation ID, operation key, retention/legal-hold field or
  update/delete prevention mechanism.
- `local-protected` contains zero rows, one primary-key constraint, no non-internal
  triggers and no RLS.
- Correlation, operation-key, retention and legal-hold columns are absent.
- Raw changes JSON and network/personal fields were not read.

## Related-Table Discovery

Local discovery for names containing traceability, certification, certificate,
compliance, incident or audit returned only the four present target tables. Similar
names were not treated as the same capability, and production discovery was not
executed.

## Unproven Schema Assumptions

- Whether production has `quality_certificates` or rows in it.
- Whether production `product_certifications` matches canonical baseline v2.
- Which Traceability shape and rows exist in production.
- Whether production Traceability data requires producer/batch reconstruction.
- Whether incident statuses fit the approved lifecycle.
- Whether audit tables contain compliance-grade controls or alternate evidence stores.
- Production constraints, indexes, triggers, RLS and aggregate data state.
