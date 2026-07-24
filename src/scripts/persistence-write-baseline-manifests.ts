import "reflect-metadata";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { DataSource } from "typeorm";

import {
  captureCatalogSnapshot,
  catalogFingerprint,
  catalogObjectCount,
} from "../database/reconciliation/catalog-inspector";
import { assertDisposableDatabaseTarget } from "../database/reconciliation/database-target.guard";
import {
  CompatibilityObjectType,
  getCompatibilityObjectDefinition,
  TypeOrmCompatibilityEntry,
  TypeOrmCompatibilityManifest,
  verifyTypeOrmCompatibilityParity,
} from "../database/reconciliation/typeorm-compatibility-parity";
import { createDataSourceOptions } from "../database/data-source-options";
import {
  CLI_ENTITY_REGISTRY,
  excludeDeferredEntitiesFromSchemaBuild,
} from "../database/entity-registry";

dotenv.config();

interface CompatibilitySeed {
  table: string;
  objectType: CompatibilityObjectType;
  objectName: string;
  owner: string;
  deferredPhase: "4" | "5";
}

const COMPATIBILITY_OBJECTS: readonly CompatibilitySeed[] = [
  {
    table: "cooperative_profiles",
    objectType: "column",
    objectName: "member_count",
    owner: "profiles",
    deferredPhase: "4",
  },
  {
    table: "farmer_profiles",
    objectType: "column",
    objectName: "experience_years",
    owner: "profiles",
    deferredPhase: "4",
  },
  {
    table: "farmer_profiles",
    objectType: "column",
    objectName: "farm_name",
    owner: "profiles",
    deferredPhase: "4",
  },
  {
    table: "cooperative_profiles",
    objectType: "foreign-key",
    objectName: "FK_cooperative_profiles_members_list_file_id",
    owner: "profiles",
    deferredPhase: "4",
  },
  {
    table: "cooperative_profiles",
    objectType: "foreign-key",
    objectName: "FK_cooperative_profiles_representative_cccd_back_fi",
    owner: "profiles",
    deferredPhase: "4",
  },
  {
    table: "cooperative_profiles",
    objectType: "foreign-key",
    objectName: "FK_cooperative_profiles_representative_cccd_front_f",
    owner: "profiles",
    deferredPhase: "4",
  },
  {
    table: "cooperative_profiles",
    objectType: "foreign-key",
    objectName: "FK_cooperative_profiles_business_license_file_id",
    owner: "profiles",
    deferredPhase: "4",
  },
  {
    table: "cooperative_profiles",
    objectType: "foreign-key",
    objectName: "FK_cooperative_profiles_cooperative_cert_file_id",
    owner: "profiles",
    deferredPhase: "4",
  },
  {
    table: "enterprise_profiles",
    objectType: "foreign-key",
    objectName: "FK_enterprise_profiles_business_license_file_id",
    owner: "profiles",
    deferredPhase: "4",
  },
  {
    table: "farmer_profiles",
    objectType: "foreign-key",
    objectName: "FK_farmer_profiles_cccd_back_file_id",
    owner: "profiles",
    deferredPhase: "4",
  },
  {
    table: "farmer_profiles",
    objectType: "foreign-key",
    objectName: "FK_farmer_profiles_cccd_front_file_id",
    owner: "profiles",
    deferredPhase: "4",
  },
  {
    table: "supplier_profiles",
    objectType: "foreign-key",
    objectName: "FK_supplier_profiles_user",
    owner: "profiles",
    deferredPhase: "4",
  },
  {
    table: "supplier_profiles",
    objectType: "foreign-key",
    objectName: "FK_supplier_profiles_business_license_file_id",
    owner: "profiles",
    deferredPhase: "4",
  },
  {
    table: "product_certifications",
    objectType: "foreign-key",
    objectName: "FK_product_certifications_stored_file",
    owner: "products",
    deferredPhase: "5",
  },
  {
    table: "wishlists",
    objectType: "foreign-key",
    objectName: "FK_wishlists_user",
    owner: "products",
    deferredPhase: "5",
  },
  {
    table: "cooperative_profiles",
    objectType: "index",
    objectName: "IDX_cooperative_profiles_cooperative_cert_file_id",
    owner: "profiles",
    deferredPhase: "4",
  },
  {
    table: "cooperative_profiles",
    objectType: "index",
    objectName: "IDX_cooperative_profiles_business_license_file_id",
    owner: "profiles",
    deferredPhase: "4",
  },
  {
    table: "cooperative_profiles",
    objectType: "index",
    objectName: "IDX_cooperative_profiles_representative_cccd_front_f",
    owner: "profiles",
    deferredPhase: "4",
  },
  {
    table: "cooperative_profiles",
    objectType: "index",
    objectName: "IDX_cooperative_profiles_representative_cccd_back_fi",
    owner: "profiles",
    deferredPhase: "4",
  },
  {
    table: "cooperative_profiles",
    objectType: "index",
    objectName: "IDX_cooperative_profiles_members_list_file_id",
    owner: "profiles",
    deferredPhase: "4",
  },
  {
    table: "enterprise_profiles",
    objectType: "index",
    objectName: "IDX_enterprise_profiles_business_license_file_id",
    owner: "profiles",
    deferredPhase: "4",
  },
  {
    table: "farmer_profiles",
    objectType: "index",
    objectName: "IDX_farmer_profiles_cccd_front_file_id",
    owner: "profiles",
    deferredPhase: "4",
  },
  {
    table: "farmer_profiles",
    objectType: "index",
    objectName: "IDX_farmer_profiles_cccd_back_file_id",
    owner: "profiles",
    deferredPhase: "4",
  },
  {
    table: "supplier_profiles",
    objectType: "index",
    objectName: "IDX_supplier_profiles_business_license_file_id",
    owner: "profiles",
    deferredPhase: "4",
  },
  {
    table: "product_certifications",
    objectType: "index",
    objectName: "IDX_product_certifications_stored_file_id",
    owner: "products",
    deferredPhase: "5",
  },
  {
    table: "reviews",
    objectType: "index",
    objectName: "IDX_reviews_reviewer_product_unique",
    owner: "reviews",
    deferredPhase: "5",
  },
  {
    table: "reviews",
    objectType: "check-constraint",
    objectName: "CHK_reviews_rating_range",
    owner: "reviews",
    deferredPhase: "5",
  },
  {
    table: "stored_files",
    objectType: "check-constraint",
    objectName: "CHK_stored_files_status",
    owner: "storage",
    deferredPhase: "4",
  },
] as const;

const OUTPUT = path.join(process.cwd(), "docs/architecture/persistence");

async function main(): Promise<void> {
  if (!process.argv.includes("--write")) {
    throw new Error("Manifest generation requires explicit --write");
  }
  const database = process.env.DB_NAME ?? "";
  assertDisposableDatabaseTarget(database);
  const dataSource = new DataSource(
    createDataSourceOptions(process.env, {
      entities: CLI_ENTITY_REGISTRY,
      logging: false,
    }),
  );
  await dataSource.initialize();
  excludeDeferredEntitiesFromSchemaBuild(dataSource);
  try {
    const snapshot = await captureCatalogSnapshot(dataSource);
    const schemaSql = await dataSource.driver.createSchemaBuilder().log();
    const entries = COMPATIBILITY_OBJECTS.map(
      (seed): TypeOrmCompatibilityEntry => {
        const definition = getCompatibilityObjectDefinition(snapshot, {
          schema: "public",
          ...seed,
        });
        if (!definition) {
          throw new Error(
            `Compatibility catalog object is missing: ${seed.objectName}`,
          );
        }
        return {
          schema: "public",
          ...seed,
          expectedDefinition: definition,
          reason:
            "Required by baseline v2 but not yet represented by current entity metadata",
          expiresAt: "2027-12-31",
          source:
            "src/database/migrations-v2/1800000000000-CreateCanonicalBaselineV2.ts",
        };
      },
    );
    const manifest: TypeOrmCompatibilityManifest = { version: 1, entries };
    const compatibility = verifyTypeOrmCompatibilityParity(
      schemaSql.upQueries.map(({ query }) => query),
      snapshot,
      manifest,
    );
    if (
      compatibility.rawDiffCount !== COMPATIBILITY_OBJECTS.length ||
      compatibility.reviewedCompatibilityCount !==
        COMPATIBILITY_OBJECTS.length ||
      compatibility.unexpected.length > 0 ||
      compatibility.staleManifestEntries.length > 0 ||
      compatibility.catalogMismatches.length > 0
    ) {
      throw new Error(
        `Compatibility inventory is not exact: ${JSON.stringify(compatibility)}`,
      );
    }

    writeJson(
      path.join(OUTPUT, "baselines/canonical-baseline-v2-catalog.json"),
      {
        version: 1,
        lineage: "v2",
        migration: "CreateCanonicalBaselineV21800000000000",
        fingerprint: catalogFingerprint(snapshot),
        objectCount: catalogObjectCount(snapshot),
        snapshot,
      },
    );
    writeJson(
      path.join(OUTPUT, "typeorm-compatibility-manifest.json"),
      manifest,
    );
    process.stdout.write(
      JSON.stringify({
        database,
        catalogObjects: catalogObjectCount(snapshot),
        catalogFingerprint: catalogFingerprint(snapshot),
        rawTypeOrmDiff: compatibility.rawDiffCount,
        reviewedCompatibility: compatibility.reviewedCompatibilityCount,
      }),
    );
  } finally {
    await dataSource.destroy();
  }
}

function writeJson(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

void main();
