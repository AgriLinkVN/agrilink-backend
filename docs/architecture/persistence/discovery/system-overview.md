# Persistence Phase 1 System Discovery

## Scope and evidence

This Decision Pack describes source commit
`0e0af99c251190939bf4c3882a73ae2b97f8009d`, the merge commit of PR #77.
It does not implement Persistence Phase 1 and does not treat the developer
PostgreSQL database as production truth.

Evidence labels used throughout this pack:

- **Observed**: directly visible in source, repository configuration, tests, or
  the recorded local PostgreSQL snapshot.
- **Inferred**: a consequence of observed code, but not executed against every
  deployment.
- **Proposed**: a Phase 1 architecture decision awaiting implementation review.
- **Unverified**: requires staging/production schema, row, or deployment
  evidence that is not present in the repository.

Machine-readable details are in:

- `runtime-module-graph.json`
- `api-persistence-map.json`
- `repository-usage-map.json`
- `entity-runtime-usage.json`
- `state-and-constraint-map.json`
- `phase-1-ownership-decisions.json`
- `baseline-inclusion-matrix.json`

Regenerate the inventories from the repository root with:

```powershell
$env:DISCOVERY_SOURCE_COMMIT = "<audited-commit>"
npx ts-node -r tsconfig-paths/register src/scripts/persistence-system-discovery.ts
```

The generator reads TypeScript and the Phase 0 registry; it does not connect to
PostgreSQL or external providers. It only rewrites this discovery directory.

## Runtime composition

**Observed:** `AppModule` mounts 14 feature modules/routes plus
`AppController`. `main.ts` applies the `api/v1` prefix, validation, exception
filter, response/logging interceptors, cookie parsing, CORS, Swagger, and
Sentry initialization. `JwtAuthGuard` and `RolesGuard` are global
`APP_GUARD` providers.

| Capability                  | Runtime status       | Entry points                        | Persistence reality                                                         |
| --------------------------- | -------------------- | ----------------------------------- | --------------------------------------------------------------------------- |
| Auth                        | Active               | 8 REST endpoints                    | `users`, `refresh_tokens`, `otp_verifications`                              |
| Users                       | Active               | 4 REST endpoints                    | `users`; module exports `TypeOrmModule`                                     |
| Profiles                    | Active               | 2 private + 1 public REST endpoints | Four central profile mappings; Storage saga                                 |
| Geography                   | Active read API      | 2 REST endpoints                    | `provinces`, `districts`                                                    |
| Products                    | Active               | 15 product and 4 wishlist endpoints | Product aggregate, certifications, wishlist; raw cross-capability reads     |
| Reviews                     | Active               | 7 REST endpoints                    | `reviews`, direct Product repository access                                 |
| Notifications               | Active               | 6 REST endpoints + WebSocket        | DB persistence then Socket.IO publication                                   |
| Ads                         | Active               | 12 REST endpoints                   | Three ad tables; moderation notification                                    |
| Admin                       | Active               | 12 REST endpoints                   | Direct writes across users, profiles, products, incidents, config and audit |
| Storage                     | Active               | 6 REST endpoints + cron             | `stored_files`, Cloudinary and Supabase                                     |
| Forum                       | Active               | 10 REST endpoints                   | posts, comments, likes                                                      |
| Cooperatives                | Persistence scaffold | no controller                       | Five registered repositories, tests, no production consumer                 |
| Market prices               | Mounted but partial  | 2 REST endpoints                    | Service methods throw `TODO`                                                |
| Traceability                | Mounted but partial  | 3 REST endpoints                    | Service methods throw `TODO`                                                |
| Commerce/contracts/payments | Not connected        | no module/controller                | central entities only                                                       |
| Logistics                   | Not connected        | no module/controller                | central entities plus optional dev-seed reference                           |
| Messaging                   | Not connected        | no module/controller                | central entities only                                                       |

**Observed:** no application route file named `src/app.routes.ts` exists; route
composition is in `AppModule` and `*.route.ts` Nest modules. No `@Global`
module or source-visible circular Nest import was found. `UsersModule`
exporting `TypeOrmModule` is a persistence boundary leak to remove in its owner
phase, not in Phase 1.

**Observed:** all 95 discovered REST handlers belong to a root-reachable
controller. `GET /api/v1/` has no `@Public` decorator, so source evidence says
the health-style root endpoint is protected by the global JWT guard.

## Background and external integration

| Integration                  | Runtime status                                    | Persistence impact                                                  |
| ---------------------------- | ------------------------------------------------- | ------------------------------------------------------------------- |
| Storage cleanup cron         | Active every five minutes                         | expires pending files and retries provider deletion                 |
| Notifications WebSocket      | Active                                            | publishes persisted notification changes                            |
| Legacy notifications gateway | Unregistered                                      | duplicate class file, no runtime provider                           |
| Cloudinary                   | Active Storage image adapter                      | external object plus `stored_files` state                           |
| Supabase Storage             | Active private-file adapter                       | external object plus `stored_files` state                           |
| Firebase Admin               | Active auth adapter                               | verifies Firebase identity; credentials can use explicit env or ADC |
| Nodemailer SMTP              | Active OTP adapter                                | OTP is persisted even if delivery returns false                     |
| eSMS                         | Module imported but not the Auth outbound binding | no confirmed production Auth send path                              |
| FPT Vision                   | Bound through a port, currently mock behavior     | KYC check is not production-grade external verification             |
| Socket.IO                    | Active                                            | notification delivery is not atomically coupled to DB commit        |
| PDFKit                       | Active admin report generation                    | read-only persistence side effect                                   |
| Sentry                       | Optional                                          | no persistence ownership                                            |

No queue consumer, outbox publisher, or application event bus was found.

## Persistence composition reality

**Observed inventory:**

- 66 writable TypeORM mappings.
- 48 distinct source `schema.table` keys.
- 18 mappings classified duplicate, 15 CLI-only legacy mappings, 28 active
  mappings, and 5 unverified cooperative mappings.
- 40 direct repository injections.
- 37 central mappings are scanned by the CLI `DataSource`.
- Runtime uses `autoLoadEntities` and module `forFeature` registrations.
- The local snapshot contains 33 tables, 32 source/live intersections, 16
  source-only source keys, and local-only `product_wishlists`.

The 28 `active` labels are mapping-level classifications, not 28 distinct
tables. A duplicate mapping can still be the active runtime contract; inspect
`runtimeRegistered` and `repositoryConsumers` instead of using `status` alone.

**Observed high-risk cross-capability persistence:**

- Admin directly registers and writes Users, Products and Profiles entities.
- Reviews directly registers/queries Product and relates to User.
- Products performs raw SQL over users, four profile tables, provinces and
  districts for seller detail.
- Users exports `TypeOrmModule`.

These are owner-phase concerns. Phase 1 must preserve current query and write
behavior while establishing a deterministic schema lineage.

## Configuration matrix

| Environment   | DataSource/entity source                              | Migrations                                | Synchronize                                                       | Seed                         | Evidence                            |
| ------------- | ----------------------------------------------------- | ----------------------------------------- | ----------------------------------------------------------------- | ---------------------------- | ----------------------------------- |
| Local runtime | Nest factory, module `forFeature`, `autoLoadEntities` | not run automatically                     | env value is unsafely parsed through `ConfigService.get<boolean>` | optional product seed        | source + compose                    |
| Local CLI     | `src/database/data-source.ts`, central entities only  | 11 legacy files                           | strict string comparison to `true`                                | `src/database/seeds/seed.ts` | source                              |
| CI            | app runtime plus PostgreSQL 16 `agrilink_test`        | Storage migration suite is opt-in enabled | not explicitly enabled                                            | none                         | workflow                            |
| Test unit     | mocks/in-memory collaborators                         | none                                      | not applicable                                                    | fixtures                     | Jest config                         |
| Staging       | same env contract is expected                         | unverified                                | must be false                                                     | must be false                | repository has no deployment config |
| Production    | same env contract is expected                         | unverified                                | must be false                                                     | must be false                | repository has no deployment config |

**Observed configuration defects for Phase 1:**

1. `migration:run` and `migration:revert` point to
   `src/config/database.config.ts`, which exports a Nest options factory, not a
   TypeORM `DataSource`.
2. Runtime and CLI entity discovery are different.
3. Runtime boolean parsing can treat a non-empty string such as `"false"` as
   truthy depending on ConfigService behavior.
4. CLI logging is always enabled.
5. The legacy migration chain cannot bootstrap a clean database because its
   first migration assumes `public.provinces`.
6. The local database has no TypeORM migration ledger.

**Proposed:** one explicit registry must feed runtime, CLI, parity checks and
tests. Production must fail closed when synchronization is requested.

## Test inventory and Phase 1 gates

**Observed:** 41 test files exist: 32 unit/spec and 9 E2E. Fifteen are
Storage-related, two are migration-related, one is a repository spec, and one
is an explicit provider contract spec.

| Critical area       | Current evidence                                     | Phase 1 regression requirement                                            |
| ------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------- |
| Auth/users          | no dedicated E2E file                                | add baseline boot plus core auth smoke                                    |
| Profiles/Storage    | unit + profiles E2E + Storage suites                 | preserve dual-column and saga behavior                                    |
| Products/wishlist   | unit/repository + products E2E                       | preserve create transaction and canonical `wishlists`                     |
| Reviews             | use-case + E2E                                       | enforce/verify duplicate prevention after reconciliation                  |
| Notifications       | use-case/controller/WebSocket + E2E                  | preserve DB and realtime contract                                         |
| Ads                 | use-case + E2E                                       | preserve moderation paths                                                 |
| Forum               | E2E                                                  | include core API smoke                                                    |
| Cooperatives        | mapper/repository/boundary specs                     | keep excluded from baseline until production flow                         |
| Market/traceability | no meaningful working-flow coverage                  | exclusion gate; TODO endpoints must not imply schema inclusion            |
| Migration lineage   | cooperative migration spec + Storage migration suite | add clean-v2 bootstrap, up/down, registry parity and existing-DB verifier |

Tests that require PostgreSQL or external provider credentials must remain
explicitly opt-in or use controlled fakes. Phase 1 must not make normal unit
tests depend on Cloudinary, Supabase, Firebase, SMTP, or FPT Vision.

## Baseline decision summary

**Proposed:** baseline v2 contains 26 physical tables:

- Group A, confirmed: 18.
- Group B, compatibility required: 8.
- Group C, excluded pending owner phase: 21 source tables.
- Group D, blocked naming/reconciliation: `product_wishlist` and local-only
  `product_wishlists`.
- Group E: none. No physical table is safe to retire solely from repository
  evidence.

The exact table-level decision and constraints are in
`baseline-inclusion-matrix.json`. New databases use the v2 lineage; existing
databases enter it only through a read-only fingerprint and an explicit,
idempotent reconciliation plan.

## Open questions

These cannot be answered from repository and local PostgreSQL evidence:

1. What schemas, migration ledgers, row counts and constraints exist in each
   staging/production database?
2. Do deployed environments contain data in `product_wishlist`,
   `product_wishlists`, or both, and does it overlap with `wishlists`?
3. Are nullable user emails intentional for Firebase/phone-only accounts, and
   what production backfill rule is accepted?
4. Which profile URL/file-ID columns are populated in deployed environments,
   and are any URLs external HTTP values that cannot be safely backfilled?
5. Is the raw Product seller-detail response a supported external contract?
6. Which business owner will activate commerce, logistics, messaging,
   cooperative persistence, market prices and traceability?
