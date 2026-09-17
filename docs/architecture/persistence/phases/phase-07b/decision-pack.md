# Phase 7B Decision Pack

Status: `OWNER_DECISIONS_RECORDED`

## Decision Labels

- `SUPPORTED_BY_EXISTING_CONTRACT`: active source, canonical baseline or approved ADR supports it.
- `RECOMMENDED_DECISION`: architecture recommendation requiring named approval.
- `DECISION_REQUIRED`: evidence is insufficient or contradictory.
- `OUT_OF_SCOPE`: not authorized for Phase 7B.

Legacy entity fields are discovery evidence, not an approved contract.

## Recorded Owner Outcomes

The authoritative outcome details, approver capacities and notes are in
`open-decisions.md`. The applicable current implementation scope is:

- Incident and Dispute are separate aggregates; Dispute implementation and schema
  are deferred, and no payment behavior is approved.
- Compliance owns Incident writes; Admin retains only a compatibility adapter over
  typed application ports.
- Incident uses `open`, `in_review`, `resolved`, `closed` actions; reopen is out of scope.
- Evidence is immutable and corrected through superseding records.
- Products retains product certificates. Legacy `quality_certificates` remains
  inventory-conditional, and no Certifier role is added.
- Traceability uses immutable batch identity, typed events and deterministic
  projections; reconciliation remains inventory-conditional.
- A separate compliance evidence ledger is selected when implementation evidence
  confirms technical `audit_logs` cannot meet its policy.
- Retention is per class with legal hold and no cascade hard-delete; cleanup remains
  disabled until exact durations are approved.
- P7B-19 authorizes read-only inventory only, never migration or mutation.

## Source Audit

| Module                | Source                                                                                        | Status                    | Current behavior                                                                       | Conflict and risk                                                                                                   | Decision needed                                                          |
| --------------------- | --------------------------------------------------------------------------------------------- | ------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Compliance/Incident   | `src/database/entities/incident-report.entity.ts:4`                                           | Active mapping            | Models shipment incident, reporter, text evidence URLs and unconstrained string status | Owned centrally; no domain layer; evidence URLs bypass `stored_files`; shipment capability was deferred in Phase 7A | Canonical owner, subject type, status, evidence and Logistics dependency |
| Admin                 | `src/modules/admin/admin.route.ts:8`                                                          | Active coupling           | Registers `IncidentReport` directly                                                    | Admin owns a repository belonging to proposed Compliance owner                                                      | Replace with Compliance query/command ports                              |
| Admin                 | `src/modules/admin/admin.controller.ts:99`                                                    | Active API                | `/admin/disputes` lists and changes incidents                                          | Public name says dispute while payload is incident; arbitrary status body has no DTO validation                     | Compatibility route and split capability                                 |
| Admin                 | `src/modules/admin/admin.service.ts:321`                                                      | Active write              | Queries incidents and writes any status, then writes an audit log                      | No transition policy, transaction or concurrency protection; audit may fail after incident save                     | Transition, transaction and version contract                             |
| Dispute               | `src/database/entities/dispute.entity.ts:4`                                                   | Legacy-only mapping       | Declares order/user/reason/evidence/status/resolution fields                           | Not in runtime registry or canonical baseline v2; no controller, repository or tests                                | Whether a Dispute capability exists at all                               |
| Shared enum           | `src/common/enums/index.ts:167`                                                               | Legacy declaration        | Lists five dispute states                                                              | No active use case proves transitions                                                                               | Approve, replace or retire states                                        |
| Quality certificate   | `src/database/entities/quality-certificate.entity.ts:9`                                       | Legacy-only mapping       | Declares user/product certificate with active/revoked string status                    | Not in runtime registry or baseline; overlaps active Product certification                                          | Retire, consolidate or define distinct organization certificate          |
| Products              | `src/modules/products/infrastructure/persistence/entities/product-certification.entity.ts:13` | Active canonical mapping  | Product-owned pending/verified/rejected certificate workflow                           | No revocation state; private file metadata exists                                                                   | Whether Phase 7B extends this aggregate through a Products port          |
| Storage               | `docs/architecture/adr/0001-storage-provider-and-access-policy.md:24`                         | Approved ADR              | Certification documents stay private and use authorized signed URLs                    | Public badge/document publication is explicitly unapproved                                                          | Publication ADR and evidence access policy                               |
| Audit                 | `src/modules/admin/entities/audit-log.entity.ts:3`                                            | Active canonical mapping  | Stores actor, action, target, request metadata and JSON changes                        | No correlation ID, retention field or immutability enforcement                                                      | Technical audit versus compliance-evidence boundary                      |
| Audit                 | `src/common/interceptors/audit-log.interceptor.ts:11`                                         | Partial                   | Logs mutating requests to application logs                                             | The source explicitly states that it does not persist to `audit_logs`                                               | Durable audit producer and failure policy                                |
| Traceability          | `src/modules/traceability/entities/traceability-record.entity.ts:3`                           | Runtime extra             | Product/producer/location mutable row with `updated_at`                                | Excluded from baseline v2 and conflicts with central mapping                                                        | Canonical model and migration path                                       |
| Traceability          | `src/database/entities/traceability-record.entity.ts:3`                                       | Duplicate legacy mapping  | Product/order item/batch/agronomy/test fields with `issued_at`                         | Different columns and nullability from runtime mapping                                                              | Field-by-field deployed evidence before consolidation                    |
| Traceability          | `src/modules/traceability/traceability.service.ts:14`                                         | Mounted but nonfunctional | All three methods throw explicit unimplemented errors                                  | Current API advertises behavior that always fails                                                                   | Preserve, disable or implement only after approval                       |
| Traceability          | `src/modules/traceability/traceability.controller.ts:17`                                      | Active OpenAPI surface    | Public QR/product reads; farmer/cooperative/admin create                               | Product ownership is not verified; public response can expose notes/agronomy data                                   | Read projection, producer authorization and privacy                      |
| Traceability frontend | `AgriLink_frontend/src/app/trace/[qr]/page.tsx:7`                                             | Mock only                 | Renders hard-coded six-step timeline                                                   | It is not an API contract and includes logistics/certification concepts not implemented                             | Product owner must approve desired trace projection                      |

No backend controller, DTO, repository or test was found for creating incidents,
opening disputes or managing `quality_certificates`. The frontend support form at
`AgriLink_frontend/src/app/support/page.tsx:217` only simulates submission.

## Persistence And Quality Audit

| Concern                    | Evidence                                                                         | Finding                                                                  | Risk/decision                                                            |
| -------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| Runtime registry           | `src/database/entity-registry.ts:64`                                             | `incident_reports` is baseline-owned and writable                        | Active table must be preserved while ownership moves                     |
| Runtime registry           | `src/database/entity-registry.ts:97`                                             | Traceability module mapping is registered as non-baseline                | Runtime can map a table that clean-v2 intentionally excludes             |
| Missing registrations      | `src/database/entity-registry.ts`                                                | `disputes` and `quality_certificates` are not registered                 | Legacy declarations cannot justify schema creation                       |
| Incident schema            | `src/database/migrations-v2/1800000000000-CreateCanonicalBaselineV2.ts:41`       | PK only; no FK, state check or query index                               | Constraints depend on approved lifecycle and deferred shipment ownership |
| Audit schema               | `src/database/migrations-v2/1800000000000-CreateCanonicalBaselineV2.ts:48`       | PK only; no immutable/retention/correlation constraint                   | Technical audit is not yet a compliance ledger                           |
| Certificate file migration | `src/database/migrations/1783818000000-AddStoredFileIdToPrivateDocuments.ts:117` | Alters `quality_certificates` only when the table already exists         | Compatibility evidence, not canonical table approval                     |
| Certificate file backfill  | same migration at line 265                                                       | Maps legacy private object keys into `stored_files`                      | Preserve if deployed rows exist; do not infer public visibility          |
| Soft delete                | all four candidate entities                                                      | No delete timestamp or delete policy is implemented                      | Exact retention/hard-delete policy is P0                                 |
| Incident API test          | `test/admin-state-agency.e2e-spec.ts:40`                                         | Admin methods are mocked; no dispute/incident route scenario is asserted | Add compatibility and real persistence coverage                          |
| Traceability tests         | repository-wide search                                                           | No focused unit/integration/E2E tests found                              | All advertised behavior is unverified                                    |
| Frontend incident contract | `AgriLink_frontend/src/app/dashboard/state/page.tsx:51`                          | Client names payload Dispute but consumes incident description/type/time | Route/payload correction requires explicit compatibility work            |
| Frontend trace contract    | `AgriLink_frontend/src/app/trace/[qr]/page.tsx:7`                                | Entire timeline is static mock data                                      | Do not treat mock fields or steps as an approved API contract            |

## Ownership Findings

| Entity                 | Current owner                                      | Proposed canonical owner                                                                   | Read dependencies                                                           | Write dependencies                                        | Migration impact                                                    | Decision status          |
| ---------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------ |
| `incident_reports`     | Compliance in catalog; Admin repository at runtime | Compliance                                                                                 | Admin/State Agency oversight; reporter view is policy-controlled            | Compliance command handler only; Admin through port       | Preserve table first; later deltas require inventory-derived review | `APPROVED`               |
| `disputes`             | Compliance catalog; no repository owner            | None in current Phase 7B scope                                                             | Future Orders, Payments, Users and oversight dependencies remain unapproved | No current write owner or payment behavior                | No table or canonical mapping                                       | `DEFERRED`               |
| `quality_certificates` | Compliance catalog; no repository owner            | Products for product certificates; distinct non-product credential requires later evidence | Products, Storage, public product query, State Agency                       | Products remains the current owner                        | Retire only if inventories prove empty; otherwise stop and review   | `APPROVED_CONDITIONALLY` |
| `traceability_records` | Traceability                                       | Traceability                                                                               | Products, producer capability and public QR projection                      | Traceability command handler only                         | Inventory/additive/copy/verify/compatibility/finalize               | `APPROVED_CONDITIONALLY` |
| `audit_logs`           | Admin                                              | Admin for technical audit; separate compliance ledger when policy gap is confirmed         | Admin/State Agency and audited capabilities                                 | Append through an audit port; no caller repository access | Separate additive store requires its own reviewed migration         | `APPROVED`               |

Admin, Products, Payments and Traceability must not import another module's ORM
entity or repository. Cross-owner access uses scalar IDs and application ports.

## Domain Contracts

### Incident Domain Contract

| Concern          | Proposal                                                                         | Classification                                    |
| ---------------- | -------------------------------------------------------------------------------- | ------------------------------------------------- |
| Aggregate        | Incident is a Compliance aggregate with evidence references                      | `APPROVED` by P7B-01/P7B-02                       |
| Current subject  | `shipment_id` is required by baseline v2                                         | `SUPPORTED_BY_EXISTING_CONTRACT`                  |
| Subject future   | Generic order/product/shipment subject                                           | `DECISION_REQUIRED` because Logistics is deferred |
| Creator          | Existing role plus object-level capability                                       | `APPROVED` by P7B-07                              |
| Content mutation | Core report content becomes immutable after submission; evidence may be appended | `APPROVED` by P7B-08/P7B-09                       |
| Status           | `open`, `in_review`, `resolved`, `closed` through actions                        | `APPROVED` by P7B-05                              |
| Reopen           | No reopen transition in the current scope                                        | `OUT_OF_SCOPE`                                    |
| Evidence         | Private `stored_file_id` references, not client-controlled URLs                  | `APPROVED` by P7B-08 and the Storage ADR          |

### Dispute Domain Contract

| Concern            | Proposal                                                                  | Classification |
| ------------------ | ------------------------------------------------------------------------- | -------------- |
| Aggregate          | Separate Compliance aggregate linked to one order                         | `DEFERRED`     |
| Existence          | No Dispute implementation or table in current Phase 7B                    | `DEFERRED`     |
| Opener             | Buyer or seller participating in the order                                | `DEFERRED`     |
| Eligibility/window | Depends on delivered/cancelled/payment state and a configured time window | `DEFERRED`     |
| Resolution         | Structured outcome plus immutable rationale                               | `DEFERRED`     |
| Payment effect     | Any future refund remains Payments-owned                                  | `DEFERRED`     |
| Concurrency        | One future terminal resolution wins                                       | `DEFERRED`     |
| Idempotency        | Future open and resolve commands use operation keys                       | `DEFERRED`     |

### Quality Certificate Domain Contract

| Concern                      | Proposal                                                                        | Classification                                                 |
| ---------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Existing product certificate | `product_certifications` remains Products-owned                                 | `APPROVED` by P7B-10                                           |
| Legacy quality certificate   | Retire only after inventories prove no data/consumer; otherwise stop and review | `APPROVED_CONDITIONALLY` by P7B-11                             |
| Issuer/certifier             | State Agency/Admin by policy; no new `certifier` role                           | `APPROVED` by P7B-13                                           |
| Verification                 | Candidate pending to verified/rejected flow                                     | `SUPPORTED_BY_EXISTING_CONTRACT` for product certificates only |
| Revocation                   | Verified to revoked, with actor, reason and timestamp; never hard delete        | `APPROVED` by P7B-12                                           |
| Expiration                   | Derived from `expiry_date`, not a client-assigned state                         | `APPROVED` by P7B-12                                           |
| Replacement                  | New immutable version linked to predecessor instead of editing verified facts   | `APPROVED` by P7B-09/P7B-12                                    |
| File/public badge            | Document remains private; public projection exposes allow-listed metadata only  | `APPROVED` for privacy; exact badge fields remain P1           |

### Audit Evidence

| Concern             | Proposal                                                                       | Classification                   |
| ------------------- | ------------------------------------------------------------------------------ | -------------------------------- |
| Technical audit     | Keep `audit_logs` Admin-owned                                                  | `SUPPORTED_BY_EXISTING_CONTRACT` |
| Compliance evidence | Separate ledger when technical-audit policy gap is confirmed                   | `APPROVED` by P7B-17             |
| Immutability        | Insert-only application port; no update/delete API                             | `APPROVED` by P7B-08             |
| Failure behavior    | Business mutation and required compliance evidence commit atomically           | `APPROVED` by P7B-17             |
| Retention           | Per-class policy with legal hold; exact durations gate cleanup                 | `APPROVED_CONDITIONALLY`         |
| Read access         | Admin/State Agency by policy; private evidence requires resource authorization | `APPROVED` by P7B-07             |

### Traceability

| Concern            | Proposal                                                                 | Classification                     |
| ------------------ | ------------------------------------------------------------------------ | ---------------------------------- |
| Aggregate          | Batch/lot identity with append-only trace events and a public projection | `APPROVED` by P7B-14/P7B-16        |
| Current identifier | Unique QR code exists in both mappings                                   | `SUPPORTED_BY_EXISTING_CONTRACT`   |
| Product/producer   | Scalar product and producer IDs; ownership verified through ports        | `APPROVED` by P7B-07/P7B-14        |
| Batch identifier   | Required stable batch/lot code separate from QR                          | `DECISION_REQUIRED`                |
| Location           | Structured location reference versus legacy free text                    | `DECISION_REQUIRED`                |
| History            | Append-only events; correction appends a superseding event               | `APPROVED` by P7B-09/P7B-16        |
| Query              | Public QR projection and authenticated owner/admin detail projection     | `APPROVED`; exact fields remain P1 |
| Compatibility      | Preserve `/trace` routes until response and migration compatibility pass | `SUPPORTED_BY_EXISTING_CONTRACT`   |

## Recorded State-Machine Outcomes

Incident and certificate rows below are the selected planning contract. Dispute is
retained only as a deferred future design and is not part of implementation scope.

### Incident State Machine

| Current         | Action       | Next      | Actor                           | Preconditions                     | Side effects                                   | Invalid result                |
| --------------- | ------------ | --------- | ------------------------------- | --------------------------------- | ---------------------------------------------- | ----------------------------- |
| none            | submit       | open      | eligible authenticated reporter | valid subject and evidence access | incident and evidence audit in one transaction | `INCIDENT_INVALID_INPUT`      |
| open            | start review | in_review | Admin/State Agency              | expected version                  | append audit evidence                          | `INCIDENT_INVALID_TRANSITION` |
| in_review       | resolve      | resolved  | Admin/State Agency              | resolution supplied               | append resolution evidence                     | `INCIDENT_INVALID_TRANSITION` |
| resolved        | close        | closed    | Admin/State Agency              | retention record complete         | append audit evidence                          | `INCIDENT_INVALID_TRANSITION` |
| resolved/closed | reopen       | in_review | none in current scope           | separate future approval          | none                                           | `OUT_OF_SCOPE`                |

Submit, review, resolve and close are approved planning transitions. Reopen is out
of scope and clients never assign a next status directly.

### Dispute State Machine

| Current      | Action         | Next            | Actor                    | Preconditions                                       | Side effects                                     | Invalid result               |
| ------------ | -------------- | --------------- | ------------------------ | --------------------------------------------------- | ------------------------------------------------ | ---------------------------- |
| none         | open           | open            | order buyer/seller       | eligible order, within window, unique operation key | create dispute/evidence and notify               | `DISPUTE_NOT_ELIGIBLE`       |
| open         | begin review   | under_review    | Admin/State Agency       | expected version                                    | audit transition                                 | `DISPUTE_INVALID_TRANSITION` |
| under_review | resolve buyer  | resolved_buyer  | approved resolver        | structured outcome                                  | request refund through Payments port if approved | `DISPUTE_INVALID_TRANSITION` |
| under_review | resolve seller | resolved_seller | approved resolver        | structured outcome                                  | audit transition                                 | `DISPUTE_INVALID_TRANSITION` |
| resolved\_\* | close          | closed          | approved resolver/system | side effects completed                              | close audit event                                | `DISPUTE_INVALID_TRANSITION` |

The entire Dispute state machine, its actors, eligibility, resolution and payment
side effects are `DEFERRED_WITH_P7B_03`.

### Quality Certificate State Machine

| Current  | Action | Next     | Actor                        | Preconditions               | Side effects                     | Invalid result                   |
| -------- | ------ | -------- | ---------------------------- | --------------------------- | -------------------------------- | -------------------------------- |
| none     | submit | pending  | owner                        | private file authorized     | create certificate and audit     | `CERTIFICATE_INVALID_INPUT`      |
| pending  | verify | verified | State Agency/Admin by policy | evidence review complete    | publish metadata projection only | `CERTIFICATE_INVALID_TRANSITION` |
| pending  | reject | rejected | State Agency/Admin by policy | reason required             | audit rejection                  | `CERTIFICATE_INVALID_TRANSITION` |
| verified | revoke | revoked  | approved authority           | reason and expected version | remove badge, retain evidence    | `CERTIFICATE_INVALID_TRANSITION` |
| verified | expire | derived  | query policy                 | expiry date elapsed         | hide active badge                | `CERTIFICATE_EXPIRED`            |

Submission/verification/rejection remain Products-owned. Immutable revocation,
linked replacement and derived expiry are approved planning behavior; documents
and internal notes remain private.

## Transaction And Concurrency

| Use case                      | Boundary                                                                                   | Race                                 | Recommended protection                                             | Retry                                      | Idempotency                |
| ----------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------ | -------------------------- |
| Submit incident with evidence | Incident, evidence links and required audit in one DB transaction                          | duplicate submit/file reuse          | operation-key unique constraint plus file authorization            | retry same key returns prior result        | required, format undecided |
| Open dispute                  | eligibility read, dispute and evidence in one transaction                                  | two opens for same order/party       | approved unique key plus order snapshot/lock policy                | replay prior result                        | required                   |
| Resolve dispute               | transition, outcome and audit in one transaction; payment action through explicit workflow | concurrent resolutions               | expected version; row lock only if cross-row invariant requires it | conflict is client-retriable after reload  | required                   |
| Verify certificate            | transition and audit in one transaction                                                    | verify versus reject                 | compare-and-set pending status or version                          | conflict not blindly retried               | recommended                |
| Revoke certificate            | transition, reason and audit in one transaction                                            | duplicate revoke                     | version plus terminal-state check                                  | replay returns same revoked representation | required                   |
| Append trace event            | batch/event/audit transaction                                                              | duplicate producer event or sequence | operation key unique per producer plus event ordering rule         | safe replay                                | required                   |
| Record audit evidence         | participates in caller transaction when mandatory                                          | duplicate retry                      | correlation/operation uniqueness if approved                       | same transaction policy                    | inherited from command     |

Outbox is `OUT_OF_SCOPE` unless an approved cross-module asynchronous side effect
cannot be made reliable through the existing transaction and operation-key pattern.

## Authorization Matrix

Legend: `E` existing evidence, `R` recommended, `D` decision required, `-` denied.
`Certifier` is not an existing `UserRole`; no implementation may add it implicitly.

| Action                           | Farmer/Seller           | Buyer            | Cooperative             | Certifier | State Agency | Admin | System |
| -------------------------------- | ----------------------- | ---------------- | ----------------------- | --------- | ------------ | ----- | ------ |
| Create incident                  | D                       | D                | D                       | -         | D            | R     | D      |
| View own incident                | R                       | R                | R                       | -         | R            | R     | -      |
| Update incident content          | - after submit          | - after submit   | - after submit          | -         | -            | -     | -      |
| Close incident                   | -                       | -                | -                       | -         | R            | R     | D      |
| Open dispute                     | D                       | R                | D                       | -         | -            | -     | -      |
| Submit dispute evidence          | R if participant        | R if participant | R if participant        | -         | R            | R     | -      |
| Resolve dispute                  | -                       | -                | -                       | -         | D            | R     | -      |
| Submit certificate               | E for product owner     | -                | E for product owner     | D         | -            | R     | -      |
| Verify/reject certificate        | -                       | -                | -                       | D         | E            | E     | -      |
| Revoke certificate               | -                       | -                | -                       | D         | R            | R     | -      |
| View private evidence            | R if owner/participant  | R if participant | R if owner              | D         | R            | R     | -      |
| View public certificate metadata | E                       | E                | E                       | E         | E            | E     | E      |
| Create traceability record       | E                       | -                | E                       | -         | -            | E     | D      |
| Correct traceability data        | R via superseding event | -                | R via superseding event | -         | D            | R     | D      |

`Supplier` and `Enterprise` exist as roles but do not fit the requested
Farmer/Seller column cleanly. Their producer/certificate rights are
`DECISION_REQUIRED`.

## Retention And Immutability

- Incident/dispute submissions, resolution records, certificate verification and
  trace events should be immutable facts; corrections append a new fact.
- Hard delete is not recommended for evidence-bearing aggregates.
- Private documents remain Storage-owned and private. Compliance stores file IDs,
  never provider paths or public document URLs.
- Exact retention periods, legal holds, anonymization and purge authority have no
  source evidence and remain P0 open decisions.
