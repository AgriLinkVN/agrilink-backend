import { ProductStatus, ProductUnit, SellerType } from "@common/enums";
import { DataSource, Repository } from "typeorm";
import {
  SeedClassification,
  SeedExecutionContext,
  SeedGroup,
  SeedGroupMetadata,
  SeedGroupResult,
  SeedOutputBinding,
} from "../../../../../database/seeds/framework/seed-contract";
import {
  USER_ID_BY_EMAIL_OUTPUT_KIND,
  USERS_TEST_SEED_GROUP_ID,
} from "../../../../users/application/contracts/user-seed-output.contract";
import {
  PRODUCT_ID_BY_SKU_OUTPUT_KIND,
  PRODUCTS_TEST_SEED_GROUP_ID,
} from "../../../application/contracts/product-seed-output.contract";
import { Product } from "../../persistence/entities/product.entity";

export {
  PRODUCT_ID_BY_SKU_OUTPUT_KIND,
  PRODUCTS_TEST_SEED_GROUP_ID,
} from "../../../application/contracts/product-seed-output.contract";

export const COMMERCE_RICE_PRODUCT_TEST_SKU = "TEST-COMMERCE-RICE-001" as const;

export interface ProductTestCatalogSeedData {
  readonly sku: string;
  readonly sellerEmail: string;
  readonly sellerType: SellerType;
  readonly name: string;
  readonly categoryId: null;
  readonly pricePerUnit: number;
  readonly unit: ProductUnit;
  readonly availableQuantity: number;
  readonly status: ProductStatus;
}

/**
 * Shared semantic Product authority from TF-04 and TF-05. Their different
 * fixed UUIDs remain harness-local; SKU is the owner provider identity.
 */
export const productTestCatalogSeedData: readonly ProductTestCatalogSeedData[] =
  Object.freeze([
    Object.freeze({
      sku: COMMERCE_RICE_PRODUCT_TEST_SKU,
      sellerEmail: "seller@example.test",
      sellerType: SellerType.FARMER,
      name: "Rice",
      categoryId: null,
      pricePerUnit: 100,
      unit: ProductUnit.KG,
      availableQuantity: 100,
      status: ProductStatus.ACTIVE,
    }),
  ]);

export const PRODUCTS_TEST_SEED_METADATA: SeedGroupMetadata = Object.freeze({
  id: PRODUCTS_TEST_SEED_GROUP_ID,
  owner: "products",
  classification: SeedClassification.TEST,
  dependencies: Object.freeze([USERS_TEST_SEED_GROUP_ID]),
  description: "Reusable Products identities for Commerce TEST harnesses",
});

export interface ProductTestCatalogRecord {
  readonly id: string;
}

export interface ProductTestCatalogWriteData {
  readonly sku: string;
  readonly sellerId: string;
  readonly sellerType: SellerType;
  readonly name: string;
  readonly categoryId: null;
  readonly pricePerUnit: number;
  readonly unit: ProductUnit;
  readonly availableQuantity: number;
  readonly status: ProductStatus;
}

export type ProductTestCatalogMutableWriteData = Omit<
  ProductTestCatalogWriteData,
  "sku"
>;

export interface ProductTestCatalogSeedWriter {
  findBySku(sku: string): Promise<readonly ProductTestCatalogRecord[]>;
  create(data: ProductTestCatalogWriteData): Promise<ProductTestCatalogRecord>;
  update(id: string, data: ProductTestCatalogMutableWriteData): Promise<void>;
}

export async function reconcileProductTestCatalog(
  writer: ProductTestCatalogSeedWriter,
  context: SeedExecutionContext,
  records: readonly ProductTestCatalogSeedData[] = productTestCatalogSeedData,
): Promise<readonly SeedOutputBinding[]> {
  const declaredSkus = new Set<string>();
  const preflight: Array<{
    readonly data: ProductTestCatalogWriteData;
    readonly matches: readonly ProductTestCatalogRecord[];
  }> = [];

  for (const record of records) {
    if (declaredSkus.has(record.sku)) {
      throw new Error(
        `${PRODUCTS_TEST_SEED_GROUP_ID} declares duplicate Product SKU ${record.sku}`,
      );
    }
    declaredSkus.add(record.sku);
    const matches = await writer.findBySku(record.sku);
    if (matches.length > 1) {
      throw new Error(
        `${PRODUCTS_TEST_SEED_GROUP_ID} found multiple Products for SKU ${record.sku}`,
      );
    }
    const { sellerEmail, ...productData } = record;
    const sellerId = context.dependencies.requireString(
      USERS_TEST_SEED_GROUP_ID,
      USER_ID_BY_EMAIL_OUTPUT_KIND,
      sellerEmail,
    );
    preflight.push({ data: { ...productData, sellerId }, matches });
  }

  const outputs: SeedOutputBinding[] = [];
  for (const { data, matches } of preflight) {
    let productId: string;
    if (matches.length === 1) {
      const { sku: _immutableSku, ...mutableData } = data;
      await writer.update(matches[0].id, mutableData);
      productId = matches[0].id;
    } else {
      productId = (await writer.create(data)).id;
    }
    outputs.push({
      kind: PRODUCT_ID_BY_SKU_OUTPUT_KIND,
      key: data.sku,
      value: productId,
    });
  }

  return Object.freeze(outputs.map((output) => Object.freeze(output)));
}

export class ProductsTestCatalogSeedGroup implements SeedGroup {
  readonly metadata = PRODUCTS_TEST_SEED_METADATA;

  constructor(private readonly writer: ProductTestCatalogSeedWriter) {}

  async execute(context: SeedExecutionContext): Promise<SeedGroupResult> {
    if (!context.classifications.includes(SeedClassification.TEST)) {
      throw new Error(`${this.metadata.id} requires explicit TEST selection`);
    }

    return {
      outputs: await reconcileProductTestCatalog(this.writer, context),
    };
  }
}

class TypeOrmProductTestCatalogSeedWriter implements ProductTestCatalogSeedWriter {
  constructor(private readonly repository: Repository<Product>) {}

  findBySku(sku: string): Promise<readonly ProductTestCatalogRecord[]> {
    return this.repository.find({ select: { id: true }, where: { sku } });
  }

  create(data: ProductTestCatalogWriteData): Promise<ProductTestCatalogRecord> {
    return this.repository.save(this.repository.create(data));
  }

  async update(
    id: string,
    data: ProductTestCatalogMutableWriteData,
  ): Promise<void> {
    await this.repository.update(id, data);
  }
}

export function createProductsTestCatalogSeedGroup(
  dataSource: DataSource,
): SeedGroup {
  return new ProductsTestCatalogSeedGroup(
    new TypeOrmProductTestCatalogSeedWriter(dataSource.getRepository(Product)),
  );
}
