import {
  SeedClassification,
  SeedExecutionContext,
} from "../../../../../database/seeds/framework/seed-contract";
import {
  ProductCategoryReferenceSeedWriter,
  ProductCategoryReferenceWriteData,
  ProductsCategoryReferenceSeedGroup,
  productCategoryReferenceSeedData,
} from "./product-category.seed";

const referenceContext: SeedExecutionContext = {
  nodeEnv: "test",
  databaseName: "agrilink_test_disposable",
  classifications: [SeedClassification.REFERENCE],
};

function createWriter(existingSlugs: readonly string[] = []): {
  writer: ProductCategoryReferenceSeedWriter;
  rows: Map<string, { id: string; data?: ProductCategoryReferenceWriteData }>;
  creates: ProductCategoryReferenceWriteData[];
  updates: ProductCategoryReferenceWriteData[];
  finds: string[];
} {
  const rows = new Map<
    string,
    { id: string; data?: ProductCategoryReferenceWriteData }
  >(existingSlugs.map((slug) => [slug, { id: `category-${slug}` }]));
  const creates: ProductCategoryReferenceWriteData[] = [];
  const updates: ProductCategoryReferenceWriteData[] = [];
  const finds: string[] = [];
  const writer: ProductCategoryReferenceSeedWriter = {
    async findBySlug(slug) {
      finds.push(slug);
      return rows.get(slug) ?? null;
    },
    async create(data) {
      creates.push(data);
      const row = { id: `category-${data.slug}`, data };
      rows.set(data.slug, row);
      return row;
    },
    async update(id, data) {
      updates.push(data);
      rows.set(data.slug, { id, data });
    },
  };

  return { writer, rows, creates, updates, finds };
}

describe("ProductsCategoryReferenceSeedGroup", () => {
  it("declares Products-owned REFERENCE metadata without dependencies", () => {
    const { writer } = createWriter();
    const group = new ProductsCategoryReferenceSeedGroup(writer);

    expect(group.metadata).toEqual(
      expect.objectContaining({
        id: "products.reference.categories",
        owner: "products",
        classification: SeedClassification.REFERENCE,
        dependencies: [],
      }),
    );
  });

  it("keeps exactly 37 canonical rows with unique slugs", () => {
    const slugs = productCategoryReferenceSeedData.map(({ slug }) => slug);

    expect(productCategoryReferenceSeedData).toHaveLength(37);
    expect(new Set(slugs).size).toBe(37);
  });

  it("reconciles parents deterministically before their children", async () => {
    const state = createWriter();
    const group = new ProductsCategoryReferenceSeedGroup(state.writer);

    await group.execute(referenceContext);

    const firstChild = productCategoryReferenceSeedData.find(
      ({ parentSlug }) => parentSlug,
    );
    expect(firstChild).toBeDefined();
    expect(state.finds.indexOf(firstChild!.parentSlug!)).toBeLessThan(
      state.finds.indexOf(firstChild!.slug),
    );
    expect(state.rows.get(firstChild!.slug)?.data?.parentId).toBe(
      `category-${firstChild!.parentSlug}`,
    );
  });

  it("converges each slug independently without a whole-table guard", async () => {
    const existingSlug = productCategoryReferenceSeedData[0].slug;
    const state = createWriter([existingSlug]);
    const group = new ProductsCategoryReferenceSeedGroup(state.writer);

    await group.execute(referenceContext);

    expect(state.finds).toHaveLength(37);
    expect(state.updates.map(({ slug }) => slug)).toEqual([existingSlug]);
    expect(state.creates).toHaveLength(36);
    expect(state.rows.size).toBe(37);

    await group.execute(referenceContext);

    expect(state.creates).toHaveLength(36);
    expect(state.updates).toHaveLength(38);
  });

  it("refuses execution without explicit REFERENCE selection", async () => {
    const { writer } = createWriter();
    const group = new ProductsCategoryReferenceSeedGroup(writer);

    await expect(
      group.execute({
        ...referenceContext,
        classifications: [SeedClassification.DEV],
      }),
    ).rejects.toThrow("requires explicit REFERENCE selection");
  });
});
