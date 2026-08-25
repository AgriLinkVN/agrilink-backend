import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";
import { getMetadataArgsStorage } from "typeorm";

import { AdCampaign } from "../../modules/ads/infrastructure/persistence/entities/ad-campaign.entity";
import { AdPackage } from "../../modules/ads/infrastructure/persistence/entities/ad-package.entity";
import { getMigrationNames, V2_MIGRATIONS } from "../migration-registry";

const databaseRoot = join(__dirname, "..");
const sourceRoot = join(databaseRoot, "..");
const migrationSource = readFileSync(
  join(__dirname, "1800000003000-ExpandAdPackageReferenceIdentity.ts"),
  "utf8",
).replace(/\r\n/g, "\n");
const upSource =
  migrationSource.match(
    /async up\([\s\S]*?\{([\s\S]*?)\n  \}\n\n  async down/,
  )?.[1] ?? "";
const downSource =
  migrationSource.match(/async down\([\s\S]*?\{([\s\S]*?)\n  \}\n\}/)?.[1] ??
  "";

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

describe("P8-05C3C2A1 Ad Package identifier schema expand", () => {
  it("maps the globally unique package code without changing the numeric id", () => {
    const columns = getMetadataArgsStorage().columns;
    const packageCode = columns.find(
      ({ target, propertyName }) =>
        target === AdPackage && propertyName === "packageCode",
    );
    const id = columns.find(
      ({ target, propertyName }) =>
        target === AdPackage && propertyName === "id",
    );
    const unique = getMetadataArgsStorage().uniques.find(
      ({ target, name }) =>
        target === AdPackage && name === "UQ_ad_packages_package_code",
    );

    expect(packageCode?.options).toEqual(
      expect.objectContaining({
        name: "package_code",
        type: "varchar",
        length: 64,
        nullable: false,
      }),
    );
    expect(unique?.columns).toEqual(["packageCode"]);
    expect(id?.options).toEqual(expect.objectContaining({ primary: true }));
    expect(
      getMetadataArgsStorage().generations.find(
        ({ target, propertyName }) =>
          target === AdPackage && propertyName === "id",
      )?.strategy,
    ).toBe("increment");
  });

  it("preserves the numeric Campaign package foreign key and relation", () => {
    const packageId = getMetadataArgsStorage().columns.find(
      ({ target, propertyName }) =>
        target === AdCampaign && propertyName === "packageId",
    );
    const packageRelation = getMetadataArgsStorage().relations.find(
      ({ target, propertyName }) =>
        target === AdCampaign && propertyName === "package",
    );
    const packageJoin = getMetadataArgsStorage().joinColumns.find(
      ({ target, propertyName }) =>
        target === AdCampaign && propertyName === "package",
    );

    expect(packageId?.options).toEqual(
      expect.objectContaining({ name: "package_id", type: "int" }),
    );
    expect(packageRelation?.relationType).toBe("many-to-one");
    expect(packageRelation?.options).toEqual(
      expect.objectContaining({ onDelete: "RESTRICT" }),
    );
    expect(packageJoin?.name).toBe("package_id");
  });

  it("registers one ordered A1 migration with expand-only UP SQL", () => {
    const migrationNames = getMigrationNames(V2_MIGRATIONS);
    expect(migrationNames).toContain(
      "ExpandAdPackageReferenceIdentity1800000003000",
    );
    expect(upSource).toContain('ADD COLUMN "package_code" varchar(64)');
    expect(upSource).toContain(
      'ADD CONSTRAINT "UQ_ad_packages_package_code" UNIQUE ("package_code")',
    );
    expect(upSource).not.toMatch(/\bUPDATE\b/i);
    expect(upSource).not.toMatch(/\bSET\s+NOT\s+NULL\b/i);
    expect(upSource).not.toMatch(
      /HOMEPAGE_CAROUSEL|FEATURED_PRODUCT|SPOTLIGHT_PLACEMENT/,
    );
  });

  it("reverses only the A1 constraint and column in dependency order", () => {
    const dropConstraint = 'DROP CONSTRAINT "UQ_ad_packages_package_code"';
    const dropColumn = 'DROP COLUMN "package_code"';

    expect(downSource).toContain(dropConstraint);
    expect(downSource).toContain(dropColumn);
    expect(downSource.indexOf(dropConstraint)).toBeLessThan(
      downSource.indexOf(dropColumn),
    );
  });

  it("preserves the owner seed and API after central reset retirement", () => {
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

    expect(existsSync(join(databaseRoot, "dev-seed.service.ts"))).toBe(false);
    expect(modelSource).not.toContain("packageCode");
    expect(runtimeSource.match(/ads\.reference\.packages/g)).toHaveLength(1);
  });
});
