import "reflect-metadata";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { DataSource } from "typeorm";

import { createDataSourceOptions } from "../database/data-source-options";
import { V2_MIGRATIONS } from "../database/migration-registry";
import {
  createAdminDataSource,
  createDisposableDatabase,
  createDisposableDatabaseName,
  dropDisposableDatabase,
} from "../database/reconciliation/disposable-database";
import {
  assertSafePersistenceTestEnvironment,
  PersistenceTestOperation,
  PersistenceTestPurpose,
} from "../database/reconciliation/database-target.guard";
import { SeedClassification } from "../database/seeds/framework/seed-contract";
import {
  assertCanonicalParity,
  verifyCanonicalParity,
} from "../database/reconciliation/parity-verifier";
import {
  applyExistingSchemaOnboarding,
  buildExistingSchemaOnboardingPlan,
  ONBOARDING_APPROVAL,
} from "../database/reconciliation/existing-schema-onboarding";
import { verifyExistingSchema } from "../database/reconciliation/existing-schema-verifier";
import {
  CLI_ENTITY_REGISTRY,
  CANONICAL_BASELINE_TABLE_KEYS,
  excludeDeferredEntitiesFromSchemaBuild,
} from "../database/entity-registry";
import {
  CLEAN_V2_TEST_FIXTURE_METADATA,
  captureOpenApiBaseline,
  captureRuntimeBaseline,
  OpenApiBaseline,
  RuntimeBaseline,
} from "../database/reconciliation/clean-v2-runtime-baseline";

dotenv.config();

async function main(): Promise<void> {
  const database = createDisposableDatabaseName();
  const testTarget = {
    classification: SeedClassification.TEST,
    purpose: PersistenceTestPurpose.MIGRATION_TEST_HARNESS,
    database,
    acknowledgement: database,
  } as const;
  const admin = createAdminDataSource(process.env, testTarget);
  let target: DataSource | null = null;

  await admin.initialize();
  try {
    await createDisposableDatabase(admin, testTarget);
    target = new DataSource(
      createDataSourceOptions(
        { ...process.env, DB_NAME: database, DB_SYNCHRONIZE: "false" },
        {
          entities: CLI_ENTITY_REGISTRY,
          migrations: V2_MIGRATIONS,
          migrationsTableName: "migrations_v2",
          logging: false,
        },
      ),
    );
    await target.initialize();
    excludeDeferredEntitiesFromSchemaBuild(target);

    const firstRun = await target.runMigrations();
    assertMigrationNames(firstRun.map(({ name }) => name));
    await assertBaselineTableSet(target);

    const secondRun = await target.runMigrations();
    if (secondRun.length !== 0 || (await target.showMigrations())) {
      throw new Error("Second v2 migration run must have no pending migration");
    }

    const firstParity = await verifyCanonicalParity(target);
    assertCanonicalParity(firstParity);

    for (let index = 0; index < V2_MIGRATIONS.length; index += 1) {
      await target.undoLastMigration();
    }
    const tablesAfterDown = await readBusinessTables(target);
    if (tablesAfterDown.length !== 0) {
      throw new Error(
        `V2 down left business tables: ${tablesAfterDown.join(", ")}`,
      );
    }

    const rerun = await target.runMigrations();
    assertMigrationNames(rerun.map(({ name }) => name));
    await assertBaselineTableSet(target);
    const finalParity = await verifyCanonicalParity(target);
    assertCanonicalParity(finalParity);
    assertSafePersistenceTestEnvironment({
      environment: { ...process.env, DB_NAME: database },
      classification: CLEAN_V2_TEST_FIXTURE_METADATA.classification,
      purpose: CLEAN_V2_TEST_FIXTURE_METADATA.purpose,
      operation: PersistenceTestOperation.FIXTURE_WRITE,
    });
    const runtimeBaseline = await captureRuntimeBaseline(target);
    const openApiBaseline = await captureOpenApiBaseline(database);
    verifyOrWriteRuntimeBaselines(runtimeBaseline, openApiBaseline);

    await target.query(`DROP TABLE "public"."migrations_v2"`);
    const unregistered = await verifyExistingSchema(target);
    const onboardingPlan = buildExistingSchemaOnboardingPlan(
      unregistered,
      "disposable-test",
    );
    const onboarded = await applyExistingSchemaOnboarding(
      target,
      onboardingPlan,
      {
        approval: ONBOARDING_APPROVAL,
        expectedFingerprint: onboardingPlan.sourceFingerprint,
        environment: onboardingPlan.environment,
        backupConfirmed: true,
        sharedTargetAcknowledged: false,
      },
    );

    process.stdout.write(
      `${JSON.stringify(
        {
          result: "PASS",
          database,
          protectedDatabase: "agrilink_db",
          firstRunMigrations: firstRun.map(({ name }) => name),
          secondRunMigrations: secondRun.length,
          downBusinessTableCount: tablesAfterDown.length,
          rerunMigrations: rerun.map(({ name }) => name),
          tableCount: CANONICAL_BASELINE_TABLE_KEYS.length,
          catalog: finalParity.catalog,
          typeOrm: finalParity.typeOrm,
          runtime: {
            smoke: runtimeBaseline.smoke,
            queryCounts: runtimeBaseline.queryCounts,
          },
          openApi: {
            fingerprint: openApiBaseline.fingerprint,
            pathCount: openApiBaseline.pathCount,
            operationCount: openApiBaseline.operationCount,
          },
          onboarding: {
            before: unregistered.lineage.classification,
            planDigest: onboardingPlan.digest,
            after: onboarded.lineage.classification,
            fingerprintUnchanged:
              unregistered.fingerprint === onboarded.fingerprint,
          },
        },
        null,
        2,
      )}\n`,
    );
  } finally {
    if (target?.isInitialized) await target.destroy();
      await dropDisposableDatabase(admin, testTarget);
    await admin.destroy();
  }
}

function verifyOrWriteRuntimeBaselines(
  runtime: RuntimeBaseline,
  openApi: OpenApiBaseline,
): void {
  const baselineDirectory = path.join(
    process.cwd(),
    "docs/architecture/persistence/baselines",
  );
  const runtimeFile = path.join(
    baselineDirectory,
    "clean-v2-runtime-baseline.json",
  );
  const openApiFile = path.join(
    baselineDirectory,
    "clean-v2-openapi-baseline.json",
  );
  if (process.argv.includes("--write-baselines")) {
    writeJson(runtimeFile, runtime);
    writeJson(openApiFile, openApi);
    return;
  }
  const expectedRuntime = readJson<RuntimeBaseline>(runtimeFile);
  const expectedOpenApi = readJson<OpenApiBaseline>(openApiFile);
  if (Object.values(runtime.smoke).some((passed) => !passed)) {
    throw new Error(
      `Clean-v2 runtime smoke failed: ${JSON.stringify(runtime.smoke)}`,
    );
  }
  if (JSON.stringify(runtime) !== JSON.stringify(expectedRuntime)) {
    throw new Error(
      `Clean-v2 runtime/query baseline changed: ${JSON.stringify({
        expected: expectedRuntime,
        actual: runtime,
      })}`,
    );
  }
  if (JSON.stringify(openApi) !== JSON.stringify(expectedOpenApi)) {
    throw new Error(
      `Clean-v2 OpenAPI baseline changed: ${JSON.stringify({
        expectedFingerprint: expectedOpenApi.fingerprint,
        actualFingerprint: openApi.fingerprint,
        expectedPathCount: expectedOpenApi.pathCount,
        actualPathCount: openApi.pathCount,
      })}`,
    );
  }
}

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}

function writeJson(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function assertMigrationNames(names: string[]): void {
  const expected = V2_MIGRATIONS.map(
    (Migration) => new Migration().name ?? Migration.name,
  );
  if (JSON.stringify(names) !== JSON.stringify(expected)) {
    throw new Error(
      `Unexpected v2 migration run: expected ${expected}, received ${names}`,
    );
  }
}

async function assertBaselineTableSet(dataSource: DataSource): Promise<void> {
  const actual = await readBusinessTables(dataSource);
  const expected = CANONICAL_BASELINE_TABLE_KEYS.map((key) =>
    key.replace('public.', ''),
  ).sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Clean-v2 table set differs: ${JSON.stringify({ expected, actual })}`,
    );
  }
}

async function readBusinessTables(dataSource: DataSource): Promise<string[]> {
  const rows = (await dataSource.query(
    `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name NOT IN ('migrations', 'migrations_v2')
      ORDER BY table_name
    `,
  )) as Array<{ table_name: string }>;
  return rows.map(({ table_name }) => table_name);
}

void main();
