# Persistence Phase 2 Implementation Report

## Geography Field Evidence

The Phase 2 source commit is
`6366f5c6fba42b1404fb4fd0efb9e157466b0897`. A repository-wide usage audit
and a read-only query against the local `agrilink_db` snapshot were performed
before consolidation.

| Field | Runtime read/write consumer | API/query/seed/test dependency | Deployed schema evidence | Decision |
| --- | --- | --- | --- | --- |
| `provinces.is_key_agri` | none | none; declaration existed only in the central duplicate and legacy generator | absent | `LEGACY_ONLY` |
| `provinces.created_at` | none | none | absent | `LEGACY_ONLY` |
| `provinces.updated_at` | none | none | absent | `LEGACY_ONLY` |

The read-only catalog contained 10 province rows and these canonical columns:
`id`, `name`, `name_en`, `code`, `region`, `lat`, `lng`, and `slug`.
`provinces` had four indexes/constraints for its primary key and unique
`name`, `code`, and `slug` values. No index or constraint referenced any of
the three legacy-only fields.

## Geography Consolidation

| Table | Previous mappings | Canonical mapping | Compatibility path | Migration |
| --- | --- | --- | --- | --- |
| `public.provinces` | central duplicate plus Geography module | `src/modules/geography/entities/province.entity.ts` | central file re-exports `Province` without decorators | none |
| `public.districts` | central duplicate plus Geography module | `src/modules/geography/entities/district.entity.ts` | central file re-exports `District` without decorators | none |

The runtime, CLI and test registry already referenced the canonical Geography
classes. The district-to-province foreign key remains `ON DELETE CASCADE`, as
recorded by the canonical baseline. Geography APIs continue to sort provinces
and districts by `name ASC`.

No baseline migration or TypeORM compatibility entry was changed. The
legacy-only fields were not restored because they are not canonical,
actively consumed, or present in the inspected deployed snapshot.

## Notifications Consolidation

The active Notifications repository, module registration, API use cases, and
WebSocket gateway all use `NotificationOrmEntity`. Read-only deployed evidence
confirmed `user_id` is varchar and non-null, while `body` is text and non-null.
The central duplicate incorrectly declared UUID `user_id` and nullable `body`.

| Table | Previous mappings | Canonical mapping | Compatibility path | Migration |
| --- | --- | --- | --- | --- |
| `public.notifications` | central duplicate plus Notifications module | `src/modules/notifications/infrastructure/persistence/notification.orm-entity.ts` | central file re-exports it as `Notification` without decorators | none |

The notification enum, list/read application models, response mapper, and
socket events were unchanged. The clean-v2 smoke test passed and notification
listing remained at one query.

## Ads Consolidation

The Ads module entities are the active repository and registry mappings.
Read-only deployed evidence confirmed package price `numeric(12,2)`, campaign
and event enums, package/campaign timestamps, and zero rows in all three Ads
tables. The package foreign key is `ON DELETE RESTRICT`; the campaign/event
foreign key is `ON DELETE CASCADE`.

| Table | Canonical mapping | Compatibility path | Migration |
| --- | --- | --- | --- |
| `public.ad_packages` | Ads module `AdPackage` | central decorator-free re-export | none |
| `public.ad_campaigns` | Ads module `AdCampaign` | central decorator-free re-export | none |
| `public.ad_events` | Ads module `AdEvent` | central decorator-free re-export | none |

The central package precision `(15,2)`, central varchar event type, and missing
timestamps/relations were non-canonical duplicate metadata. No Ads DTO,
response, state transition, or repository logic changed.

## System Config Consolidation

Admin is the active owner and its entity matches the deployed schema: UUID
primary key, unique config key, text value, nullable varchar updater, and
created/updated timestamps. The table contained zero rows during read-only
inspection. The central key-as-primary-key/jsonb-value mapping was not
canonical.

`src/database/entities/system-config.entity.ts` now re-exports the Admin class
without decorators. Admin list ordering, key-based upsert, config key/value
representation, and audit write behavior were unchanged. No migration was
required.

## Audit Logs Consolidation

The deployed table and all active Admin reads/writes use `method`, `path`, and
`changes`; `old_data` and `new_data` do not exist. The inspected table had zero
rows. The development seed was the only active source reference to the legacy
field names, but it passed them through `as any` to the Admin entity, so those
values were not persisted.

Both representations describe the same before/after audit diff. Seed data now
stores it as `changes: { before, after }`, the unsafe cast was removed, and the
central file became a decorator-free re-export. Admin is the canonical owner
because it owns all current repositories, writes, reads, and API exposure. The
obsolete `Admin:AuditLog` foreign-registration exception was removed.

No column rename, data migration, API change, or baseline migration was
required.

## Market Prices Evidence Review

**Decision: `DEFERRED`.**

The deployed table matches the module-local single-price/reporting model and
contains zero rows, but both service methods still throw `TODO`. The table is
an excluded Group C runtime extra and is not part of the canonical 26-table
baseline. The central min/max/average model remains a different business
concept.

Phase 2 did not modify either mapping, the runtime registry, API implementation,
or schema. Consolidation requires an implemented and tested capability flow
plus an explicit Group C onboarding decision.

## Validation

The clean-v2 OpenAPI artifact inherited from Phase 1 was stale at 84 paths and
95 operations. A detached worktree at the Phase 2 source commit independently
produced 88 paths, 99 operations, and fingerprint
`5637fed8d1ae886ea9cb8fabc5b9f7813454990c5f52ac5c5cded8fcb0a0157f`.
The Phase 2 working tree produced the same values. The baseline was refreshed
from the source commit before verification; Geography introduced no OpenAPI
change.

| Gate | Result | Evidence |
| --- | --- | --- |
| Architecture audit | pass | 58 writable mappings, 10 out-of-scope/deferred duplicate tables, no violations |
| Phase 1 persistence tests | pass | 27 tests |
| Phase 2 focused tests | pass | 18 tests across 6 suites |
| TypeScript | pass | `tsc --noEmit` |
| Clean-v2 table set | pass | 26 tables |
| Catalog parity | pass | 499/499 objects, zero differences |
| TypeORM compatibility | pass | 28 raw/reviewed, zero unexpected, stale, or catalog mismatch |
| Geography runtime smoke | pass | canonical disposable database |
| Phase 2 query counts | pass | Notifications 1; Geography 1/1; Ads 1/1; System Config 1; Audit Logs 1 |
| OpenAPI | unchanged from source | 88 paths, 99 operations, source/working fingerprints equal |
| Build | pass | Nest build |
| Lint | pass | zero errors; 20 pre-existing warnings |
| Full unit suite | pass | 34 suites, 145 tests; 1 opt-in skip |
| Full E2E suite | pass | 10 suites, 98 tests |
| Storage unit/E2E | pass | 38 unit and 11 E2E tests |
| Storage migration integration | opt-in skipped | existing environment-controlled behavior |

The protected local database schema SHA-256 was
`ace7d317b8e370066ce1e860aa1e0a0818c15638e6a2695cb2a1c547ef2d5857`
both before and after validation. It retained 33 public tables, no migration
ledger, and no legacy-only Province columns. All disposable databases were
removed.

## Phase Status

All included Phase 2 tables have one canonical writable mapping. Market Prices
is explicitly deferred, the baseline remains 26 tables, and no physical schema
change or migration was required. Phase 3 has not started.
