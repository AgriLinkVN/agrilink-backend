import { readFileSync } from "fs";
import { resolve } from "path";

import {
  assertCatalogParity,
  assertTypeOrmCompatibilityParity,
  verifyCanonicalParity,
} from "../database/reconciliation/parity-verifier";
import { readCatalogManifest } from "../database/reconciliation/baseline-artifacts";
import {
  getMigrationNames,
  V2_MIGRATIONS,
} from "../database/migration-registry";

type Parity = Awaited<ReturnType<typeof verifyCanonicalParity>>;

describe("persistence parity commands", () => {
  it("routes catalog and TypeORM compatibility to distinct entry points", () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
    ) as { scripts: Record<string, string> };

    expect(packageJson.scripts["persistence:schema-parity"]).toContain(
      "persistence-schema-parity.ts",
    );
    expect(
      packageJson.scripts["persistence:typeorm-compatibility-parity"],
    ).toContain("persistence-typeorm-compatibility-parity.ts");
    expect(packageJson.scripts["persistence:schema-parity"]).not.toBe(
      packageJson.scripts["persistence:typeorm-compatibility-parity"],
    );
  });

  it("asserts catalog and TypeORM compatibility independently", () => {
    const parity = {
      catalog: { diffCount: 0 },
      typeOrm: {
        unexpectedCount: 1,
        staleManifestCount: 0,
        catalogMismatchCount: 0,
      },
    } as Parity;

    expect(() => assertCatalogParity(parity)).not.toThrow();
    expect(() => assertTypeOrmCompatibilityParity(parity)).toThrow(
      "TypeORM compatibility parity failed",
    );
  });

  it("labels the catalog with the latest represented v2 migration", () => {
    const migrationNames = getMigrationNames(V2_MIGRATIONS);
    expect(readCatalogManifest().migration).toBe(
      migrationNames[migrationNames.length - 1],
    );
  });
});
