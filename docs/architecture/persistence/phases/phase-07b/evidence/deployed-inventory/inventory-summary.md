# Phase 7B Inventory Summary

Status: `BLOCKED_INCOMPLETE_DEPLOYED_INVENTORY`

## Evidence Classes

| Evidence class                       | Accepted use                                | Limitation                                           |
| ------------------------------------ | ------------------------------------------- | ---------------------------------------------------- |
| Current source and registries        | mapping, ownership and consumer evidence    | cannot prove deployed schema or rows                 |
| Canonical baseline v2                | approved clean-database inclusion           | cannot prove an existing environment matches it      |
| Historical local reconciliation      | prior local shape and zero-row observation  | not current and not production evidence              |
| Current deployed PostgreSQL metadata | required for P7B-11/P7B-15 data conclusions | unavailable because access safety gates did not pass |

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
  rows, product scope or a deployed dependency.
- No database conclusion can be made about identifiers, nulls, timestamps, status
  distribution or stored-file references.

### Product Certifications

- Products is the canonical source owner and both runtime and CLI registries use
  its module mapping.
- Baseline v2 includes the table and private stored-file relationship.
- The central declaration is a compatibility re-export, not a second mapping.
- Current table existence, row count, status distribution, uniqueness and private
  file null count remain unknown.

### Traceability

- Mapping A is runtime/CLI registered and models product, producer, location,
  agronomy JSON/text, `created_at` and mutable `updated_at`.
- Mapping B is unregistered legacy source and models product, order item, batch,
  agronomy/test fields, `issued_at` and `created_at`.
- Baseline v2 excludes `traceability_records`.
- The mounted service throws explicit unimplemented errors before repository work,
  so active application writes are not proven.
- A historical local snapshot recorded mapping-A-like columns and zero rows. It is
  not accepted as current or rollout-environment inventory.
- Current QR duplicates, null producer/product/batch fields, orphan aggregates,
  constraints, indexes and data-loss risks remain unknown.

### Incident Reports

- Runtime/CLI and baseline include the existing mapping.
- Source persists shipment/reporter IDs, mutable string status, private-unsafe URL
  array and created/resolved timestamps.
- Current rows, non-approved statuses, nulls, evidence usage and timestamp
  consistency remain unknown because no aggregate query ran.

### Audit Logs

- Runtime/CLI and baseline include the Admin technical-audit mapping.
- Source has no correlation ID, operation key, retention/legal-hold field or
  update/delete prevention mechanism.
- Current rows, trigger protection, constraints and null aggregates remain unknown.
- Raw changes JSON and network/personal fields were not read.

## Related-Table Discovery

Database-wide discovery for names containing traceability, certification,
certificate, compliance, incident or audit was not executed. Source evidence also
references `stored_files`, product/profile certification fields and deferred
`disputes`; similar names are not treated as the same capability.

## Unproven Schema Assumptions

- Whether any rollout environment has `quality_certificates` or rows in it.
- Whether deployed `product_certifications` matches canonical baseline v2.
- Which Traceability mapping, if either, matches each rollout environment.
- Whether Traceability rows require producer/batch reconstruction.
- Whether incident statuses fit the approved lifecycle.
- Whether audit tables contain compliance-grade controls or alternate evidence stores.
- Whether staging or production currently exists and is part of rollout.
