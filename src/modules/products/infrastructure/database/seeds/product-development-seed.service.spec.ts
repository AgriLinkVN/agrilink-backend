import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import {
  SeedClassification,
  SeedExecutionContext,
  SeedGroupResult,
} from '../../../../../database/seeds/framework/seed-contract';
import { SeedOutputRegistry } from '../../../../../database/seeds/framework/seed-dependency-outputs';
import {
  CATEGORY_ID_BY_SLUG_OUTPUT_KIND,
  PRODUCTS_CATEGORY_REFERENCE_SEED_GROUP_ID,
  PRODUCTS_DEV_SEED_GROUP_ID,
} from '../../../application/contracts/product-seed-output.contract';
import {
  USER_ID_BY_EMAIL_OUTPUT_KIND,
  USERS_DEV_SEED_GROUP_ID,
} from '../../../../users/application/contracts/user-seed-output.contract';
import {
  PRODUCTS_DEV_SEED_METADATA,
  PRODUCT_DEV_PRIMARY_IMAGE_URL,
  ProductDevPrimaryImageWriteData,
  ProductDevSeedWriteData,
  ProductDevSeedWriter,
  ProductDevelopmentSeedService,
  buildProductDevelopmentSeedData,
  reconcileProductDevelopmentSeeds,
} from './product-development-seed.service';

const CATEGORY_SLUGS = [
  'trai-cay',
  'rau-cu-qua',
  'lua-gao-ngu-coc',
  'thuy-san',
  'gia-suc-gia-cam',
  'ca-phe-che',
  'gia-vi-thao-moc',
  'hat-dau',
  'mat-ong-dac-san',
  'hoa-cay-canh',
] as const;

function createContext(
  includeUsers = true,
  includeCategories = true,
  dependencies = PRODUCTS_DEV_SEED_METADATA.dependencies,
): SeedExecutionContext {
  const registry = new SeedOutputRegistry();
  if (includeUsers) {
    registry.register(USERS_DEV_SEED_GROUP_ID, {
      outputs: [
        {
          kind: USER_ID_BY_EMAIL_OUTPUT_KIND,
          key: 'farmer@agrilink.vn',
          value: 'user-farmer',
        },
        {
          kind: USER_ID_BY_EMAIL_OUTPUT_KIND,
          key: 'cooperative@agrilink.vn',
          value: 'user-cooperative',
        },
        {
          kind: USER_ID_BY_EMAIL_OUTPUT_KIND,
          key: 'supplier@agrilink.vn',
          value: 'user-supplier',
        },
      ],
    });
  }
  if (includeCategories) {
    registry.register(PRODUCTS_CATEGORY_REFERENCE_SEED_GROUP_ID, {
      outputs: CATEGORY_SLUGS.map((slug) => ({
        kind: CATEGORY_ID_BY_SLUG_OUTPUT_KIND,
        key: slug,
        value: `category-${slug}`,
      })),
    });
  }
  return {
    nodeEnv: 'development',
    databaseName: 'agrilink_dev_disposable',
    classifications: [SeedClassification.DEV],
    dependencies: registry.viewFor({
      ...PRODUCTS_DEV_SEED_METADATA,
      dependencies,
    }),
  };
}

interface StoredProduct {
  readonly id: string;
  data: ProductDevSeedWriteData;
}

interface StoredImage {
  readonly id: string;
  data: ProductDevPrimaryImageWriteData;
}

function createWriter(initialProducts: readonly StoredProduct[] = []): {
  writer: ProductDevSeedWriter;
  products: Map<string, StoredProduct>;
  images: Map<string, StoredImage[]>;
  productCreates: ProductDevSeedWriteData[];
  productUpdates: ProductDevSeedWriteData[];
  imageCreates: ProductDevPrimaryImageWriteData[];
  imageUpdates: ProductDevPrimaryImageWriteData[];
} {
  const products = new Map(initialProducts.map((row) => [row.data.sku, row]));
  const images = new Map<string, StoredImage[]>();
  const productCreates: ProductDevSeedWriteData[] = [];
  const productUpdates: ProductDevSeedWriteData[] = [];
  const imageCreates: ProductDevPrimaryImageWriteData[] = [];
  const imageUpdates: ProductDevPrimaryImageWriteData[] = [];
  const writer: ProductDevSeedWriter = {
    async findProductBySku(sku) {
      return products.get(sku) ?? null;
    },
    async createProduct(data) {
      productCreates.push(data);
      const row = { id: `product-${data.sku}`, data };
      products.set(data.sku, row);
      return row;
    },
    async updateProduct(id, data) {
      productUpdates.push(data);
      products.set(data.sku, { id, data });
    },
    async findPrimaryImages(productId) {
      return images.get(productId) ?? [];
    },
    async createPrimaryImage(data) {
      imageCreates.push(data);
      const current = images.get(data.productId) ?? [];
      current.push({
        id: `image-${data.productId}-${current.length + 1}`,
        data,
      });
      images.set(data.productId, current);
    },
    async updatePrimaryImage(id, data) {
      imageUpdates.push(data);
      images.set(data.productId, [{ id, data }]);
    },
  };

  return {
    writer,
    products,
    images,
    productCreates,
    productUpdates,
    imageCreates,
    imageUpdates,
  };
}

describe('ProductDevelopmentSeedService', () => {
  it('declares the one canonical Products-owned DEV group', () => {
    expect(PRODUCTS_DEV_SEED_GROUP_ID).toBe('products.dev.products');
    expect(PRODUCTS_DEV_SEED_METADATA).toEqual({
      id: PRODUCTS_DEV_SEED_GROUP_ID,
      owner: 'products',
      classification: SeedClassification.DEV,
      dependencies: [PRODUCTS_CATEGORY_REFERENCE_SEED_GROUP_ID, USERS_DEV_SEED_GROUP_ID],
      description: 'Canonical Products development catalog',
    });
  });

  it('keeps 54 explicit stable and unique DEV SKUs', () => {
    const records = buildProductDevelopmentSeedData(createContext());
    const identities = new Map(records.map(({ name, sku }) => [name, sku]));
    const reversed = new Map([...records].reverse().map(({ name, sku }) => [name, sku]));

    expect(records).toHaveLength(54);
    expect(records.every(({ sku }) => sku.startsWith('DEV-') && sku.length <= 50)).toBe(true);
    expect(new Set(records.map(({ sku }) => sku)).size).toBe(54);
    expect(reversed).toEqual(identities);
  });

  it('resolves all seller and category IDs only from dependency outputs', () => {
    const records = buildProductDevelopmentSeedData(createContext());

    expect(new Set(records.map(({ sellerId }) => sellerId))).toEqual(
      new Set(['user-farmer', 'user-cooperative', 'user-supplier']),
    );
    expect(new Set(records.map(({ categoryId }) => categoryId))).toEqual(
      new Set(CATEGORY_SLUGS.map((slug) => `category-${slug}`)),
    );
  });

  it('fails closed when a required producer output is unavailable', () => {
    expect(() => buildProductDevelopmentSeedData(createContext(false))).toThrow('MISSING_REQUIRED_OUTPUT');
    expect(() => buildProductDevelopmentSeedData(createContext(true, false))).toThrow('MISSING_REQUIRED_OUTPUT');
  });

  it('fails closed when a required producer is not a declared dependency', () => {
    expect(() =>
      buildProductDevelopmentSeedData(
        createContext(true, true, [PRODUCTS_CATEGORY_REFERENCE_SEED_GROUP_ID]),
      ),
    ).toThrow('UNDECLARED_DEPENDENCY_LOOKUP');
  });

  it('requires explicit DEV selection', async () => {
    const state = createWriter();
    const service = new ProductDevelopmentSeedService(state.writer);

    await expect(
      service.execute({
        ...createContext(),
        classifications: [SeedClassification.REFERENCE],
      }),
    ).rejects.toThrow('requires explicit DEV selection');
    expect(state.productCreates).toEqual([]);
  });

  it('converges partial Product state per SKU and creates nothing on a second run', async () => {
    const context = createContext();
    const records = buildProductDevelopmentSeedData(context);
    const first = records[0];
    const state = createWriter([
      {
        id: 'existing-product',
        data: { ...first, name: 'stale name' },
      },
    ]);
    const service = new ProductDevelopmentSeedService(state.writer);

    await expect(service.execute(context)).resolves.toEqual<SeedGroupResult>({
      outputs: [],
    });
    expect(state.productUpdates).toHaveLength(1);
    expect(state.productUpdates[0]).toEqual(first);
    expect(state.productCreates).toHaveLength(53);
    expect(state.products.size).toBe(54);
    expect(state.imageCreates).toHaveLength(54);

    await service.execute(context);

    expect(state.productCreates).toHaveLength(53);
    expect(state.productUpdates).toHaveLength(55);
    expect(state.imageCreates).toHaveLength(54);
    expect(state.imageUpdates).toHaveLength(54);
    expect([...state.images.values()].every((rows) => rows.length === 1)).toBe(true);
  });

  it('reconciles a changed intended primary image instead of inserting another', async () => {
    const record = buildProductDevelopmentSeedData(createContext())[0];
    const state = createWriter();

    await reconcileProductDevelopmentSeeds(state.writer, [record], 'image-v1');
    await reconcileProductDevelopmentSeeds(state.writer, [record], 'image-v2');

    expect(state.imageCreates).toHaveLength(1);
    expect(state.imageUpdates).toHaveLength(1);
    expect(state.imageUpdates[0]).toEqual({
      productId: `product-${record.sku}`,
      imageUrl: 'image-v2',
      altText: record.name,
      sortOrder: 0,
      isPrimary: true,
    });
  });

  it('fails closed when a seeded Product has multiple primary images', async () => {
    const record = buildProductDevelopmentSeedData(createContext())[0];
    const state = createWriter([{ id: 'existing-product', data: record }]);
    state.images.set('existing-product', [
      {
        id: 'primary-1',
        data: {
          productId: 'existing-product',
          imageUrl: 'one',
          altText: record.name,
          sortOrder: 0,
          isPrimary: true,
        },
      },
      {
        id: 'primary-2',
        data: {
          productId: 'existing-product',
          imageUrl: 'two',
          altText: record.name,
          sortOrder: 1,
          isPrimary: true,
        },
      },
    ]);

    await expect(reconcileProductDevelopmentSeeds(state.writer, [record])).rejects.toThrow('multiple primary images');
    expect(state.imageCreates).toEqual([]);
    expect(state.imageUpdates).toEqual([]);
  });

  it('contains no count guard, reset, truncate, or category compatibility call', () => {
    const source = readFileSync(join(__dirname, 'product-development-seed.service.ts'), 'utf8');

    expect(source).not.toMatch(
      /countProducts|resetProducts|TRUNCATE|seedCategories|saveSeedProducts|savePrimaryImagesForProducts/,
    );
    expect(source).not.toContain('00000000-0000-0000-0000-00000000000');
  });

  it('retires the superseded Product and Seller seed sources', () => {
    expect(existsSync(join(__dirname, 'product.seed.ts'))).toBe(false);
    expect(existsSync(join(__dirname, '../../../../users/seeds/seller.seed.ts'))).toBe(false);
  });

  it('uses the declared primary image policy', () => {
    expect(PRODUCT_DEV_PRIMARY_IMAGE_URL).toContain('images.unsplash.com');
  });
});
