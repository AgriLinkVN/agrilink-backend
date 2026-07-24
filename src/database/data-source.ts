import "reflect-metadata";
import * as dotenv from "dotenv";
import { DataSource } from "typeorm";

dotenv.config();

import { parseEnvBoolean } from "../config/parse-env-boolean";
import {
  createDataSourceOptions,
  describeDataSourceTarget,
} from "./data-source-options";
import {
  CLI_ENTITY_REGISTRY,
  excludeDeferredEntitiesFromSchemaBuild,
} from "./entity-registry";
import { assertDisposableDatabaseTarget } from "./reconciliation/database-target.guard";
import { V2_MIGRATIONS } from "./migration-registry";

function assertV2Target(): void {
  const database = process.env.DB_NAME ?? "agrilink_db";
  if (
    parseEnvBoolean(
      process.env.PERSISTENCE_V2_TARGET_ACKNOWLEDGED,
      "PERSISTENCE_V2_TARGET_ACKNOWLEDGED",
      false,
    )
  ) {
    if (database === "agrilink_db") {
      throw new Error("V2 migrations must never target agrilink_db");
    }
    return;
  }
  assertDisposableDatabaseTarget(database);
}

export const dataSourceOptions = createDataSourceOptions(
  {
    ...process.env,
    DB_SYNCHRONIZE: "false",
    PRODUCT_DEV_SEED: "false",
    PRODUCT_DEV_SEED_RESET: "false",
  },
  {
    entities: CLI_ENTITY_REGISTRY,
    migrations: V2_MIGRATIONS,
    migrationsTableName: "migrations_v2",
  },
);

console.info(
  `[Persistence CLI] lineage=v2 ${describeDataSourceTarget(dataSourceOptions)}`,
);

class GuardedV2DataSource extends DataSource {
  override async initialize(): Promise<this> {
    assertV2Target();
    const initialized = await super.initialize();
    excludeDeferredEntitiesFromSchemaBuild(initialized);
    return initialized;
  }
}

const dataSource = new GuardedV2DataSource(dataSourceOptions);
export default dataSource;
