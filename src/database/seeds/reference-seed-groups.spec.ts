import { existsSync } from "fs";
import { join } from "path";
import {
  GEOGRAPHY_PROVINCE_REFERENCE_SEED_METADATA,
  provinceReferenceSeedData,
} from "../../modules/geography/infrastructure/seeds/province-reference.seed";
import { PRODUCTS_CATEGORY_REFERENCE_SEED_METADATA } from "../../modules/products/infrastructure/database/seeds/product-category.seed";
import { SeedClassification, SeedGroup } from "./framework/seed-contract";
import {
  buildSeedExecutionPlan,
  orderSeedMetadata,
} from "./framework/seed-metadata";

const groups: readonly SeedGroup[] = [
  {
    metadata: GEOGRAPHY_PROVINCE_REFERENCE_SEED_METADATA,
    execute: jest.fn(),
  },
  {
    metadata: PRODUCTS_CATEGORY_REFERENCE_SEED_METADATA,
    execute: jest.fn(),
  },
];

describe("P8-04 reference seed registration", () => {
  it("contains exactly the two approved cycle-free groups", () => {
    const ordered = orderSeedMetadata([
      PRODUCTS_CATEGORY_REFERENCE_SEED_METADATA,
      GEOGRAPHY_PROVINCE_REFERENCE_SEED_METADATA,
    ]);

    expect(ordered.map(({ id }) => id)).toEqual([
      "geography.reference.provinces",
      "products.reference.categories",
    ]);
  });

  it("selects both groups only when REFERENCE is explicitly requested", () => {
    expect(buildSeedExecutionPlan(groups, [SeedClassification.DEV])).toEqual(
      [],
    );
    expect(
      buildSeedExecutionPlan(groups, [SeedClassification.REFERENCE]).map(
        ({ metadata }) => metadata.id,
      ),
    ).toEqual([
      "geography.reference.provinces",
      "products.reference.categories",
    ]);
  });

  it("keeps the canonical province payload only in Geography", () => {
    expect(provinceReferenceSeedData).toHaveLength(34);
    expect(existsSync(join(__dirname, "provinces.seed.ts"))).toBe(false);
    expect(
      existsSync(
        join(__dirname, "../../modules/geography/seeds/province.seed.ts"),
      ),
    ).toBe(false);
  });
});
