import "reflect-metadata";
import * as dotenv from "dotenv";
import { DataSource } from "typeorm";

import { assertDisposableDatabaseTarget } from "../database/reconciliation/database-target.guard";
import { createDataSourceOptions } from "../database/data-source-options";
import {
  CLI_ENTITY_REGISTRY,
  excludeDeferredEntitiesFromSchemaBuild,
} from "../database/entity-registry";
import {
  assertCatalogParity,
  verifyCanonicalParity,
} from "../database/reconciliation/parity-verifier";

dotenv.config();

async function main(): Promise<void> {
  const database = process.env.DB_NAME ?? "";
  assertDisposableDatabaseTarget(database);
  const dataSource = new DataSource(
    createDataSourceOptions(process.env, {
      entities: CLI_ENTITY_REGISTRY,
      logging: false,
    }),
  );
  await dataSource.initialize();
  excludeDeferredEntitiesFromSchemaBuild(dataSource);
  try {
    const parity = await verifyCanonicalParity(dataSource);
    const result = {
      database,
      synchronize: dataSource.options.synchronize,
      lineage: "v2",
      gate: "canonical-catalog",
      catalog: parity.catalog,
    };
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    assertCatalogParity(parity);
  } finally {
    await dataSource.destroy();
  }
}

void main();
