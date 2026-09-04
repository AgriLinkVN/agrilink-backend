import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";
import { getMetadataArgsStorage } from "typeorm";

import { AdCampaign } from "../../modules/ads/infrastructure/persistence/entities/ad-campaign.entity";
import { AdPackage } from "../../modules/ads/infrastructure/persistence/entities/ad-package.entity";
import { getMigrationNames, V2_MIGRATIONS } from "../migration-registry";

const databaseRoot = join(__dirname, "..");
const sourceRoot = join(databaseRoot, "..");
const a1Source = readFileSync(
  join(__dirname, "1800000003000-ExpandAdPackageReferenceIdentity.ts"),
  "utf8",
).replace(/\r\n/g, "\n");
const a2Source = readFileSync(
  join(
    __dirname,
    "1800000004000-BackfillAndContractAdPackageReferenceIdentity.ts",
  ),
  "utf8",
).replace(/\r\n/g, "\n");
const upSource =
  a2Source.match(/async up\([\s\S]*?\{([\s\S]*?)\n  \}\n\n  async down/)?.[1] ??
  "";
const downSource =
  a2Source.match(/async down\([\s\S]*?\{([\s\S]*?)\n  \}\n\}/)?.[1] ?? "";
const firstUpdateIndex = upSource.indexOf('UPDATE "ad_packages"');
const preflightSource = upSource.slice(0, firstUpdateIndex);
const updateStatements = [
  ...upSource.matchAll(
    /UPDATE "ad_packages"([\s\S]*?)(?=\n\s*`\);\n\n\s*await queryRunner\.query|\n\s*`\);\n\s*\})/g,
  ),
].map((match) => match[0]);

function readRuntimeTypeScript(root: string): string {
  return readdirSync(root)
    .flatMap((entry) => {
      const file = join(root, entry);
      if (statSync(file).isDirectory()) return readRuntimeTypeScript(file);
      return entry.endsWith(".ts") && !entry.endsWith(".spec.ts")
        ? readFileSync(file, "utf8")
        : "";
    })
    .join("\n");
}

describe("P8-05C3C2A2 Ad Package identifier backfill and contract", () => {
  it("preserves A1 as the nullable column and unique-constraint owner", () => {
    expect(a1Source).toContain('ADD COLUMN "package_code" varchar(64)');
    expect(a1Source).toContain(
      'ADD CONSTRAINT "UQ_ad_packages_package_code" UNIQUE ("package_code")',
    );
    expect(a1Source).not.toMatch(/\bUPDATE\b/);
    expect(a1Source).not.toContain("SET NOT NULL");
    expect(a1Source).toContain('DROP CONSTRAINT "UQ_ad_packages_package_code"');
    expect(a1Source).toContain('DROP COLUMN "package_code"');
  });

  it("orders A2 immediately after A1", () => {
    const names = getMigrationNames(V2_MIGRATIONS);
    const a1Index = names.indexOf(
      "ExpandAdPackageReferenceIdentity1800000003000",
    );
    const a2Index = names.indexOf(
      "BackfillAndContractAdPackageReferenceIdentity1800000004000",
    );

    expect(a1Index).toBeGreaterThanOrEqual(0);
    expect(a2Index).toBe(a1Index + 1);
  });

  it("preflights all three ambiguous fingerprints before any update", () => {
    expect(firstUpdateIndex).toBeGreaterThan(0);
    expect(preflightSource.match(/SELECT count\(\*\)/g)).toHaveLength(3);
    expect(preflightSource.match(/\) > 1 THEN/g)).toHaveLength(3);
    expect(
      preflightSource.match(/Ambiguous legacy Ad Package fingerprint/g),
    ).toHaveLength(3);
    expect(preflightSource).toContain(
      "Unexpected existing Ad Package package_code",
    );
    expect(preflightSource).toContain('"package_code" NOT IN');
  });

  it("binds each approved code to its exact fingerprint before any update", () => {
    expect(
      preflightSource.match(/is attached to the wrong Ad Package fingerprint/g),
    ).toHaveLength(3);
    for (const code of [
      "HOMEPAGE_CAROUSEL",
      "FEATURED_PRODUCT",
      "SPOTLIGHT_PLACEMENT",
    ]) {
      expect(preflightSource).toContain(`"package_code" = '${code}'`);
    }
    expect(preflightSource.match(/\) IS NOT TRUE/g)).toHaveLength(6);
  });

  it("rejects unknown/custom NULL rows before the first update", () => {
    const unresolvedMessage =
      "Unresolved Ad Package row requires explicit package_code mapping";
    expect(preflightSource).toContain('WHERE "package_code" IS NULL');
    expect(preflightSource).toContain(unresolvedMessage);
    expect(preflightSource.indexOf(unresolvedMessage)).toBeLessThan(
      firstUpdateIndex,
    );
  });

  it("uses exactly three full-fingerprint NULL-only assignments", () => {
    expect(updateStatements).toHaveLength(3);
    expect(
      updateStatements.map(
        (statement) => statement.match(/SET "package_code" = '([^']+)'/)?.[1],
      ),
    ).toEqual(["HOMEPAGE_CAROUSEL", "FEATURED_PRODUCT", "SPOTLIGHT_PLACEMENT"]);

    const fingerprints = [
      [
        "Banner chính (Carousel)",
        "'banner'",
        "500000",
        '"duration_days" = 30',
        "Hiển thị trên carousel trang chủ",
        '"max_impressions" = 10000',
      ],
      [
        "Sản phẩm nổi bật",
        "'featured'",
        "300000",
        '"duration_days" = 14',
        "Sản phẩm được gắn nhãn nổi bật",
        '"max_impressions" = 5000',
      ],
      [
        "Spotlight tuần",
        "'spotlight'",
        "700000",
        '"duration_days" = 7',
        "Hiển thị spotlight nổi bật 7 ngày",
        '"max_impressions" = 20000',
      ],
    ];

    updateStatements.forEach((statement, index) => {
      expect(statement).toContain('WHERE "package_code" IS NULL');
      expect(statement).toContain('"is_active" IS TRUE');
      for (const evidence of fingerprints[index]) {
        expect(statement).toContain(evidence);
      }
    });
  });

  it("never uses numeric id, position, name alone, or ad type alone", () => {
    const updates = updateStatements.join("\n");
    expect(updates).not.toMatch(
      /"id"|\bORDER BY\b|\bLIMIT\b|\bOFFSET\b|\bROW_NUMBER\b|\bARRAY_POSITION\b/i,
    );
    for (const statement of updateStatements) {
      expect(statement).toContain('"name" =');
      expect(statement).toContain('"type" =');
      expect(statement).toContain('"price" =');
      expect(statement).toContain('"duration_days" =');
      expect(statement).toContain('"description" =');
      expect(statement).toContain('"is_active" IS TRUE');
      expect(statement).toContain('"max_impressions" =');
    }
  });

  it("allows zero matches but fails closed on conflicts and unresolved rows", () => {
    expect(upSource).not.toMatch(
      /GET DIAGNOSTICS|ROW_COUNT|= 0 THEN|<> 1 THEN/,
    );
    expect(preflightSource.match(/Conflicting package_code/g)).toHaveLength(3);
    expect(
      preflightSource.match(/already assigned to another Package/g),
    ).toHaveLength(3);

    const unresolvedIndex = upSource.lastIndexOf(
      'WHERE "package_code" IS NULL',
    );
    const contractIndex = upSource.indexOf(
      'ALTER COLUMN "package_code" SET NOT NULL',
    );
    expect(unresolvedIndex).toBeGreaterThan(
      upSource.lastIndexOf('UPDATE "ad_packages"'),
    );
    expect(upSource.slice(unresolvedIndex, contractIndex)).toContain(
      "Unresolved Ad Package row requires explicit package_code mapping",
    );
    expect(contractIndex).toBeGreaterThan(
      upSource.lastIndexOf("RAISE EXCEPTION"),
    );
  });

  it("makes DOWN non-destructive and leaves A1 objects in place", () => {
    expect(downSource).toContain('ALTER COLUMN "package_code" DROP NOT NULL');
    expect(downSource).not.toMatch(/\bUPDATE\b|\bDELETE\b/);
    expect(downSource).not.toMatch(/DROP COLUMN|DROP CONSTRAINT/);
    expect(downSource).not.toContain("UQ_ad_packages_package_code");
  });

  it("contracts entity nullability while preserving numeric PK and Campaign FK", () => {
    const columns = getMetadataArgsStorage().columns;
    const packageCode = columns.find(
      ({ target, propertyName }) =>
        target === AdPackage && propertyName === "packageCode",
    );
    const id = columns.find(
      ({ target, propertyName }) =>
        target === AdPackage && propertyName === "id",
    );
    const packageId = columns.find(
      ({ target, propertyName }) =>
        target === AdCampaign && propertyName === "packageId",
    );

    expect(packageCode?.options).toEqual(
      expect.objectContaining({
        name: "package_code",
        type: "varchar",
        length: 64,
        nullable: false,
      }),
    );
    expect(id?.options).toEqual(expect.objectContaining({ primary: true }));
    expect(packageId?.options).toEqual(
      expect.objectContaining({ name: "package_id", type: "int" }),
    );
  });

  it("preserves public API, seed ownership, central writers, and reset debt", () => {
    const entitySource = readFileSync(
      join(
        sourceRoot,
        "modules",
        "ads",
        "infrastructure",
        "persistence",
        "entities",
        "ad-package.entity.ts",
      ),
      "utf8",
    );
    const modelSource = readFileSync(
      join(
        sourceRoot,
        "modules",
        "ads",
        "application",
        "models",
        "ads.model.ts",
      ),
      "utf8",
    );
    const runtimeSource = readRuntimeTypeScript(sourceRoot);

    expect(entitySource).toMatch(/packageCode:\s*string;/);
    expect(modelSource).not.toContain("packageCode");
    expect(runtimeSource.match(/ads\.reference\.packages/g)).toHaveLength(1);
    expect(existsSync(join(databaseRoot, "dev-seed.service.ts"))).toBe(false);
  });
});
