import "reflect-metadata";
import * as dotenv from "dotenv";
import { DataSource } from "typeorm";

import {
  assertSafePersistenceTestEnvironment,
  PersistenceTestOperation,
  PersistenceTestPurpose,
} from "../database/reconciliation/database-target.guard";
import { createDataSourceOptions } from "../database/data-source-options";
import { CANONICAL_BASELINE_ENTITY_REGISTRY } from "../database/entity-registry";
import { SeedClassification } from "../database/seeds/framework/seed-contract";

dotenv.config();

async function main(): Promise<void> {
  const target = assertSafePersistenceTestEnvironment({
    environment: process.env,
    classification: SeedClassification.TEST,
    purpose: PersistenceTestPurpose.READ_ONLY_TEST_HARNESS,
    operation: PersistenceTestOperation.READ_ONLY_INSPECTION,
  });
  const database = target.database;
  const dataSource = new DataSource(
    createDataSourceOptions(process.env, {
      entities: CANONICAL_BASELINE_ENTITY_REGISTRY,
      logging: false,
    }),
  );
  await dataSource.initialize();
  try {
    const sql = await dataSource.driver.createSchemaBuilder().log();
    process.stdout.write(
      JSON.stringify(
        {
          database,
          schema:
            dataSource.options.type === "postgres"
              ? dataSource.options.schema
              : "public",
          synchronize: dataSource.options.synchronize,
          upQueries: sql.upQueries.map(({ query }) => query),
          downQueries: sql.downQueries.map(({ query }) => query),
        },
        null,
        2,
      ),
    );
  } finally {
    await dataSource.destroy();
  }
}

void main();
