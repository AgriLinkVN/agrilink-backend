import * as fs from "fs";
import * as path from "path";

import { CatalogSnapshot } from "../../src/database/reconciliation/catalog-inspector";
import {
  parseTypeOrmDropOperation,
  TypeOrmCompatibilityEntry,
  TypeOrmCompatibilityManifest,
  verifyTypeOrmCompatibilityParity,
} from "../../src/database/reconciliation/typeorm-compatibility-parity";

interface CatalogManifest {
  snapshot: CatalogSnapshot;
}

describe("TypeORM compatibility parity", () => {
  const catalog = readJson<CatalogManifest>(
    "docs/architecture/persistence/baselines/canonical-baseline-v2-catalog.json",
  ).snapshot;
  const manifest = readJson<TypeOrmCompatibilityManifest>(
    "docs/architecture/persistence/typeorm-compatibility-manifest.json",
  );
  const rawSql = manifest.entries.map(toTypeOrmDrop);

  it("maps every exact drop operation one-to-one", () => {
    const result = verifyTypeOrmCompatibilityParity(
      rawSql,
      catalog,
      manifest,
      new Date("2026-07-24T00:00:00Z"),
    );
    expect(result).toMatchObject({
      rawDiffCount: manifest.entries.length,
      reviewedCompatibilityCount: manifest.entries.length,
      unexpected: [],
      staleManifestEntries: [],
      catalogMismatches: [],
    });
  });

  it("fails stale, unexpected, changed, duplicate and expired entries", () => {
    const stale = verifyTypeOrmCompatibilityParity(
      rawSql.slice(1),
      catalog,
      manifest,
      new Date("2026-07-24T00:00:00Z"),
    );
    expect(stale.staleManifestEntries).toHaveLength(1);

    const unexpected = verifyTypeOrmCompatibilityParity(
      [...rawSql, 'DROP TABLE "public"."reviews"'],
      catalog,
      manifest,
      new Date("2026-07-24T00:00:00Z"),
    );
    expect(unexpected.unexpected).toHaveLength(1);

    const changed = cloneManifest(manifest);
    changed.entries[0].expectedDefinition = "{}";
    expect(
      verifyTypeOrmCompatibilityParity(
        rawSql,
        catalog,
        changed,
        new Date("2026-07-24T00:00:00Z"),
      ).catalogMismatches.some(({ reason }) =>
        reason.includes("definition differs"),
      ),
    ).toBe(true);

    const duplicate = cloneManifest(manifest);
    duplicate.entries.push({ ...duplicate.entries[0] });
    expect(
      verifyTypeOrmCompatibilityParity(
        rawSql,
        catalog,
        duplicate,
        new Date("2026-07-24T00:00:00Z"),
      ).catalogMismatches.some(({ reason }) =>
        reason.includes("duplicate manifest key"),
      ),
    ).toBe(true);

    const expired = cloneManifest(manifest);
    expired.entries[0].expiresAt = "2025-01-01";
    expect(
      verifyTypeOrmCompatibilityParity(
        rawSql,
        catalog,
        expired,
        new Date("2026-07-24T00:00:00Z"),
      ).catalogMismatches.some(({ reason }) => reason.includes("expired")),
    ).toBe(true);
  });

  it("parses only exact TypeORM drop-object grammar", () => {
    expect(
      parseTypeOrmDropOperation(
        'ALTER TABLE "reviews" DROP CONSTRAINT "CHK_reviews_rating_range"',
      ),
    ).toMatchObject({
      schema: "public",
      table: "reviews",
      kind: "constraint",
      objectName: "CHK_reviews_rating_range",
    });
    expect(
      parseTypeOrmDropOperation(
        'DROP INDEX "public"."IDX_reviews_reviewer_product_unique"',
      ),
    ).toMatchObject({
      schema: "public",
      table: null,
      kind: "index",
      objectName: "IDX_reviews_reviewer_product_unique",
    });
    expect(
      parseTypeOrmDropOperation(
        'ALTER TABLE "farmer_profiles" DROP COLUMN "farm_name"',
      ),
    ).toMatchObject({
      schema: "public",
      table: "farmer_profiles",
      kind: "column",
      objectName: "farm_name",
    });
    expect(() => parseTypeOrmDropOperation('DROP TABLE "reviews"')).toThrow(
      "not an exact drop-object",
    );
  });
});

function toTypeOrmDrop(entry: TypeOrmCompatibilityEntry): string {
  if (entry.objectType === "index") {
    return `DROP INDEX "${entry.schema}"."${entry.objectName}"`;
  }
  if (entry.objectType === "column") {
    return `ALTER TABLE "${entry.table}" DROP COLUMN "${entry.objectName}"`;
  }
  return `ALTER TABLE "${entry.table}" DROP CONSTRAINT "${entry.objectName}"`;
}

function readJson<T>(relative: string): T {
  return JSON.parse(
    fs.readFileSync(path.join(process.cwd(), relative), "utf8"),
  ) as T;
}

function cloneManifest(
  value: TypeOrmCompatibilityManifest,
): TypeOrmCompatibilityManifest {
  return JSON.parse(JSON.stringify(value)) as TypeOrmCompatibilityManifest;
}
