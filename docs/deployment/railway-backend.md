# Railway Backend Database Preparation

This document describes deployment prerequisites. It does not indicate that the
AgriLink Backend or PostgreSQL service has been deployed.

## Database Topologies

Local development runs NestJS directly on Windows and PostgreSQL in Docker:

```text
NestJS -> localhost:5433 -> PostgreSQL container:5432
```

Railway runs NestJS and PostgreSQL as managed services. The Backend connects
through the PostgreSQL service's `DATABASE_URL`; it must not use `localhost`.

## Connection Precedence

The Backend and TypeORM CLI use the same configuration contract:

1. A non-empty `DATABASE_URL` is used when present.
2. Development and test environments fall back to `DB_HOST`, `DB_PORT`,
   `DB_NAME`, `DB_USER`, and `DB_PASS`.
3. Production fails during configuration validation when `DATABASE_URL` is
   absent or malformed.

Connection URLs contain credentials and must not be logged or committed.

## Railway Variables

Configure these variables on the Backend service:

```env
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
DB_SYNCHRONIZE=false
DB_LOGGING=false
```

Configure the other application, authentication, storage, mail, and provider
variables documented in `.env.example`. Do not upload the local `.env` file.

## Schema Management

`synchronize` and automatic migration execution remain disabled. Schema changes
must use reviewed migrations as an explicit release operation.

Before the first application deployment:

1. Create a fresh Railway PostgreSQL service.
2. Confirm the target database is not the protected local `agrilink_db`.
3. Review the pending v2 migration set.
4. Run the reviewed migration command against the fresh database with the
   repository's explicit target acknowledgement.
5. Start the NestJS application only after migration verification passes.

Never run development seeds against staging or production.

## Local Verification

With Docker PostgreSQL already running:

```powershell
Test-NetConnection localhost -Port 5433
docker compose ps
npx tsc --noEmit
npm run build
```

The expected local connection variables are:

```env
DB_HOST=localhost
DB_PORT=5433
DB_NAME=agrilink_db
DB_USER=agrilink
DB_PASS=your_local_password
DB_SYNCHRONIZE=false
DB_LOGGING=true
```

## Deployment Prerequisites

- PostgreSQL and Backend services exist in the same Railway project.
- `DATABASE_URL` is provided through a Railway variable reference.
- All required production variables pass application validation.
- Reviewed migrations pass against a fresh disposable database.
- TypeScript, build, configuration tests, and persistence architecture audit
  pass.
- No local credential or complete connection URL is committed or printed.
