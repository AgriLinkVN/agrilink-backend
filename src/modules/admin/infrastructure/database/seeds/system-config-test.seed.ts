import { DataSource, Repository } from "typeorm";
import {
  SeedClassification,
  SeedExecutionContext,
  SeedGroup,
  SeedGroupMetadata,
  SeedGroupResult,
  SeedOutputBinding,
} from "../../../../../database/seeds/framework/seed-contract";
import { SystemConfig } from "../../../entities/system-config.entity";

export const ADMIN_SYSTEM_CONFIG_TEST_SEED_GROUP_ID =
  "admin.test.system-configs";
export const SYSTEM_CONFIG_ID_BY_KEY_OUTPUT_KIND = "system-config.id.by-key";

export interface SystemConfigTestSeedData {
  readonly id: string;
  readonly key: string;
  readonly value: string;
}

/**
 * Clean-v2 prerequisite used by both the Admin read baseline and its audit
 * fixture. The persisted unique config key is the reconciliation identity;
 * the historical UUID is retained only as create payload so the local audit
 * row continues to reference the same entity.
 */
export const systemConfigTestSeedData: readonly SystemConfigTestSeedData[] =
  Object.freeze([
    Object.freeze({
      id: "a0000000-0000-4000-8000-000000000001",
      key: "phase1",
      value: "enabled",
    }),
  ]);

export const ADMIN_SYSTEM_CONFIG_TEST_SEED_METADATA: SeedGroupMetadata =
  Object.freeze({
    id: ADMIN_SYSTEM_CONFIG_TEST_SEED_GROUP_ID,
    owner: "admin",
    classification: SeedClassification.TEST,
    dependencies: Object.freeze([]),
    description: "Reusable Admin system configuration TEST prerequisites",
  });

export interface SystemConfigTestRecord {
  readonly id: string;
}

export interface SystemConfigTestCreateData {
  readonly id: string;
  readonly key: string;
  readonly value: string;
}

export interface SystemConfigTestMutableData {
  readonly value: string;
}

export interface SystemConfigTestSeedWriter {
  findByKey(key: string): Promise<readonly SystemConfigTestRecord[]>;
  create(data: SystemConfigTestCreateData): Promise<SystemConfigTestRecord>;
  update(id: string, data: SystemConfigTestMutableData): Promise<void>;
}

export async function reconcileSystemConfigTestSeeds(
  writer: SystemConfigTestSeedWriter,
  records: readonly SystemConfigTestSeedData[] = systemConfigTestSeedData,
): Promise<readonly SeedOutputBinding[]> {
  const declaredKeys = new Set<string>();
  const preflight: Array<{
    readonly record: SystemConfigTestSeedData;
    readonly matches: readonly SystemConfigTestRecord[];
  }> = [];

  for (const record of records) {
    if (declaredKeys.has(record.key)) {
      throw new Error(
        `${ADMIN_SYSTEM_CONFIG_TEST_SEED_GROUP_ID} declares duplicate key ${record.key}`,
      );
    }
    declaredKeys.add(record.key);
    const matches = await writer.findByKey(record.key);
    if (matches.length > 1) {
      throw new Error(
        `${ADMIN_SYSTEM_CONFIG_TEST_SEED_GROUP_ID} found multiple rows for key ${record.key}`,
      );
    }
    preflight.push({ record, matches });
  }

  const outputs: SeedOutputBinding[] = [];
  for (const { record, matches } of preflight) {
    let configId: string;
    if (matches.length === 1) {
      await writer.update(matches[0].id, { value: record.value });
      configId = matches[0].id;
    } else {
      configId = (await writer.create(record)).id;
    }
    outputs.push({
      kind: SYSTEM_CONFIG_ID_BY_KEY_OUTPUT_KIND,
      key: record.key,
      value: configId,
    });
  }

  return Object.freeze(outputs.map((output) => Object.freeze(output)));
}

export class AdminSystemConfigTestSeedGroup implements SeedGroup {
  readonly metadata = ADMIN_SYSTEM_CONFIG_TEST_SEED_METADATA;

  constructor(private readonly writer: SystemConfigTestSeedWriter) {}

  async execute(context: SeedExecutionContext): Promise<SeedGroupResult> {
    if (!context.classifications.includes(SeedClassification.TEST)) {
      throw new Error(`${this.metadata.id} requires explicit TEST selection`);
    }

    return { outputs: await reconcileSystemConfigTestSeeds(this.writer) };
  }
}

class TypeOrmSystemConfigTestSeedWriter implements SystemConfigTestSeedWriter {
  constructor(private readonly repository: Repository<SystemConfig>) {}

  findByKey(key: string): Promise<readonly SystemConfigTestRecord[]> {
    return this.repository.find({ select: { id: true }, where: { key } });
  }

  create(data: SystemConfigTestCreateData): Promise<SystemConfigTestRecord> {
    return this.repository.save(this.repository.create(data));
  }

  async update(id: string, data: SystemConfigTestMutableData): Promise<void> {
    await this.repository.update(id, data);
  }
}

export function createAdminSystemConfigTestSeedGroup(
  persistence: Pick<DataSource, "getRepository">,
): SeedGroup {
  return new AdminSystemConfigTestSeedGroup(
    new TypeOrmSystemConfigTestSeedWriter(
      persistence.getRepository(SystemConfig),
    ),
  );
}
