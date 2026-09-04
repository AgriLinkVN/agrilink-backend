import { ConfigService } from "@nestjs/config";
import { PostgresConnectionOptions } from "typeorm/driver/postgres/PostgresConnectionOptions";

import { databaseConfig } from "../../src/config/database.config";
import { parseDatabaseEnvironment } from "../../src/config/database-environment";
import { createDataSourceOptions } from "../../src/database/data-source-options";

const LOCAL_ENV = {
  NODE_ENV: "development",
  DB_HOST: "localhost",
  DB_PORT: "5433",
  DB_NAME: "agrilink_db",
  DB_USER: "agrilink",
  DB_PASS: "local-test-password",
  DB_SYNCHRONIZE: "false",
  DB_LOGGING: "true",
};

const MANAGED_DATABASE_URL =
  "postgresql://railway_user:not-a-real-secret@managed.example:6543/railway";

const asPostgres = (options: unknown): PostgresConnectionOptions =>
  options as PostgresConnectionOptions;

describe("Database deployment configuration", () => {
  it("prefers DATABASE_URL over split connection variables", () => {
    const options = asPostgres(
      createDataSourceOptions(
        {
          ...LOCAL_ENV,
          DATABASE_URL: MANAGED_DATABASE_URL,
          DB_PORT: "not-a-port",
        },
        { entities: [] },
      ),
    );

    expect(options.url).toBe(MANAGED_DATABASE_URL);
    expect(options.host).toBeUndefined();
    expect(options.port).toBeUndefined();
    expect(options.database).toBe("railway");
  });

  it("uses the required split variables when DATABASE_URL is absent", () => {
    const options = asPostgres(
      createDataSourceOptions(LOCAL_ENV, { entities: [] }),
    );

    expect(options.url).toBeUndefined();
    expect(options.host).toBe("localhost");
    expect(options.port).toBe(5433);
    expect(options.database).toBe("agrilink_db");
    expect(options.username).toBe("agrilink");
  });

  it("rejects an incomplete local fallback without exposing its value", () => {
    const incomplete: Record<string, string> = { ...LOCAL_ENV };
    delete incomplete.DB_PASS;

    expect(() => parseDatabaseEnvironment(incomplete)).toThrow(
      "DB_PASS is required for database configuration",
    );
  });

  it("strictly parses safety flags and keeps schema automation disabled", () => {
    const parsed = parseDatabaseEnvironment(LOCAL_ENV);
    const options = createDataSourceOptions(LOCAL_ENV, { entities: [] });

    expect(parsed.synchronize).toBe(false);
    expect(parsed.logging).toBe(true);
    expect(options.synchronize).toBe(false);
    expect(options.migrationsRun).toBe(false);
  });

  it("rejects synchronize in production", () => {
    expect(() =>
      parseDatabaseEnvironment({
        NODE_ENV: "production",
        DATABASE_URL: MANAGED_DATABASE_URL,
        DB_SYNCHRONIZE: "true",
      }),
    ).toThrow("DB_SYNCHRONIZE must be false in production.");
  });

  it("requires DATABASE_URL in production even when split variables exist", () => {
    expect(() =>
      parseDatabaseEnvironment({
        ...LOCAL_ENV,
        NODE_ENV: "production",
      }),
    ).toThrow("DATABASE_URL is required in production.");
  });

  it("keeps Nest runtime and TypeORM CLI connection selection equivalent", () => {
    const env = {
      ...LOCAL_ENV,
      NODE_ENV: "production",
      DATABASE_URL: MANAGED_DATABASE_URL,
    };
    const runtime = asPostgres(databaseConfig(new ConfigService(env)));
    const cli = asPostgres(createDataSourceOptions(env, { entities: [] }));

    expect(runtime.url).toBe(cli.url);
    expect(runtime.database).toBe(cli.database);
    expect(runtime.synchronize).toBe(cli.synchronize);
    expect(runtime.migrationsRun).toBe(cli.migrationsRun);
  });

  it("does not expose a malformed connection secret in errors", () => {
    const secret = "must-not-appear";
    let message = "";

    try {
      parseDatabaseEnvironment({
        ...LOCAL_ENV,
        DATABASE_URL: `postgresql://user:${secret}@/database`,
      });
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }

    expect(message).toBe("DATABASE_URL must be a valid PostgreSQL connection URL");
    expect(message).not.toContain(secret);
  });
});
