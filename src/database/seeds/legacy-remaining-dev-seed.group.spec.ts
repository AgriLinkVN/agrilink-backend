import { readFileSync } from "fs";
import { join } from "path";
import {
  SeedClassification,
  SeedExecutionContext,
} from "./framework/seed-contract";
import { SeedOutputRegistry } from "./framework/seed-dependency-outputs";
import {
  USER_ID_BY_EMAIL_OUTPUT_KIND,
  USERS_DEV_SEED_GROUP_ID,
} from "../../modules/users/application/contracts/user-seed-output.contract";
import {
  PRODUCT_ID_BY_SKU_OUTPUT_KIND,
  PRODUCTS_DEV_SEED_GROUP_ID,
} from "../../modules/products/application/contracts/product-seed-output.contract";
import {
  LEGACY_DEV_ACTOR_EMAILS,
  LEGACY_DEV_PRODUCT_SKUS,
  LEGACY_REMAINING_DEV_SEED_METADATA,
  LEGACY_REMAINING_TARGET_RETIREMENT,
  LegacyDevActorIds,
  LegacyDevProductIds,
  LegacyRemainingDevSeedContinuation,
  LegacyRemainingDevSeedGroup,
  TEMPORARY_LEGACY_CONTINUATION,
  resolveLegacyDevActorIds,
  resolveLegacyDevProductIds,
} from "./legacy-remaining-dev-seed.group";

function createContext(
  dependencies = LEGACY_REMAINING_DEV_SEED_METADATA.dependencies,
): SeedExecutionContext {
  const registry = new SeedOutputRegistry();
  registry.register(USERS_DEV_SEED_GROUP_ID, {
    outputs: Object.values(LEGACY_DEV_ACTOR_EMAILS).map((email) => ({
      kind: USER_ID_BY_EMAIL_OUTPUT_KIND,
      key: email,
      value: `id:${email}`,
    })),
  });
  registry.register(PRODUCTS_DEV_SEED_GROUP_ID, {
    outputs: Object.values(LEGACY_DEV_PRODUCT_SKUS).map((sku) => ({
      kind: PRODUCT_ID_BY_SKU_OUTPUT_KIND,
      key: sku,
      value: `id:${sku}`,
    })),
  });
  return {
    nodeEnv: "development",
    databaseName: "agrilink_dev_disposable",
    classifications: [SeedClassification.DEV],
    dependencies: registry.viewFor({
      ...LEGACY_REMAINING_DEV_SEED_METADATA,
      dependencies,
    }),
  };
}

describe("LegacyRemainingDevSeedGroup", () => {
  it("is explicit temporary C1-to-C4 scaffolding with exact dependencies", () => {
    expect(TEMPORARY_LEGACY_CONTINUATION).toBe("YES");
    expect(LEGACY_REMAINING_TARGET_RETIREMENT).toBe("P8_05C4");
    expect(LEGACY_REMAINING_DEV_SEED_METADATA).toEqual({
      id: "legacy.dev.remaining",
      owner: "persistence-transition",
      classification: SeedClassification.DEV,
      dependencies: [USERS_DEV_SEED_GROUP_ID, PRODUCTS_DEV_SEED_GROUP_ID],
      description:
        "TEMPORARY_LEGACY_CONTINUATION=YES; TARGET_RETIREMENT=P8_05C4",
    });
  });

  it("resolves every legacy alias from the approved user.id.by-email outputs", () => {
    expect(resolveLegacyDevActorIds(createContext())).toEqual(
      Object.fromEntries(
        Object.entries(LEGACY_DEV_ACTOR_EMAILS).map(([alias, email]) => [
          alias,
          `id:${email}`,
        ]),
      ),
    );
  });

  it("fails closed when Users output access is undeclared", () => {
    expect(() =>
      resolveLegacyDevActorIds(createContext([PRODUCTS_DEV_SEED_GROUP_ID])),
    ).toThrow("UNDECLARED_DEPENDENCY_LOOKUP");
  });

  it("resolves only the Harvest Product ID still required centrally", () => {
    expect(resolveLegacyDevProductIds(createContext())).toEqual(
      Object.fromEntries(
        Object.entries(LEGACY_DEV_PRODUCT_SKUS).map(([alias, sku]) => [
          alias,
          `id:${sku}`,
        ]),
      ),
    );
    expect(LEGACY_DEV_PRODUCT_SKUS).toEqual({
      XOAI_HOA_LOC: "DEV-XOAI-HOA-LOC-001",
    });
  });

  it("fails closed when Products output access is undeclared", () => {
    expect(() =>
      resolveLegacyDevProductIds(createContext([USERS_DEV_SEED_GROUP_ID])),
    ).toThrow("UNDECLARED_DEPENDENCY_LOOKUP");
  });

  it("calls only the narrow remaining C2/C3/C4 continuation", async () => {
    const calls: LegacyDevActorIds[] = [];
    const productCalls: LegacyDevProductIds[] = [];
    const continuation: LegacyRemainingDevSeedContinuation = {
      async seedRemainingLegacySections(actors, products) {
        calls.push(actors);
        productCalls.push(products);
      },
    };

    await new LegacyRemainingDevSeedGroup(continuation).execute(
      createContext(),
    );

    expect(calls).toHaveLength(1);
    expect(calls[0].FARMER).toBe("id:farmer@sandbox.com");
    expect(calls[0].ENTERPRISE).toBe("id:enterprise@agrilink.vn");
    expect(productCalls).toHaveLength(1);
    expect(productCalls[0].XOAI_HOA_LOC).toBe("id:DEV-XOAI-HOA-LOC-001");
  });

  it("keeps migrated and deferred C1 paths out of central execution", () => {
    const central = readFileSync(
      join(__dirname, "..", "dev-seed.service.ts"),
      "utf8",
    );
    const main = readFileSync(join(__dirname, "..", "..", "main.ts"), "utf8");

    expect(central).not.toMatch(
      /seedUsers|seedAddress|seedProfile|getRepository\(User\)|user_addresses|logistics_profiles/,
    );
    expect(central).not.toMatch(
      /farmer-profile\.entity|cooperative-profile\.entity|enterprise-profile\.entity|supplier-profile\.entity|logistics-profile\.entity/,
    );
    expect(main).not.toMatch(/users\.dev\.addresses|logistics\.dev\.profile/);
    expect(main).toContain("new LegacyRemainingDevSeedGroup");
    expect(main).not.toContain("devSeed.seedAll");
    expect(central).not.toMatch(
      /getRepository\(Product\)|product-image\.entity|product-category\.entity|product-certification\.entity|products\[|productIds\[/,
    );
    expect(central).not.toMatch(/seedProducts|seedCategories|seedViolations/);
    expect(central).not.toMatch(
      /seedReviews|getRepository\(Review\)|review\.entity|['"]review['"],/,
    );
    expect(central).not.toMatch(
      /seedCoopMembers|getRepository\(CooperativeMemberEntity\)|cooperative-member\.entity|['"]cooperative_members['"],/,
    );
    expect(central).toContain("seedBulkListings");
    expect(central).toContain("seedHarvestSchedules");
    expect(central).toContain("bulk_listing_contributions");
    expect(central).toContain("harvest_schedules");
    expect(LEGACY_DEV_ACTOR_EMAILS.COOP).toBe("cooperative@sandbox.com");
    expect(LEGACY_DEV_ACTOR_EMAILS.FARMER).toBe("farmer@sandbox.com");
    expect(Object.keys(LEGACY_DEV_PRODUCT_SKUS)).toEqual(["XOAI_HOA_LOC"]);
    expect(central).not.toMatch(
      /SAU_RIENG_RI6|BUOI_DA_XANH_FARMER|THANH_LONG_RUOT_DO|DUA_HAU_KHONG_HAT|VAI_THIEU_LUC_NGAN|RAU_MUONG_HUU_CO|CA_ROT_DA_LAT/,
    );
  });
});
