import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { DataSource, QueryRunner } from 'typeorm';

import { createDataSourceOptions } from '../database/data-source-options';
import {
  captureCatalogSnapshot,
  catalogFingerprint,
} from '../database/reconciliation/catalog-inspector';

dotenv.config();

const ROOT = process.cwd();
const CANDIDATES = [
  {
    table: 'logistics_profiles',
    owner: 'logistics',
    entity: 'LogisticsProfile',
    entityFile: 'src/database/entities/logistics-profile.entity.ts',
  },
  {
    table: 'shipments',
    owner: 'logistics',
    entity: 'Shipment',
    entityFile: 'src/database/entities/shipment.entity.ts',
  },
  {
    table: 'shipment_tracking_events',
    owner: 'logistics',
    entity: 'ShipmentTrackingEvent',
    entityFile: 'src/database/entities/shipment-tracking-event.entity.ts',
  },
  {
    table: 'conversations',
    owner: 'messaging',
    entity: 'Conversation',
    entityFile: 'src/database/entities/conversation.entity.ts',
  },
  {
    table: 'messages',
    owner: 'messaging',
    entity: 'Message',
    entityFile: 'src/database/entities/message.entity.ts',
  },
  {
    table: 'notifications',
    owner: 'notifications',
    entity: 'NotificationOrmEntity',
    entityFile:
      'src/modules/notifications/infrastructure/persistence/notification.orm-entity.ts',
  },
] as const;

interface BaselineEntry {
  table: string;
  includeInBaselineV2: boolean;
  reason: string;
}

interface OwnershipEntry {
  table: string;
  owner: string;
  status: string;
  currentMappings: string[];
}

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8')) as T;
}

function walk(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(target);
    return entry.isFile() && target.endsWith('.ts') ? [target] : [];
  });
}

function relative(file: string): string {
  return path.relative(ROOT, file).replace(/\\/g, '/');
}

function references(
  files: string[],
  patterns: readonly string[],
  predicate: (file: string, source: string) => boolean = () => true,
): string[] {
  return files
    .filter((file) => {
      const source = fs.readFileSync(file, 'utf8');
      return (
        patterns.some((pattern) => {
          const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          return new RegExp(`\\b${escaped}\\b`).test(source);
        }) && predicate(relative(file), source)
      );
    })
    .map(relative)
    .sort();
}

async function captureProtectedDatabase(dataSource: DataSource) {
  const runner = dataSource.createQueryRunner();
  await runner.connect();
  await runner.startTransaction();
  try {
    await runner.query('SET TRANSACTION READ ONLY');
    const [identity] = (await runner.query(
      `SELECT current_database() AS database,
              current_setting('transaction_read_only') AS read_only`,
    )) as Array<{ database: string; read_only: string }>;
    const catalog = await captureCatalogSnapshot(runner as QueryRunner);
    const tableNames = new Set(catalog.tables.map(({ name }) => name));
    const tables = [];
    for (const candidate of CANDIDATES) {
      const exists = tableNames.has(candidate.table);
      const rows = exists
        ? Number(
            (
              (await runner.query(
                `SELECT COUNT(*)::text AS count FROM "public"."${candidate.table}"`,
              )) as Array<{ count: string }>
            )[0].count,
          )
        : 0;
      tables.push({ table: candidate.table, exists, rows });
    }
    const ledgerTables = (await runner.query(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_name IN ('migrations', 'migrations_v2')
       ORDER BY table_name`,
    )) as Array<{ table_name: string }>;
    const ledgers = [];
    for (const table of ['migrations', 'migrations_v2']) {
      if (!ledgerTables.some(({ table_name }) => table_name === table))
        continue;
      const [{ count }] = (await runner.query(
        `SELECT COUNT(*)::text AS count FROM "public"."${table}"`,
      )) as Array<{ count: string }>;
      ledgers.push({ table, rows: Number(count) });
    }
    return {
      database: identity.database,
      readOnly: identity.read_only === 'on',
      fingerprint: catalogFingerprint(catalog),
      tableCount: catalog.tables.length,
      ledgers,
      tables,
    };
  } finally {
    await runner.rollbackTransaction();
    await runner.release();
  }
}

async function main(): Promise<void> {
  const outputIndex = process.argv.indexOf('--output');
  const positionalOutput = process.argv
    .slice(2)
    .find((argument) => !argument.startsWith('--'));
  const output =
    outputIndex >= 0
      ? process.argv[outputIndex + 1]
      : (positionalOutput ?? null);
  if (outputIndex >= 0 && (!output || output.startsWith('--'))) {
    throw new Error('--output requires a file path');
  }

  const baseline = readJson<{ entries: BaselineEntry[] }>(
    'docs/architecture/persistence/discovery/baseline-inclusion-matrix.json',
  );
  const ownership = readJson<{ tables: OwnershipEntry[] }>(
    'docs/architecture/persistence/entity-ownership.json',
  );
  const registry = fs.readFileSync(
    path.join(ROOT, 'src/database/entity-registry.ts'),
    'utf8',
  );
  const files = walk(path.join(ROOT, 'src')).filter(
    (file) =>
      !file.endsWith('.spec.ts') &&
      !relative(file).startsWith('src/scripts/') &&
      !relative(file).startsWith('src/database/migrations'),
  );

  const dataSource = new DataSource(
    createDataSourceOptions(
      { ...process.env, DB_SYNCHRONIZE: 'false' },
      { entities: [], logging: false },
    ),
  );
  await dataSource.initialize();
  try {
    const protectedBefore = await captureProtectedDatabase(dataSource);
    if (protectedBefore.database !== 'agrilink_db') {
      throw new Error('Phase 7A protected evidence must target agrilink_db');
    }

    const inventory = CANDIDATES.map((candidate) => {
      const baselineEntry = baseline.entries.find(
        ({ table }) => table === candidate.table,
      );
      const ownershipEntry = ownership.tables.find(
        ({ table }) => table === candidate.table,
      );
      if (!baselineEntry || !ownershipEntry) {
        throw new Error(`Missing canonical evidence for ${candidate.table}`);
      }
      const database = protectedBefore.tables.find(
        ({ table }) => table === candidate.table,
      )!;
      const ownerModulePrefix = `src/modules/${candidate.owner}/`;
      const runtimeReferences = references(
        files,
        [candidate.table],
        (file) =>
          file !== candidate.entityFile &&
          file !== 'src/database/entity-registry.ts' &&
          file !== 'src/database/dev-seed.service.ts',
      );
      const repositoryConsumers = references(
        files,
        [candidate.entity],
        (file, source) =>
          file !== candidate.entityFile &&
          /InjectRepository|getRepository|Repository</.test(source),
      );
      const controllerUseCaseConsumers = files
        .map(relative)
        .filter(
          (file) =>
            file.startsWith(ownerModulePrefix) &&
            (/\/presentation\/controllers\//.test(file) ||
              /\/application\/use-cases\//.test(file)),
        )
        .sort();
      const websocketFiles = files
        .filter((file) => relative(file).startsWith(ownerModulePrefix))
        .filter((file) =>
          /WebSocketGateway|WebSocketServer|publishCreated|publishMarkedRead|publishAllRead/.test(
            fs.readFileSync(file, 'utf8'),
          ),
        )
        .map(relative)
        .sort();
      const schedulerFiles = files
        .filter((file) => relative(file).startsWith(ownerModulePrefix))
        .filter((file) =>
          /@Cron|@Interval|@Timeout|retention|cleanup|purge|archive/.test(
            fs.readFileSync(file, 'utf8'),
          ),
        )
        .map(relative)
        .sort();
      const seedReferences = references(
        files,
        [candidate.table, candidate.entity],
        (file) => file === 'src/database/dev-seed.service.ts',
      );
      const runtimeRegistered = registry.includes(`entry("${candidate.table}"`);
      const activeOwnerBoundary =
        baselineEntry.includeInBaselineV2 &&
        runtimeRegistered &&
        repositoryConsumers.some((file) =>
          file.startsWith(ownerModulePrefix),
        ) &&
        controllerUseCaseConsumers.length > 0;
      const dormant =
        !baselineEntry.includeInBaselineV2 &&
        !runtimeRegistered &&
        runtimeReferences.length === 0 &&
        !database.exists;
      const decision = activeOwnerBoundary
        ? 'ACTIVE_BOUNDARY_ONLY'
        : dormant
          ? 'DORMANT_DEFER'
          : 'BLOCKED_MISSING_CONTRACT';

      return {
        table: candidate.table,
        currentEntity: candidate.entityFile,
        decoratorStatus: fs
          .readFileSync(path.join(ROOT, candidate.entityFile), 'utf8')
          .includes('@Entity')
          ? 'ENTITY_DECLARATION'
          : 'DECORATOR_FREE',
        runtimeRegistration: runtimeRegistered,
        cliRegistration: runtimeRegistered,
        repositoryConsumers,
        controllerUseCaseConsumers,
        websocketProducer: websocketFiles,
        websocketConsumer: [],
        schedulerConsumer: schedulerFiles,
        seedDependency: seedReferences,
        canonicalBaselineV2: baselineEntry.includeInBaselineV2,
        baselineReason: baselineEntry.reason,
        protectedDatabase: database,
        currentOwner: ownershipEntry.owner,
        recommendedOwner: candidate.owner,
        ownershipStatus: ownershipEntry.status,
        crossModuleInfrastructureImports: runtimeReferences.filter(
          (file) =>
            file.startsWith('src/modules/') &&
            !file.startsWith(ownerModulePrefix) &&
            file.includes('/infrastructure/'),
        ),
        migrationEvidence: baselineEntry.includeInBaselineV2
          ? 'canonical-baseline-v2'
          : 'none',
        decision,
      };
    });

    const protectedAfter = await captureProtectedDatabase(dataSource);
    const result = {
      audit: 'persistence-phase-7a-operations',
      source: {
        roadmap: 'docs/architecture/persistence/roadmap.md',
        baseline:
          'docs/architecture/persistence/discovery/baseline-inclusion-matrix.json',
        ownership: 'docs/architecture/persistence/entity-ownership.json',
      },
      inventory,
      protectedDatabase: {
        before: protectedBefore,
        after: protectedAfter,
        unchanged:
          protectedBefore.fingerprint === protectedAfter.fingerprint &&
          protectedBefore.tableCount === protectedAfter.tableCount &&
          JSON.stringify(protectedBefore.ledgers) ===
            JSON.stringify(protectedAfter.ledgers),
      },
    };
    const json = `${JSON.stringify(result, null, 2)}\n`;
    if (output) {
      const target = path.resolve(output);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, json, 'utf8');
    }
    process.stdout.write(json);
  } finally {
    await dataSource.destroy();
  }
}

void main();
