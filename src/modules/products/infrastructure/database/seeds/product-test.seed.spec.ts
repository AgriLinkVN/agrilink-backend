import { ProductStatus, ProductUnit, SellerType } from "@common/enums";
import {
  SeedClassification,
  SeedExecutionContext,
} from "../../../../../database/seeds/framework/seed-contract";
import { SeedOutputRegistry } from "../../../../../database/seeds/framework/seed-dependency-outputs";
import {
  USER_ID_BY_EMAIL_OUTPUT_KIND,
  USERS_TEST_SEED_GROUP_ID,
} from "../../../../users/application/contracts/user-seed-output.contract";
import {
  COMMERCE_RICE_PRODUCT_TEST_SKU,
  PRODUCTS_TEST_SEED_METADATA,
  PRODUCT_ID_BY_SKU_OUTPUT_KIND,
  ProductTestCatalogMutableWriteData,
  ProductTestCatalogSeedWriter,
  ProductTestCatalogWriteData,
  ProductsTestCatalogSeedGroup,
  productTestCatalogSeedData,
} from "./product-test.seed";

function createContext(sellerId = "shared-seller-id"): SeedExecutionContext {
  const outputs = new SeedOutputRegistry();
  outputs.register(USERS_TEST_SEED_GROUP_ID, {
    outputs: [
      {
        kind: USER_ID_BY_EMAIL_OUTPUT_KIND,
        key: "seller@example.test",
        value: sellerId,
      },
    ],
  });
  return {
    nodeEnv: "test",
    databaseName: "agrilink_test_disposable",
    classifications: [SeedClassification.TEST],
    dependencies: outputs.viewFor(PRODUCTS_TEST_SEED_METADATA),
  };
}

interface InMemoryProduct {
  readonly id: string;
  data: ProductTestCatalogWriteData;
}

function createWriter(initialRows: readonly InMemoryProduct[] = []): {
  writer: ProductTestCatalogSeedWriter;
  rows: Map<string, InMemoryProduct>;
  finds: string[];
  creates: ProductTestCatalogWriteData[];
  updates: ProductTestCatalogMutableWriteData[];
} {
  const rows = new Map(initialRows.map((row) => [row.id, row]));
  const finds: string[] = [];
  const creates: ProductTestCatalogWriteData[] = [];
  const updates: ProductTestCatalogMutableWriteData[] = [];
  const writer: ProductTestCatalogSeedWriter = {
    async findBySku(sku) {
      finds.push(sku);
      return [...rows.values()].filter((row) => row.data.sku === sku);
    },
    async create(data) {
      creates.push(data);
      const row = { id: `product-${rows.size + 1}`, data };
      rows.set(row.id, row);
      return row;
    },
    async update(id, data) {
      updates.push(data);
      const current = rows.get(id);
      if (!current) throw new Error(`missing in-memory Product ${id}`);
      rows.set(id, { id, data: { ...data, sku: current.data.sku } });
    },
  };

  return { writer, rows, finds, creates, updates };
}

describe("ProductsTestCatalogSeedGroup", () => {
  it("declares the one approved Products-owned Commerce record", () => {
    const group = new ProductsTestCatalogSeedGroup(createWriter().writer);

    expect(group.metadata).toEqual(
      expect.objectContaining({
        id: "products.test.catalog",
        owner: "products",
        classification: SeedClassification.TEST,
        dependencies: ["users.test.identities"],
      }),
    );
    expect(productTestCatalogSeedData).toEqual([
      {
        sku: "TEST-COMMERCE-RICE-001",
        sellerEmail: "seller@example.test",
        sellerType: SellerType.FARMER,
        name: "Rice",
        categoryId: null,
        pricePerUnit: 100,
        unit: ProductUnit.KG,
        availableQuantity: 100,
        status: ProductStatus.ACTIVE,
      },
    ]);
    expect(JSON.stringify(productTestCatalogSeedData)).not.toMatch(
      /TEST-CLEANV2-PHASE-ONE-001|phase-one-category|wishlist|certification/i,
    );
  });

  it("requires explicit TEST selection", async () => {
    const state = createWriter();

    await expect(
      new ProductsTestCatalogSeedGroup(state.writer).execute({
        ...createContext(),
        classifications: [SeedClassification.DEV],
      }),
    ).rejects.toThrow("requires explicit TEST selection");
    expect(state.finds).toEqual([]);
  });

  it("creates by the approved SKU and resolves its seller from Users output", async () => {
    const state = createWriter();
    const group = new ProductsTestCatalogSeedGroup(state.writer);

    const result = await group.execute(createContext("resolved-seller-id"));

    expect(state.finds).toEqual([COMMERCE_RICE_PRODUCT_TEST_SKU]);
    expect(state.creates).toEqual([
      {
        sku: COMMERCE_RICE_PRODUCT_TEST_SKU,
        sellerId: "resolved-seller-id",
        sellerType: SellerType.FARMER,
        name: "Rice",
        categoryId: null,
        pricePerUnit: 100,
        unit: ProductUnit.KG,
        availableQuantity: 100,
        status: ProductStatus.ACTIVE,
      },
    ]);
    expect(result.outputs).toEqual([
      {
        kind: PRODUCT_ID_BY_SKU_OUTPUT_KIND,
        key: COMMERCE_RICE_PRODUCT_TEST_SKU,
        value: "product-1",
      },
    ]);
  });

  it("reconciles mutable payload without mutating SKU", async () => {
    const current: ProductTestCatalogWriteData = {
      sku: COMMERCE_RICE_PRODUCT_TEST_SKU,
      sellerId: "stale-seller-id",
      sellerType: SellerType.FARMER,
      name: "Stale Rice",
      categoryId: null,
      pricePerUnit: 1,
      unit: ProductUnit.KG,
      availableQuantity: 1,
      status: ProductStatus.DRAFT,
    };
    const state = createWriter([{ id: "commerce-rice-id", data: current }]);
    const group = new ProductsTestCatalogSeedGroup(state.writer);

    const first = await group.execute(createContext());
    const second = await group.execute(createContext());

    expect(state.creates).toEqual([]);
    expect(state.updates).toHaveLength(2);
    expect(state.updates.every((data) => !("sku" in data))).toBe(true);
    expect(state.rows.get("commerce-rice-id")?.data.sku).toBe(
      COMMERCE_RICE_PRODUCT_TEST_SKU,
    );
    expect(second).toEqual(first);
  });

  it("fails before writes when the required seller output is missing", async () => {
    const outputs = new SeedOutputRegistry();
    const state = createWriter();
    const context: SeedExecutionContext = {
      ...createContext(),
      dependencies: outputs.viewFor(PRODUCTS_TEST_SEED_METADATA),
    };

    await expect(
      new ProductsTestCatalogSeedGroup(state.writer).execute(context),
    ).rejects.toThrow("MISSING_REQUIRED_OUTPUT");
    expect(state.creates).toEqual([]);
    expect(state.updates).toEqual([]);
  });

  it("fails closed before writes when SKU is not unique", async () => {
    const data: ProductTestCatalogWriteData = {
      sku: COMMERCE_RICE_PRODUCT_TEST_SKU,
      sellerId: "shared-seller-id",
      sellerType: SellerType.FARMER,
      name: "Rice",
      categoryId: null,
      pricePerUnit: 100,
      unit: ProductUnit.KG,
      availableQuantity: 100,
      status: ProductStatus.ACTIVE,
    };
    const state = createWriter([
      { id: "rice-one", data },
      { id: "rice-two", data },
    ]);

    await expect(
      new ProductsTestCatalogSeedGroup(state.writer).execute(createContext()),
    ).rejects.toThrow(
      `found multiple Products for SKU ${COMMERCE_RICE_PRODUCT_TEST_SKU}`,
    );
    expect(state.creates).toEqual([]);
    expect(state.updates).toEqual([]);
  });
});
