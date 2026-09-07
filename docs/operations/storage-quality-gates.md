# Storage Quality Gates

`npm run test:storage` runs the Storage unit, architecture, resilience, and
concurrency tests. The concurrency test creates 50 intent requests using mocked
ports and records Node heap growth; its budget is less than 32 MiB.

`npm run test:storage:e2e` runs the Storage REST contract suite. It verifies
anonymous rejection, authenticated owner propagation, cross-owner behavior, and
reviewer/admin routes without real providers.

`npm run test:storage:contract` is opt-in and must run only against a dedicated
non-production Supabase bucket. Set `STORAGE_CONTRACT_TESTS=true` and use a
`STORAGE_ENV_PREFIX` beginning with `contract` or `test`. The test creates and
deletes its own isolated object. Never run it against production credentials.

`npm run test:storage:migration` is the Phase 9 PostgreSQL integration gate.
With `STORAGE_MIGRATION_TESTS=true`, it creates an isolated schema, seeds every
supported legacy private-document source, runs the Phase 9 migration `up`
twice, then runs `down`. It verifies real PostgreSQL constraints, idempotency,
private metadata links, and rollback retention. The backend quality workflow
runs this gate against a PostgreSQL 16 service; local runs require a disposable
database and must never target production.
