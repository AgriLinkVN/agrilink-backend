import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import { DataSource } from 'typeorm';
import {
  CATALOG_MANIFEST_PATH,
  readCatalogManifest,
  readTypeOrmCompatibilityManifest,
} from '../database/reconciliation/baseline-artifacts';
import {
  captureCatalogSnapshot,
  catalogFingerprint,
  catalogObjectCount,
  CatalogSnapshot,
  diffCatalogSnapshots,
} from '../database/reconciliation/catalog-inspector';
import { createDataSourceOptions } from '../database/data-source-options';
import {
  CLI_ENTITY_REGISTRY,
  CANONICAL_BASELINE_TABLE_KEYS,
  excludeDeferredEntitiesFromSchemaBuild,
} from '../database/entity-registry';
import { V2_MIGRATIONS } from '../database/migration-registry';
import {
  createAdminDataSource,
  createDisposableDatabase,
  createDisposableDatabaseName,
  dropDisposableDatabase,
} from '../database/reconciliation/disposable-database';
import { verifyTypeOrmCompatibilityParity } from '../database/reconciliation/typeorm-compatibility-parity';

dotenv.config();

const COMMERCE_TABLES = new Set([
  'commerce_operations',
  'contracts',
  'order_items',
  'order_status_history',
  'orders',
  'payments',
  'purchase_requests',
]);

const REQUIRED_CONSTRAINTS = new Set([
  'CHK_commerce_operations_status',
  'CHK_contracts_quantity',
  'CHK_contracts_status',
  'CHK_contracts_total',
  'CHK_order_items_money',
  'CHK_order_items_quantity',
  'CHK_orders_method',
  'CHK_orders_money',
  'CHK_orders_status',
  'CHK_payments_currency',
  'CHK_payments_method',
  'CHK_payments_refund',
  'CHK_payments_status',
  'CHK_purchase_requests_quantity',
  'CHK_purchase_requests_status',
  'FK_commerce_operations_actor',
  'FK_contracts_buyer',
  'FK_contracts_category',
  'FK_contracts_request',
  'FK_contracts_seller',
  'FK_order_items_order',
  'FK_order_items_product',
  'FK_order_status_history_actor',
  'FK_order_status_history_order',
  'FK_orders_buyer',
  'FK_orders_seller',
  'FK_payments_order',
  'FK_purchase_requests_buyer',
  'FK_purchase_requests_category',
  'FK_purchase_requests_province',
  'UQ_commerce_operations_scope',
  'UQ_order_status_history_operation',
]);

const REQUIRED_INDEXES = new Set([
  'IDX_contracts_purchase_request',
  'IDX_order_history_order_created',
  'IDX_order_items_order',
  'IDX_orders_buyer_created',
  'IDX_orders_seller_created',
]);

async function main(): Promise<void> {
  if (!process.argv.includes('--write')) {
    throw new Error('Phase 6 catalog refresh requires explicit --write');
  }
  const previous = readCatalogManifest();
  const database = createDisposableDatabaseName();
  const admin = createAdminDataSource(process.env);
  let target: DataSource | null = null;
  await admin.initialize();
  try {
    await createDisposableDatabase(admin, database);
    target = new DataSource(
      createDataSourceOptions(
        { ...process.env, DB_NAME: database, DB_SYNCHRONIZE: 'false' },
        {
          entities: CLI_ENTITY_REGISTRY,
          migrations: V2_MIGRATIONS,
          migrationsTableName: 'migrations_v2',
          logging: false,
        },
      ),
    );
    await target.initialize();
    excludeDeferredEntitiesFromSchemaBuild(target);
    const firstRun = await target.runMigrations();
    const secondRun = await target.runMigrations();
    if (
      firstRun.length !== V2_MIGRATIONS.length ||
      secondRun.length !== 0 ||
      (await target.showMigrations())
    ) {
      throw new Error('Phase 6 catalog writer requires a clean, stable v2 chain');
    }

    const snapshot = await captureCatalogSnapshot(target);
    assertLegacyCatalogUnchanged(previous.snapshot, snapshot);
    assertCommerceCatalog(snapshot);
    const schemaLog = await target.driver.createSchemaBuilder().log();
    const compatibility = verifyTypeOrmCompatibilityParity(
      schemaLog.upQueries.map(({ query }) => query),
      snapshot,
      readTypeOrmCompatibilityManifest(),
    );
    if (
      compatibility.unexpected.length > 0 ||
      compatibility.staleManifestEntries.length > 0 ||
      compatibility.catalogMismatches.length > 0
    ) {
      throw new Error(
        `Phase 6 TypeORM compatibility is not exact: ${JSON.stringify(compatibility)}`,
      );
    }

    const manifest = {
      version: 1,
      lineage: 'v2',
      migration: 'CreateCommerceBoundariesV21800000001000',
      fingerprint: catalogFingerprint(snapshot),
      objectCount: catalogObjectCount(snapshot),
      snapshot,
    };
    fs.writeFileSync(
      CATALOG_MANIFEST_PATH,
      `${JSON.stringify(manifest, null, 2)}\n`,
      'utf8',
    );
    process.stdout.write(
      `${JSON.stringify({
        result: 'PASS',
        database,
        tableCount: snapshot.tables.length,
        objectCount: manifest.objectCount,
        fingerprint: manifest.fingerprint,
        rawTypeOrmDiff: compatibility.rawDiffCount,
        reviewedCompatibility: compatibility.reviewedCompatibilityCount,
      })}\n`,
    );
  } finally {
    if (target?.isInitialized) await target.destroy();
    await dropDisposableDatabase(admin, database);
    await admin.destroy();
  }
}

function assertLegacyCatalogUnchanged(
  previous: CatalogSnapshot,
  actual: CatalogSnapshot,
): void {
  const withoutCommerce: CatalogSnapshot = {
    ...actual,
    tables: actual.tables.filter(({ name }) => !COMMERCE_TABLES.has(name)),
  };
  const differences = diffCatalogSnapshots(previous, withoutCommerce);
  if (differences.length > 0) {
    throw new Error(
      `Phase 6 changed the pre-Commerce catalog: ${JSON.stringify(differences)}`,
    );
  }
}

function assertCommerceCatalog(snapshot: CatalogSnapshot): void {
  const expectedTables = CANONICAL_BASELINE_TABLE_KEYS.map((key) =>
    key.replace('public.', ''),
  ).sort();
  const actualTables = snapshot.tables.map(({ name }) => name).sort();
  if (JSON.stringify(actualTables) !== JSON.stringify(expectedTables)) {
    throw new Error('Phase 6 catalog table inventory is not exact');
  }
  const commerce = snapshot.tables.filter(({ name }) => COMMERCE_TABLES.has(name));
  const constraints = new Set(
    commerce.flatMap(({ constraints: entries }) =>
      entries.map(({ name }) => name),
    ),
  );
  const indexes = new Set(
    commerce.flatMap(({ indexes: entries }) => entries.map(({ name }) => name)),
  );
  assertSetContains(constraints, REQUIRED_CONSTRAINTS, 'constraint');
  assertSetContains(indexes, REQUIRED_INDEXES, 'index');
}

function assertSetContains(
  actual: Set<string>,
  expected: Set<string>,
  kind: string,
): void {
  const missing = [...expected].filter((name) => !actual.has(name));
  if (missing.length > 0) {
    throw new Error(`Missing reviewed Commerce ${kind}s: ${missing.join(', ')}`);
  }
}

void main();
