# Phase 7B Implementation Plan

Status: `READY_FOR_REVIEW`; execution is blocked by P0 decisions.

## Preconditions

- Named owner groups approve every P0 decision and record the outcome, approver and date.
- A fresh branch `refactor/persistence-phase-7b-compliance` is created from a clean,
  current `origin/develop` only after the specification PR is merged.
- Fresh approved read-only deployed inventories exist where migration decisions
  depend on deployed schema/data.
- No implementation edits the merged canonical baseline migration.

## Steps

| Step                         | Objective                                                         | Expected paths                                                           | Dependency                                                    | Risk                                                   | Acceptance                                                         | Focused validation                                            | Rollback point                                                          |
| ---------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 1. Domain contract           | Define approved aggregates, values, errors and policies           | `src/modules/<owner>/domain/**`                                          | Approved P0 state, identity, evidence and retention contracts | Legacy fields may be mistaken for rules                | Every approved invariant/transition has domain coverage            | focused domain specs; `npx tsc --noEmit`                      | Remove isolated, unbound domain additions                               |
| 2. Application use cases     | Add commands/queries and scalar input/output models               | `src/modules/<owner>/application/{use-cases,models}/**`                  | Step 1 and approved actor/idempotency/privacy decisions       | ORM types or caller-controlled actors may leak inward  | Invalid commands fail before adapters; no ORM exposure             | focused use-case specs                                        | Remove provider bindings; no schema impact                              |
| 3. Repository interfaces     | Define owner-local outbound and cross-module capability ports     | `src/modules/<owner>/application/ports/**`                               | Steps 1-2 and approved ownership                              | Cross-module infrastructure coupling                   | Architecture audit reports zero forbidden imports                  | architecture spec; `npm run persistence:audit`                | Restore compatibility callers behind old adapter                        |
| 4. Persistence mapper        | Map approved domain facts explicitly                              | `src/modules/<owner>/infrastructure/persistence/mappers/**`              | Steps 1 and 3; approved canonical fields                      | Data loss or private provider identifiers in domain    | Every field round-trips and sensitive metadata stays out           | focused mapper specs                                          | Remove mapper while legacy read remains                                 |
| 5. Repository implementation | Implement deterministic TypeORM adapters                          | `src/modules/<owner>/infrastructure/persistence/repositories/**`         | Steps 3-4 and approved query/uniqueness contracts             | Duplicate mappings and unsafe DB-error exposure        | One writable mapping/table and safe errors                         | repository integration specs                                  | Disable new provider binding                                            |
| 6. Approved schema/migration | Add only approved v2 deltas                                       | new timestamped `src/database/migrations-v2/*`; never baseline migration | P0 schema approvals and fresh deployed inventories            | Critical reconciliation/data loss                      | Disposable up/down, catalog and row parity pass                    | `npm run migration:v2:verify-clean`; Phase 7B migration suite | Reviewed down before canonical writes; otherwise compatibility rollback |
| 7. Transaction/concurrency   | Implement atomicity, compare-and-set/locks and operation keys     | application/repository transaction adapters approved by local convention | Steps 2, 5-6 and approved concurrency matrix                  | Double terminal actions or partial evidence            | Concurrent tests prove one winner and safe replay                  | Phase 7B integration suite with parallel requests             | Revert use-case binding; preserve operation evidence                    |
| 8. Controller/DTO            | Add validated APIs and compatibility adapters                     | `src/modules/<owner>/presentation/**`                                    | Steps 2 and 7; approved endpoint/projection/pagination        | Breaking old clients or accepting arbitrary state/JSON | DTO boundaries and OpenAPI match approved contract                 | controller/E2E specs; OpenAPI snapshot                        | Restore route compatibility adapter                                     |
| 9. Authorization/errors      | Enforce object capability and stable client-safe errors           | guards/policies/error mappers under owner presentation/application       | Step 8; approved P7B-07, P7B-13 and error envelope            | PII leaks or weakened guards                           | 401/403/404 privacy and conflict behavior pass                     | security/E2E specs                                            | Restore prior mapper/route while new domain stays unbound               |
| 10. Unit tests               | Cover domains, policies, use cases, mappers and failures          | owner-local `*.spec.ts`                                                  | Steps 1-9                                                     | Missing invalid-state edges                            | Every approved state edge and invalid input is represented         | focused config; `npm test -- --runInBand`                     | Revert only isolated tests with their unbound code                      |
| 11. Integration tests        | Exercise PostgreSQL repositories, constraints, rollback and races | `test/persistence-phase-7b/**`, focused Jest config                      | Steps 5-7; disposable DB only                                 | Tests accidentally use protected DB or mocks           | Real persistence guarantees execute on disposable DB               | new `test:persistence-phase-7b` script                        | Drop disposable DB only                                                 |
| 12. E2E tests                | Verify auth, privacy, compatibility, idempotency and errors       | Phase 7B E2E specs under `test/**`                                       | Steps 8-11 and wired providers                                | OpenAPI/client regression                              | Existing path/shape changes are only approved ones                 | `npm run test:e2e`; OpenAPI parity                            | Disable new routes/providers                                            |
| 13. Documentation/handoff    | Record implementation, evidence, migration and owner changes      | Phase 7B implementation report/evidence plus ownership/index docs        | All prior steps and executed gates                            | Incorrectly claiming completion                        | Report includes commands, DB safety, limitations and honest status | `git diff --check`; link/evidence validation                  | Revert incorrect metadata, never source evidence                        |

## Expected Implementation Scope

Candidate files, conditional on approved decisions:

- `src/modules/compliance/domain/**`
- `src/modules/compliance/application/**`
- `src/modules/compliance/infrastructure/persistence/**`
- `src/modules/compliance/presentation/**`
- `src/modules/traceability/{domain,application,infrastructure,presentation}/**`
- Admin compatibility/query-port wiring only; no Admin ownership of Compliance repositories.
- Products/Payments typed ports only where approved; no direct entity imports.
- A new timestamped migration under `src/database/migrations-v2/` only after approval.
- Phase 7B focused Jest config and architecture/disposable-DB tests.

## Required Full Gates

Use only scripts present at implementation time. The minimum expected set is:

```powershell
npm ci
npx tsc --noEmit
npm run lint
npm run persistence:audit
npx jest src/scripts/persistence-architecture-audit.spec.ts --runInBand
npm run test:persistence-phase-1
npm run test:persistence-phase-2
npm run test:persistence-phase-3
npm run test:persistence-phase-4
npm run test:persistence-phase-5
npm run test:persistence-phase-6
npm run test:persistence-phase-7a
npm run test:persistence-phase-7b
npm test -- --runInBand
npm run test:e2e
npm run migration:v2:verify-clean
npm run build
git diff --check
```

Add a Phase 7B script only together with its focused test config. Do not claim a
gate passed when it was skipped or blocked by environment.

## Risk Controls

- Preserve old physical evidence and compatibility reads through verification.
- Do not dual-write without a separately approved reconciliation/failure contract.
- Never run development migration/seed/sync against protected databases.
- Treat public trace/certificate projections as privacy-sensitive API changes.
- Payment refund remains Payments-owned and idempotent; Compliance records outcome,
  not ledger mutation.
- Stop the dependent step when a decision or deployed fact is missing; independent
  documentation/test work may continue and must be reported as partial.
