export type CleanV2WriteDisposition =
  | "MOVE_TO_OWNER_LOCAL_TEST_PROVIDER"
  | "KEEP_HARNESS_LOCAL_WORKFLOW_ACTION"
  | "KEEP_HARNESS_LOCAL_SYNTHETIC_FIXTURE"
  | "KEEP_HARNESS_CONTROL"
  | "BLOCKED_IDENTITY"
  | "BLOCKED_OWNER";

export interface CleanV2WriteInventoryEntry {
  readonly id: string;
  readonly table: string;
  readonly owner: string;
  readonly mechanism: string;
  readonly prerequisiteFixture: boolean;
  readonly workflowAction: boolean;
  readonly migrationOrParityControl: boolean;
  readonly stableIdentityProven: boolean;
  readonly currentDisposition: CleanV2WriteDisposition;
  readonly reason: string;
}

function entry(
  value: CleanV2WriteInventoryEntry,
): Readonly<CleanV2WriteInventoryEntry> {
  return Object.freeze(value);
}

/**
 * P8-06C static authority for every clean-v2 persistence write boundary.
 * The first fifteen rows are runtime prerequisites, the two workflow rows are
 * Products behavior assertions, and the final nine entries are migration or
 * parity harness controls from persistence-verify-clean-v2.ts.
 */
export const CLEAN_V2_WRITE_INVENTORY: readonly CleanV2WriteInventoryEntry[] =
  Object.freeze([
    entry({
      id: "CV2-F01",
      table: "users",
      owner: "users",
      mechanism: "RAW_SQL_INSERT",
      prerequisiteFixture: true,
      workflowAction: false,
      migrationOrParityControl: false,
      stableIdentityProven: true,
      currentDisposition: "KEEP_HARNESS_LOCAL_SYNTHETIC_FIXTURE",
      reason:
        "phase1@example.test appears only in TF-02; sharing it would require a new human identity decision",
    }),
    entry({
      id: "CV2-F02",
      table: "farmer_profiles",
      owner: "profiles",
      mechanism: "RAW_SQL_INSERT",
      prerequisiteFixture: true,
      workflowAction: false,
      migrationOrParityControl: false,
      stableIdentityProven: true,
      currentDisposition: "KEEP_HARNESS_LOCAL_SYNTHETIC_FIXTURE",
      reason:
        "the stable CCCD still depends on the harness-local Phase One User",
    }),
    entry({
      id: "CV2-F03",
      table: "product_categories",
      owner: "products",
      mechanism: "RAW_SQL_INSERT",
      prerequisiteFixture: true,
      workflowAction: false,
      migrationOrParityControl: false,
      stableIdentityProven: true,
      currentDisposition: "KEEP_HARNESS_LOCAL_SYNTHETIC_FIXTURE",
      reason:
        "phase-one-category has no exact canonical reference mapping and is explicit retained authority",
    }),
    entry({
      id: "CV2-F04",
      table: "products",
      owner: "products",
      mechanism: "RAW_SQL_INSERT",
      prerequisiteFixture: true,
      workflowAction: false,
      migrationOrParityControl: false,
      stableIdentityProven: false,
      currentDisposition: "KEEP_HARNESS_LOCAL_SYNTHETIC_FIXTURE",
      reason:
        "the SKU-less Phase One Product and its synthetic category are explicit retained authority",
    }),
    entry({
      id: "CV2-F05",
      table: "reviews",
      owner: "reviews",
      mechanism: "RAW_SQL_INSERT",
      prerequisiteFixture: true,
      workflowAction: false,
      migrationOrParityControl: false,
      stableIdentityProven: true,
      currentDisposition: "KEEP_HARNESS_LOCAL_SYNTHETIC_FIXTURE",
      reason:
        "the unique reviewer/Product pair depends on two harness-local parents",
    }),
    entry({
      id: "CV2-F06",
      table: "notifications",
      owner: "notifications",
      mechanism: "RAW_SQL_INSERT",
      prerequisiteFixture: true,
      workflowAction: false,
      migrationOrParityControl: false,
      stableIdentityProven: false,
      currentDisposition: "KEEP_HARNESS_LOCAL_SYNTHETIC_FIXTURE",
      reason: "no persisted non-generated notification identity is proven",
    }),
    entry({
      id: "CV2-F07",
      table: "provinces",
      owner: "geography",
      mechanism: "RAW_SQL_INSERT",
      prerequisiteFixture: true,
      workflowAction: false,
      migrationOrParityControl: false,
      stableIdentityProven: true,
      currentDisposition: "KEEP_HARNESS_LOCAL_SYNTHETIC_FIXTURE",
      reason:
        "P1 is a compatibility-specific synthetic code absent from canonical Geography reference data",
    }),
    entry({
      id: "CV2-F08",
      table: "districts",
      owner: "geography",
      mechanism: "RAW_SQL_INSERT",
      prerequisiteFixture: true,
      workflowAction: false,
      migrationOrParityControl: false,
      stableIdentityProven: false,
      currentDisposition: "KEEP_HARNESS_LOCAL_SYNTHETIC_FIXTURE",
      reason:
        "D1 is not schema-unique and its parent is the synthetic Phase One Province",
    }),
    entry({
      id: "CV2-F09",
      table: "stored_files",
      owner: "storage",
      mechanism: "RAW_SQL_INSERT",
      prerequisiteFixture: true,
      workflowAction: false,
      migrationOrParityControl: false,
      stableIdentityProven: true,
      currentDisposition: "KEEP_HARNESS_LOCAL_SYNTHETIC_FIXTURE",
      reason: "the unique object key still depends on the harness-local owner",
    }),
    entry({
      id: "CV2-F10",
      table: "ad_packages",
      owner: "ads",
      mechanism: "RAW_SQL_INSERT",
      prerequisiteFixture: true,
      workflowAction: false,
      migrationOrParityControl: false,
      stableIdentityProven: false,
      currentDisposition: "KEEP_HARNESS_LOCAL_SYNTHETIC_FIXTURE",
      reason:
        "Phase One Package declares no canonical package code and its generated ID is part of the compatibility setup",
    }),
    entry({
      id: "CV2-F11",
      table: "ad_campaigns",
      owner: "ads",
      mechanism: "RAW_SQL_INSERT",
      prerequisiteFixture: true,
      workflowAction: false,
      migrationOrParityControl: false,
      stableIdentityProven: false,
      currentDisposition: "KEEP_HARNESS_LOCAL_SYNTHETIC_FIXTURE",
      reason:
        "the campaign has no non-generated stable key and depends on local User and Package rows",
    }),
    entry({
      id: "CV2-F12",
      table: "forum_posts",
      owner: "forum",
      mechanism: "RAW_SQL_INSERT",
      prerequisiteFixture: true,
      workflowAction: false,
      migrationOrParityControl: false,
      stableIdentityProven: false,
      currentDisposition: "KEEP_HARNESS_LOCAL_SYNTHETIC_FIXTURE",
      reason:
        "the post has only a generated-ID identity and a harness-local author",
    }),
    entry({
      id: "CV2-F13",
      table: "system_configs",
      owner: "admin",
      mechanism: "OWNER_TEST_SEED_GROUP_RECONCILIATION",
      prerequisiteFixture: true,
      workflowAction: false,
      migrationOrParityControl: false,
      stableIdentityProven: true,
      currentDisposition: "MOVE_TO_OWNER_LOCAL_TEST_PROVIDER",
      reason:
        "the schema-unique key supports Admin reads and the audit entity reference without a cross-owner dependency",
    }),
    entry({
      id: "CV2-F14",
      table: "audit_logs",
      owner: "admin",
      mechanism: "RAW_SQL_INSERT",
      prerequisiteFixture: true,
      workflowAction: false,
      migrationOrParityControl: false,
      stableIdentityProven: false,
      currentDisposition: "KEEP_HARNESS_LOCAL_SYNTHETIC_FIXTURE",
      reason:
        "the bounded audit row has no non-generated reconciliation key and uses the local actor",
    }),
    entry({
      id: "CV2-F15",
      table: "incident_reports",
      owner: "compliance",
      mechanism: "RAW_SQL_INSERT",
      prerequisiteFixture: true,
      workflowAction: false,
      migrationOrParityControl: false,
      stableIdentityProven: false,
      currentDisposition: "KEEP_HARNESS_LOCAL_SYNTHETIC_FIXTURE",
      reason:
        "the bounded compatibility row has no non-generated key and uses the local reporter",
    }),
    entry({
      id: "CV2-W01",
      table: "wishlists",
      owner: "products",
      mechanism: "OWNER_REPOSITORY_ADD_IF_ABSENT",
      prerequisiteFixture: false,
      workflowAction: true,
      migrationOrParityControl: false,
      stableIdentityProven: true,
      currentDisposition: "KEEP_HARNESS_LOCAL_WORKFLOW_ACTION",
      reason:
        "two concurrent addIfAbsent calls and the one-row assertion are the behavior under test",
    }),
    entry({
      id: "CV2-W02",
      table: "products",
      owner: "products",
      mechanism: "OWNER_REPOSITORY_VIEW_COUNT_INCREMENT",
      prerequisiteFixture: false,
      workflowAction: true,
      migrationOrParityControl: false,
      stableIdentityProven: false,
      currentDisposition: "KEEP_HARNESS_LOCAL_WORKFLOW_ACTION",
      reason:
        "the Product detail read intentionally increments viewCount on the SKU-less local Product and the harness waits for that asynchronous write",
    }),
    ...[
      ["CV2-C01", "database", "CREATE_DISPOSABLE_DATABASE"],
      ["CV2-C02", "schema", "FIRST_MIGRATION_UP"],
      ["CV2-C03", "schema", "SECOND_MIGRATION_NOOP_VERIFICATION"],
      ["CV2-C04", "schema", "MIGRATION_DOWN_CYCLE"],
      ["CV2-C05", "schema", "MIGRATION_RERUN"],
      ["CV2-C06", "baseline_artifacts", "VERIFY_OR_WRITE_BASELINES"],
      ["CV2-C07", "migrations_v2", "DROP_LINEAGE_TABLE"],
      ["CV2-C08", "schema_lineage", "APPLY_EXISTING_SCHEMA_ONBOARDING"],
      ["CV2-C09", "database", "DROP_DISPOSABLE_DATABASE"],
    ].map(([id, table, mechanism]) =>
      entry({
        id,
        table,
        owner: "persistence-harness",
        mechanism,
        prerequisiteFixture: false,
        workflowAction: false,
        migrationOrParityControl: true,
        stableIdentityProven: false,
        currentDisposition: "KEEP_HARNESS_CONTROL",
        reason:
          "required migration, parity, baseline, or disposable lifecycle control",
      }),
    ),
  ]);
