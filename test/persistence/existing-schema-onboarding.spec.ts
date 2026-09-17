import { DataSource } from "typeorm";

import {
  applyExistingSchemaOnboarding,
  buildExistingSchemaOnboardingPlan,
  ExistingSchemaOnboardingPlan,
  ONBOARDING_APPROVAL,
  verifyOnboardingPlanIntegrity,
} from "../../src/database/reconciliation/existing-schema-onboarding";
import { ExistingSchemaReport } from "../../src/database/reconciliation/existing-schema-verifier";

describe("existing schema onboarding guards", () => {
  it("builds a deterministic plan only for an exact unregistered baseline", () => {
    const report = eligibleReport("agrilink_persistence_test_fixture");
    const first = buildExistingSchemaOnboardingPlan(report, "integration");
    const second = buildExistingSchemaOnboardingPlan(report, "integration");

    expect(first).toEqual(second);
    expect(first.operations).toEqual([
      { type: "ensure-ledger", table: "migrations_v2" },
      {
        type: "register-migration",
        timestamp: "1800000000000",
        name: "CreateCanonicalBaselineV21800000000000",
      },
      {
        type: "register-migration",
        timestamp: "1800000001000",
        name: "CreateCommerceBoundariesV21800000001000",
      },
    ]);
    expect(() => verifyOnboardingPlanIntegrity(first)).not.toThrow();
  });

  it("rejects an altered plan digest", () => {
    const plan = buildExistingSchemaOnboardingPlan(
      eligibleReport("agrilink_persistence_test_fixture"),
      "integration",
    );
    const changed = { ...plan, environment: "changed" };

    expect(() => verifyOnboardingPlanIntegrity(changed)).toThrow(
      "digest does not match",
    );
  });

  it("rejects reconciliation-required schemas", () => {
    const report = eligibleReport("agrilink_persistence_test_fixture");
    report.catalog.mismatchCount = 1;
    report.lineage.classification = "reconciliation-required";

    expect(() =>
      buildExistingSchemaOnboardingPlan(report, "integration"),
    ).toThrow("not eligible");
  });

  it("always refuses to apply a plan to agrilink_db", async () => {
    const plan = buildExistingSchemaOnboardingPlan(
      eligibleReport("agrilink_db"),
      "local",
    );

    await expect(
      applyExistingSchemaOnboarding({} as DataSource, plan, approvalFor(plan)),
    ).rejects.toThrow("protected database agrilink_db");
  });

  it("requires backup confirmation before opening an apply transaction", async () => {
    const plan = buildExistingSchemaOnboardingPlan(
      eligibleReport("agrilink_persistence_test_fixture"),
      "integration",
    );

    await expect(
      applyExistingSchemaOnboarding({} as DataSource, plan, {
        ...approvalFor(plan),
        backupConfirmed: false,
      }),
    ).rejects.toThrow("Backup/restore confirmation");
  });

  it("requires an extra acknowledgement for non-disposable targets", async () => {
    const plan = buildExistingSchemaOnboardingPlan(
      eligibleReport("agrilink_staging"),
      "staging",
    );

    await expect(
      applyExistingSchemaOnboarding({} as DataSource, plan, approvalFor(plan)),
    ).rejects.toThrow("shared-target acknowledgement");
  });
});

function approvalFor(plan: ExistingSchemaOnboardingPlan) {
  return {
    approval: ONBOARDING_APPROVAL,
    expectedFingerprint: plan.sourceFingerprint,
    environment: plan.environment,
    backupConfirmed: true,
    sharedTargetAcknowledged: false,
  };
}

function eligibleReport(database: string): ExistingSchemaReport {
  return {
    database: {
      serverVersion: "16.14",
      database,
      schema: "public",
      user: "agrilink",
      readOnly: true,
    },
    lineage: {
      ledgers: [],
      classification: "canonical-unregistered",
    },
    fingerprint:
      "b267c0189b42040b9bfd2920da36605a680d23b94ccbeb1eac9dfe31e782b029",
    catalog: {
      tableCount: 26,
      mismatchCount: 0,
      mismatches: [],
      knownPreservedExtras: [],
      unknownTables: [],
    },
    groupB: { rowCounts: {}, blockers: [] },
    storage: { occupancy: [], orphanReferences: [] },
    wishlist: [],
    result: "PASS",
    blockers: [],
  };
}
