import { readFileSync } from "fs";
import { join } from "path";
import {
  SeedClassification,
  SeedExecutionContext,
} from "../../../../../database/seeds/framework/seed-contract";
import { SeedOutputRegistry } from "../../../../../database/seeds/framework/seed-dependency-outputs";
import {
  USER_ID_BY_EMAIL_OUTPUT_KIND,
  USERS_DEV_SEED_GROUP_ID,
} from "../../../../users/application/contracts/user-seed-output.contract";
import {
  ADMIN_DEV_PROFILE_USER_EMAILS,
  PROFILE_DEV_USER_EMAILS,
  PROFILES_ROLE_PROFILES_DEV_SEED_METADATA,
  ProfileRoleDevSeedData,
  ProfileRoleDevSeedWriter,
  buildProfileRoleDevSeedData,
  reconcileProfileRoleDevSeeds,
} from "./profile-role-development.seed";

const allProfileEmails = Object.values(PROFILE_DEV_USER_EMAILS).flat();

function createContext(
  dependencies = PROFILES_ROLE_PROFILES_DEV_SEED_METADATA.dependencies,
): SeedExecutionContext {
  const registry = new SeedOutputRegistry();
  registry.register(USERS_DEV_SEED_GROUP_ID, {
    outputs: allProfileEmails.map((email) => ({
      kind: USER_ID_BY_EMAIL_OUTPUT_KIND,
      key: email,
      value: `user:${email}`,
    })),
  });
  return {
    nodeEnv: "development",
    databaseName: "agrilink_dev_disposable",
    classifications: [SeedClassification.DEV],
    dependencies: registry.viewFor({
      ...PROFILES_ROLE_PROFILES_DEV_SEED_METADATA,
      dependencies,
    }),
  };
}

type ProfileKind = keyof ProfileRoleDevSeedData;
type ProfileWriteData = ProfileRoleDevSeedData[ProfileKind][number];

interface StoredProfile {
  readonly id: string;
  data: ProfileWriteData;
}

function createWriter(
  initial: Partial<Record<ProfileKind, StoredProfile[]>> = {},
): {
  writer: ProfileRoleDevSeedWriter;
  rows: Record<ProfileKind, StoredProfile[]>;
  creates: ProfileKind[];
  updates: ProfileKind[];
} {
  const rows: Record<ProfileKind, StoredProfile[]> = {
    farmer: [...(initial.farmer ?? [])],
    cooperative: [...(initial.cooperative ?? [])],
    enterprise: [...(initial.enterprise ?? [])],
    supplier: [...(initial.supplier ?? [])],
  };
  const creates: ProfileKind[] = [];
  const updates: ProfileKind[] = [];
  const find = (kind: ProfileKind, field: string, value: string) =>
    rows[kind].find(
      ({ data }) =>
        (data as unknown as Record<string, unknown>)[field] === value,
    ) ?? null;
  const create = (kind: ProfileKind, data: ProfileWriteData) => {
    creates.push(kind);
    rows[kind].push({ id: `${kind}-${rows[kind].length + 1}`, data });
  };
  const update = (kind: ProfileKind, id: string, data: object) => {
    updates.push(kind);
    const index = rows[kind].findIndex((row) => row.id === id);
    rows[kind][index] = {
      id,
      data: { ...rows[kind][index].data, ...data } as ProfileWriteData,
    };
  };

  const writer: ProfileRoleDevSeedWriter = {
    async findFarmerByUserId(value) {
      return find("farmer", "userId", value);
    },
    async findFarmerByCccd(value) {
      return find("farmer", "cccdNumber", value);
    },
    async createFarmer(data) {
      create("farmer", data);
    },
    async updateFarmer(id, data) {
      update("farmer", id, data);
    },
    async findCooperativeByUserId(value) {
      return find("cooperative", "userId", value);
    },
    async findCooperativeByBusinessLicense(value) {
      return find("cooperative", "businessLicenseNumber", value);
    },
    async findCooperativeByTaxCode(value) {
      return find("cooperative", "taxCode", value);
    },
    async createCooperative(data) {
      create("cooperative", data);
    },
    async updateCooperative(id, data) {
      update("cooperative", id, data);
    },
    async findEnterpriseByUserId(value) {
      return find("enterprise", "userId", value);
    },
    async findEnterpriseByTaxCode(value) {
      return find("enterprise", "taxCode", value);
    },
    async createEnterprise(data) {
      create("enterprise", data);
    },
    async updateEnterprise(id, data) {
      update("enterprise", id, data);
    },
    async findSupplierByUserId(value) {
      return find("supplier", "userId", value);
    },
    async createSupplier(data) {
      create("supplier", data);
    },
    async updateSupplier(id, data) {
      update("supplier", id, data);
    },
  };
  return { writer, rows, creates, updates };
}

describe("ProfilesRoleProfilesDevSeedGroup", () => {
  it("declares the one Profiles-owned group with only the Users dependency", () => {
    expect(PROFILES_ROLE_PROFILES_DEV_SEED_METADATA).toEqual({
      id: "profiles.dev.role-profiles",
      owner: "profiles",
      classification: SeedClassification.DEV,
      dependencies: [USERS_DEV_SEED_GROUP_ID],
      description: "Canonical development role profiles",
    });
  });

  it("contains four baseline and eight approved D2 Profile fixtures", () => {
    const data = buildProfileRoleDevSeedData(
      createContext(),
      new Date("2026-08-16T00:00:00Z"),
    );

    expect(data.farmer).toHaveLength(4);
    expect(data.cooperative).toHaveLength(3);
    expect(data.enterprise).toHaveLength(3);
    expect(data.supplier).toHaveLength(2);
    expect(
      Object.values(data).reduce(
        (count, profiles) => count + profiles.length,
        0,
      ),
    ).toBe(12);
    expect(ADMIN_DEV_PROFILE_USER_EMAILS).toEqual([
      "hung.nv@farm.vn",
      "mai.lt@farm.vn",
      "tuan.pq@farm.vn",
      "htx.dalat@coop.vn",
      "htx.tiengiang@coop.vn",
      "xnk.mekong@ent.vn",
      "agri.tech@ent.vn",
      "phanbon.xanh@sup.vn",
    ]);
    expect(allProfileEmails).toHaveLength(12);
    expect(new Set(allProfileEmails).size).toBe(12);
    expect(
      Object.values(data)
        .flat()
        .map(({ userId }) => userId),
    ).toEqual(
      expect.arrayContaining(allProfileEmails.map((email) => `user:${email}`)),
    );
  });

  it("preserves the eight Admin payloads and opaque numeric geography values", () => {
    const data = buildProfileRoleDevSeedData(createContext());

    expect(
      data.farmer
        .slice(1)
        .map(({ provinceId, districtId }) => [provinceId, districtId]),
    ).toEqual([
      [1, 101],
      [2, 201],
      [3, 301],
    ]);
    expect(
      data.cooperative.slice(1).map(({ provinceId }) => provinceId),
    ).toEqual([2, 1]);
    expect(
      data.enterprise.slice(1).map(({ provinceId }) => provinceId),
    ).toEqual([3, 3]);
    expect(data.supplier[1]).toEqual({
      userId: "user:phanbon.xanh@sup.vn",
      companyName: "Công ty TNHH Phân Bón Xanh Việt",
      supplierType: "fertilizer",
      taxCode: "0302123456",
      businessLicenseUrl:
        "https://res.cloudinary.com/personal-media/image/upload/agrilink/profiles/gpkd-phanbon.jpg",
      address: "KCN Tân Tạo, Bình Tân, TP Hồ Chí Minh",
      provinceId: 3,
      isVerified: false,
    });
    expect(PROFILES_ROLE_PROFILES_DEV_SEED_METADATA.dependencies).toEqual([
      USERS_DEV_SEED_GROUP_ID,
    ]);
    expect(PROFILES_ROLE_PROFILES_DEV_SEED_METADATA.dependencies).not.toContain(
      "geography.reference.provinces",
    );
  });

  it("declares unique User and schema-backed secondary identities", () => {
    const data = buildProfileRoleDevSeedData(createContext());
    const unique = (values: readonly string[]) =>
      expect(new Set(values).size).toBe(values.length);

    unique(
      Object.values(data)
        .flat()
        .map(({ userId }) => userId),
    );
    unique(data.farmer.map(({ cccdNumber }) => cccdNumber));
    unique(
      data.cooperative.map(
        ({ businessLicenseNumber }) => businessLicenseNumber,
      ),
    );
    unique(data.cooperative.map(({ taxCode }) => taxCode));
    unique(data.enterprise.map(({ taxCode }) => taxCode));
  });

  it("converges all twelve records while the group publishes no outputs", async () => {
    const context = createContext();
    const expected = buildProfileRoleDevSeedData(
      context,
      new Date("2026-08-16T00:00:00Z"),
    );
    const state = createWriter({
      farmer: [
        {
          id: "existing-farmer",
          data: { ...expected.farmer[0], bio: "stale farmer bio" },
        },
      ],
    });
    await reconcileProfileRoleDevSeeds(state.writer, expected);
    expect(state.creates).toHaveLength(11);
    expect(state.updates).toEqual(["farmer"]);
    expect(Object.values(state.rows).map((values) => values.length)).toEqual([
      4, 3, 3, 2,
    ]);

    await reconcileProfileRoleDevSeeds(state.writer, expected);
    expect(state.creates).toHaveLength(11);
    expect(state.updates).toHaveLength(13);
    expect(state.rows.farmer[0].data.userId).toBe(expected.farmer[0].userId);

    const source = readFileSync(
      join(__dirname, "profile-role-development.seed.ts"),
      "utf8",
    );
    expect(source).toContain("return EMPTY_SEED_GROUP_RESULT");
  });

  it.each([
    ["farmer", 3, "cccdNumber"],
    ["cooperative", 2, "businessLicenseNumber"],
    ["cooperative", 1, "taxCode"],
    ["enterprise", 2, "taxCode"],
  ] as const)(
    "preflights every fixture and fails closed when %s[%s] splits on %s",
    async (kind, index, secondaryField) => {
      const context = createContext();
      const data = buildProfileRoleDevSeedData(context);
      const intended = data[kind][index] as ProfileWriteData;
      const byUserData = {
        ...intended,
        [secondaryField]: `stale-${kind}-${secondaryField}`,
      } as ProfileWriteData;
      const bySecondaryData = {
        ...intended,
        userId: `another-user:${kind}`,
      } as ProfileWriteData;
      const state = createWriter({
        [kind]: [
          { id: `${kind}-by-user`, data: byUserData },
          { id: `${kind}-by-secondary`, data: bySecondaryData },
        ],
      } as Partial<Record<ProfileKind, StoredProfile[]>>);

      await expect(
        reconcileProfileRoleDevSeeds(state.writer, data),
      ).rejects.toThrow("identity conflict");
      expect(state.creates).toEqual([]);
      expect(state.updates).toEqual([]);
    },
  );

  it.each([
    ["farmer", 0, "cccdNumber"],
    ["cooperative", 1, "businessLicenseNumber"],
    ["cooperative", 2, "taxCode"],
    ["enterprise", 1, "taxCode"],
  ] as const)(
    "fails closed when %s[%s] has only its %s identity",
    async (kind, index, secondaryField) => {
      const context = createContext();
      const data = buildProfileRoleDevSeedData(context);
      const intended = data[kind][index] as ProfileWriteData;
      const state = createWriter({
        [kind]: [
          {
            id: `${kind}-partial`,
            data: {
              ...intended,
              userId: `other-user:${kind}`,
            } as ProfileWriteData,
          },
        ],
      } as Partial<Record<ProfileKind, StoredProfile[]>>);

      await expect(
        reconcileProfileRoleDevSeeds(state.writer, data),
      ).rejects.toThrow("partial identity conflict");
      expect(
        (state.rows[kind][0].data as unknown as Record<string, unknown>)[
          secondaryField
        ],
      ).toBe((intended as unknown as Record<string, unknown>)[secondaryField]);
      expect(state.creates).toEqual([]);
      expect(state.updates).toEqual([]);
    },
  );

  it("fails closed on duplicate declared identities before any write", async () => {
    const context = createContext();
    const data = buildProfileRoleDevSeedData(context);
    const duplicate: ProfileRoleDevSeedData = {
      ...data,
      farmer: [
        data.farmer[0],
        { ...data.farmer[1], cccdNumber: data.farmer[0].cccdNumber },
        ...data.farmer.slice(2),
      ],
    };
    const state = createWriter();

    await expect(
      reconcileProfileRoleDevSeeds(state.writer, duplicate),
    ).rejects.toThrow("duplicate declared Farmer CCCD");
    expect(state.creates).toEqual([]);
    expect(state.updates).toEqual([]);
  });

  it("fails closed without the declared Users dependency", () => {
    expect(() => buildProfileRoleDevSeedData(createContext([]))).toThrow(
      "UNDECLARED_DEPENDENCY_LOOKUP",
    );
  });

  it("keeps User persistence, Geography, and TypeORM outside the group contract", () => {
    const source = readFileSync(
      join(__dirname, "profile-role-development.seed.ts"),
      "utf8",
    );
    expect(source).not.toMatch(/from ["']typeorm["']/);
    expect(source).not.toMatch(/user\.entity|Repository<|DataSource/);
    expect(source).not.toMatch(/geography|province-reference|Province/);
  });
});
