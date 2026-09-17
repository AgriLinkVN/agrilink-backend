import "reflect-metadata";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { DataSource } from "typeorm";

import { createDataSourceOptions } from "../database/data-source-options";
import { verifyExistingSchema } from "../database/reconciliation/existing-schema-verifier";

dotenv.config();

async function main(): Promise<void> {
  const output = readOption("--output");
  const dataSource = new DataSource(
    createDataSourceOptions(
      {
        ...process.env,
        DB_SYNCHRONIZE: "false",
        PRODUCT_DEV_SEED: "false",
        PRODUCT_DEV_SEED_RESET: "false",
      },
      { entities: [], logging: false },
    ),
  );
  await dataSource.initialize();
  try {
    const report = await verifyExistingSchema(
      dataSource,
      process.env.DB_SCHEMA ?? "public",
    );
    const json = `${JSON.stringify(report, null, 2)}\n`;
    if (output) {
      const resolved = path.resolve(output);
      fs.mkdirSync(path.dirname(resolved), { recursive: true });
      fs.writeFileSync(resolved, json, "utf8");
    }
    process.stdout.write(json);
  } finally {
    await dataSource.destroy();
  }
}

function readOption(name: string): string | null {
  const index = process.argv.indexOf(name);
  const value =
    index === -1
      ? process.argv.slice(2).find((argument) => !argument.startsWith("--"))
      : process.argv[index + 1];
  if (!value) return null;
  if (!value || value.startsWith("--")) {
    throw new Error(`${name} requires a value`);
  }
  return value;
}

void main();
