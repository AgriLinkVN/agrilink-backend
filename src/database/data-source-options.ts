import { DataSourceOptions, EntityTarget, MigrationInterface } from "typeorm";

import {
  DatabaseEnvironment,
  parseDatabaseEnvironment,
} from "../config/database-environment";

export interface DataSourceComposition {
  entities: readonly EntityTarget<unknown>[];
  migrations?: readonly (new () => MigrationInterface)[];
  migrationsTableName?: string;
  logging?: boolean;
}

export function createDataSourceOptions(
  env: DatabaseEnvironment,
  composition: DataSourceComposition,
): DataSourceOptions {
  const parsed = parseDatabaseEnvironment(env);
  const connection = parsed.databaseUrl
    ? {
        url: parsed.databaseUrl,
        database: parsed.database,
      }
    : {
        host: parsed.host,
        port: parsed.port,
        username: parsed.username,
        password: parsed.password,
        database: parsed.database,
      };
  return {
    type: "postgres",
    ...connection,
    schema: parsed.schema,
    entities: [...composition.entities] as DataSourceOptions["entities"],
    migrations: [...(composition.migrations ?? [])],
    migrationsTableName: composition.migrationsTableName,
    migrationsRun: false,
    migrationsTransactionMode: "all",
    synchronize: false,
    logging: composition.logging ?? parsed.logging,
    extra: {
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 2_000,
    },
  };
}

export function describeDataSourceTarget(options: DataSourceOptions): string {
  if (options.type !== "postgres") {
    throw new Error("Persistence Phase 1 supports PostgreSQL only");
  }
  return [
    `database=${String(options.database)}`,
    `schema=${String(options.schema ?? "public")}`,
    `synchronize=${String(options.synchronize)}`,
  ].join(" ");
}
