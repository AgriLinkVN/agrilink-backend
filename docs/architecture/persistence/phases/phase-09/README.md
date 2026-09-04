# Persistence Phase 9: Retirement and Parity

Phase 9 begins after the human-reviewed merge of PR #155 completed every
Phase 8 exit criterion. This phase retires compatibility persistence surfaces,
reconciles remaining physical and migration authority, and proves parity in a
strict dependency order. The [P9-00 kickoff inventory](kickoff-inventory.md)
is the current planning authority.

No cleanup is implemented by P9-00. Database-bearing and production-bearing
slices remain gated independently.

```text
PHASE_08_COMPLETE=YES_BY_MERGED_PR_155
P8_10_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_155
PHASE_08_EXIT_CRITERIA_STATUS=ALL_SATISFIED_BY_MERGED_PR_155
IDEMPOTENCY_VERIFIED=YES
SECOND_SEED_RUN_NO_DUPLICATES=YES
DISPOSABLE_DB_SEED_RUN_PASS=YES

P9_00_IMPLEMENTATION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P9_00_BLOCKERS=NONE_FOR_INVENTORY
PHASE_09_IMPLEMENTATION_STATUS=IN_PROGRESS
PHASE_09_COMPLETE=NO
```

## Current targets

```text
CENTRAL_ENTITY_COMPATIBILITY_RETIRED=NO
ONE_WRITABLE_MAPPING_PER_TABLE=NO
MULTI_WRITABLE_MAPPING_TABLE_COUNT=1
TYPEORM_COMPATIBILITY_MANIFEST_ENTRY_COUNT=3
ARCHITECTURE_EXCEPTION_COUNT=3
WISHLIST_PHYSICAL_NAME_RECONCILED=NO
MIGRATION_CHAIN_AUTHORITY_RECONCILED=NO
DISPOSABLE_SCHEMA_PARITY_PASS=NOT_RUN_FOR_PHASE_9
PRODUCTION_PARITY_VERIFIED=NO_NOT_AUTHORIZED
```

The implementation DAG deliberately ends with authorized production parity.
P9-00 does not grant that authorization and does not select any human-owned
mapping, migration-ledger, or deployed-data decision.

## P9-01 Implementation Overlay

PR #156 merged the kickoff inventory as
`8cbde69ade0149f0297e79fbdaf88af3891b42a6`. P9-01 executes only the merged
database-free “Safe compatibility and authority cleanup” slice. It removes 27
zero-consumer central re-exports, prevents their generator recreation, closes
the stale database-boolean exception, and preserves every later decision gate.

```text
P9_00_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_156
P9_01_IMPLEMENTATION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P9_01_BLOCKERS=NONE
P9_02_IMPLEMENTATION_AUTHORIZED=YES_REQUIRES_HUMAN_DECISION
P9_03_IMPLEMENTATION_AUTHORIZED=NO_WAITING_FOR_P9_01_AND_P9_02_MERGE
PHASE_09_IMPLEMENTATION_STATUS=IN_PROGRESS
PHASE_09_COMPLETE=NO
```
