# Persistence Phase 7A: Operations Boundaries

- Status: Complete
- Source PR: #90
- Merge commit: `4a16970`
- CI evidence: Backend Quality Gate `SUCCESS` on PR #90
- Branch: `refactor/persistence-phase-7a-operations`
- Dependency: Phase 6, PR #89, merge commit `924e2a6`
- Scope: Logistics, Messaging and Notifications

## Result

The evidence audit classifies Logistics and Messaging as `DORMANT_DEFER`.
Their five candidate tables are absent from canonical baseline v2, the runtime
and CLI registries, and protected PostgreSQL. Their central declarations do
not define an approved product or schema contract, so Phase 7A creates no
tables, modules, APIs or state machines for them.

Notifications remains `ACTIVE_BOUNDARY_ONLY`. Its existing module owns the
single canonical writable mapping and exports only the typed publisher port.
Phase 7A makes realtime delivery best effort after persistence, makes
concurrent mark-read deterministic, and adds a stable `created_at`, `id`
ordering tie-breaker. The unmounted legacy gateway becomes a decorator-free
compatibility export of the canonical gateway. No API, event name, payload or
migration changes.

## References

- [Implementation report](implementation-report.md)
- [Deterministic operations evidence](evidence/operations-evidence.json)
- [Persistence roadmap](../../roadmap.md)

Phase 7B must not begin until the Phase 7A pull request is merged.
