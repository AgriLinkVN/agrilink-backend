import { readFileSync } from "fs";
import { join } from "path";

const root = join(__dirname, "..", "..", "..");
const adminSource = readFileSync(join(__dirname, "admin-dev.seed.ts"), "utf8");
const usersSeedSource = readFileSync(
  join(
    root,
    "src",
    "modules",
    "users",
    "infrastructure",
    "database",
    "seeds",
    "user.seed.ts",
  ),
  "utf8",
);
const phaseReadme = readFileSync(
  join(
    root,
    "docs",
    "architecture",
    "persistence",
    "phases",
    "phase-08",
    "README.md",
  ),
  "utf8",
);

function section(start: string, end: string): string {
  const startIndex = adminSource.indexOf(start);
  const endIndex = adminSource.indexOf(end, startIndex + start.length);
  if (startIndex < 0 || endIndex < 0) {
    throw new Error(`Missing Admin DEV source section: ${start} -> ${end}`);
  }
  return adminSource.slice(startIndex, endIndex);
}

function matchCount(source: string, pattern: RegExp): number {
  return source.match(pattern)?.length ?? 0;
}

describe("P8-05D1 Admin DEV Users owner transition", () => {
  it("uses the existing Users owner group and scalar output contract", () => {
    expect(adminSource).toContain("createUsersDevSeedGroup(ds).execute");
    expect(adminSource).toContain("USER_ID_BY_EMAIL_OUTPUT_KIND");
    expect(adminSource).toContain("USERS_DEV_SEED_GROUP_ID");
    expect(adminSource).toContain("resolveAdminDevUserIds(result)");
    expect(adminSource).toContain(
      "dependencies: EMPTY_SEED_DEPENDENCY_OUTPUTS",
    );
  });

  it("declares all nine standalone identities for scalar resolution", () => {
    const identities = section(
      "export const ADMIN_DEV_USER_EMAILS = [",
      "] as const;",
    );
    expect(identities.match(/[\w.-]+@[\w.-]+/g)).toEqual([
      "admin@agrilink.vn",
      "hung.nv@farm.vn",
      "mai.lt@farm.vn",
      "tuan.pq@farm.vn",
      "htx.dalat@coop.vn",
      "htx.tiengiang@coop.vn",
      "xnk.mekong@ent.vn",
      "agri.tech@ent.vn",
      "phanbon.xanh@sup.vn",
    ]);
  });

  it("contains no standalone User repository or User business write", () => {
    expect(adminSource).not.toMatch(/\buserRepo\b/);
    expect(adminSource).not.toMatch(/getRepository\(User\)/);
    expect(adminSource).not.toMatch(/\buserDefs\b/);
    expect(adminSource).not.toMatch(/bcrypt|passwordHash/);
    expect(adminSource).not.toMatch(
      /(?:userRepo|usersRepository)\.(?:save|create|update|insert|upsert|delete)/,
    );
  });

  it("keeps one existing Users SeedGroup and creates no transition group", () => {
    expect(matchCount(usersSeedSource, /export class UsersDevSeedGroup/g)).toBe(
      1,
    );
    expect(matchCount(usersSeedSource, /id: USERS_DEV_SEED_GROUP_ID/g)).toBe(1);
    expect(adminSource).not.toMatch(/class\s+\w*Users?\w*SeedGroup/);
    expect(adminSource).not.toMatch(/new UsersDevSeedGroup/);
  });

  it("preserves all eight Profile fixture writes for D2", () => {
    const farmers = section(
      "const farmerProfiles = [",
      "// ─── Cooperative profiles",
    );
    const cooperatives = section(
      "const coopProfiles = [",
      "// ─── Enterprise profiles",
    );
    const enterprises = section(
      "const enterpriseProfiles = [",
      "// ─── Supplier profile",
    );
    const supplier = section("const spExist =", "// ─── Products");

    expect(matchCount(farmers, /userId: users\[/g)).toBe(3);
    expect(matchCount(cooperatives, /userId: users\[/g)).toBe(2);
    expect(matchCount(enterprises, /userId: users\[/g)).toBe(2);
    expect(matchCount(supplier, /supplierRepo\.create\(\{/g)).toBe(1);
    expect(supplier).toContain('userId: users["phanbon.xanh@sup.vn"].id');
    expect(adminSource).toContain("farmerRepo.save");
    expect(adminSource).toContain("coopRepo.save");
    expect(adminSource).toContain("enterpriseRepo.save");
    expect(adminSource).toContain("supplierRepo.save");
  });

  it("preserves all ten Product and ten Product Image fixture writes for D3", () => {
    const products = section(
      "const productDefs = [",
      "for (const pd of productDefs)",
    );
    const images = section(
      "const placeholderImages: Record<string, string> = {",
      "for (const pd of productDefs)",
    );

    expect(matchCount(products, /sellerId: users\[/g)).toBe(10);
    expect(matchCount(images, /https:\/\/res\.cloudinary\.com/g)).toBe(10);
    expect(adminSource).toContain("productRepo.save");
    expect(adminSource).toContain("imageRepo.save");
  });

  it("retains the guarded standalone entrypoint and current D4 blockers", () => {
    expect(adminSource).toContain("if (require.main === module)");
    expect(adminSource).toContain("const ds = new DataSource");
    expect(adminSource.indexOf("assertSeedExecutionSafety({")).toBeLessThan(
      adminSource.indexOf("const ds = new DataSource"),
    );
    expect(phaseReadme).toContain(
      "P8_05D4_STANDALONE_ENTRYPOINT_RETIREMENT_AUTHORIZED=NO",
    );
    expect(phaseReadme).toContain(
      "P8_05D4_BLOCKERS=P8_05D2_PROFILES_NOT_IMPLEMENTED;P8_05D3_PRODUCTS_NOT_IMPLEMENTED",
    );
  });
});
