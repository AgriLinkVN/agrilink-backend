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
  PROFILE_DEV_USER_EMAILS,
  PROFILES_ROLE_PROFILES_DEV_SEED_METADATA,
  ProfileRoleDevSeedData,
  ProfileRoleDevSeedWriter,
  ProfilesRoleProfilesDevSeedGroup,
  buildProfileRoleDevSeedData,
} from "./profile-role-development.seed";

function createContext(
  dependencies = PROFILES_ROLE_PROFILES_DEV_SEED_METADATA.dependencies,
): SeedExecutionContext {
  const registry = new SeedOutputRegistry();
  registry.register(USERS_DEV_SEED_GROUP_ID, {
    outputs: Object.values(PROFILE_DEV_USER_EMAILS).map((email) => ({
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

interface StoredProfile {
  readonly id: string;
  data: ProfileRoleDevSeedData[ProfileKind];
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
  const create = (
    kind: ProfileKind,
    data: ProfileRoleDevSeedData[ProfileKind],
  ) => {
    creates.push(kind);
    rows[kind].push({ id: `${kind}-${rows[kind].length + 1}`, data });
  };
  const update = (
    kind: ProfileKind,
    id: string,
    data: ProfileRoleDevSeedData[ProfileKind],
  ) => {
    updates.push(kind);
    const index = rows[kind].findIndex((row) => row.id === id);
    rows[kind][index] = { id, data };
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
  it("declares Profiles-owned DEV metadata with only the Users dependency", () => {
    expect(PROFILES_ROLE_PROFILES_DEV_SEED_METADATA).toEqual({
      id: "profiles.dev.role-profiles",
      owner: "profiles",
      classification: SeedClassification.DEV,
      dependencies: [USERS_DEV_SEED_GROUP_ID],
      description: "Canonical development role profiles",
    });
  });

  it("uses approved canonical emails and preserves opaque province integers", () => {
    const verifiedAt = new Date("2026-08-16T00:00:00Z");
    const data = buildProfileRoleDevSeedData(createContext(), verifiedAt);

    expect(PROFILE_DEV_USER_EMAILS).toEqual({
      farmer: "farmer@sandbox.com",
      cooperative: "cooperative@sandbox.com",
      enterprise: "enterprise@agrilink.vn",
      supplier: "supplier@agrilink.vn",
    });
    expect(data.farmer.userId).toBe("user:farmer@sandbox.com");
    expect(data.cooperative.userId).toBe("user:cooperative@sandbox.com");
    expect(data.enterprise.userId).toBe("user:enterprise@agrilink.vn");
    expect(data.supplier.userId).toBe("user:supplier@agrilink.vn");
    expect([
      data.farmer.provinceId,
      data.cooperative.provinceId,
      data.enterprise.provinceId,
      data.supplier.provinceId,
    ]).toEqual([2, 22, 1, 10]);
    expect(PROFILES_ROLE_PROFILES_DEV_SEED_METADATA.dependencies).not.toContain(
      "geography.reference.provinces",
    );
  });

  it("converges partial state per record without duplicate profiles", async () => {
    const context = createContext();
    const expected = buildProfileRoleDevSeedData(
      context,
      new Date("2026-08-16T00:00:00Z"),
    );
    const state = createWriter({
      farmer: [
        {
          id: "existing-farmer",
          data: { ...expected.farmer, bio: "stale farmer bio" },
        },
      ],
    });
    const group = new ProfilesRoleProfilesDevSeedGroup(state.writer);

    await group.execute(context);
    expect(state.creates).toEqual(["cooperative", "enterprise", "supplier"]);
    expect(state.updates).toEqual(["farmer"]);
    expect(Object.values(state.rows).map((values) => values.length)).toEqual([
      1, 1, 1, 1,
    ]);

    await group.execute(context);
    expect(state.creates).toHaveLength(3);
    expect(state.updates).toEqual([
      "farmer",
      "farmer",
      "cooperative",
      "enterprise",
      "supplier",
    ]);
    expect(state.rows.farmer[0].data.userId).toBe(expected.farmer.userId);
  });

  it.each([
    ["farmer", "cccdNumber"],
    ["cooperative", "businessLicenseNumber"],
    ["cooperative", "taxCode"],
    ["enterprise", "taxCode"],
  ] as const)(
    "fails closed when %s User ID and %s resolve to different rows",
    async (kind, secondaryField) => {
      const context = createContext();
      const data = buildProfileRoleDevSeedData(context);
      const intended = data[kind];
      const byUserData = {
        ...intended,
        [secondaryField]: `stale-${kind}-${secondaryField}`,
      } as ProfileRoleDevSeedData[typeof kind];
      const byUser = { id: `${kind}-by-user`, data: byUserData };
      const splitData = {
        ...intended,
        userId: `another-user:${kind}`,
      };
      const bySecondary = { id: `${kind}-by-secondary`, data: splitData };
      const state = createWriter({ [kind]: [byUser, bySecondary] } as Partial<
        Record<ProfileKind, StoredProfile[]>
      >);

      await expect(
        new ProfilesRoleProfilesDevSeedGroup(state.writer).execute(context),
      ).rejects.toThrow(`identity conflict for ${kind}`);
      expect(state.creates).toEqual([]);
      expect(state.updates).toEqual([]);
      expect(
        (bySecondary.data as unknown as Record<string, unknown>)[
          secondaryField
        ],
      ).toBe((intended as unknown as Record<string, unknown>)[secondaryField]);
    },
  );

  it("fails closed without a declared Users dependency", () => {
    expect(() => buildProfileRoleDevSeedData(createContext([]))).toThrow(
      "UNDECLARED_DEPENDENCY_LOOKUP",
    );
  });

  it("keeps Users and TypeORM persistence outside the group contract", () => {
    const source = readFileSync(
      join(__dirname, "profile-role-development.seed.ts"),
      "utf8",
    );
    expect(source).not.toMatch(/from ["']typeorm["']/);
    expect(source).not.toMatch(/user\.entity|Repository<|DataSource/);
  });
});
