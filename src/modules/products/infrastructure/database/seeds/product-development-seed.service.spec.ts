import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import {
  FarmingType,
  ProductStatus,
  ProductUnit,
  SellerType,
} from '@common/enums';
import {
  SeedClassification,
  SeedExecutionContext,
} from '../../../../../database/seeds/framework/seed-contract';
import { SeedOutputRegistry } from '../../../../../database/seeds/framework/seed-dependency-outputs';
import {
  CATEGORY_ID_BY_SLUG_OUTPUT_KIND,
  PRODUCT_ID_BY_SKU_OUTPUT_KIND,
  PRODUCTS_CATEGORY_REFERENCE_SEED_GROUP_ID,
  PRODUCTS_DEV_SEED_GROUP_ID,
} from '../../../application/contracts/product-seed-output.contract';
import {
  USER_ID_BY_EMAIL_OUTPUT_KIND,
  USERS_DEV_SEED_GROUP_ID,
} from '../../../../users/application/contracts/user-seed-output.contract';
import {
  APPROVED_D3_PRIMARY_IMAGE_URLS,
  APPROVED_D3_PRODUCT_SKUS,
  D3_REQUIRED_SELLER_EMAILS,
  PRODUCTS_DEV_SEED_METADATA,
  PRODUCT_DEV_PRIMARY_IMAGE_URL,
  ProductDevCertificationWriteData,
  ProductDevPrimaryImageWriteData,
  ProductDevSeedWriteData,
  ProductDevSeedWriter,
  ProductDevelopmentSeedService,
  buildProductDevelopmentCertificationData,
  buildProductDevelopmentSeedData,
  reconcileProductDevelopmentCertifications,
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

const ORIGINAL_PRODUCT_DEV_SKUS = [
  'DEV-XOAI-HOA-LOC-001',
  'DEV-THANH-LONG-RUOT-DO-001',
  'DEV-SAU-RIENG-RI6-001',
  'DEV-BUOI-DA-XANH-001',
  'DEV-DUA-HAU-KHONG-HAT-001',
  'DEV-NHAN-LONG-HUNG-YEN-001',
  'DEV-VAI-THIEU-LUC-NGAN-001',
  'DEV-CAM-SANH-HA-GIANG-001',
  'DEV-DUA-MD2-NINH-BINH-001',
  'DEV-OI-LE-DAI-LOAN-001',
  'DEV-RAU-MUONG-HUU-CO-001',
  'DEV-CAI-BAP-VIETGAP-001',
  'DEV-CA-CHUA-BI-HUU-CO-001',
  'DEV-KHOAI-LANG-TIM-NHAT-001',
  'DEV-BI-DO-HOKAIDO-001',
  'DEV-HANH-TIM-VINH-CHAU-001',
  'DEV-MANG-TAY-XANH-001',
  'DEV-GAO-ST25-001',
  'DEV-GAO-SENG-CU-001',
  'DEV-NEP-CAI-HOA-VANG-001',
  'DEV-GAO-LUT-DO-HUU-CO-001',
  'DEV-CA-PHE-ARABICA-001',
  'DEV-CA-PHE-ROBUSTA-001',
  'DEV-CHE-SHAN-TUYET-001',
  'DEV-CHE-XANH-THAI-NGUYEN-001',
  'DEV-TOM-SU-DONG-LANH-001',
  'DEV-CA-TRA-PHI-LE-001',
  'DEV-MUC-KHO-PHU-QUOC-001',
  'DEV-TIEU-DEN-PHU-QUOC-001',
  'DEV-NGHE-VANG-HUU-CO-001',
  'DEV-TOI-DEN-LY-SON-001',
  'DEV-GUNG-TUOI-HUU-CO-001',
  'DEV-TINH-BOT-NGHE-001',
  'DEV-MAT-ONG-HOA-NHAN-001',
  'DEV-MAT-ONG-RUNG-001',
  'DEV-MUOI-HAM-CAN-GIO-001',
  'DEV-DUA-XIEM-XANH-001',
  'DEV-MAM-NEM-PHAN-THIET-001',
  'DEV-NUOC-MAM-PHU-QUOC-001',
  'DEV-DAU-DUA-EP-LANH-001',
  'DEV-CAO-SAM-NGOC-LINH-001',
  'DEV-HAT-DIEU-W320-001',
  'DEV-DAU-PHONG-DO-001',
  'DEV-NAM-LINH-CHI-001',
  'DEV-NAM-DONG-CO-001',
  'DEV-XA-LACH-THUY-CANH-001',
  'DEV-DAO-TIEN-MOC-CHAU-001',
  'DEV-MAN-HAU-BAC-HA-001',
  'DEV-LE-VH6-BAC-GIANG-001',
  'DEV-HOA-CUC-VANG-001',
  'DEV-HOA-HONG-ECUADOR-001',
  'DEV-TRUNG-GA-THA-VUON-001',
  'DEV-THIT-BO-WAGYU-F1-001',
  'DEV-SUA-BO-TUOI-001',
] as const;

const APPROVED_C2B_PRODUCT_SKUS = [
  'DEV-BUOI-DA-XANH-FARMER-001',
  'DEV-CA-ROT-DA-LAT-001',
  'DEV-GAO-JASMINE-THOM-001',
  'DEV-CA-PHE-ROBUSTA-SUPPLIER-001',
  'DEV-TIEU-DEN-PHU-QUOC-SUPPLIER-001',
  'DEV-DAU-PHONG-RANG-001',
  'DEV-MAT-ONG-HOA-NHAN-COOP-001',
  'DEV-VIOLATION-BVTV-KHONG-TEM-001',
  'DEV-VIOLATION-PHAN-BON-KEM-CHAT-LUONG-001',
] as const;

const SUPERSEDED_D3_PRODUCT_SKUS = [
  'DEV-GAO-LUT-HUU-CO-XNK-MEKONG-001',
  'DEV-CA-PHE-ROBUSTA-AGRI-TECH-001',
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
        {
          kind: USER_ID_BY_EMAIL_OUTPUT_KIND,
          key: 'farmer@sandbox.com',
          value: 'user-sandbox-farmer',
        },
        {
          kind: USER_ID_BY_EMAIL_OUTPUT_KIND,
          key: 'cooperative@sandbox.com',
          value: 'user-sandbox-cooperative',
        },
        ...D3_REQUIRED_SELLER_EMAILS.map((email) => ({
          kind: USER_ID_BY_EMAIL_OUTPUT_KIND,
          key: email,
          value: `user-${email}`,
        })),
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

interface StoredCertification {
  readonly id: string;
  data: ProductDevCertificationWriteData;
}

function createWriter(initialProducts: readonly StoredProduct[] = []): {
  writer: ProductDevSeedWriter;
  products: Map<string, StoredProduct>;
  images: Map<string, StoredImage[]>;
  certifications: Map<string, StoredCertification[]>;
  productCreates: ProductDevSeedWriteData[];
  productUpdates: ProductDevSeedWriteData[];
  imageCreates: ProductDevPrimaryImageWriteData[];
  imageUpdates: ProductDevPrimaryImageWriteData[];
  certificationCreates: ProductDevCertificationWriteData[];
  certificationUpdates: ProductDevCertificationWriteData[];
} {
  const products = new Map(initialProducts.map((row) => [row.data.sku, row]));
  const images = new Map<string, StoredImage[]>();
  const certifications = new Map<string, StoredCertification[]>();
  const productCreates: ProductDevSeedWriteData[] = [];
  const productUpdates: ProductDevSeedWriteData[] = [];
  const imageCreates: ProductDevPrimaryImageWriteData[] = [];
  const imageUpdates: ProductDevPrimaryImageWriteData[] = [];
  const certificationCreates: ProductDevCertificationWriteData[] = [];
  const certificationUpdates: ProductDevCertificationWriteData[] = [];
  const writer: ProductDevSeedWriter = {
    async findProductsBySku(sku) {
      const product = products.get(sku);
      return product ? [product] : [];
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
    async findCertifications(productId, certNumber) {
      return (certifications.get(productId) ?? []).filter(
        ({ data }) => data.certNumber === certNumber,
      );
    },
    async createCertification(data) {
      certificationCreates.push(data);
      const current = certifications.get(data.productId) ?? [];
      current.push({
        id: `certification-${data.productId}-${current.length + 1}`,
        data,
      });
      certifications.set(data.productId, current);
    },
    async updateCertification(id, data) {
      certificationUpdates.push(data);
      const current = certifications.get(data.productId) ?? [];
      const index = current.findIndex((row) => row.id === id);
      if (index >= 0) current[index] = { id, data };
      certifications.set(data.productId, current);
    },
  };

  return {
    writer,
    products,
    images,
    certifications,
    productCreates,
    productUpdates,
    imageCreates,
    imageUpdates,
    certificationCreates,
    certificationUpdates,
  };
}

describe('ProductDevelopmentSeedService', () => {
  it('declares the one canonical Products-owned DEV group', () => {
    expect(PRODUCTS_DEV_SEED_GROUP_ID).toBe('products.dev.products');
    expect(PRODUCTS_DEV_SEED_METADATA).toEqual({
      id: PRODUCTS_DEV_SEED_GROUP_ID,
      owner: 'products',
      classification: SeedClassification.DEV,
      dependencies: [
        PRODUCTS_CATEGORY_REFERENCE_SEED_GROUP_ID,
        USERS_DEV_SEED_GROUP_ID,
      ],
      description: 'Canonical Products development catalog',
    });
  });

  it('preserves the 54-SKU snapshot and the nine approved C2B SKUs', () => {
    const records = buildProductDevelopmentSeedData(createContext());
    expect(records).toHaveLength(69);
    expect(records.slice(0, 54).map(({ sku }) => sku)).toEqual(
      ORIGINAL_PRODUCT_DEV_SKUS,
    );
    expect(records.slice(54).map(({ sku }) => sku)).toEqual([
      ...APPROVED_C2B_PRODUCT_SKUS,
      ...APPROVED_D3_PRODUCT_SKUS,
    ]);
    expect(
      records.every(({ sku }) => sku.startsWith('DEV-') && sku.length <= 50),
    ).toBe(true);
    expect(new Set(records.map(({ sku }) => sku)).size).toBe(69);
  });

  it('resolves all seller and category IDs only from dependency outputs', () => {
    const records = buildProductDevelopmentSeedData(createContext());

    expect(new Set(records.map(({ sellerId }) => sellerId))).toEqual(
      new Set([
        'user-farmer',
        'user-cooperative',
        'user-supplier',
        'user-sandbox-farmer',
        'user-sandbox-cooperative',
        ...D3_REQUIRED_SELLER_EMAILS.map((email) => `user-${email}`),
      ]),
    );
    expect(new Set(records.map(({ categoryId }) => categoryId))).toEqual(
      new Set([...CATEGORY_SLUGS.map((slug) => `category-${slug}`), null]),
    );
  });

  it('preserves approved ordinary and violation payload semantics', () => {
    const records = buildProductDevelopmentSeedData(createContext());
    const bySku = new Map(records.map((record) => [record.sku, record]));

    expect(
      APPROVED_C2B_PRODUCT_SKUS.slice(0, 7).map((sku) => {
        const record = bySku.get(sku)!;
        return {
          sku,
          sellerId: record.sellerId,
          sellerType: record.sellerType,
          categoryId: record.categoryId,
          name: record.name,
          description: record.description,
          pricePerUnit: record.pricePerUnit,
          unit: record.unit,
          availableQuantity: record.availableQuantity,
          minOrderQuantity: record.minOrderQuantity,
          farmingType: record.farmingType,
          harvestDate: record.harvestDate?.toISOString().slice(0, 10),
          expiryDate: record.expiryDate,
          status: record.status,
          viewCount: record.viewCount,
          primaryImageUrl: record.primaryImageUrl,
        };
      }),
    ).toEqual([
      {
        sku: 'DEV-BUOI-DA-XANH-FARMER-001',
        sellerId: 'user-sandbox-farmer',
        sellerType: SellerType.FARMER,
        categoryId: 'category-trai-cay',
        name: 'Bưởi da xanh Bến Tre',
        description: 'Bưởi da xanh ruột hồng, không hạt, mọng nước.',
        pricePerUnit: 32000,
        unit: ProductUnit.KG,
        availableQuantity: 800,
        minOrderQuantity: 10,
        farmingType: FarmingType.VIETGAP,
        harvestDate: '2026-07-01',
        expiryDate: null,
        status: ProductStatus.ACTIVE,
        viewCount: 1120,
        primaryImageUrl:
          'https://images.unsplash.com/photo-1576181256399-834e3b3a49bf?w=600',
      },
      {
        sku: 'DEV-CA-ROT-DA-LAT-001',
        sellerId: 'user-sandbox-farmer',
        sellerType: SellerType.FARMER,
        categoryId: 'category-rau-cu-qua',
        name: 'Cà rốt Đà Lạt',
        description: 'Cà rốt Đà Lạt ngọt giòn, VietGAP, tươi mỗi ngày.',
        pricePerUnit: 22000,
        unit: ProductUnit.KG,
        availableQuantity: 400,
        minOrderQuantity: 10,
        farmingType: FarmingType.VIETGAP,
        harvestDate: '2026-06-05',
        expiryDate: null,
        status: ProductStatus.ACTIVE,
        viewCount: 645,
        primaryImageUrl:
          'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=600',
      },
      {
        sku: 'DEV-GAO-JASMINE-THOM-001',
        sellerId: 'user-sandbox-farmer',
        sellerType: SellerType.FARMER,
        categoryId: 'category-lua-gao-ngu-coc',
        name: 'Gạo Jasmine thơm',
        description: 'Gạo Jasmine thơm dẻo Cần Thơ, truyền thống.',
        pricePerUnit: 24000,
        unit: ProductUnit.KG,
        availableQuantity: 1500,
        minOrderQuantity: 20,
        farmingType: FarmingType.TRADITIONAL,
        harvestDate: '2026-04-20',
        expiryDate: null,
        status: ProductStatus.ACTIVE,
        viewCount: 3210,
        primaryImageUrl:
          'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=600',
      },
      {
        sku: 'DEV-CA-PHE-ROBUSTA-SUPPLIER-001',
        sellerId: 'user-supplier',
        sellerType: SellerType.SUPPLIER,
        categoryId: 'category-ca-phe-che',
        name: 'Cà phê Robusta BMT',
        description: 'Robusta Buôn Ma Thuột đậm vị, rang đậm.',
        pricePerUnit: 95000,
        unit: ProductUnit.KG,
        availableQuantity: 500,
        minOrderQuantity: 5,
        farmingType: FarmingType.VIETGAP,
        harvestDate: '2025-12-15',
        expiryDate: null,
        status: ProductStatus.ACTIVE,
        viewCount: 2890,
        primaryImageUrl:
          'https://images.unsplash.com/photo-1559525839-d9acfd564ca0?w=600',
      },
      {
        sku: 'DEV-TIEU-DEN-PHU-QUOC-SUPPLIER-001',
        sellerId: 'user-supplier',
        sellerType: SellerType.SUPPLIER,
        categoryId: 'category-gia-vi-thao-moc',
        name: 'Tiêu đen Phú Quốc',
        description: 'Tiêu đen Phú Quốc OCOP 5 sao, hương vị đặc trưng.',
        pricePerUnit: 180000,
        unit: ProductUnit.KG,
        availableQuantity: 200,
        minOrderQuantity: 1,
        farmingType: FarmingType.TRADITIONAL,
        harvestDate: '2026-03-01',
        expiryDate: null,
        status: ProductStatus.ACTIVE,
        viewCount: 3210,
        primaryImageUrl:
          'https://images.unsplash.com/photo-1599582907898-5cdb44389b66?w=600',
      },
      {
        sku: 'DEV-DAU-PHONG-RANG-001',
        sellerId: 'user-sandbox-farmer',
        sellerType: SellerType.FARMER,
        categoryId: 'category-hat-dau',
        name: 'Đậu phộng rang',
        description: 'Đậu phộng rang giòn truyền thống, Bình Định.',
        pricePerUnit: 55000,
        unit: ProductUnit.KG,
        availableQuantity: 1200,
        minOrderQuantity: 10,
        farmingType: FarmingType.TRADITIONAL,
        harvestDate: '2026-05-01',
        expiryDate: null,
        status: ProductStatus.ACTIVE,
        viewCount: 867,
        primaryImageUrl:
          'https://images.unsplash.com/photo-1567132875421-e84e6c8c0d56?w=600',
      },
      {
        sku: 'DEV-MAT-ONG-HOA-NHAN-COOP-001',
        sellerId: 'user-sandbox-cooperative',
        sellerType: SellerType.COOPERATIVE,
        categoryId: 'category-mat-ong-dac-san',
        name: 'Mật ong hoa nhãn',
        description: 'Mật ong hoa nhãn nguyên chất Hưng Yên, thơm ngọt.',
        pricePerUnit: 180000,
        unit: ProductUnit.LITER,
        availableQuantity: 200,
        minOrderQuantity: 1,
        farmingType: FarmingType.ORGANIC,
        harvestDate: '2026-07-01',
        expiryDate: null,
        status: ProductStatus.ACTIVE,
        viewCount: 2670,
        primaryImageUrl:
          'https://images.unsplash.com/photo-1587049352851-8d4e8915b9c1?w=600',
      },
    ]);

    for (const sku of APPROVED_C2B_PRODUCT_SKUS.slice(0, 7)) {
      expect(bySku.get(sku)?.primaryImageUrl).toContain('images.unsplash.com');
      expect(bySku.get(sku)?.expiryDate).toBeNull();
    }
    for (const sku of APPROVED_C2B_PRODUCT_SKUS.slice(7)) {
      expect(bySku.get(sku)).toMatchObject({
        categoryId: null,
        status: ProductStatus.SUSPENDED,
        minOrderQuantity: null,
        harvestDate: null,
        expiryDate: null,
        primaryImageUrl: null,
      });
    }
    expect(bySku.get('DEV-VIOLATION-BVTV-KHONG-TEM-001')).toMatchObject({
      pricePerUnit: 50000,
      availableQuantity: 100,
    });
    expect(
      bySku.get('DEV-VIOLATION-PHAN-BON-KEM-CHAT-LUONG-001'),
    ).toMatchObject({ pricePerUnit: 120000, availableQuantity: 500 });
  });

  describe('P8-05D3 corrected Admin DEV Product owner migration', () => {
    it('declares exactly six approved distinct Products and primary Images', () => {
      const context = createContext();
      const requireString = jest.fn(
        context.dependencies.requireString.bind(context.dependencies),
      );
      const dependencies = new Proxy(context.dependencies, {
        get(target, property) {
          if (property === 'requireString') return requireString;
          const value = Reflect.get(target, property, target);
          return typeof value === 'function' ? value.bind(target) : value;
        },
      });
      const records = buildProductDevelopmentSeedData({
        ...context,
        dependencies,
      });
      const d3Records = records.filter(({ sku }) =>
        APPROVED_D3_PRODUCT_SKUS.includes(
          sku as (typeof APPROVED_D3_PRODUCT_SKUS)[number],
        ),
      );

      expect(records).toHaveLength(69);
      expect(new Set(records.map(({ sku }) => sku)).size).toBe(69);
      expect(d3Records.map(({ sku }) => sku)).toEqual(APPROVED_D3_PRODUCT_SKUS);
      expect(d3Records.map(({ sellerId }) => sellerId)).toEqual([
        'user-hung.nv@farm.vn',
        'user-mai.lt@farm.vn',
        'user-tuan.pq@farm.vn',
        'user-htx.dalat@coop.vn',
        'user-htx.dalat@coop.vn',
        'user-htx.tiengiang@coop.vn',
      ]);
      expect(new Set(d3Records.map(({ sellerId }) => sellerId)).size).toBe(5);
      expect(
        d3Records.every(
          ({ sellerType }) =>
            sellerType === SellerType.FARMER ||
            sellerType === SellerType.COOPERATIVE,
        ),
      ).toBe(true);
      expect(d3Records.every(({ categoryId }) => categoryId === null)).toBe(
        true,
      );
      expect(
        requireString.mock.calls.filter(
          ([producerId]) =>
            producerId === PRODUCTS_CATEGORY_REFERENCE_SEED_GROUP_ID,
        ),
      ).toHaveLength(CATEGORY_SLUGS.length);
      expect(d3Records.map(({ variety }) => variety)).toEqual([
        'Hòa Lộc',
        'Xà lách Mỹ',
        'Nhật Bản',
        'ST25',
        'Bó xôi',
        'Da xanh',
      ]);
      expect(d3Records.map(({ primaryImageUrl }) => primaryImageUrl)).toEqual(
        APPROVED_D3_PRIMARY_IMAGE_URLS,
      );
    });

    it('excludes every retired Product, Image, and superseded SKU', () => {
      const records = buildProductDevelopmentSeedData(createContext());
      const skus = new Set(records.map(({ sku }) => sku));
      const names = new Set(records.map(({ name }) => name));
      const imageUrls = new Set(
        records.map(({ primaryImageUrl }) => primaryImageUrl),
      );

      expect(SUPERSEDED_D3_PRODUCT_SKUS.every((sku) => !skus.has(sku))).toBe(
        true,
      );
      expect(names).not.toContain('Gạo lứt hữu cơ xuất khẩu');
      expect(names).not.toContain('Cà phê robusta Buôn Ma Thuột');
      expect(names).not.toContain('Phân bón hữu cơ vi sinh Trichoderma');
      expect(names).not.toContain('Chế phẩm sinh học EM gốc');
      expect(imageUrls).not.toContain(
        'https://res.cloudinary.com/personal-media/image/upload/c_fill,w_800,h_800/agrilink/products/gao-lut.jpg',
      );
      expect(imageUrls).not.toContain(
        'https://res.cloudinary.com/personal-media/image/upload/c_fill,w_800,h_800/agrilink/products/ca-phe-robusta.jpg',
      );
      expect(imageUrls).not.toContain(
        'https://res.cloudinary.com/personal-media/image/upload/c_fill,w_800,h_800/agrilink/products/phan-bon.jpg',
      );
      expect(imageUrls).not.toContain(
        'https://res.cloudinary.com/personal-media/image/upload/c_fill,w_800,h_800/agrilink/products/che-pham-em.jpg',
      );
    });

    it('reconciles 69 Product outputs and 67 managed primary Images', async () => {
      const records = buildProductDevelopmentSeedData(createContext());
      const state = createWriter();

      const productIds = await reconcileProductDevelopmentSeeds(
        state.writer,
        records,
      );

      expect(productIds.size).toBe(69);
      expect(new Set(productIds.keys()).size).toBe(69);
      expect(state.imageCreates).toHaveLength(67);
      const d3Images = state.imageCreates.filter(({ imageUrl }) =>
        APPROVED_D3_PRIMARY_IMAGE_URLS.includes(
          imageUrl as (typeof APPROVED_D3_PRIMARY_IMAGE_URLS)[number],
        ),
      );
      expect(d3Images).toHaveLength(6);
      expect(
        d3Images.every(
          ({ isPrimary, sortOrder }) => isPrimary && sortOrder === 0,
        ),
      ).toBe(true);
    });

    it('preflights every declared SKU before the first Product write', async () => {
      const records = buildProductDevelopmentSeedData(createContext());
      const state = createWriter();
      state.writer.findProductsBySku = async (sku) =>
        sku === APPROVED_D3_PRODUCT_SKUS[5]
          ? [{ id: 'duplicate-1' }, { id: 'duplicate-2' }]
          : [];

      await expect(
        reconcileProductDevelopmentSeeds(state.writer, records),
      ).rejects.toThrow('multiple Products for SKU');
      expect(state.productCreates).toEqual([]);
      expect(state.productUpdates).toEqual([]);
    });
  });

  it('fails closed when a required producer output is unavailable', () => {
    expect(() => buildProductDevelopmentSeedData(createContext(false))).toThrow(
      'MISSING_REQUIRED_OUTPUT',
    );
    expect(() =>
      buildProductDevelopmentSeedData(createContext(true, false)),
    ).toThrow('MISSING_REQUIRED_OUTPUT');
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

    const firstResult = await service.execute(context);
    expect(firstResult.outputs).toHaveLength(69);
    expect(
      firstResult.outputs.every(
        ({ kind }) => kind === PRODUCT_ID_BY_SKU_OUTPUT_KIND,
      ),
    ).toBe(true);
    expect(new Set(firstResult.outputs.map(({ key }) => key)).size).toBe(69);
    expect(
      firstResult.outputs.every(
        (output) =>
          typeof output.key === 'string' &&
          typeof output.value === 'string' &&
          Object.keys(output).sort().join(',') === 'key,kind,value',
      ),
    ).toBe(true);
    expect(firstResult.outputs).toContainEqual({
      kind: PRODUCT_ID_BY_SKU_OUTPUT_KIND,
      key: first.sku,
      value: 'existing-product',
    });
    expect(firstResult.outputs).toContainEqual({
      kind: PRODUCT_ID_BY_SKU_OUTPUT_KIND,
      key: 'DEV-CA-ROT-DA-LAT-001',
      value: 'product-DEV-CA-ROT-DA-LAT-001',
    });
    expect(state.productUpdates).toHaveLength(1);
    expect(state.productUpdates[0]).toEqual(first);
    expect(state.productCreates).toHaveLength(68);
    expect(state.products.size).toBe(69);
    expect(state.imageCreates).toHaveLength(67);
    expect(state.certificationCreates).toHaveLength(4);

    const secondResult = await service.execute(context);

    expect(secondResult.outputs).toEqual(firstResult.outputs);
    expect(state.productCreates).toHaveLength(68);
    expect(state.productUpdates).toHaveLength(70);
    expect(state.imageCreates).toHaveLength(67);
    expect(state.imageUpdates).toHaveLength(67);
    expect(state.certificationCreates).toHaveLength(4);
    expect(state.certificationUpdates).toHaveLength(4);
    expect([...state.images.values()].every((rows) => rows.length === 1)).toBe(
      true,
    );
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

    await expect(
      reconcileProductDevelopmentSeeds(state.writer, [record]),
    ).rejects.toThrow('multiple primary images');
    expect(state.imageCreates).toEqual([]);
    expect(state.imageUpdates).toEqual([]);
  });

  it('fails closed when more than one Product matches a SKU', async () => {
    const record = buildProductDevelopmentSeedData(createContext())[0];
    const state = createWriter();
    state.writer.findProductsBySku = async () => [
      { id: 'duplicate-1' },
      { id: 'duplicate-2' },
    ];

    await expect(
      reconcileProductDevelopmentSeeds(state.writer, [record]),
    ).rejects.toThrow('multiple Products for SKU');
    expect(state.productCreates).toEqual([]);
    expect(state.productUpdates).toEqual([]);
  });

  it('declares no managed image for violation Products and preserves unrelated images', async () => {
    const record = buildProductDevelopmentSeedData(createContext()).find(
      ({ sku }) => sku === 'DEV-VIOLATION-BVTV-KHONG-TEM-001',
    );
    expect(record).toBeDefined();
    const state = createWriter([{ id: 'violation-product', data: record! }]);
    state.images.set('violation-product', [
      {
        id: 'unrelated-image',
        data: {
          productId: 'violation-product',
          imageUrl: 'unrelated',
          altText: 'unrelated',
          sortOrder: 7,
          isPrimary: true,
        },
      },
    ]);

    await reconcileProductDevelopmentSeeds(state.writer, [record!]);

    expect(state.imageCreates).toEqual([]);
    expect(state.imageUpdates).toEqual([]);
    expect(state.images.get('violation-product')).toHaveLength(1);
  });

  it('reconciles exactly four deterministic certifications by Product ID and number', async () => {
    const definitions = buildProductDevelopmentCertificationData();
    const productIds = new Map(
      definitions.map(({ productSku }) => [productSku, `id:${productSku}`]),
    );
    const state = createWriter();

    expect(
      definitions.map(({ certNumber, productSku }) => [certNumber, productSku]),
    ).toEqual([
      ['DEV-CERT-VIETGAP-XOAI-HOA-LOC-001', 'DEV-XOAI-HOA-LOC-001'],
      ['DEV-CERT-VIETGAP-THANH-LONG-001', 'DEV-THANH-LONG-RUOT-DO-001'],
      ['DEV-CERT-VIETGAP-VAI-LUC-NGAN-001', 'DEV-VAI-THIEU-LUC-NGAN-001'],
      ['DEV-CERT-VIETGAP-GAO-JASMINE-001', 'DEV-GAO-JASMINE-THOM-001'],
    ]);

    await reconcileProductDevelopmentCertifications(state.writer, productIds);
    await reconcileProductDevelopmentCertifications(state.writer, productIds);

    expect(state.certificationCreates).toHaveLength(4);
    expect(state.certificationUpdates).toHaveLength(4);
    expect(state.certifications.size).toBe(4);
  });

  it('preflights all certification identities and fails closed before a write on ambiguity', async () => {
    const definitions = buildProductDevelopmentCertificationData();
    const productIds = new Map(
      definitions.map(({ productSku }) => [productSku, `id:${productSku}`]),
    );
    const state = createWriter();
    await reconcileProductDevelopmentCertifications(state.writer, productIds);
    const last = state.certifications.get('id:DEV-GAO-JASMINE-THOM-001')![0];
    state.certifications.get('id:DEV-GAO-JASMINE-THOM-001')!.push({
      ...last,
      id: 'duplicate-certification',
    });
    state.certificationCreates.length = 0;
    state.certificationUpdates.length = 0;

    await expect(
      reconcileProductDevelopmentCertifications(state.writer, productIds),
    ).rejects.toThrow('multiple certifications');
    expect(state.certificationCreates).toEqual([]);
    expect(state.certificationUpdates).toEqual([]);
  });

  it('contains no count guard, reset, truncate, or category compatibility call', () => {
    const source = readFileSync(
      join(__dirname, 'product-development-seed.service.ts'),
      'utf8',
    );

    expect(source).not.toMatch(
      /countProducts|resetProducts|TRUNCATE|seedCategories|saveSeedProducts|savePrimaryImagesForProducts/,
    );
    expect(source).not.toContain('00000000-0000-0000-0000-00000000000');
    expect(source).not.toMatch(/Date\.now\(\)|Math\.random\(\)/);
  });

  it('retires the superseded Product and Seller seed sources', () => {
    expect(existsSync(join(__dirname, 'product.seed.ts'))).toBe(false);
    expect(
      existsSync(join(__dirname, '../../../../users/seeds/seller.seed.ts')),
    ).toBe(false);
  });

  it('uses the declared primary image policy', () => {
    expect(PRODUCT_DEV_PRIMARY_IMAGE_URL).toContain('images.unsplash.com');
  });
});
