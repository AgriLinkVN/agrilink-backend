import { UserRole, UserStatus } from "@common/enums";
import {
  SeedClassification,
  SeedExecutionContext,
} from "../../../../../database/seeds/framework/seed-contract";
import { EMPTY_SEED_DEPENDENCY_OUTPUTS } from "../../../../../database/seeds/framework/seed-dependency-outputs";
import {
  USER_ID_BY_EMAIL_OUTPUT_KIND,
  UserTestIdentityCreateData,
  UserTestIdentityMutableData,
  UserTestIdentitySeedWriter,
  UsersTestIdentitySeedGroup,
  userTestIdentitySeedData,
} from "./user-test.seed";

const testContext: SeedExecutionContext = {
  nodeEnv: "test",
  databaseName: "agrilink_test_disposable",
  classifications: [SeedClassification.TEST],
  dependencies: EMPTY_SEED_DEPENDENCY_OUTPUTS,
};

interface InMemoryUser {
  readonly id: string;
  data: UserTestIdentityCreateData;
}

function createWriter(initialRows: readonly InMemoryUser[] = []): {
  writer: UserTestIdentitySeedWriter;
  rows: Map<string, InMemoryUser>;
  finds: string[];
  creates: UserTestIdentityCreateData[];
  updates: UserTestIdentityMutableData[];
} {
  const rows = new Map(initialRows.map((row) => [row.id, row]));
  const finds: string[] = [];
  const creates: UserTestIdentityCreateData[] = [];
  const updates: UserTestIdentityMutableData[] = [];
  const writer: UserTestIdentitySeedWriter = {
    async findByEmail(email) {
      finds.push(email);
      return [...rows.values()].filter((row) => row.data.email === email);
    },
    async create(data) {
      creates.push(data);
      const row = { id: `user-${rows.size + 1}`, data };
      rows.set(row.id, row);
      return row;
    },
    async update(id, data) {
      updates.push(data);
      const existing = rows.get(id)!;
      rows.set(id, { id, data: { ...existing.data, ...data } });
    },
  };

  return { writer, rows, finds, creates, updates };
}

describe("UsersTestIdentitySeedGroup", () => {
  it("declares the single Users-owned TEST provider without dependencies", () => {
    const group = new UsersTestIdentitySeedGroup(createWriter().writer);

    expect(group.metadata).toEqual(
      expect.objectContaining({
        id: "users.test.identities",
        owner: "users",
        classification: SeedClassification.TEST,
        dependencies: [],
      }),
    );
    expect(userTestIdentitySeedData).toEqual([
      {
        email: "seller@example.test",
        phone: null,
        passwordHash: "x",
        role: UserRole.FARMER,
        status: UserStatus.ACTIVE,
        fullName: null,
        isPhoneVerified: false,
        isEmailVerified: false,
      },
    ]);
    expect(JSON.stringify(userTestIdentitySeedData)).not.toMatch(
      /22222222-2222-4222-8222-222222222222/,
    );
  });

  it("requires explicit TEST selection", async () => {
    const state = createWriter();

    await expect(
      new UsersTestIdentitySeedGroup(state.writer).execute({
        ...testContext,
        classifications: [SeedClassification.DEV],
      }),
    ).rejects.toThrow("requires explicit TEST selection");
    expect(state.finds).toEqual([]);
  });

  it("reconciles by email per record and publishes user.id.by-email", async () => {
    const stale = {
      ...userTestIdentitySeedData[0],
      passwordHash: "preserve-existing-hash",
      status: UserStatus.LOCKED,
    };
    const state = createWriter([{ id: "seller-id", data: stale }]);
    const group = new UsersTestIdentitySeedGroup(state.writer);

    const first = await group.execute(testContext);
    const second = await group.execute(testContext);

    expect(state.finds).toEqual(["seller@example.test", "seller@example.test"]);
    expect(state.creates).toEqual([]);
    const {
      email: _immutableEmail,
      passwordHash: _createOnlyPasswordHash,
      ...mutableData
    } = userTestIdentitySeedData[0];
    expect(state.updates).toEqual([mutableData, mutableData]);
    expect(state.rows.get("seller-id")?.data.passwordHash).toBe(
      "preserve-existing-hash",
    );
    expect(second).toEqual(first);
    expect(first.outputs).toEqual([
      {
        kind: USER_ID_BY_EMAIL_OUTPUT_KIND,
        key: "seller@example.test",
        value: "seller-id",
      },
    ]);
  });

  it("creates an absent identity and then converges without another create", async () => {
    const state = createWriter();
    const group = new UsersTestIdentitySeedGroup(state.writer);

    await group.execute(testContext);
    await group.execute(testContext);

    expect(state.creates).toHaveLength(1);
    expect(state.updates).toHaveLength(1);
    expect(state.rows.size).toBe(1);
  });

  it("fails closed before writes when email is not unique", async () => {
    const data = userTestIdentitySeedData[0];
    const state = createWriter([
      { id: "seller-one", data },
      { id: "seller-two", data },
    ]);

    await expect(
      new UsersTestIdentitySeedGroup(state.writer).execute(testContext),
    ).rejects.toThrow("found multiple Users for email seller@example.test");
    expect(state.creates).toEqual([]);
    expect(state.updates).toEqual([]);
  });
});
