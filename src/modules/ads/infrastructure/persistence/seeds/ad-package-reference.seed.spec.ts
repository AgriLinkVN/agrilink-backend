import { readFileSync } from "fs";
import { join } from "path";
import { AdType } from "../../../../../common/enums";
import {
  SeedClassification,
  SeedExecutionContext,
} from "../../../../../database/seeds/framework/seed-contract";
import { EMPTY_SEED_DEPENDENCY_OUTPUTS } from "../../../../../database/seeds/framework/seed-dependency-outputs";
import {
  AdPackageReferenceMutableData,
  AdPackageReferenceSeedData,
  AdPackageReferenceSeedWriter,
  AdsPackageReferenceSeedGroup,
  adPackageReferenceSeedData,
} from "./ad-package-reference.seed";

const referenceContext: SeedExecutionContext = {
  nodeEnv: "test",
  databaseName: "agrilink_test_disposable",
  classifications: [SeedClassification.REFERENCE],
  dependencies: EMPTY_SEED_DEPENDENCY_OUTPUTS,
};

function createWriter(existingCodes: readonly string[] = []): {
  writer: AdPackageReferenceSeedWriter;
  creates: AdPackageReferenceSeedData[];
  updates: Array<{ id: number; data: AdPackageReferenceMutableData }>;
  finds: string[];
} {
  const rows = new Map(
    existingCodes.map((packageCode, index) => [
      packageCode,
      [{ id: index + 1, packageCode }],
    ]),
  );
  const creates: AdPackageReferenceSeedData[] = [];
  const updates: Array<{
    id: number;
    data: AdPackageReferenceMutableData;
  }> = [];
  const finds: string[] = [];
  const writer: AdPackageReferenceSeedWriter = {
    async findByPackageCode(packageCode) {
      finds.push(packageCode);
      return rows.get(packageCode) ?? [];
    },
    async create(data) {
      creates.push(data);
      const row = { id: rows.size + 1, packageCode: data.packageCode };
      rows.set(data.packageCode, [row]);
      return row;
    },
    async update(id, data) {
      updates.push({ id, data });
    },
  };

  return { writer, creates, updates, finds };
}

describe("AdsPackageReferenceSeedGroup", () => {
  it("declares one Ads-owned REFERENCE group without dependencies", () => {
    const group = new AdsPackageReferenceSeedGroup(createWriter().writer);

    expect(group.metadata).toEqual({
      id: "ads.reference.packages",
      owner: "ads",
      classification: SeedClassification.REFERENCE,
      dependencies: [],
      description: "Canonical advertising Package reference catalog",
    });
  });

  it("owns exactly the three approved Package codes and payloads", () => {
    expect(adPackageReferenceSeedData).toEqual([
      {
        packageCode: "HOMEPAGE_CAROUSEL",
        name: "Banner chính (Carousel)",
        adType: AdType.BANNER,
        price: 500000,
        durationDays: 30,
        maxImpressions: 10000,
        description: "Hiển thị trên carousel trang chủ",
        isActive: true,
      },
      {
        packageCode: "FEATURED_PRODUCT",
        name: "Sản phẩm nổi bật",
        adType: AdType.FEATURED,
        price: 300000,
        durationDays: 14,
        maxImpressions: 5000,
        description: "Sản phẩm được gắn nhãn nổi bật",
        isActive: true,
      },
      {
        packageCode: "SPOTLIGHT_PLACEMENT",
        name: "Spotlight tuần",
        adType: AdType.SPOTLIGHT,
        price: 700000,
        durationDays: 7,
        maxImpressions: 20000,
        description: "Hiển thị spotlight nổi bật 7 ngày",
        isActive: true,
      },
    ]);
  });

  it("reconciles every packageCode independently without mutating identity", async () => {
    const existingCode = "FEATURED_PRODUCT";
    const state = createWriter([existingCode]);
    const group = new AdsPackageReferenceSeedGroup(state.writer);

    const result = await group.execute(referenceContext);

    expect(state.finds).toEqual([
      "HOMEPAGE_CAROUSEL",
      "FEATURED_PRODUCT",
      "SPOTLIGHT_PLACEMENT",
    ]);
    expect(state.creates.map(({ packageCode }) => packageCode)).toEqual([
      "HOMEPAGE_CAROUSEL",
      "SPOTLIGHT_PLACEMENT",
    ]);
    expect(state.updates).toHaveLength(1);
    expect(state.updates[0].data).toEqual({
      name: "Sản phẩm nổi bật",
      adType: AdType.FEATURED,
      price: 300000,
      durationDays: 14,
      maxImpressions: 5000,
      description: "Sản phẩm được gắn nhãn nổi bật",
      isActive: true,
    });
    expect(state.updates[0].data).not.toHaveProperty("packageCode");
    expect(result.outputs).toEqual([]);
  });

  it("fails closed on an impossible ambiguous packageCode", async () => {
    const writer = createWriter().writer;
    writer.findByPackageCode = async (packageCode) => [
      { id: 1, packageCode },
      { id: 2, packageCode },
    ];

    await expect(
      new AdsPackageReferenceSeedGroup(writer).execute(referenceContext),
    ).rejects.toThrow(
      "AMBIGUOUS_AD_PACKAGE_REFERENCE_IDENTITY:HOMEPAGE_CAROUSEL",
    );
  });

  it("requires explicit REFERENCE selection", async () => {
    const group = new AdsPackageReferenceSeedGroup(createWriter().writer);

    await expect(
      group.execute({
        ...referenceContext,
        classifications: [SeedClassification.DEV],
      }),
    ).rejects.toThrow("requires explicit REFERENCE selection");
  });

  it("preserves the legacy Package and Campaign transition without output plumbing", () => {
    const repositoryRoot = join(__dirname, "../../../../../..");
    const centralSource = readFileSync(
      join(repositoryRoot, "src/database/dev-seed.service.ts"),
      "utf8",
    );
    const mainSource = readFileSync(
      join(repositoryRoot, "src/main.ts"),
      "utf8",
    );
    const cliSource = readFileSync(
      join(repositoryRoot, "src/database/seeds/seed.ts"),
      "utf8",
    );
    const seedSource = readFileSync(
      join(__dirname, "ad-package-reference.seed.ts"),
      "utf8",
    );

    expect(centralSource.match(/private async seedAdPackages\(/g)).toHaveLength(
      1,
    );
    expect(
      centralSource.match(/private async seedAdCampaigns\(/g),
    ).toHaveLength(1);
    expect(centralSource).toContain("const existing = await repo.count()");
    expect(centralSource).toContain("packages[0].id");
    expect(centralSource).toContain("packages[1].id");
    expect(centralSource).toContain("packages[2].id");
    expect(centralSource.match(/\{ supplierId, packageId:/g)).toHaveLength(4);

    expect(centralSource).toContain(
      "{ name: 'Banner chính (Carousel)', packageCode: 'HOMEPAGE_CAROUSEL', adType: AdType.BANNER, price: 500000, durationDays: 30, maxImpressions: 10000, description: 'Hiển thị trên carousel trang chủ', isActive: true }",
    );
    expect(centralSource).toContain(
      "{ name: 'Sản phẩm nổi bật', packageCode: 'FEATURED_PRODUCT', adType: AdType.FEATURED, price: 300000, durationDays: 14, maxImpressions: 5000, description: 'Sản phẩm được gắn nhãn nổi bật', isActive: true }",
    );
    expect(centralSource).toContain(
      "{ name: 'Spotlight tuần', packageCode: 'SPOTLIGHT_PLACEMENT', adType: AdType.SPOTLIGHT, price: 700000, durationDays: 7, maxImpressions: 20000, description: 'Hiển thị spotlight nổi bật 7 ngày', isActive: true }",
    );

    for (const record of adPackageReferenceSeedData) {
      expect(centralSource).toContain(
        `packageCode: '${record.packageCode}'`,
      );
      expect(centralSource).toContain(`name: '${record.name}'`);
      expect(centralSource).toContain(`price: ${record.price}`);
      expect(centralSource).toContain(`durationDays: ${record.durationDays}`);
      expect(centralSource).toContain(
        `maxImpressions: ${record.maxImpressions}`,
      );
      expect(centralSource).toContain(`description: '${record.description}'`);
    }

    expect(mainSource).toContain("createAdsPackageReferenceSeedGroup");
    expect(cliSource).toContain("createAdsPackageReferenceSeedGroup");
    expect(seedSource).not.toMatch(/package\.id\.by|SeedOutputBinding/);
    expect(seedSource).not.toMatch(/\.count\(|findByName|findByAdType/);
  });

  it("keeps reset, ad_events, Campaign groups, and public API unchanged", () => {
    const repositoryRoot = join(__dirname, "../../../../../..");
    const centralSource = readFileSync(
      join(repositoryRoot, "src/database/dev-seed.service.ts"),
      "utf8",
    );
    const runtimeSeedSources = readFileSync(
      join(__dirname, "ad-package-reference.seed.ts"),
      "utf8",
    );
    const publicApiSource = [
      "application/models/ads.model.ts",
      "presentation/controllers/ads.controller.ts",
      "presentation/dto/create-ad-campaign.dto.ts",
    ]
      .map((path) =>
        readFileSync(join(repositoryRoot, "src/modules/ads", path), "utf8"),
      )
      .join("\n");

    expect(centralSource).toContain("'ad_campaigns', 'ad_packages'");
    expect(centralSource).toContain("'ad_events'");
    expect(runtimeSeedSources).not.toMatch(/campaign|ad_events/i);
    expect(publicApiSource).not.toContain("packageCode");
  });
});
