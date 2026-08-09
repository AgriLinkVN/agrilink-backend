# Phase 7B Open Decisions

Status: Owner outcomes recorded; conditional implementation gates remain

The outcomes below were recorded by the named academic-project owner on 2026-08-02.
They approve only the explicitly selected specification scope. Conditional outcomes,
read-only inventory gates and deferred capabilities remain binding. No outcome in
this document authorizes DDL, DML, migration execution or production mutation.

## P0 Summary

| ID     | Topic                                    | Required approver groups                             | Outcome                            |
| ------ | ---------------------------------------- | ---------------------------------------------------- | ---------------------------------- |
| P7B-01 | Incident and Dispute capability boundary | Product Owner, Architecture Owner, Compliance Owner  | `APPROVED`                         |
| P7B-02 | Incident table ownership                 | Architecture Owner, Compliance Owner                 | `APPROVED`                         |
| P7B-03 | Dispute MVP inclusion                    | Product Owner, Compliance Owner, Payment Owner       | `DEFERRED`                         |
| P7B-04 | Dispute canonical schema                 | Architecture Owner, Database Owner, Compliance Owner | `NOT_APPLICABLE_DUE_TO_P7B_03`     |
| P7B-05 | Incident state machine                   | Product Owner, Compliance Owner                      | `APPROVED`                         |
| P7B-06 | Dispute state machine                    | Product Owner, Compliance Owner, Payment Owner       | `DEFERRED_WITH_P7B_03`             |
| P7B-07 | Actor authorization                      | Security Owner, Compliance Owner, Product Owner      | `APPROVED`                         |
| P7B-08 | Evidence immutability                    | Compliance Owner, Security Owner, Database Owner     | `APPROVED`                         |
| P7B-09 | Evidence replacement and correction      | Compliance Owner, Security Owner                     | `APPROVED`                         |
| P7B-10 | Quality Certificate ownership            | Product Owner, Architecture Owner, Compliance Owner  | `APPROVED`                         |
| P7B-11 | Legacy `quality_certificates` scope      | Product Owner, Database Owner, Compliance Owner      | `READY_FOR_HUMAN_APPROVAL`          |
| P7B-12 | Certificate verification and revocation  | Product Owner, Compliance Owner, Security Owner      | `APPROVED`                         |
| P7B-13 | Certifier role governance                | Security Owner, Product Owner, Compliance Owner      | `APPROVED`                         |
| P7B-14 | Traceability canonical mapping           | Product Owner, Architecture Owner, Database Owner    | `APPROVED`                         |
| P7B-15 | Traceability reconciliation strategy     | Database Owner, Architecture Owner                   | `READY_FOR_HUMAN_APPROVAL`          |
| P7B-16 | Traceability append-only contract        | Product Owner, Compliance Owner, Architecture Owner  | `APPROVED`                         |
| P7B-17 | Audit evidence persistence               | Architecture Owner, Compliance Owner, Security Owner | `APPROVED`                         |
| P7B-18 | Retention and hard-delete policy         | Compliance Owner, Security Owner, Database Owner     | `APPROVED_CONDITIONALLY`           |
| P7B-19 | Deployed inventory and migration basis   | Database Owner, Architecture Owner                   | `APPROVED_FOR_READ_ONLY_INVENTORY` |

## P0 Decision Records

### P7B-01: Incident And Dispute Capability Boundary

- **Question:** Are Incident and Dispute separate aggregates and API resources?
- **Why it blocks:** Admin currently labels Incident rows as disputes, so ownership,
  state and compatibility cannot be implemented safely until the concepts are split.
- **Observed evidence:** `src/modules/admin/admin.controller.ts:99` exposes dispute
  routes while `src/modules/admin/admin.service.ts:321` reads `IncidentReport`.
  `Dispute` has no runtime repository or baseline table.
- **Options:** Keep one Incident capability; introduce a distinct order Dispute;
  model Dispute as an Incident subtype.
- **Trade-offs:** One model preserves current storage but conflates logistics and
  commerce. Separate aggregates add contracts/migration but preserve invariants.
- **Recommendation:** Separate shipment/operational Incident from order/payment
  Dispute, with a deprecated compatibility adapter for the Admin route.
- **Required approver groups:** Product Owner, Architecture Owner, Compliance Owner.
- **Selected option:** B - separate aggregates.
- **Outcome:** `APPROVED`
- **Approval note:** Incident and Dispute are separate aggregates. Legacy Admin
  dispute routes remain an Incident compatibility adapter during transition.
- **Approver:** Mai Nguyễn Tiến Đạt.
- **Approver capacity:** Project Owner, Product Owner, Architecture Owner, Database
  Owner and Security/Compliance Owner for this academic project.
- **Approval date:** 2026-08-02.
- **Implementation impact:** Determines module boundaries and application ports.
- **Migration impact:** Determines whether a Dispute table is needed.
- **API impact:** Determines replacement/deprecation of `/admin/disputes`.
- **Test impact:** Requires compatibility tests proving Incident payloads do not
  silently become Dispute payloads.

### P7B-02: Incident Table Ownership

- **Question:** Does Compliance canonically own `incident_reports` while Admin only
  consumes query/transition ports?
- **Why it blocks:** Admin directly registers a central entity, violating the target
  owner boundary.
- **Observed evidence:** `docs/architecture/persistence/entity-ownership.json:26`
  assigns Compliance, but `src/modules/admin/admin.route.ts:8` and
  `src/modules/admin/admin.service.ts:77` own the runtime repository.
- **Options:** Compliance owner; Admin owner; defer ownership movement.
- **Trade-offs:** Compliance ownership matches evidence retention. Admin ownership
  preserves current wiring but couples oversight UI to business persistence.
- **Recommendation:** Compliance owns writes and mapping; Admin uses typed ports.
- **Required approver groups:** Architecture Owner, Compliance Owner.
- **Selected option:** A - Compliance owner.
- **Outcome:** `APPROVED`
- **Approval note:** Compliance owns the Incident domain and writable persistence.
  Admin accesses it only through typed application ports.
- **Approver:** Mai Nguyễn Tiến Đạt.
- **Approver capacity:** Project Owner, Product Owner, Architecture Owner, Database
  Owner and Security/Compliance Owner for this academic project.
- **Approval date:** 2026-08-02.
- **Implementation impact:** Moves entity/repository registration and adds ports.
- **Migration impact:** Compatibility move should initially preserve the table.
- **API impact:** Existing Admin response remains behind an adapter.
- **Test impact:** Architecture and compatibility tests must reject direct imports.

### P7B-03: Dispute MVP Inclusion

- **Question:** Is an order/payment Dispute workflow part of the Phase 7B MVP?
- **Why it blocks:** Creating a table or domain from the unused legacy declaration
  would invent product behavior.
- **Observed evidence:** `src/database/entities/dispute.entity.ts:4` exists, but the
  runtime registry, canonical baseline, controllers and tests do not use it.
- **Options:** Include MVP; defer; retire declaration.
- **Trade-offs:** Inclusion enables formal resolution but adds critical commerce
  integration. Deferral avoids invented schema but leaves no dispute workflow.
- **Recommendation:** Include only after eligibility, actors and resolution outcomes
  are approved; otherwise explicitly defer and retire the writable declaration.
- **Required approver groups:** Product Owner, Compliance Owner, Payment Owner.
- **Selected option:** B - defer.
- **Outcome:** `DEFERRED`
- **Approval note:** Dispute is excluded from the current Phase 7B implementation
  because eligibility, participants, outcomes and payment coordination are not
  approved. No payment behavior is approved; future activation still requires
  Payment Owner review.
- **Approver:** Mai Nguyễn Tiến Đạt.
- **Approver capacity:** Project Owner, Product Owner, Architecture Owner, Database
  Owner and Security/Compliance Owner for this academic project; scope deferral
  only, not Payment Owner approval.
- **Approval date:** 2026-08-02.
- **Implementation impact:** Controls whether Dispute domain/use cases are built.
- **Migration impact:** Controls whether any additive Dispute table is permitted.
- **API impact:** Controls whether new Dispute endpoints are introduced.
- **Test impact:** Controls dispute unit/integration/E2E scope.

### P7B-04: Dispute Canonical Schema

- **Question:** If included, what identity, order linkage, participant, outcome,
  operation-key, version and timestamp fields are canonical?
- **Why it blocks:** The baseline has no Dispute table and the legacy fields have no
  deployed or active-contract authority.
- **Observed evidence:** Legacy entity has nullable `order_id`, user IDs and text
  URLs at `src/database/entities/dispute.entity.ts:9`; status and free-text
  resolution continue at `src/database/entities/dispute.entity.ts:24`.
- **Options:** Adopt legacy shape; design order-centric aggregate; no table/defer.
- **Trade-offs:** Legacy reuse is quick but lacks idempotency/concurrency and allows
  URL evidence. A new aggregate is safer but requires additive migration.
- **Recommendation:** Order-centric UUID aggregate with scalar participants,
  structured outcome, private evidence links, version and durable operation key.
- **Required approver groups:** Architecture Owner, Database Owner, Compliance Owner.
- **Selected option:** C - no table/defer.
- **Outcome:** `NOT_APPLICABLE_DUE_TO_P7B_03`
- **Approval note:** No `disputes` table or canonical Dispute mapping is created in
  the current Phase 7B scope.
- **Approver:** Mai Nguyễn Tiến Đạt.
- **Approver capacity:** Project Owner, Product Owner, Architecture Owner, Database
  Owner and Security/Compliance Owner for this academic project.
- **Approval date:** 2026-08-02.
- **Implementation impact:** Defines domain, mapper and repository contracts.
- **Migration impact:** Defines exact additive table/constraints/indexes.
- **API impact:** Defines request/response fields and idempotency header.
- **Test impact:** Requires constraints, replay, orphan and rollback coverage.

### P7B-05: Incident State Machine

- **Question:** What Incident states, actions, actors and reopen policy are valid?
- **Why it blocks:** Current endpoint writes any status string and cannot enforce
  domain invariants.
- **Observed evidence:** Swagger suggests `open`, `in_progress`, `resolved` at
  `src/modules/admin/admin.controller.ts:102`; the entity uses unconstrained
  varchar at `src/database/entities/incident-report.entity.ts:24`; the service
  accepts arbitrary status at `src/modules/admin/admin.service.ts:334`.
- **Options:** Preserve three states; approve open/in-review/resolved/closed; event-only lifecycle.
- **Trade-offs:** Minimal states aid compatibility but omit close/reopen semantics.
  Richer states require mapping and migration decisions.
- **Recommendation:** Action-based constrained lifecycle with explicit privileged
  reopen only if product owners require it.
- **Required approver groups:** Product Owner, Compliance Owner.
- **Selected option:** B - `open`, `in_review`, `resolved`, `closed`.
- **Outcome:** `APPROVED`
- **Approval note:** Clients invoke validated actions and cannot assign status
  directly. Reopen remains out of scope without a separate decision.
- **Approver:** Mai Nguyễn Tiến Đạt.
- **Approver capacity:** Project Owner, Product Owner, Architecture Owner, Database
  Owner and Security/Compliance Owner for this academic project.
- **Approval date:** 2026-08-02.
- **Implementation impact:** Defines aggregate transition policy.
- **Migration impact:** Defines status normalization/check constraints.
- **API impact:** Replaces direct status assignment with transition actions.
- **Test impact:** Requires every valid/invalid transition and concurrent update.

### P7B-06: Dispute State Machine

- **Question:** What opening, review, resolution and closure states/outcomes are valid?
- **Why it blocks:** Legacy enum names do not prove transitions, eligibility or side effects.
- **Observed evidence:** `src/common/enums/index.ts:167` declares five unused states;
  Payments supports only separately authorized admin refund commands.
- **Options:** Legacy five states; simplified open/resolved/closed; structured outcome events.
- **Trade-offs:** Legacy names imply buyer/seller outcomes but omit partial/mixed
  outcomes and payment completion semantics.
- **Recommendation:** Approve action/state/outcome separately and make payment side
  effects explicit through a Payments port.
- **Required approver groups:** Product Owner, Compliance Owner, Payment Owner.
- **Selected option:** C - structured outcome events, deferred with P7B-03.
- **Outcome:** `DEFERRED_WITH_P7B_03`
- **Approval note:** Structured outcomes remain a future recommendation. Resolution,
  refund coordination and every payment side effect are excluded from Phase 7B.
  Future activation requires Payment Owner review.
- **Approver:** Mai Nguyễn Tiến Đạt.
- **Approver capacity:** Project Owner, Product Owner, Architecture Owner, Database
  Owner and Security/Compliance Owner for this academic project; scope deferral
  only, not Payment Owner approval.
- **Approval date:** 2026-08-02.
- **Implementation impact:** Defines resolution use case and ports.
- **Migration impact:** Defines state/outcome columns and constraints.
- **API impact:** Defines resolution DTO and conflict responses.
- **Test impact:** Requires terminal race, replay and payment-failure scenarios.

### P7B-07: Actor Authorization

- **Question:** Which existing roles and object relationships may create, view,
  transition, verify, revoke or correct Phase 7B resources?
- **Why it blocks:** Role decorators alone cannot prove order participation, product
  ownership or evidence access.
- **Observed evidence:** Existing roles are in `src/common/enums/index.ts:6`;
  Traceability create currently allows Farmer, Cooperative and Admin at
  `src/modules/traceability/traceability.controller.ts:34` without implemented
  ownership checks.
- **Options:** Role-only; role plus object-level capability ports; Admin-only MVP.
- **Trade-offs:** Role-only is simple but insecure. Object-level checks require
  cross-module read ports but preserve boundaries.
- **Recommendation:** Existing role plus object-level authorization through typed ports.
- **Required approver groups:** Security Owner, Compliance Owner, Product Owner.
- **Selected option:** B - existing role plus object-level capability.
- **Outcome:** `APPROVED`
- **Approval note:** Use existing roles and typed capability ports. No new role is
  introduced.
- **Approver:** Mai Nguyễn Tiến Đạt.
- **Approver capacity:** Project Owner, Product Owner, Architecture Owner, Database
  Owner and Security/Compliance Owner for this academic project.
- **Approval date:** 2026-08-02.
- **Implementation impact:** Defines guards/policies and read ports.
- **Migration impact:** May require participant snapshots, not role columns.
- **API impact:** Defines 401/403/non-disclosing 404 behavior.
- **Test impact:** Requires role/object matrix and privacy-negative tests.

### P7B-08: Evidence Immutability

- **Question:** Which submissions, decisions, audit facts and trace events become immutable?
- **Why it blocks:** Persistence and update APIs cannot be designed without a fact-mutation policy.
- **Observed evidence:** Existing Incident and Dispute entities store mutable arrays/text;
  roadmap requires immutable evidence and no retention-breaking cascades.
- **Options:** Fully mutable rows; immutable facts with append-only metadata;
  immutable after state threshold.
- **Trade-offs:** Mutable rows simplify corrections but erase history. Append-only
  evidence costs storage and query complexity.
- **Recommendation:** Submission and decision facts become immutable at commit;
  corrections append evidence/events.
- **Required approver groups:** Compliance Owner, Security Owner, Database Owner.
- **Selected option:** B - immutable facts with append-only metadata.
- **Outcome:** `APPROVED`
- **Approval note:** Submitted compliance evidence cannot be updated or hard-deleted
  in place.
- **Approver:** Mai Nguyễn Tiến Đạt.
- **Approver capacity:** Project Owner, Product Owner, Architecture Owner, Database
  Owner and Security/Compliance Owner for this academic project.
- **Approval date:** 2026-08-02.
- **Implementation impact:** Prohibits update/delete use cases for evidence facts.
- **Migration impact:** May require event/evidence tables and no-cascade constraints.
- **API impact:** No raw evidence update/delete endpoints.
- **Test impact:** Requires database/application immutability tests.

### P7B-09: Evidence Replacement And Correction

- **Question:** How are erroneous evidence metadata and trace facts corrected?
- **Why it blocks:** Immutability without a correction path prevents legitimate remediation.
- **Observed evidence:** No current correction/version relationship exists; Storage
  owns private file lifecycle and IDs.
- **Options:** Replace in place; append superseding record; administrative override.
- **Trade-offs:** In-place replacement loses history. Superseding records preserve
  provenance but need ordering and public projection rules.
- **Recommendation:** Append a correction referencing the superseded fact, reason and actor.
- **Required approver groups:** Compliance Owner, Security Owner.
- **Selected option:** B - append a superseding record.
- **Outcome:** `APPROVED`
- **Approval note:** Corrections record predecessor, actor, reason and time while
  preserving the original evidence.
- **Approver:** Mai Nguyễn Tiến Đạt.
- **Approver capacity:** Project Owner, Product Owner, Architecture Owner, Database
  Owner and Security/Compliance Owner for this academic project.
- **Approval date:** 2026-08-02.
- **Implementation impact:** Adds correction commands/projections.
- **Migration impact:** Requires predecessor/supersedes relationship if approved.
- **API impact:** Adds action endpoint rather than PATCHing immutable facts.
- **Test impact:** Requires original-preservation and projection tests.

### P7B-10: Quality Certificate Ownership

- **Question:** Which module owns product certificates and any distinct organization credential?
- **Why it blocks:** Products has an active canonical certificate workflow while
  ownership catalog assigns legacy `quality_certificates` to Compliance.
- **Observed evidence:**
  `src/modules/products/infrastructure/persistence/entities/product-certification.entity.ts:13`
  is active and canonical; `src/database/entities/quality-certificate.entity.ts:9`
  is not runtime registered.
- **Options:** Products owns all; Compliance owns all; split by credential subject.
- **Trade-offs:** One owner simplifies access but may mix product metadata and legal
  credentials. Split ownership needs explicit read ports.
- **Recommendation:** Products retains product certificates; Compliance owns only a
  separately approved non-product credential aggregate.
- **Required approver groups:** Product Owner, Architecture Owner, Compliance Owner.
- **Selected option:** C - split by credential subject.
- **Outcome:** `APPROVED`
- **Approval note:** Products retains `product_certifications`. Compliance may own a
  distinct certificate capability only after a non-product subject is approved by
  evidence.
- **Approver:** Mai Nguyễn Tiến Đạt.
- **Approver capacity:** Project Owner, Product Owner, Architecture Owner, Database
  Owner and Security/Compliance Owner for this academic project.
- **Approval date:** 2026-08-02.
- **Implementation impact:** Determines module and port placement.
- **Migration impact:** Determines consolidation versus separate renamed table.
- **API impact:** Determines whether existing Products endpoints remain canonical.
- **Test impact:** Requires ownership architecture and cross-module contract tests.

### P7B-11: Legacy Quality Certificates Scope

- **Question:** Is `quality_certificates` a duplicate, an organization credential or deployed legacy data?
- **Why it blocked:** The table was absent from baseline but a historical Storage
  migration and CLI command family conditionally supported it.
- **Evidence basis:** The merged local-protected and production inventory artifacts
  both classify `quality_certificates` as `TABLE_NOT_PRESENT`. The production
  artifact classifies `product_certifications` as present. The source scan found
  one legacy declaration at `src/database/entities/quality-certificate.entity.ts`;
  it is not in `src/database/entity-registry.ts`, no module registers it with
  `TypeOrmModule.forFeature`, and no repository, service, controller or normal
  request path imports it. The only executable consumer is the optional
  `quality_certificate` descriptor in the Storage Phase 9 rollout CLI at
  `src/scripts/storage-phase9-rollout.ts`; its `plan`, `apply`, `finalize` and
  `verify` modes skip the descriptor when the table is absent. The conditional
  private-document migration is migration-only compatibility code. Tests and
  documentation references are non-runtime evidence only.
- **Canonical replacement and owner:** `product_certifications` is runtime
  registered and has Products application ports, use cases, TypeORM repository
  adapter and presentation endpoints. P7B-10 and `schema-plan.md` confirm that
  Products owns product certifications.
- **Options:** Retire declaration; reconcile into Products; preserve as distinct renamed aggregate.
- **Trade-offs:** Retirement is safest without rows. Deployed rows require lossless
  inventory and backfill before retirement.
- **Recommendation:** Retire the legacy source consumer disposition; do not create,
  deploy or migrate the absent table.
- **Required approver groups:** Product Owner, Database Owner, Compliance Owner.
- **Proposed decision:**
  `P7B_11_DECISION=RETIRE_LEGACY_QUALITY_CERTIFICATES_SOURCE_CONSUMER`.
- **Decision status:** `P7B_11_DECISION_STATUS=READY_FOR_HUMAN_APPROVAL`.
- **Deployment state:**
  `DATABASE_DEPLOYMENT_STATE=ABSENT_IN_LOCAL_PROTECTED_AND_PRODUCTION`.
- **Implementation consequences:**
  `CANONICAL_REPLACEMENT=product_certifications`;
  `LEGACY_SOURCE_ACTION=REMOVE_OR_REWRITE_STORAGE_PHASE_9_CONSUMER_DURING_IMPLEMENTATION`;
  `DATABASE_MIGRATION_REQUIRED=NO_FOR_QUALITY_CERTIFICATES_RETIREMENT`. This
  documentation decision neither removes the CLI consumer nor authorizes any
  implementation, migration, bootstrap, DDL or DML.

### P7B-12: Certificate Verification And Revocation

- **Question:** What verification, rejection, expiration, revocation and replacement lifecycle is approved?
- **Why it blocks:** Active Products workflow has pending/verified/rejected only;
  legacy active/revoked strings are not authoritative.
- **Observed evidence:** `CertificationStatus` at `src/common/enums/index.ts:128` and
  Products verification policy support current three-state flow.
- **Options:** Preserve current flow; add revocation; derive or persist expiration;
  version replacements.
- **Trade-offs:** Adding state affects API/schema. Derived expiration avoids writes
  but still needs consistent query/badge behavior.
- **Recommendation:** Preserve current flow, add immutable revocation event and
  linked replacement only after approval; derive validity from expiry date.
- **Required approver groups:** Product Owner, Compliance Owner, Security Owner.
- **Selected option:** B - immutable revocation, linked replacement and derived expiry.
- **Outcome:** `APPROVED`
- **Approval note:** Private document URLs and internal notes never enter the public
  projection.
- **Approver:** Mai Nguyễn Tiến Đạt.
- **Approver capacity:** Project Owner, Product Owner, Architecture Owner, Database
  Owner and Security/Compliance Owner for this academic project.
- **Approval date:** 2026-08-02.
- **Implementation impact:** Defines certificate policy/use cases.
- **Migration impact:** May require revocation/version metadata.
- **API impact:** Defines revoke/public-validity responses.
- **Test impact:** Requires concurrent decision, expiry, revoke and replacement tests.

### P7B-13: Certifier Role Governance

- **Question:** Is a new Certifier role needed, or do existing State Agency/Admin roles verify?
- **Why it blocks:** Authorization cannot reference a role absent from identity governance.
- **Observed evidence:** `UserRole` contains State Agency and Admin but no Certifier.
- **Options:** Existing roles; new role; external issuer recorded as data only.
- **Trade-offs:** New role expands onboarding/token/guard contracts. Existing roles
  may not match operational authority.
- **Recommendation:** Add no role in Phase 7B unless Auth/Security governance approves it.
- **Required approver groups:** Security Owner, Product Owner, Compliance Owner.
- **Selected option:** A - existing State Agency and Admin roles.
- **Outcome:** `APPROVED`
- **Approval note:** Phase 7B does not add Certifier to `UserRole`.
- **Approver:** Mai Nguyễn Tiến Đạt.
- **Approver capacity:** Project Owner, Product Owner, Architecture Owner, Database
  Owner and Security/Compliance Owner for this academic project.
- **Approval date:** 2026-08-02.
- **Implementation impact:** Determines decorators/authorization policies.
- **Migration impact:** May require no schema if issuer remains scalar metadata.
- **API impact:** Determines verifier-facing endpoints and claims.
- **Test impact:** Requires token/role matrix if a role is added.

### P7B-14: Traceability Canonical Mapping

- **Question:** Which fields define the canonical Traceability aggregate and public projection?
- **Why it blocks:** Two writable entity declarations map the same table with incompatible fields.
- **Observed evidence:** Module mapping at
  `src/modules/traceability/entities/traceability-record.entity.ts:3` has
  producer/location/mutable timestamps; central mapping at
  `src/database/entities/traceability-record.entity.ts:3` has batch/agronomy/test fields.
- **Options:** Choose either mapping; merge into one mutable row; batch plus typed events.
- **Trade-offs:** Choosing one loses the other field set. A merged row grows ambiguous.
  Event model preserves history but needs reconciliation.
- **Recommendation:** Stable batch aggregate, unique QR aliases and append-only typed events.
- **Required approver groups:** Product Owner, Architecture Owner, Database Owner.
- **Selected option:** C - immutable batch identity plus typed events.
- **Outcome:** `APPROVED`
- **Approval note:** Neither conflicting legacy mapping is adopted directly.
- **Approver:** Mai Nguyễn Tiến Đạt.
- **Approver capacity:** Project Owner, Product Owner, Architecture Owner, Database
  Owner and Security/Compliance Owner for this academic project.
- **Approval date:** 2026-08-02.
- **Implementation impact:** Defines Traceability domain/mapping/query projection.
- **Migration impact:** Defines destination tables/columns.
- **API impact:** Defines public and owner response fields.
- **Test impact:** Requires mapping parity and public privacy tests.

### P7B-15: Traceability Reconciliation Strategy

- **Question:** How are duplicate mappings and any deployed rows migrated without loss?
- **Why it blocked:** The two writable source mappings are incompatible and the
  local-protected schema is not automatically canonical.
- **Source inventory:** Mapping A is
  `src/modules/traceability/entities/traceability-record.entity.ts`, registered
  by `src/database/entity-registry.ts` and `TraceabilityModule`. It is a
  Traceability-owned, mutable product/producer/location row with scalar
  `product_id` and `producer_id`, unique QR, agronomy fields, JSON certifications
  and `created_at`/`updated_at`. The mounted service repository is its only
  repository consumer; controller request paths exist, but all service methods
  explicitly throw `TODO`, so there is no successful normal persistence path.
  It has no batch, order/shipment or typed-event representation.

  Mapping B is `src/database/entities/traceability-record.entity.ts`. It is an
  unregistered legacy declaration with no module, repository, service, controller
  or CLI consumer. It uses product/order-item scalar IDs, batch code, QR, agronomy
  and quality-test fields with `issued_at`/`created_at`; it has no producer,
  shipment, typed-event, projection or lifecycle-status representation. Its
  product/order-item/batch shape conflicts with Mapping A's producer/location and
  mutable-row shape. Neither mapping has a status model; Mapping A's `updated_at`
  is mutation metadata, not an event history or projection.
- **Deployed evidence:** The merged production inventory says
  `PRODUCTION_LEGACY_TABLE_STATE=TABLE_NOT_PRESENT`. The approved local-protected
  artifact says `LOCAL_PROTECTED_LEGACY_STATE=PRESENT_MAPPING_A_LIKE` and records
  an exact zero row count at capture. No local database was queried for this
  decision. `ENVIRONMENT_DIVERGENCE_CONFIRMED=true`.
- **Approved target evidence:** P7B-14 selected immutable batch identity plus
  typed events, and P7B-16/`decision-pack.md` require deterministic public and
  private projections. Therefore
  `CANONICAL_TRACEABILITY_MODEL=BATCH_PLUS_TYPED_EVENTS_PLUS_DETERMINISTIC_PROJECTION`.
- **Options:** Retire when empty; copy into canonical model; compatibility read adapter.
- **Trade-offs:** Empty retirement is simple only with approved inventories.
  Copy requires deterministic mapping for conflicting/null fields.
- **Recommendation:** Adopt the approved canonical model with staged
  inventory/additive/copy/verify/compatibility/finalize reconciliation.
- **Required approver groups:** Database Owner, Architecture Owner.
- **Proposed decision:**
  `P7B_15_DECISION=ADOPT_BATCH_TYPED_EVENTS_DETERMINISTIC_PROJECTION_CANONICAL_MODEL`.
- **Decision status:** `P7B_15_DECISION_STATUS=READY_FOR_HUMAN_APPROVAL`.
- **Reconciliation strategy:** `RECONCILIATION_STRATEGY=STAGED`. Production has
  no `traceability_records` rows to migrate from that absent table; this does not
  waive a future canonical schema/application migration. Local-protected remains
  `READ_ONLY_NO_MUTATION`: do not drop, alter, truncate or migrate its preserved
  table. Implementation must choose one canonical writable mapping, prevent
  incompatible mappings from remaining writable in parallel, use scalar IDs and
  typed ports across contexts, and retain staged reconciliation. It must not use
  cross-owner repositories/entities or pass raw TypeORM primitives across a
  bounded-context boundary.

#### Reconciliation Package Controls

`P7B-18_POLICY_MODEL_APPROVED`; `RETENTION_DURATION_NOT_CONFIGURED`;
`RETENTION_CLEANUP_DISABLED`; `LEGAL_HOLD_REQUIRED`; and
`CASCADE_HARD_DELETE_PROHIBITED` remain unchanged. No retention duration is
selected by this reconciliation package.

All implementation remains bound by one canonical writable mapping per table;
domain/application layers must not import TypeORM; and bounded contexts must use
scalar IDs and typed ports rather than cross-owner repositories/entities or raw
TypeORM primitives. Existing ownership remains: Products owns product
certifications, Compliance owns Incident, and Incident is separate from deferred
Dispute.

The absent production table does not prove traceability unnecessary, and the
local-protected zero-row capture is evidence only for its capture time. A future
canonical schema/application migration still needs separate approval. This package
records `PHASE_7B_RECONCILIATION_STATUS=DECISIONS_READY_FOR_HUMAN_APPROVAL` and
`PHASE_7B_IMPLEMENTATION_STATUS=BLOCKED_PENDING_DECISION_PR_MERGE`. It does not
authorize runtime changes, database access, SQL, DDL, DML, migration, seed or
application bootstrap.

#### Approved Implementation Handoff

`P7B_11_IMPLEMENTATION_STATUS=IMPLEMENTED_SOURCE_RETIREMENT`; legacy
`quality_certificates` source and the Storage Phase 9 descriptor are removed;
Products-owned `product_certifications` remains canonical.

`P7B_15_IMPLEMENTATION_STATUS=IMPLEMENTED_PENDING_DISPOSABLE_MIGRATION_VERIFICATION`.
Traceability now has one writable mapping per canonical table: `traceability_batches`
and `traceability_events`; the legacy `traceability_records` mappings are removed.
`TRACEABILITY_WRITABLE_MAPPING_COUNT=1` for each canonical table.

`MIGRATION_FILES_CREATED=1`; it is additive and must be verified only on a
disposable database. `PROTECTED_LOCAL_DB_ACCESSED=NO` and
`PRODUCTION_DB_ACCESSED=NO`. P7B-18 controls remain unchanged.

### P7B-16: Traceability Append-Only Contract

- **Question:** Are trace events immutable, and how are sequence and corrections represented?
- **Why it blocks:** Current module mapping uses `updated_at`, while roadmap expects retained evidence.
- **Observed evidence:** Runtime entity has `UpdateDateColumn` at line 44; central
  entity has issued/created facts but no event identity.
- **Options:** Mutable current-state row; append-only events; hybrid event plus projection.
- **Trade-offs:** Mutable rows are simple but destroy provenance. Events preserve
  provenance but require ordering, idempotency and projection logic.
- **Recommendation:** Immutable events plus derived/materialized public projection.
- **Required approver groups:** Product Owner, Compliance Owner, Architecture Owner.
- **Selected option:** C - immutable events plus deterministic projection.
- **Outcome:** `APPROVED`
- **Approval note:** Corrections append a superseding event and never update the
  original event.
- **Approver:** Mai Nguyễn Tiến Đạt.
- **Approver capacity:** Project Owner, Product Owner, Architecture Owner, Database
  Owner and Security/Compliance Owner for this academic project.
- **Approval date:** 2026-08-02.
- **Implementation impact:** Defines event command/query model.
- **Migration impact:** May require event table and projection rebuild.
- **API impact:** Corrections append actions, never PATCH historical facts.
- **Test impact:** Requires ordering, replay, correction and projection tests.

### P7B-17: Audit Evidence Persistence

- **Question:** Is `audit_logs` the compliance ledger or only technical request audit?
- **Why it blocks:** Mandatory evidence transaction/failure behavior depends on the owner and store.
- **Observed evidence:** `audit_logs` is canonical Admin persistence, while
  `src/common/interceptors/audit-log.interceptor.ts:11` logs text and explicitly
  does not persist rows.
- **Options:** Extend `audit_logs`; separate compliance ledger; domain-local history tables.
- **Trade-offs:** One table is simple but mixes retention/PII/use cases. Separate
  ledger adds infrastructure but preserves policy boundaries.
- **Recommendation:** Keep technical audit Admin-owned; use a dedicated compliance
  evidence contract if retention/immutability differs.
- **Required approver groups:** Architecture Owner, Compliance Owner, Security Owner.
- **Selected option:** B - separate compliance evidence ledger when the stated
  implementation evidence condition is met.
- **Outcome:** `APPROVED`
- **Approval note:** Use a separate ledger when implementation evidence confirms
  technical `audit_logs` cannot satisfy retention, immutability and transaction
  policy. Mandatory compliance-evidence failure rolls back the domain mutation.
- **Approver:** Mai Nguyễn Tiến Đạt.
- **Approver capacity:** Project Owner, Product Owner, Architecture Owner, Database
  Owner and Security/Compliance Owner for this academic project.
- **Approval date:** 2026-08-02.
- **Implementation impact:** Defines audit port and transaction participation.
- **Migration impact:** Determines extension versus additive evidence store.
- **API impact:** Determines oversight query and redaction surface.
- **Test impact:** Requires failure rollback, immutability and privacy tests.

### P7B-18: Retention And Hard-Delete Policy

- **Question:** What retention, legal hold, anonymization and purge rules apply per record class?
- **Why it blocks:** Delete behavior, FK cascades and rollback cannot be approved without retention rules.
- **Observed evidence:** Ownership catalog says retain evidence/no cascade, but no
  duration or legal-hold contract exists; entities have no soft-delete fields.
- **Options:** Indefinite retain; fixed durations; configurable per-class policy.
- **Trade-offs:** Indefinite retention increases privacy/storage exposure. Fixed
  deletion can violate legal holds without explicit controls.
- **Recommendation:** Per-class policy with legal hold; prohibit cascade hard delete.
- **Required approver groups:** Compliance Owner, Security Owner, Database Owner.
- **Selected option:** C - per-class policy with legal hold.
- **Outcome:** `APPROVED_CONDITIONALLY`
- **Approval note:** Cascade hard-delete is prohibited. Exact durations must be
  configured and approved before any cleanup process is enabled.
- **Approver:** Mai Nguyễn Tiến Đạt.
- **Approver capacity:** Project Owner, Product Owner, Architecture Owner, Database
  Owner and Security/Compliance Owner for this academic project.
- **Approval date:** 2026-08-02.
- **Implementation impact:** Defines lifecycle jobs and delete prohibitions.
- **Migration impact:** May require retention/legal-hold metadata and FK changes.
- **API impact:** Determines whether archive/purge actions exist.
- **Test impact:** Requires retention, hold and cascade-negative tests.

### P7B-19: Deployed Inventory And Migration Basis

- **Question:** Which approved read-only deployed inventories authorize migration design?
- **Why it blocks:** Source declarations and local snapshots cannot prove production schema or data.
- **Observed evidence:** Canonical baseline includes Incident/Audit only; local
  reconciliation is explicitly environment-specific; protected DB was not accessed.
- **Options:** Source-only assumption; one environment inventory; inventory every
  deployed environment targeted by rollout.
- **Trade-offs:** Broader inventory costs coordination but prevents row/schema loss.
- **Recommendation:** After approval, capture read-only table/column/constraint/index,
  row-count, duplicate and orphan evidence for each rollout environment.
- **Required approver groups:** Database Owner, Architecture Owner.
- **Selected option:** C - every rollout environment.
- **Outcome:** `APPROVED_FOR_READ_ONLY_INVENTORY`
- **Approval note:** Read-only inventory is authorized. DDL, DML, migration, seed,
  synchronize, onboarding apply and every production mutation remain prohibited.
- **Approver:** Mai Nguyễn Tiến Đạt.
- **Approver capacity:** Project Owner, Product Owner, Architecture Owner, Database
  Owner and Security/Compliance Owner for this academic project.
- **Approval date:** 2026-08-02.
- **Implementation impact:** Keeps migration and write enablement blocked until evidence exists.
- **Migration impact:** Provides the only approved basis for backfill/retirement SQL.
- **API impact:** Determines compatibility duration where deployed shapes differ.
- **Test impact:** Supplies realistic migration fixtures and reconciliation assertions.

## Post-Specification Inventory Resolution

The original outcomes above remain unchanged. The read-only inventory attempt and
source audit are recorded in the
[inventory evidence package](evidence/deployed-inventory/README.md).

| Decision | Inventory resolution                    | Evidence reference                                                                                                      | Remaining condition                              | Implementation effect                                            |
| -------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------- |
| P7B-11   | `P7B-11_RECONCILIATION_REQUIRED`        | [conditional resolution](evidence/deployed-inventory/conditional-gate-resolution.md#p7b-11-legacy-quality-certificates) | `P7B-11_BLOCKED_INCOMPLETE_PRODUCTION_INVENTORY` | Do not retire the legacy declaration or Storage rollout consumer |
| P7B-15   | `P7B-15_STAGED_RECONCILIATION_REQUIRED` | [conditional resolution](evidence/deployed-inventory/conditional-gate-resolution.md#p7b-15-traceability-reconciliation) | `P7B-15_BLOCKED_INCOMPLETE_PRODUCTION_INVENTORY` | Preserve staged path; no migration or dual-write                 |
| P7B-18   | `P7B-18_POLICY_MODEL_APPROVED`          | [retention gate](evidence/deployed-inventory/conditional-gate-resolution.md#p7b-18-retention-gate)                      | `RETENTION_DURATION_NOT_CONFIGURED`              | Cleanup, purge and destructive deletion stay disabled            |
| P7B-19   | `LOCAL_READ_ONLY_INVENTORY_EXECUTED`    | [authorization matrix](evidence/deployed-inventory/README.md#authorization-matrix)                                      | production read-only access is incomplete        | P7B-19 remains inventory-only authorization                      |

Overall inventory verdict: `PHASE_7B_INVENTORY_BLOCKED`.

## Environment Decisions

On 2026-08-04, Mai Nguyễn Tiến Đạt approved the following in the capacities of
Project Owner, Architecture Owner, Database Owner for this academic project and
Environment Operator for `local-protected`:

- `local-protected`: exists, required for P7B-11/P7B-15, and authorized for an
  operator-run read-only transaction. The sanitized inventory is complete with
  schema-precondition blockers.
- `staging`: does not exist and is `NOT_APPLICABLE_APPROVED`.
- `production`: exists, is required for the future rollout and remains
  `REQUIRED_READ_ONLY_CREDENTIAL_MISSING`. The application credential is not
  approved for inventory.

These environment decisions supplement P7B-19 without changing its original
outcome or granting migration approval.

## P1 Decisions

| ID     | Topic                                  | Recommendation                                                                    | Effect                                               |
| ------ | -------------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------- |
| P7B-20 | Dispute eligibility and opening window | Approve exact order/payment states and a configured deadline source               | Defines eligibility policy and expired-window tests  |
| P7B-21 | Dispute refund coordination            | Keep ledger mutation Payments-owned behind an idempotent command port             | Defines resolution side effects and failure recovery |
| P7B-22 | Operation-key and concurrency strategy | Reuse durable Phase 6 operation keys and compare-and-set by default               | Defines replay retention and conflict behavior       |
| P7B-23 | API compatibility and error envelope   | Deprecate misnamed route; add backward-compatible optional error code             | Defines frontend migration and OpenAPI tests         |
| P7B-24 | Public certificate/trace privacy       | Publish allow-listed metadata only; private files remain signed and authorized    | Defines public projection and security tests         |
| P7B-25 | Pagination and non-core producer roles | Use deterministic cursors and approve Supplier/Enterprise capabilities explicitly | Defines query indexes, DTOs and role matrix          |

## Approval Record Rule

Only named human owner groups may change an outcome. Every record must include the
selected option, outcome, approver capacity, approval date and synchronized updates
to the decision pack, schema plan, API contract and acceptance criteria. Conditional
outcomes cannot be promoted by automated review or absence of comments.
