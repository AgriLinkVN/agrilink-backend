import { DataSource } from "typeorm";

import {
  captureCatalogSnapshot,
  catalogFingerprint,
  catalogObjectCount,
  diffCatalogSnapshots,
} from "./catalog-inspector";
import {
  readCatalogManifest,
  readTypeOrmCompatibilityManifest,
} from "./baseline-artifacts";
import { verifyTypeOrmCompatibilityParity } from "./typeorm-compatibility-parity";

export async function verifyCanonicalParity(dataSource: DataSource) {
  const expected = readCatalogManifest();
  const compatibilityManifest = readTypeOrmCompatibilityManifest();
  const actual = await captureCatalogSnapshot(dataSource);
  const catalogDifferences = diffCatalogSnapshots(expected.snapshot, actual);
  const rawSchemaLog = await dataSource.driver.createSchemaBuilder().log();
  const compatibility = verifyTypeOrmCompatibilityParity(
    rawSchemaLog.upQueries.map(({ query }) => query),
    actual,
    compatibilityManifest,
  );

  return {
    catalog: {
      expectedObjectCount: expected.objectCount,
      actualObjectCount: catalogObjectCount(actual),
      expectedFingerprint: expected.fingerprint,
      actualFingerprint: catalogFingerprint(actual),
      diffCount: catalogDifferences.length,
      differences: catalogDifferences,
    },
    typeOrm: {
      rawDiffCount: compatibility.rawDiffCount,
      reviewedCompatibilityCount: compatibility.reviewedCompatibilityCount,
      unexpectedCount: compatibility.unexpected.length,
      staleManifestCount: compatibility.staleManifestEntries.length,
      catalogMismatchCount: compatibility.catalogMismatches.length,
      unexpected: compatibility.unexpected,
      staleManifestEntries: compatibility.staleManifestEntries,
      catalogMismatches: compatibility.catalogMismatches,
    },
  };
}

export function assertCanonicalParity(
  parity: Awaited<ReturnType<typeof verifyCanonicalParity>>,
): void {
  if (
    parity.catalog.diffCount !== 0 ||
    parity.typeOrm.unexpectedCount !== 0 ||
    parity.typeOrm.staleManifestCount !== 0 ||
    parity.typeOrm.catalogMismatchCount !== 0
  ) {
    throw new Error(
      `Canonical schema parity failed: ${JSON.stringify(parity, null, 2)}`,
    );
  }
}
