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
