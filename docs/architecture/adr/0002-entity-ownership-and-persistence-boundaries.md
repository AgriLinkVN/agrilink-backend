# ADR 0002: Entity Ownership And Persistence Boundaries

## Status

Proposed. Accept when the Phase 0 pull request is merged.

## Context

AgriLink is a NestJS modular monolith. Persistence mappings currently exist in
both `src/database/entities` and feature modules. The Phase 0 source inventory
found 66 writable TypeORM mappings for 48 `public` tables, including 18 tables
with duplicate writable mappings. Runtime registration, migration CLI loading,
and the legacy seed DataSource use different entity sets.

## Decision

A physical table is identified by `(database schema, table name)` and has one
canonical writable persistence entity owned by one business capability.

- Domain and application code do not import TypeORM.
- A module does not import another module's persistence entity or writable
  repository implementation.
- Cross-module references use scalar IDs. The table containing an FK owns its
  migration, constraint, index, and delete behavior.
- `@ViewEntity`, read-only projections, test-only entities, and migration-only
  mappings are allowed only through an expiring machine-readable exception.
- The database package is a composition root. It may import feature entities
  into a registry but does not own business entities.
- Root DataSource, migration CLI, schema parity, and integration tests use the
  same canonical entity registry. Feature modules continue to use
  `TypeOrmModule.forFeature` for entities they own.
- Read models may query across schema contracts but are read-only, return
  projections, and do not inject another capability's writable repository.
- Persistence entities are not controller response models.

## Compatibility

Migration is incremental. A temporary re-export may preserve an old import
path only when listed in the exception registry. New imports from legacy paths
are blocked. Moving a class without changing its physical schema does not
justify a database migration.

## Consequences

- Ownership and dependency direction become testable.
- Some ORM relations are replaced by scalar IDs and explicit query ports.
- Aggregate reporting requires dedicated projections.
- Existing violations remain temporarily visible and expire by phase.
- Live PostgreSQL inspection is required before choosing a canonical schema
  where entity metadata and migration history disagree.

## Rejected Alternatives

- Put business entities in `shared`: this hides ownership rather than removing
  coupling.
- Global writable repository module: this recreates cross-module persistence
  access.
- Big-bang entity move: review, rollback, and schema diagnosis become unsafe.
- `synchronize` as migration: it is nondeterministic and prohibited in
  production.
