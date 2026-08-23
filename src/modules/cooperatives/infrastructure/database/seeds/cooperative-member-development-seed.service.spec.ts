import { readFileSync } from "fs";
import { join } from "path";

import {
  EMPTY_SEED_GROUP_RESULT,
  SeedClassification,
  SeedExecutionContext,
} from "../../../../../database/seeds/framework/seed-contract";
import { SeedOutputRegistry } from "../../../../../database/seeds/framework/seed-dependency-outputs";
import {
  USER_ID_BY_EMAIL_OUTPUT_KIND,
  USERS_DEV_SEED_GROUP_ID,
} from "../../../../users/application/contracts/user-seed-output.contract";
import { COOPERATIVES_DEV_MEMBERS_SEED_GROUP_ID } from "../../../application/contracts/cooperative-seed.contract";
import {
  COOPERATIVE_MEMBER_DEV_SEED_DEFINITIONS,
  COOPERATIVES_DEV_MEMBERS_SEED_METADATA,
  CooperativeMemberDevelopmentSeedService,
  CooperativeMemberDevSeedCreateData,
  CooperativeMemberDevSeedRecord,
  CooperativeMemberDevSeedUpdateData,
  CooperativeMemberDevSeedWriteData,
  CooperativeMemberDevSeedWriter,
  reconcileCooperativeMemberDevelopmentSeeds,
  resolveCooperativeMemberDevelopmentSeedData,
} from "./cooperative-member-development-seed.service";

interface StoredMember
  extends CooperativeMemberDevSeedRecord, CooperativeMemberDevSeedWriteData {}

class InMemoryCooperativeMemberDevSeedWriter implements CooperativeMemberDevSeedWriter {
  readonly rows: StoredMember[];
  readonly creates: CooperativeMemberDevSeedCreateData[] = [];
  readonly updates: Array<{
    readonly id: string;
    readonly data: CooperativeMemberDevSeedUpdateData;
  }> = [];

  constructor(rows: StoredMember[] = []) {
    this.rows = rows;
  }

  async findMembersByCooperativeAndFarmer(
    cooperativeId: string,
    farmerId: string,
  ): Promise<readonly CooperativeMemberDevSeedRecord[]> {
    return this.rows
      .filter(
        (row) =>
          row.cooperativeId === cooperativeId && row.farmerId === farmerId,
      )
      .map(({ id, joinedAt }) => ({ id, joinedAt }));
  }

  async createMember(data: CooperativeMemberDevSeedCreateData): Promise<void> {
    this.creates.push(data);
    this.rows.push({ id: `member:${this.rows.length + 1}`, ...data });
  }

  async updateMember(
    id: string,
    data: CooperativeMemberDevSeedUpdateData,
  ): Promise<void> {
    this.updates.push({ id, data });
    const index = this.rows.findIndex((row) => row.id === id);
    if (index >= 0) this.rows[index] = { ...this.rows[index], ...data };
  }
}

function createContext(options?: {
  readonly omitEmail?: string;
  readonly classifications?: readonly SeedClassification[];
}): SeedExecutionContext {
  const registry = new SeedOutputRegistry();
  const emails = [
    ...new Set(
      COOPERATIVE_MEMBER_DEV_SEED_DEFINITIONS.flatMap(
        ({ cooperativeEmail, farmerEmail }) => [cooperativeEmail, farmerEmail],
      ),
    ),
  ];
  registry.register(USERS_DEV_SEED_GROUP_ID, {
    outputs: emails
      .filter((email) => email !== options?.omitEmail)
      .map((email) => ({
        kind: USER_ID_BY_EMAIL_OUTPUT_KIND,
        key: email,
        value: `user:${email}`,
      })),
  });
  return {
    nodeEnv: "development",
    databaseName: "agrilink_dev_disposable",
    classifications: options?.classifications ?? [SeedClassification.DEV],
    dependencies: registry.viewFor(COOPERATIVES_DEV_MEMBERS_SEED_METADATA),
  };
}

describe("CooperativeMemberDevelopmentSeedService", () => {
  it("declares the one Cooperatives-owned DEV group and exact dependency", () => {
    expect(COOPERATIVES_DEV_MEMBERS_SEED_GROUP_ID).toBe(
      "cooperatives.dev.members",
    );
    expect(COOPERATIVES_DEV_MEMBERS_SEED_METADATA).toEqual({
      id: "cooperatives.dev.members",
      owner: "cooperatives",
      classification: SeedClassification.DEV,
      dependencies: [USERS_DEV_SEED_GROUP_ID],
      description: "Canonical Cooperative Member development fixture",
    });
  });

  it("declares exactly the approved Member payload and no generated identity", () => {
    expect(COOPERATIVE_MEMBER_DEV_SEED_DEFINITIONS).toEqual([
      {
        fixtureId: "COOP-MEMBER-01",
        cooperativeEmail: "cooperative@sandbox.com",
        farmerEmail: "farmer@sandbox.com",
        status: "active",
        role: "Thành viên sản xuất",
      },
    ]);
    expect(COOPERATIVE_MEMBER_DEV_SEED_DEFINITIONS).toHaveLength(1);
    expect(COOPERATIVE_MEMBER_DEV_SEED_DEFINITIONS[0]).not.toHaveProperty("id");
    expect(COOPERATIVE_MEMBER_DEV_SEED_DEFINITIONS[0]).not.toHaveProperty(
      "joinedAt",
    );
  });

  it("resolves both actor IDs only from dependency-scoped User outputs", () => {
    expect(
      resolveCooperativeMemberDevelopmentSeedData(createContext()),
    ).toEqual([
      {
        cooperativeId: "user:cooperative@sandbox.com",
        farmerId: "user:farmer@sandbox.com",
        status: "active",
        role: "Thành viên sản xuất",
      },
    ]);
  });

  it("fails closed when either required User output is missing", () => {
    expect(() =>
      resolveCooperativeMemberDevelopmentSeedData(
        createContext({ omitEmail: "cooperative@sandbox.com" }),
      ),
    ).toThrow("MISSING_REQUIRED_OUTPUT");
    expect(() =>
      resolveCooperativeMemberDevelopmentSeedData(
        createContext({ omitEmail: "farmer@sandbox.com" }),
      ),
    ).toThrow("MISSING_REQUIRED_OUTPUT");
  });

  it("rejects duplicate declared cooperative/Farmer identities", () => {
    const definition = COOPERATIVE_MEMBER_DEV_SEED_DEFINITIONS[0];
    expect(() =>
      resolveCooperativeMemberDevelopmentSeedData(createContext(), [
        definition,
        { ...definition, fixtureId: "DUPLICATE" },
      ]),
    ).toThrow("declares duplicate Member identity");
  });

  it("creates a missing Member with current-time joinedAt semantics", async () => {
    const records =
      resolveCooperativeMemberDevelopmentSeedData(createContext());
    const joinedAt = new Date("2026-08-17T00:00:00.000Z");
    const writer = new InMemoryCooperativeMemberDevSeedWriter();

    await reconcileCooperativeMemberDevelopmentSeeds(
      writer,
      records,
      () => joinedAt,
    );

    expect(writer.creates).toEqual([{ ...records[0], joinedAt }]);
    expect(writer.updates).toHaveLength(0);
    expect(writer.rows).toHaveLength(1);
  });

  it("reconciles status and role while preserving identity, joinedAt, and unrelated Members", async () => {
    const records =
      resolveCooperativeMemberDevelopmentSeedData(createContext());
    const originalJoinedAt = new Date("2026-01-15T08:30:00.000Z");
    const existing: StoredMember = {
      id: "existing-member",
      ...records[0],
      status: "pending",
      role: "stale role",
      joinedAt: originalJoinedAt,
    };
    const unrelated: StoredMember = {
      id: "unrelated-member",
      cooperativeId: "unrelated-cooperative",
      farmerId: "unrelated-farmer",
      status: "active",
      role: "preserve me",
      joinedAt: new Date("2025-01-01T00:00:00.000Z"),
    };
    const writer = new InMemoryCooperativeMemberDevSeedWriter([
      existing,
      unrelated,
    ]);

    await reconcileCooperativeMemberDevelopmentSeeds(writer, records);

    expect(writer.creates).toHaveLength(0);
    expect(writer.updates).toEqual([
      {
        id: "existing-member",
        data: { status: "active", role: "Thành viên sản xuất" },
      },
    ]);
    expect(writer.rows.find(({ id }) => id === "existing-member")).toEqual({
      id: "existing-member",
      ...records[0],
      joinedAt: originalJoinedAt,
    });
    expect(writer.rows.find(({ id }) => id === "unrelated-member")).toEqual(
      unrelated,
    );
  });

  it("preflights the full identity and fails before the first mutation on multiple matches", async () => {
    const records =
      resolveCooperativeMemberDevelopmentSeedData(createContext());
    const duplicateBase = {
      ...records[0],
      joinedAt: new Date("2026-01-01T00:00:00.000Z"),
    };
    const writer = new InMemoryCooperativeMemberDevSeedWriter([
      { id: "duplicate-a", ...duplicateBase },
      { id: "duplicate-b", ...duplicateBase },
    ]);

    await expect(
      reconcileCooperativeMemberDevelopmentSeeds(writer, records),
    ).rejects.toThrow("found multiple Members");
    expect(writer.creates).toHaveLength(0);
    expect(writer.updates).toHaveLength(0);
  });

  it("is idempotent and produces no joinedAt drift on a second in-memory run", async () => {
    const records =
      resolveCooperativeMemberDevelopmentSeedData(createContext());
    const firstJoinedAt = new Date("2026-08-17T01:00:00.000Z");
    const writer = new InMemoryCooperativeMemberDevSeedWriter();

    await reconcileCooperativeMemberDevelopmentSeeds(
      writer,
      records,
      () => firstJoinedAt,
    );
    const joinedAtAfterFirstRun = writer.rows[0].joinedAt;
    await reconcileCooperativeMemberDevelopmentSeeds(
      writer,
      records,
      () => new Date("2026-08-18T01:00:00.000Z"),
    );

    expect(writer.creates).toHaveLength(1);
    expect(writer.updates).toHaveLength(1);
    expect(writer.rows).toHaveLength(1);
    expect(writer.rows[0].joinedAt).toBe(joinedAtAfterFirstRun);
  });

  it("requires explicit DEV selection and returns the empty group result", async () => {
    const writer = new InMemoryCooperativeMemberDevSeedWriter();
    const service = new CooperativeMemberDevelopmentSeedService(writer);

    await expect(service.execute(createContext())).resolves.toEqual(
      EMPTY_SEED_GROUP_RESULT,
    );
    await expect(
      service.execute(
        createContext({ classifications: [SeedClassification.REFERENCE] }),
      ),
    ).rejects.toThrow("requires explicit DEV selection");
  });

  it("keeps the application contract neutral and TypeORM owner-local", () => {
    const contractSource = readFileSync(
      join(
        __dirname,
        "../../../application/contracts/cooperative-seed.contract.ts",
      ),
      "utf8",
    );
    const serviceSource = readFileSync(
      join(__dirname, "cooperative-member-development-seed.service.ts"),
      "utf8",
    );
    const writerSource = readFileSync(
      join(__dirname, "typeorm-cooperative-member-dev-seed.writer.ts"),
      "utf8",
    );

    expect(contractSource).not.toMatch(
      /typeorm|DataSource|EntityManager|QueryRunner|Repository|\.entity/,
    );
    expect(serviceSource).not.toMatch(
      /modules\/users\/.*(?:infrastructure|entities|repositories)|getRepository/,
    );
    expect(writerSource).toMatch(/from ["']typeorm["']/);
    expect(writerSource).toContain("CooperativeMemberEntity");
    expect(writerSource).toContain("this.repository.find({");
    expect(writerSource).not.toContain("findOne");
  });

  it("retires only central Member persistence and reset targeting", () => {
    const centralSource = readFileSync(
      join(__dirname, "../../../../../database/dev-seed.service.ts"),
      "utf8",
    );
    const mainSource = readFileSync(
      join(__dirname, "../../../../../main.ts"),
      "utf8",
    );
    const legacySource = readFileSync(
      join(
        __dirname,
        "../../../../../database/seeds/legacy-remaining-dev-seed.group.ts",
      ),
      "utf8",
    );

    expect(centralSource).not.toMatch(
      /seedCoopMembers|CooperativeMemberEntity|cooperative-member\.entity|['"]cooperative_members['"]/,
    );
    expect(centralSource).not.toContain("seedBulkListings");
    expect(centralSource).toContain("seedHarvestSchedules");
    expect(centralSource).not.toContain("bulkListingId: listing.id");
    expect(
      centralSource.match(/expectedHarvestDate: new Date\(["']2026-/g),
    ).toHaveLength(3);
    expect(
      mainSource.match(/app\.get\(CooperativeMemberDevelopmentSeedService\)/g),
    ).toHaveLength(1);
    expect(mainSource).not.toMatch(
      /cooperatives\.dev\.(?:bulk-operations|harvest)/,
    );
    expect(legacySource).toContain('COOP: "cooperative@sandbox.com"');
    expect(legacySource).toContain('FARMER: "farmer@sandbox.com"');
    expect(legacySource).toContain('XOAI_HOA_LOC: "DEV-XOAI-HOA-LOC-001"');
  });

  it("retains the schema-backed cooperative/Farmer unique pair", () => {
    const migrationSource = readFileSync(
      join(
        __dirname,
        "../../../../../database/migrations/1783731600000-EstablishCooperativePersistenceBoundaries.ts",
      ),
      "utf8",
    );
    expect(migrationSource).toContain("uq_p3_member_cooperative_farmer");
    expect(migrationSource).toContain("UNIQUE (cooperative_id, farmer_id)");
  });
});
