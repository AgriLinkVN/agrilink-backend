import {
  SeedClassification,
  SeedExecutionContext,
} from "../../../../../database/seeds/framework/seed-contract";
import { EMPTY_SEED_DEPENDENCY_OUTPUTS } from "../../../../../database/seeds/framework/seed-dependency-outputs";
import {
  ADMIN_SYSTEM_CONFIG_TEST_SEED_GROUP_ID,
  AdminSystemConfigTestSeedGroup,
  SYSTEM_CONFIG_ID_BY_KEY_OUTPUT_KIND,
  SystemConfigTestCreateData,
  SystemConfigTestMutableData,
  SystemConfigTestSeedWriter,
  systemConfigTestSeedData,
} from "./system-config-test.seed";

const testContext: SeedExecutionContext = {
  nodeEnv: "test",
  databaseName: "agrilink_persistence_test_clean_v2_static",
  classifications: [SeedClassification.TEST],
  dependencies: EMPTY_SEED_DEPENDENCY_OUTPUTS,
};

interface InMemoryConfig {
  readonly id: string;
  data: SystemConfigTestCreateData;
}

function createWriter(initialRows: readonly InMemoryConfig[] = []): {
  writer: SystemConfigTestSeedWriter;
  rows: Map<string, InMemoryConfig>;
  finds: string[];
  creates: SystemConfigTestCreateData[];
  updates: SystemConfigTestMutableData[];
} {
  const rows = new Map(initialRows.map((row) => [row.id, row]));
  const finds: string[] = [];
  const creates: SystemConfigTestCreateData[] = [];
  const updates: SystemConfigTestMutableData[] = [];
  const writer: SystemConfigTestSeedWriter = {
    async findByKey(key) {
      finds.push(key);
      return [...rows.values()].filter((row) => row.data.key === key);
    },
    async create(data) {
      creates.push(data);
      const row = { id: data.id, data };
      rows.set(row.id, row);
      return row;
    },
    async update(id, data) {
      updates.push(data);
      const current = rows.get(id);
      if (!current) throw new Error(`missing in-memory config ${id}`);
      rows.set(id, { id, data: { ...current.data, ...data } });
    },
  };
  return { writer, rows, finds, creates, updates };
}

describe("AdminSystemConfigTestSeedGroup", () => {
  it("declares one Admin-owned TEST prerequisite with key identity", () => {
    const group = new AdminSystemConfigTestSeedGroup(createWriter().writer);

    expect(group.metadata).toEqual(
      expect.objectContaining({
        id: ADMIN_SYSTEM_CONFIG_TEST_SEED_GROUP_ID,
        owner: "admin",
        classification: SeedClassification.TEST,
        dependencies: [],
      }),
    );
    expect(systemConfigTestSeedData).toEqual([
      {
        id: "a0000000-0000-4000-8000-000000000001",
        key: "phase1",
        value: "enabled",
      },
    ]);
  });

  it("requires explicit TEST selection", async () => {
    const state = createWriter();

    await expect(
      new AdminSystemConfigTestSeedGroup(state.writer).execute({
        ...testContext,
        classifications: [SeedClassification.DEV],
      }),
    ).rejects.toThrow("requires explicit TEST selection");
    expect(state.finds).toEqual([]);
  });

  it("creates by config key and publishes system-config.id.by-key", async () => {
    const state = createWriter();

    const result = await new AdminSystemConfigTestSeedGroup(
      state.writer,
    ).execute(testContext);

    expect(state.finds).toEqual(["phase1"]);
    expect(state.creates).toEqual(systemConfigTestSeedData);
    expect(result.outputs).toEqual([
      {
        kind: SYSTEM_CONFIG_ID_BY_KEY_OUTPUT_KIND,
        key: "phase1",
        value: "a0000000-0000-4000-8000-000000000001",
      },
    ]);
  });

  it("reconciles mutable value without changing key or ID", async () => {
    const data = { ...systemConfigTestSeedData[0], value: "stale" };
    const existingId = "a0000000-0000-4000-8000-000000000099";
    const state = createWriter([{ id: existingId, data: { ...data, id: existingId } }]);
    const group = new AdminSystemConfigTestSeedGroup(state.writer);

    const first = await group.execute(testContext);
    const second = await group.execute(testContext);

    expect(state.creates).toEqual([]);
    expect(state.updates).toEqual([{ value: "enabled" }, { value: "enabled" }]);
    expect(state.rows.get(existingId)?.data).toEqual({
      ...systemConfigTestSeedData[0],
      id: existingId,
    });
    expect(first.outputs).toEqual([
      {
        kind: SYSTEM_CONFIG_ID_BY_KEY_OUTPUT_KIND,
        key: "phase1",
        value: existingId,
      },
    ]);
    expect(second).toEqual(first);
  });

  it("fails closed before writes when key identity is ambiguous", async () => {
    const data = systemConfigTestSeedData[0];
    const state = createWriter([
      { id: data.id, data },
      { id: "a0000000-0000-4000-8000-000000000002", data },
    ]);

    await expect(
      new AdminSystemConfigTestSeedGroup(state.writer).execute(testContext),
    ).rejects.toThrow("found multiple rows for key phase1");
    expect(state.creates).toEqual([]);
    expect(state.updates).toEqual([]);
  });
});
