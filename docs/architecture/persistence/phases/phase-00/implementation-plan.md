# Phase 0 Implementation Plan

## Artifacts

- ADR 0002: ownership and persistence boundaries.
- ADR 0003: transaction coordinator, saga, and outbox.
- `../../entity-ownership.json`: canonical table registry and phase assignment.
- `../../exceptions.json`: exact legacy edges, registration gaps, expiry, and API
  whitelist.
- `../../current-state-audit.md`: source-backed findings and PostgreSQL limitations.
- `../../roadmap.md`: executable Phase 0-9 sequence.
- `src/scripts/persistence-architecture-audit.ts`: AST inventory/check command.
- `src/scripts/persistence-architecture-audit.spec.ts`: regression gate.

## Registry Contract

Each table entry includes schema, table, owner, canonical entity/file,
writable flag, exception type, status, replacement target, phase, expiry,
repository/FK/migration owner, delete behavior, risk, and all current mappings.

Allowed statuses are `canonical`, `legacy`, `pending-consolidation`,
`compatibility-reexport`, `exception`, and `retired`.

## Validation

```powershell
npm run persistence:audit
npx jest src/scripts/persistence-architecture-audit.spec.ts --runInBand
npm run lint
npm run build
npm test -- --runInBand
git diff --check
```

The initial Phase 0 run did not claim PostgreSQL metadata because port 5432 was
unavailable. The post-merge verification is now recorded in
`evidence/postgresql-schema-verification.md`: the local snapshot has 33 public tables,
no migration ledger, and the clean migration chain fails at migration one.
This evidence is an input to Phase 1 and does not alter Phase 0 ownership
decisions.

## Commit Breakdown

One Phase 0 commit is acceptable because all changes are documentation and
architecture gates:

```text
docs(persistence): establish phase 0 ownership contract
```

## PR Description

- State source commit and generated counts.
- List duplicate, runtime/CLI, migration bootstrap, and boundary findings.
- Link both ADRs and machine-readable registries.
- State that no entity, API, runtime behavior, or schema changed.
- Record every validation command.
- Block Phase 1 until the PR is merged.

## Definition Of Done

- All 66 current writable mappings are represented.
- All 48 physical keys have one proposed owner.
- All 18 duplicates are visible and phase-assigned.
- Existing forbidden edges are exact and expiring.
- New mappings/edges and expired exceptions fail the architecture gate.
- Roadmap reflects the missing migration bootstrap and profile schema evidence.
- Phase 0 PR was merged into `develop`; the schema verification follow-up does
  not move entities or implement Phase 1 runtime changes.
