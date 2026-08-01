import { createHash } from "crypto";
import { DataSource } from "typeorm";

import {
  captureCatalogSnapshot,
  catalogFingerprint,
} from "./catalog-inspector";
import { readCatalogManifest } from "./baseline-artifacts";
import {
  ExistingSchemaReport,
  verifyExistingSchema,
} from "./existing-schema-verifier";
import { assertDisposableDatabaseTarget } from "./database-target.guard";

export const ONBOARDING_APPROVAL = "APPROVE_V2_BASELINE_ONBOARDING";
const V2_LINEAGE = [
  {
    timestamp: "1800000000000",
    name: "CreateCanonicalBaselineV21800000000000",
  },
  {
    timestamp: "1800000001000",
    name: "CreateCommerceBoundariesV21800000001000",
  },
] as const;

export interface ExistingSchemaOnboardingPlan {
  version: 1;
  lineage: "v2";
  database: string;
  environment: string;
  sourceFingerprint: string;
  canonicalFingerprint: string;
  operations: Array<
    | { type: "ensure-ledger"; table: "migrations_v2" }
    | {
        type: "register-migration";
        timestamp: (typeof V2_LINEAGE)[number]["timestamp"];
        name: (typeof V2_LINEAGE)[number]["name"];
      }
  >;
  digest: string;
}

export interface ExistingSchemaOnboardingApproval {
  approval: string;
  expectedFingerprint: string;
  environment: string;
  backupConfirmed: boolean;
  sharedTargetAcknowledged: boolean;
}

export function buildExistingSchemaOnboardingPlan(
  report: ExistingSchemaReport,
  environment: string,
): ExistingSchemaOnboardingPlan {
  if (!environment.trim()) {
    throw new Error("Onboarding plan requires an explicit environment");
  }
  if (
    report.lineage.classification !== "canonical-unregistered" ||
    report.catalog.mismatchCount !== 0 ||
    report.catalog.unknownTables.length !== 0 ||
    report.blockers.length !== 0
  ) {
    throw new Error(
      "Existing schema is not eligible for baseline-only onboarding",
    );
  }
  const withoutDigest = {
    version: 1 as const,
    lineage: "v2" as const,
    database: report.database.database,
    environment,
    sourceFingerprint: report.fingerprint,
    canonicalFingerprint: readCatalogManifest().fingerprint,
    operations: [
      { type: "ensure-ledger" as const, table: "migrations_v2" as const },
      ...V2_LINEAGE.map(({ timestamp, name }) => ({
        type: "register-migration" as const,
        timestamp,
        name,
      })),
    ],
  };
  return {
    ...withoutDigest,
    digest: digestPlan(withoutDigest),
  };
}

export function verifyOnboardingPlanIntegrity(
  plan: ExistingSchemaOnboardingPlan,
): void {
  const { digest, ...withoutDigest } = plan;
  if (digest !== digestPlan(withoutDigest)) {
    throw new Error("Onboarding plan digest does not match its contents");
  }
}

export async function applyExistingSchemaOnboarding(
  dataSource: DataSource,
  plan: ExistingSchemaOnboardingPlan,
  approval: ExistingSchemaOnboardingApproval,
): Promise<ExistingSchemaReport> {
  verifyOnboardingPlanIntegrity(plan);
  assertOnboardingApproval(plan, approval);
  assertOnboardingTarget(plan.database, approval.sharedTargetAcknowledged);
  if (String(dataSource.options.database) !== plan.database) {
    throw new Error("Connected database does not match the reviewed plan");
  }

  const preflight = await verifyExistingSchema(dataSource);
  if (
    preflight.lineage.classification !== "canonical-unregistered" ||
    preflight.fingerprint !== plan.sourceFingerprint ||
    preflight.catalog.mismatchCount !== 0 ||
    preflight.blockers.length !== 0
  ) {
    throw new Error("Database changed or is no longer eligible for onboarding");
  }

  const runner = dataSource.createQueryRunner();
  await runner.connect();
  await runner.startTransaction();
  try {
    await runner.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      "agrilink:persistence:v2:onboarding",
    ]);
    const lockedSnapshot = await captureCatalogSnapshot(runner);
    if (catalogFingerprint(lockedSnapshot) !== plan.sourceFingerprint) {
      throw new Error("Database fingerprint changed after lock acquisition");
    }
    await runner.query(
      `
        CREATE TABLE IF NOT EXISTS "public"."migrations_v2" (
          "id" SERIAL PRIMARY KEY,
          "timestamp" bigint NOT NULL,
          "name" character varying NOT NULL
        )
      `,
    );
    const [ledger] = (await runner.query(
      `SELECT COUNT(*)::text AS count FROM "public"."migrations_v2"`,
    )) as Array<{ count: string }>;
    if (Number(ledger.count) !== 0) {
      throw new Error("V2 ledger is not empty; refusing baseline registration");
    }
    for (const migration of V2_LINEAGE) {
      await runner.query(
        `
          INSERT INTO "public"."migrations_v2" ("timestamp", "name")
          VALUES ($1, $2)
        `,
        [migration.timestamp, migration.name],
      );
    }
    await runner.commitTransaction();
  } catch (error) {
    await runner.rollbackTransaction();
    throw error;
  } finally {
    await runner.release();
  }

  const result = await verifyExistingSchema(dataSource);
  if (
    result.lineage.classification !== "canonical-v2" ||
    result.fingerprint !== plan.sourceFingerprint
  ) {
    throw new Error("Post-onboarding verification failed");
  }
  return result;
}

function assertOnboardingTarget(
  database: string,
  sharedTargetAcknowledged: boolean,
): void {
  if (database === "agrilink_db") {
    throw new Error("Refusing to use protected database agrilink_db");
  }
  try {
    assertDisposableDatabaseTarget(database);
    return;
  } catch {
    if (!sharedTargetAcknowledged) {
      throw new Error(
        "Non-disposable onboarding requires explicit shared-target acknowledgement",
      );
    }
  }
}

function assertOnboardingApproval(
  plan: ExistingSchemaOnboardingPlan,
  approval: ExistingSchemaOnboardingApproval,
): void {
  if (approval.approval !== ONBOARDING_APPROVAL) {
    throw new Error(`Approval must equal ${ONBOARDING_APPROVAL}`);
  }
  if (!approval.backupConfirmed) {
    throw new Error("Backup/restore confirmation is required");
  }
  if (approval.expectedFingerprint !== plan.sourceFingerprint) {
    throw new Error("Approved fingerprint does not match the plan");
  }
  if (approval.environment !== plan.environment) {
    throw new Error("Approved environment does not match the plan");
  }
}

function digestPlan(
  plan: Omit<ExistingSchemaOnboardingPlan, "digest">,
): string {
  return createHash("sha256").update(JSON.stringify(plan)).digest("hex");
}
