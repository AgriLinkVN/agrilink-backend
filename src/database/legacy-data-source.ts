import "reflect-metadata";
import * as dotenv from "dotenv";
import { DataSource } from "typeorm";

import {
  createDataSourceOptions,
  describeDataSourceTarget,
} from "./data-source-options";
import { CLI_ENTITY_REGISTRY } from "./entity-registry";
import { LEGACY_MIGRATIONS } from "./migration-registry";

dotenv.config();

export const legacyDataSourceOptions = createDataSourceOptions(process.env, {
  entities: CLI_ENTITY_REGISTRY,
  migrations: LEGACY_MIGRATIONS,
  migrationsTableName: "migrations",
});

console.info(
  `[Persistence CLI] lineage=legacy-read-only ${describeDataSourceTarget(
    legacyDataSourceOptions,
  )}`,
);

export default new DataSource(legacyDataSourceOptions);
