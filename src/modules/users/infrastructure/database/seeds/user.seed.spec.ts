import {
  SeedClassification,
  SeedExecutionContext,
} from "../../../../../database/seeds/framework/seed-contract";
import { EMPTY_SEED_DEPENDENCY_OUTPUTS } from "../../../../../database/seeds/framework/seed-dependency-outputs";
import {
  USER_ID_BY_EMAIL_OUTPUT_KIND,
  UserDevPasswordHasher,
  UserDevSeedWriter,
  UserDevWriteData,
  UsersDevSeedGroup,
  userDevSeedData,
} from "./user.seed";

const devContext: SeedExecutionContext = {
  nodeEnv: "development",
  databaseName: "agrilink_dev_disposable",
  classifications: [SeedClassification.DEV],
  dependencies: EMPTY_SEED_DEPENDENCY_OUTPUTS,
};

interface InMemoryUser {
  readonly id: string;
  data: UserDevWriteData;
}

function createWriter(initialRows: readonly InMemoryUser[] = []): {
  writer: UserDevSeedWriter;
  rows: Map<string, InMemoryUser>;
  creates: UserDevWriteData[];
  updates: UserDevWriteData[];
} {
  const rows = new Map(initialRows.map((row) => [row.id, row]));
  const creates: UserDevWriteData[] = [];
  const updates: UserDevWriteData[] = [];
  const writer: UserDevSeedWriter = {
    async findByPhone(phone) {
      return [...rows.values()].find((row) => row.data.phone === phone) ?? null;
    },
    async findByEmail(email) {
      return [...rows.values()].find((row) => row.data.email === email) ?? null;
    },
    async create(data) {
      creates.push(data);
      const row = { id: `user-${rows.size + 1}`, data };
      rows.set(row.id, row);
      return row;
    },
    async update(id, data) {
      updates.push(data);
      rows.set(id, { id, data });
    },
  };

  return { writer, rows, creates, updates };
}

function createHasher(passwordHash = "declared-dev-password-hash"): {
  hasher: UserDevPasswordHasher;
  credentials: string[];
} {
  const credentials: string[] = [];
  return {
    credentials,
    hasher: {
      async hash(credential) {
        credentials.push(credential);
        return passwordHash;
      },
    },
  };
}

describe("UsersDevSeedGroup", () => {
  it("declares Users-owned DEV metadata without dependencies", () => {
    const { writer } = createWriter();
    const { hasher } = createHasher();
    const group = new UsersDevSeedGroup(writer, hasher);

    expect(group.metadata).toEqual(
      expect.objectContaining({
        id: "users.dev.users",
        owner: "users",
        classification: SeedClassification.DEV,
        dependencies: [],
      }),
    );
  });

  it("keeps payload phone and email identifiers unique", () => {
    const phones = userDevSeedData.map(({ phone }) => phone);
    const emails = userDevSeedData.map(({ email }) => email);

    expect(userDevSeedData).toHaveLength(10);
    expect(new Set(phones).size).toBe(userDevSeedData.length);
    expect(new Set(emails).size).toBe(userDevSeedData.length);

    expect(emails).toEqual(
      expect.arrayContaining([
        "farmer@sandbox.com",
        "cooperative@sandbox.com",
        "state_agency@sandbox.com",
      ]),
    );
    expect(emails).not.toEqual(
      expect.arrayContaining([
        "buyer@sandbox.com",
        "enterprise@sandbox.com",
        "supplier@sandbox.com",
        "logistics@sandbox.com",
        "demo.farmer@sandbox.com",
        "demo.coop@sandbox.com",
        "demo.supplier@sandbox.com",
      ]),
    );
    expect(
      userDevSeedData.filter(({ email }) => email === "admin@agrilink.vn"),
    ).toHaveLength(1);
    expect(
      userDevSeedData.find(({ email }) => email === "admin@agrilink.vn")?.phone,
    ).toBe("+84901111099");
  });

  it("requires explicit DEV selection", async () => {
    const { writer } = createWriter();
    const { hasher, credentials } = createHasher();
    const group = new UsersDevSeedGroup(writer, hasher);

    await expect(
      group.execute({
        ...devContext,
        classifications: [SeedClassification.REFERENCE],
      }),
    ).rejects.toThrow("requires explicit DEV selection");
    expect(credentials).toEqual([]);
  });

  it("converges partial state per user and creates nothing on a second run", async () => {
    const first = userDevSeedData[0];
    const state = createWriter([
      {
        id: "existing-admin",
        data: {
          ...first,
          fullName: "Stale admin name",
          passwordHash: "old-password-hash",
        },
      },
    ]);
    const passwordHash = "declared-dev-password-hash";
    const { hasher, credentials } = createHasher(passwordHash);
    const group = new UsersDevSeedGroup(state.writer, hasher);

    const firstResult = await group.execute(devContext);

    expect(state.updates).toHaveLength(1);
    expect(state.updates[0]).toEqual({ ...first, passwordHash });
    expect(state.creates).toHaveLength(9);
    expect(state.rows.size).toBe(10);
    expect(firstResult.outputs).toHaveLength(10);
    expect(firstResult.outputs).toEqual(
      userDevSeedData.map(({ email }, index) => ({
        kind: USER_ID_BY_EMAIL_OUTPUT_KIND,
        key: email,
        value: index === 0 ? "existing-admin" : `user-${index + 1}`,
      })),
    );

    const secondResult = await group.execute(devContext);

    expect(state.creates).toHaveLength(9);
    expect(state.updates).toHaveLength(11);
    expect(credentials).toEqual(["demo123", "demo123"]);
    expect(secondResult).toEqual(firstResult);
    expect(
      [...state.rows.values()].every(
        ({ data }) => data.passwordHash === passwordHash,
      ),
    ).toBe(true);
  });

  it("publishes all ten email-to-ID bindings without secret values", async () => {
    const state = createWriter();
    const { hasher } = createHasher("sensitive-password-hash");

    const result = await new UsersDevSeedGroup(state.writer, hasher).execute(
      devContext,
    );

    expect(result.outputs).toHaveLength(10);
    expect(
      result.outputs.every(
        ({ kind, key, value }) =>
          kind === USER_ID_BY_EMAIL_OUTPUT_KIND &&
          userDevSeedData.some(({ email }) => email === key) &&
          typeof value === "string" &&
          String(value).startsWith("user-"),
      ),
    ).toBe(true);
    expect(JSON.stringify(result.outputs)).not.toMatch(
      /demo123|password|hash|credential|token|secret/i,
    );
  });

  it("updates one user when phone and email resolve to the same identity", async () => {
    const first = userDevSeedData[0];
    const state = createWriter([
      {
        id: "same-user",
        data: { ...first, passwordHash: "old-password-hash" },
      },
    ]);
    const { hasher } = createHasher();

    await new UsersDevSeedGroup(state.writer, hasher).execute(devContext);

    expect(state.updates[0].phone).toBe(first.phone);
    expect(state.updates[0].email).toBe(first.email);
    expect(state.creates.map(({ email }) => email)).not.toContain(first.email);
  });

  it("fails closed when phone and email resolve to different users", async () => {
    const first = userDevSeedData[0];
    const state = createWriter([
      {
        id: "phone-owner",
        data: {
          ...first,
          email: "other-phone-owner@agrilink.vn",
          passwordHash: "old-password-hash",
        },
      },
      {
        id: "email-owner",
        data: {
          ...first,
          phone: "+84909999999",
          passwordHash: "old-password-hash",
        },
      },
    ]);
    const { hasher } = createHasher();

    await expect(
      new UsersDevSeedGroup(state.writer, hasher).execute(devContext),
    ).rejects.toThrow("phone and email resolve to different users");
    expect(state.creates).toEqual([]);
    expect(state.updates).toEqual([]);
  });
});
