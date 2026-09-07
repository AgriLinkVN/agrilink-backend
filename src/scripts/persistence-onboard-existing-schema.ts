import "reflect-metadata";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { DataSource } from "typeorm";

import { createDataSourceOptions } from "../database/data-source-options";
import {
  applyExistingSchemaOnboarding,
  buildExistingSchemaOnboardingPlan,
  ExistingSchemaOnboardingPlan,
  ONBOARDING_APPROVAL,
} from "../database/reconciliation/existing-schema-onboarding";
import { verifyExistingSchema } from "../database/reconciliation/existing-schema-verifier";

dotenv.config();

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
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
    if (!options.apply) {
      const report = await verifyExistingSchema(dataSource);
      const plan = buildExistingSchemaOnboardingPlan(
        report,
        required(options, "environment"),
      );
      writeJson(required(options, "output"), plan);
      process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
      return;
    }

    const plan = readJson<ExistingSchemaOnboardingPlan>(
      required(options, "plan"),
    );
    const result = await applyExistingSchemaOnboarding(dataSource, plan, {
      approval: required(options, "approval"),
      expectedFingerprint: required(options, "expected-fingerprint"),
      environment: required(options, "environment"),
      backupConfirmed: options["backup-confirmed"] === "true",
      sharedTargetAcknowledged:
        options["shared-target-acknowledged"] === "true",
    });
    process.stdout.write(
      `${JSON.stringify(
        {
          result: "PASS",
          database: result.database.database,
          lineage: result.lineage.classification,
          fingerprint: result.fingerprint,
          approval: ONBOARDING_APPROVAL,
        },
        null,
        2,
      )}\n`,
    );
  } finally {
    await dataSource.destroy();
  }
}

function parseOptions(arguments_: string[]): Record<string, string> & {
  apply?: string;
} {
  const result: Record<string, string> = {};
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === "--apply") {
      result.apply = "true";
      continue;
    }
    if (!argument.startsWith("--")) {
      throw new Error(`Unexpected positional argument: ${argument}`);
    }
    const separator = argument.indexOf("=");
    if (separator > 2) {
      result[argument.slice(2, separator)] = argument.slice(separator + 1);
      continue;
    }
    const name = argument.slice(2);
    const value = arguments_[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`${argument} requires a value`);
    }
    result[name] = value;
    index += 1;
  }
  return result;
}

function required(options: Record<string, string>, name: string): string {
  const value = options[name];
  if (!value) throw new Error(`--${name} is required`);
  return value;
}

function writeJson(file: string, value: unknown): void {
  const resolved = path.resolve(file);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(path.resolve(file), "utf8")) as T;
}

void main();
