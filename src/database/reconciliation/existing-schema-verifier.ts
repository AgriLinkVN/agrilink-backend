import * as fs from "fs";
import * as path from "path";
import { DataSource, QueryRunner } from "typeorm";

import {
  captureCatalogSnapshot,
  catalogFingerprint,
  diffCatalogSnapshots,
} from "./catalog-inspector";
import { readCatalogManifest } from "./baseline-artifacts";

interface BaselineDecision {
  schema: string;
  table: string;
  includeInBaselineV2: boolean;
  group: "A" | "B" | "C" | "D" | "E";
  reconciliationOwner: string;
}

interface BaselineDecisionMatrix {
  entries: BaselineDecision[];
}

interface CountRow {
  count: string;
}

const GROUP_B_TABLES = [
  "users",
  "farmer_profiles",
  "cooperative_profiles",
  "enterprise_profiles",
  "supplier_profiles",
  "products",
  "product_certifications",
  "reviews",
] as const;

const STORAGE_REFERENCE_COLUMNS = [
  ["farmer_profiles", "cccd_front_file_id"],
  ["farmer_profiles", "cccd_back_file_id"],
  ["cooperative_profiles", "cooperative_cert_file_id"],
  ["cooperative_profiles", "business_license_file_id"],
  ["cooperative_profiles", "representative_cccd_front_file_id"],
  ["cooperative_profiles", "representative_cccd_back_file_id"],
  ["cooperative_profiles", "members_list_file_id"],
  ["enterprise_profiles", "business_license_file_id"],
  ["supplier_profiles", "business_license_file_id"],
  ["product_certifications", "stored_file_id"],
] as const;

const STORAGE_COMPATIBILITY_PAIRS = [
  ["farmer_profiles", "cccd_front_url", "cccd_front_file_id"],
  ["farmer_profiles", "cccd_back_url", "cccd_back_file_id"],
  ["cooperative_profiles", "cooperative_cert_url", "cooperative_cert_file_id"],
  ["cooperative_profiles", "business_license_url", "business_license_file_id"],
  [
    "cooperative_profiles",
    "representative_cccd_front_url",
    "representative_cccd_front_file_id",
  ],
  [
    "cooperative_profiles",
    "representative_cccd_back_url",
    "representative_cccd_back_file_id",
  ],
  ["cooperative_profiles", "members_list_url", "members_list_file_id"],
  ["enterprise_profiles", "business_license_url", "business_license_file_id"],
  ["supplier_profiles", "business_license_url", "business_license_file_id"],
  ["product_certifications", "document_url", "stored_file_id"],
] as const;

export interface ExistingSchemaReport {
  database: {
    serverVersion: string;
    database: string;
    schema: string;
    user: string;
    readOnly: boolean;
  };
  lineage: {
    ledgers: Array<{ table: string; rows: number }>;
    classification:
      | "canonical-v2"
      | "canonical-unregistered"
      | "reconciliation-required";
  };
  fingerprint: string;
  catalog: {
    tableCount: number;
    mismatchCount: number;
    mismatches: ReturnType<typeof diffCatalogSnapshots>;
    knownPreservedExtras: Array<{
      table: string;
      group: string;
      owner: string;
      rows: number;
    }>;
    unknownTables: Array<{ table: string; rows: number }>;
  };
  groupB: {
    rowCounts: Record<string, number>;
    blockers: Array<{ check: string; count: number }>;
  };
  storage: {
    occupancy: Array<{
      table: string;
      urlColumn: string;
      fileIdColumn: string;
      urlOnly: number;
      fileIdOnly: number;
      both: number;
    }>;
    orphanReferences: Array<{
      table: string;
      column: string;
      count: number;
    }>;
  };
  wishlist: Array<{
    table: string;
    rows: number;
    duplicatePairs: number | null;
    foreignKeys: number;
  }>;
  result: "PASS" | "RECONCILIATION_REQUIRED";
  blockers: string[];
}

export async function verifyExistingSchema(
  dataSource: DataSource,
  schema = "public",
): Promise<ExistingSchemaReport> {
  const runner = dataSource.createQueryRunner();
  await runner.connect();
  await runner.startTransaction();
  try {
    await runner.query("SET TRANSACTION READ ONLY");
    const identity = await readIdentity(runner);
    const snapshot = await captureCatalogSnapshot(runner, schema);
    const expected = readCatalogManifest();
    const mismatches = diffCatalogSnapshots(expected.snapshot, snapshot);
    const decisions = readDecisionMatrix();
    const rowCounts = await readRowCounts(
      runner,
      snapshot.tables.map(({ name }) => name),
    );
    const ledgers = await readLedgers(runner, schema);
    const knownTableDecisions = new Map(
      decisions.entries.map((entry) => [entry.table, entry]),
    );
    const knownPreservedExtras = snapshot.tables
      .filter(({ name }) => {
        const decision = knownTableDecisions.get(name);
        return decision && !decision.includeInBaselineV2;
      })
      .map(({ name }) => {
        const decision = knownTableDecisions.get(name)!;
        return {
          table: name,
          group: decision.group,
          owner: decision.reconciliationOwner,
          rows: rowCounts[name],
        };
      });
    const unknownTables = snapshot.tables
      .filter(({ name }) => !knownTableDecisions.has(name))
      .map(({ name }) => ({ table: name, rows: rowCounts[name] }));
    const groupBRowCounts = Object.fromEntries(
      GROUP_B_TABLES.map((table) => [table, rowCounts[table] ?? 0]),
    );
    const groupBBlockers = await readGroupBBlockers(runner, snapshot);
    const occupancy = await readStorageOccupancy(runner, snapshot);
    const orphanReferences = await readStorageOrphans(runner, snapshot);
    const wishlist = await readWishlistEvidence(runner, snapshot, rowCounts);
    const hasV2Ledger = ledgers.some(
      ({ table, rows }) => table === "migrations_v2" && rows > 0,
    );
    const exactCanonical = mismatches.length === 0;
    const blockers = [
      ...groupBBlockers
        .filter(({ count }) => count > 0)
        .map(({ check, count }) => `${check}: ${count}`),
      ...orphanReferences
        .filter(({ count }) => count > 0)
        .map(
          ({ table, column, count }) => `${table}.${column} orphans: ${count}`,
        ),
      ...unknownTables.map(({ table }) => `unknown table: ${table}`),
    ];

    return {
      database: {
        serverVersion: identity.server_version,
        database: identity.database,
        schema,
        user: identity.user_name,
        readOnly: true,
      },
      lineage: {
        ledgers,
        classification: exactCanonical
          ? hasV2Ledger
            ? "canonical-v2"
            : "canonical-unregistered"
          : "reconciliation-required",
      },
      fingerprint: catalogFingerprint(snapshot),
      catalog: {
        tableCount: snapshot.tables.length,
        mismatchCount: mismatches.length,
        mismatches,
        knownPreservedExtras,
        unknownTables,
      },
      groupB: {
        rowCounts: groupBRowCounts,
        blockers: groupBBlockers,
      },
      storage: {
        occupancy,
        orphanReferences,
      },
      wishlist,
      result:
        exactCanonical && blockers.length === 0
          ? "PASS"
          : "RECONCILIATION_REQUIRED",
      blockers,
    };
  } finally {
    await runner.rollbackTransaction();
    await runner.release();
  }
}

async function readIdentity(runner: QueryRunner) {
  const [row] = (await runner.query(
    `
      SELECT current_setting('server_version') AS server_version,
             current_database() AS database,
             current_user AS user_name
    `,
  )) as Array<{
    server_version: string;
    database: string;
    user_name: string;
  }>;
  return row;
}

async function readRowCounts(
  runner: QueryRunner,
  tables: string[],
): Promise<Record<string, number>> {
  const result: Record<string, number> = {};
  for (const table of tables) {
    assertIdentifier(table);
    const [row] = (await runner.query(
      `SELECT COUNT(*)::text AS count FROM "public"."${table}"`,
    )) as CountRow[];
    result[table] = Number(row.count);
  }
  return result;
}

async function readLedgers(
  runner: QueryRunner,
  schema: string,
): Promise<Array<{ table: string; rows: number }>> {
  const existing = (await runner.query(
    `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = $1
        AND table_name IN ('migrations', 'migrations_v2')
      ORDER BY table_name
    `,
    [schema],
  )) as Array<{ table_name: string }>;
  const ledgers = existing.map(({ table_name }) => table_name);
  const result: Array<{ table: string; rows: number }> = [];
  for (const table of ledgers) {
    const [row] = (await runner.query(
      `SELECT COUNT(*)::text AS count FROM "${schema}"."${table}"`,
    )) as CountRow[];
    result.push({ table, rows: Number(row.count) });
  }
  return result;
}

async function readGroupBBlockers(
  runner: QueryRunner,
  snapshot: Awaited<ReturnType<typeof captureCatalogSnapshot>>,
): Promise<Array<{ check: string; count: number }>> {
  const result: Array<{ check: string; count: number }> = [];
  if (hasColumn(snapshot, "users", "email")) {
    result.push({
      check: "users.email is null",
      count: await scalarCount(
        runner,
        `SELECT COUNT(*)::text AS count FROM "public"."users" WHERE "email" IS NULL`,
      ),
    });
  }
  if (
    hasColumn(snapshot, "reviews", "reviewer_id") &&
    hasColumn(snapshot, "reviews", "product_id")
  ) {
    result.push({
      check: "reviews duplicate reviewer/product pairs",
      count: await scalarCount(
        runner,
        `
          SELECT COUNT(*)::text AS count
          FROM (
            SELECT reviewer_id, product_id
            FROM "public"."reviews"
            WHERE product_id IS NOT NULL
            GROUP BY reviewer_id, product_id
            HAVING COUNT(*) > 1
          ) duplicate_pairs
        `,
      ),
    });
  }
  return result;
}

async function readStorageOccupancy(
  runner: QueryRunner,
  snapshot: Awaited<ReturnType<typeof captureCatalogSnapshot>>,
) {
  const result: ExistingSchemaReport["storage"]["occupancy"] = [];
  for (const [table, urlColumn, fileIdColumn] of STORAGE_COMPATIBILITY_PAIRS) {
    if (
      !hasColumn(snapshot, table, urlColumn) ||
      !hasColumn(snapshot, table, fileIdColumn)
    ) {
      continue;
    }
    const [row] = (await runner.query(
      `
        SELECT
          COUNT(*) FILTER (WHERE "${urlColumn}" IS NOT NULL AND "${fileIdColumn}" IS NULL)::text AS url_only,
          COUNT(*) FILTER (WHERE "${urlColumn}" IS NULL AND "${fileIdColumn}" IS NOT NULL)::text AS file_id_only,
          COUNT(*) FILTER (WHERE "${urlColumn}" IS NOT NULL AND "${fileIdColumn}" IS NOT NULL)::text AS both
        FROM "public"."${table}"
      `,
    )) as Array<{ url_only: string; file_id_only: string; both: string }>;
    result.push({
      table,
      urlColumn,
      fileIdColumn,
      urlOnly: Number(row.url_only),
      fileIdOnly: Number(row.file_id_only),
      both: Number(row.both),
    });
  }
  return result;
}

async function readStorageOrphans(
  runner: QueryRunner,
  snapshot: Awaited<ReturnType<typeof captureCatalogSnapshot>>,
) {
  const result: ExistingSchemaReport["storage"]["orphanReferences"] = [];
  if (!snapshot.tables.some(({ name }) => name === "stored_files"))
    return result;
  for (const [table, column] of STORAGE_REFERENCE_COLUMNS) {
    if (!hasColumn(snapshot, table, column)) continue;
    const count = await scalarCount(
      runner,
      `
        SELECT COUNT(*)::text AS count
        FROM "public"."${table}" owner_record
        LEFT JOIN "public"."stored_files" stored_file
          ON stored_file.id = owner_record."${column}"
        WHERE owner_record."${column}" IS NOT NULL
          AND stored_file.id IS NULL
      `,
    );
    result.push({ table, column, count });
  }
  return result;
}

async function readWishlistEvidence(
  runner: QueryRunner,
  snapshot: Awaited<ReturnType<typeof captureCatalogSnapshot>>,
  rowCounts: Record<string, number>,
) {
  const result: ExistingSchemaReport["wishlist"] = [];
  for (const table of ["wishlists", "product_wishlist", "product_wishlists"]) {
    const catalogTable = snapshot.tables.find(({ name }) => name === table);
    if (!catalogTable) continue;
    const canCountPairs = ["user_id", "product_id"].every((column) =>
      hasColumn(snapshot, table, column),
    );
    result.push({
      table,
      rows: rowCounts[table],
      duplicatePairs: canCountPairs
        ? await scalarCount(
            runner,
            `
              SELECT COUNT(*)::text AS count
              FROM (
                SELECT user_id, product_id
                FROM "public"."${table}"
                GROUP BY user_id, product_id
                HAVING COUNT(*) > 1
              ) duplicate_pairs
            `,
          )
        : null,
      foreignKeys: catalogTable.constraints.filter(
        ({ type }) => type === "foreign-key",
      ).length,
    });
  }
  return result;
}

async function scalarCount(runner: QueryRunner, sql: string): Promise<number> {
  const [row] = (await runner.query(sql)) as CountRow[];
  return Number(row.count);
}

function hasColumn(
  snapshot: Awaited<ReturnType<typeof captureCatalogSnapshot>>,
  table: string,
  column: string,
): boolean {
  return Boolean(
    snapshot.tables
      .find(({ name }) => name === table)
      ?.columns.some(({ name }) => name === column),
  );
}

function readDecisionMatrix(): BaselineDecisionMatrix {
  const file = path.join(
    process.cwd(),
    "docs/architecture/persistence/discovery/baseline-inclusion-matrix.json",
  );
  return JSON.parse(fs.readFileSync(file, "utf8")) as BaselineDecisionMatrix;
}

function assertIdentifier(value: string): void {
  if (!/^[a-z][a-z0-9_]*$/.test(value)) {
    throw new Error(`Unsafe catalog identifier: ${value}`);
  }
}
