# Documentation Reorganization Report

Source develop commit:
`f0089f34b0245cbcc3bc7d8a2a32dd5e2c884cc6`.

PR #82 was merged successfully at that commit before this documentation-only
work began. No production code, entity, migration, baseline data, database,
API, ownership decision, or phase completion decision was changed.

## A. Initial Inventory

| Category | File count |
| --- | ---: |
| All Markdown files | 33 |
| Markdown files under `docs` | 31 |
| Architecture Markdown files | 20 |
| Persistence Markdown files | 10 |
| ADR files | 5 |
| Phase-specific Markdown files | 7 |
| Markdown files outside `docs` | 2 |

The complete initial classification, ownership, status, references, overlap
candidates, and destinations are in
[`../documentation-inventory.json`](../documentation-inventory.json).

## B. Classification

| Type | Subject | Old path | New path |
| --- | --- | --- | --- |
| Feature contract | Auth | `docs/architecture/auth-phone-login-hardening.md` | `docs/architecture/auth/phone-login.md` |
| Architecture policy | Storage | `docs/architecture/storage-policy.md` | `docs/architecture/storage/policy.md` |
| Roadmap | Storage | `docs/architecture/storage-roadmap.md` | `docs/architecture/storage/roadmap.md` |
| Phase plan | Persistence 0 | `docs/architecture/persistence/phase-0-implementation-plan.md` | `docs/architecture/persistence/phases/phase-00/implementation-plan.md` |
| Evidence | Persistence 0 | `docs/architecture/persistence/postgresql-schema-verification.md` | `docs/architecture/persistence/phases/phase-00/evidence/postgresql-schema-verification.md` |
| Phase scope | Persistence 1 | `docs/architecture/persistence/discovery/phase-1-final-scope.md` | `docs/architecture/persistence/phases/phase-01/evidence/final-scope.md` |
| Implementation report | Persistence 1 | `docs/architecture/persistence/phase-1-implementation-report.md` | `docs/architecture/persistence/phases/phase-01/implementation-report.md` |
| Implementation report | Persistence 2 | `docs/architecture/persistence/phase-2-implementation-report.md` | `docs/architecture/persistence/phases/phase-02/implementation-report.md` |
| Implementation report | Persistence 3 | `docs/architecture/persistence/phase-3-implementation-report.md` | `docs/architecture/persistence/phases/phase-03/implementation-report.md` |
| Machine evidence | Persistence 3 | `docs/architecture/persistence/phase-3-evidence.json` | `docs/architecture/persistence/phases/phase-03/evidence/users-auth-evidence.json` |
| Architecture audit | P2 Products | `docs/p2-dat/p2-product-architecture-audit.md` | `docs/delivery/p2-products/architecture-audit.md` |
| Acceptance evidence | P2 Products | `docs/p2-dat/p2-product-final-acceptance.md` | `docs/delivery/p2-products/final-acceptance.md` |
| Operational readiness | P2 Products | `docs/p2-dat/p2-deploy-readiness.md` | `docs/operations/product-deploy-readiness.md` |
| Execution roadmap | P3 Cooperatives | `docs/architecture/p3-cooperative-execution-roadmap.md` | `docs/delivery/p3-cooperatives/execution-roadmap.md` |
| Delivery plan | P5 cross-module | `docs/p5-clean-architecture-plan.md` | `docs/delivery/p5-cross-module/clean-architecture-plan.md` |
| Delivery handoff | P5 cross-module | `docs/p5-remaining-work-handoff.md` | `docs/delivery/p5-cross-module/remaining-work-handoff.md` |
| Operational runbook | CI | `docs/ci-quality-gates.md` | `docs/operations/ci-quality-gates.md` |

ADRs remain under `docs/architecture/adr`. Canonical persistence roadmap,
current-state audit, ownership, exceptions, and compatibility manifest remain
at the persistence root. Canonical baselines and shared generated discovery
remain in their existing folders.

## C. Merged Files

No Markdown content files were merged. Files were grouped by purpose and
linked through README indexes because ADRs, policies, phase evidence,
implementation reports, acceptance records, and runbooks have different audit
and update lifecycles.

## D. Removed Files

No content file was removed. All 17 relocations used `git mv`.

`docs/clean-architecture-rules.md` remains as an intentional compatibility
pointer to the canonical
`docs/architecture/clean-architecture-rules.md`; it is not a duplicate content
source.

## E. Link Updates

- Updated Persistence current-state, roadmap, Phase 0, Phase 1, and Phase 3
  references to their new phase folders.
- Updated the generated ownership-decision evidence path and the matching
  path-only reference in `src/scripts/persistence-system-discovery.ts`.
- Updated Auth, Storage, P2, P3, P5, CI, and operational cross-references.
- Added navigation indexes for `docs`, Architecture, ADR, Auth, Storage,
  Persistence, Baselines, Discovery, Persistence Phases, Delivery, and
  Operations.
- Historical basenames in immutable evidence and references to frontend or
  proposed files remain unchanged when they describe the original audit
  context rather than a live canonical link.

## F. Final Structure

```text
docs/
|-- README.md
|-- documentation-inventory.json
|-- architecture/
|   |-- README.md
|   |-- documentation-reorganization-report.md
|   |-- clean-architecture-rules.md
|   |-- adr/
|   |   |-- README.md
|   |   `-- 0001 ... 0005
|   |-- auth/
|   |   |-- README.md
|   |   `-- phone-login.md
|   |-- storage/
|   |   |-- README.md
|   |   |-- policy.md
|   |   `-- roadmap.md
|   `-- persistence/
|       |-- README.md
|       |-- roadmap.md
|       |-- current-state-audit.md
|       |-- entity-ownership.json
|       |-- exceptions.json
|       |-- typeorm-compatibility-manifest.json
|       |-- baselines/
|       |   `-- README.md and canonical JSON baselines
|       |-- discovery/
|       |   `-- README.md and shared discovery artifacts
|       `-- phases/
|           |-- README.md
|           |-- phase-00/
|           |   |-- README.md
|           |   |-- implementation-plan.md
|           |   `-- evidence/postgresql-schema-verification.md
|           |-- phase-01/
|           |   |-- README.md
|           |   |-- implementation-report.md
|           |   `-- evidence/final-scope.md
|           |-- phase-02/
|           |   |-- README.md
|           |   `-- implementation-report.md
|           `-- phase-03/
|               |-- README.md
|               |-- implementation-report.md
|               `-- evidence/users-auth-evidence.json
|-- delivery/
|   |-- README.md
|   |-- p2-products/
|   |-- p3-cooperatives/
|   `-- p5-cross-module/
`-- operations/
    |-- README.md
    `-- CI, deployment, observability, Storage quality, and rollout runbooks
```

## G. Validation

| Gate | Result | Evidence |
| --- | --- | --- |
| Relative Markdown links | Pass | 51 Markdown files, 0 broken links |
| Missing canonical path references | Pass | 0 stale live-path consumers |
| Duplicate destination files | Pass | 17 unique `git mv` destinations |
| Orphan Persistence phase reports | Pass | Phase 0-3 indexed from `phases/README.md` |
| Persistence architecture audit | Pass | 58 mappings, 48 tables, 0 violations |
| Architecture regression test | Pass | 2 tests |
| Persistence Phase 1 | Pass | 27 tests |
| Persistence Phase 2 | Pass | 18 tests |
| Persistence Phase 3 | Pass | 17 tests |
| TypeScript | Pass | 0 errors |
| Build | Pass | Nest build completed |
| Git diff check | Pass | No whitespace errors |

No migration or E2E suite was required because runtime behavior and database
contracts did not change.
