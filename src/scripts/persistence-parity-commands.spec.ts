import { readFileSync } from "fs";
import { resolve } from "path";

import {
  assertCatalogParity,
  assertTypeOrmCompatibilityParity,
  verifyCanonicalParity,
} from "../database/reconciliation/parity-verifier";

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
});
