import * as fs from "fs";
import * as path from "path";

import { CatalogSnapshot } from "./catalog-inspector";
import { TypeOrmCompatibilityManifest } from "./typeorm-compatibility-parity";

export interface CatalogManifest {
  version: number;
  lineage: string;
  migration: string;
  fingerprint: string;
  objectCount: number;
  snapshot: CatalogSnapshot;
}

const PERSISTENCE_DOCS = path.join(
  process.cwd(),
  "docs/architecture/persistence",
);

export const CATALOG_MANIFEST_PATH = path.join(
  PERSISTENCE_DOCS,
  "baselines/canonical-baseline-v2-catalog.json",
);

export const TYPEORM_COMPATIBILITY_MANIFEST_PATH = path.join(
  PERSISTENCE_DOCS,
  "typeorm-compatibility-manifest.json",
);

export function readCatalogManifest(): CatalogManifest {
  return readJson<CatalogManifest>(CATALOG_MANIFEST_PATH);
}

export function readTypeOrmCompatibilityManifest(): TypeOrmCompatibilityManifest {
  return readJson<TypeOrmCompatibilityManifest>(
    TYPEORM_COMPATIBILITY_MANIFEST_PATH,
  );
}

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}
