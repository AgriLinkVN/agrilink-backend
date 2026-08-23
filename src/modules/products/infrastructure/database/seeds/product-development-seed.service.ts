import { Inject, Injectable } from '@nestjs/common';
import {
  CertificationStatus,
  CertType,
  FarmingType,
  ProductStatus,
  ProductUnit,
  SellerType,
} from '@common/enums';
import {
  SeedClassification,
  SeedExecutionContext,
  SeedGroup,
  SeedGroupMetadata,
  SeedGroupResult,
} from '../../../../../database/seeds/framework/seed-contract';
import {
  USER_ID_BY_EMAIL_OUTPUT_KIND,
  USERS_DEV_SEED_GROUP_ID,
} from '../../../../users/application/contracts/user-seed-output.contract';
import {
  CATEGORY_ID_BY_SLUG_OUTPUT_KIND,
  PRODUCT_ID_BY_SKU_OUTPUT_KIND,
  PRODUCTS_CATEGORY_REFERENCE_SEED_GROUP_ID,
  PRODUCTS_DEV_SEED_GROUP_ID,
} from '../../../application/contracts/product-seed-output.contract';

export const PRODUCT_DEV_SEED_WRITER = Symbol('PRODUCT_DEV_SEED_WRITER');

export const PRODUCTS_DEV_SEED_METADATA: SeedGroupMetadata = {
  id: PRODUCTS_DEV_SEED_GROUP_ID,
  owner: 'products',
  classification: SeedClassification.DEV,
  dependencies: [
    PRODUCTS_CATEGORY_REFERENCE_SEED_GROUP_ID,
    USERS_DEV_SEED_GROUP_ID,
  ],
  description: 'Canonical Products development catalog',
};

export const PRODUCT_DEV_PRIMARY_IMAGE_URL =
  'https://images.unsplash.com/photo-1506617420156-8e4536971650?w=600&q=80';

export const APPROVED_D3_PRODUCT_SKUS = [
  'DEV-XOAI-HOA-LOC-HUNG-001',
  'DEV-XA-LACH-THUY-CANH-MAI-001',
  'DEV-DUA-LUOI-NHAT-TUAN-001',
  'DEV-GAO-ST25-HTX-DALAT-001',
  'DEV-CAI-BO-XOI-HUU-CO-HTX-DALAT-001',
  'DEV-BUOI-DA-XANH-HTX-TIEN-GIANG-001',
] as const;

export const D3_REQUIRED_SELLER_EMAILS = [
  'hung.nv@farm.vn',
  'mai.lt@farm.vn',
  'tuan.pq@farm.vn',
  'htx.dalat@coop.vn',
  'htx.tiengiang@coop.vn',
] as const;

export const APPROVED_D3_PRIMARY_IMAGE_URLS = [
  'https://res.cloudinary.com/personal-media/image/upload/c_fill,w_800,h_800/agrilink/products/xoai-cat-hoa-loc.jpg',
  'https://res.cloudinary.com/personal-media/image/upload/c_fill,w_800,h_800/agrilink/products/xa-lach-thuy-canh.jpg',
  'https://res.cloudinary.com/personal-media/image/upload/c_fill,w_800,h_800/agrilink/products/dua-luoi-nhat.jpg',
  'https://res.cloudinary.com/personal-media/image/upload/c_fill,w_800,h_800/agrilink/products/gao-st25.jpg',
  'https://res.cloudinary.com/personal-media/image/upload/c_fill,w_800,h_800/agrilink/products/cai-bo-xoi.jpg',
  'https://res.cloudinary.com/personal-media/image/upload/c_fill,w_800,h_800/agrilink/products/buoi-da-xanh.jpg',
] as const;

export interface ProductDevSeedWriteData {
  readonly sku: string;
  readonly sellerId: string;
  readonly sellerType: SellerType;
  readonly categoryId: string | null;
  readonly name: string;
  readonly description: string;
  readonly pricePerUnit: number;
  readonly unit: ProductUnit;
  readonly availableQuantity: number;
  readonly minOrderQuantity: number | null;
  readonly variety?: string | null;
  readonly farmingType: FarmingType;
  readonly status: ProductStatus;
  readonly viewCount?: number;
  readonly harvestDate?: Date | null;
  readonly expiryDate?: Date | null;
  readonly rejectionReason?: string | null;
}

export interface ProductDevSeedRecord {
  readonly id: string;
}

export interface ProductDevSeedDefinition extends ProductDevSeedWriteData {
  /** Undefined uses the canonical fallback; null declares no managed image. */
  readonly primaryImageUrl?: string | null;
}

export interface ProductDevPrimaryImageRecord {
  readonly id: string;
}

export interface ProductDevPrimaryImageWriteData {
  readonly productId: string;
  readonly imageUrl: string;
  readonly altText: string;
  readonly sortOrder: number;
  readonly isPrimary: true;
}

export interface ProductDevCertificationRecord {
  readonly id: string;
}

export interface ProductDevCertificationWriteData {
  readonly productId: string;
  readonly certType: CertType;
  readonly certNumber: string;
  readonly issuedBy: string;
  readonly issuedDate: Date;
  readonly expiryDate: Date;
  readonly documentUrl: string;
  readonly isVerified: true;
  readonly status: CertificationStatus.VERIFIED;
}

export interface ProductDevCertificationDefinition extends Omit<
  ProductDevCertificationWriteData,
  'productId'
> {
  readonly productSku: string;
}

export interface ProductDevSeedWriter {
  findProductsBySku(sku: string): Promise<readonly ProductDevSeedRecord[]>;
  createProduct(data: ProductDevSeedWriteData): Promise<ProductDevSeedRecord>;
  updateProduct(id: string, data: ProductDevSeedWriteData): Promise<void>;
  findPrimaryImages(
    productId: string,
  ): Promise<readonly ProductDevPrimaryImageRecord[]>;
  createPrimaryImage(data: ProductDevPrimaryImageWriteData): Promise<void>;
  updatePrimaryImage(
    id: string,
    data: ProductDevPrimaryImageWriteData,
  ): Promise<void>;
  findCertifications(
    productId: string,
    certNumber: string,
  ): Promise<readonly ProductDevCertificationRecord[]>;
  createCertification(data: ProductDevCertificationWriteData): Promise<void>;
  updateCertification(
    id: string,
    data: ProductDevCertificationWriteData,
  ): Promise<void>;
}

export function buildProductDevelopmentSeedData(
  context: SeedExecutionContext,
): readonly ProductDevSeedDefinition[] {
  const sellerId = (email: string): string =>
    context.dependencies.requireString(
      USERS_DEV_SEED_GROUP_ID,
      USER_ID_BY_EMAIL_OUTPUT_KIND,
      email,
    );
  const categoryId = (slug: string): string =>
    context.dependencies.requireString(
      PRODUCTS_CATEGORY_REFERENCE_SEED_GROUP_ID,
      CATEGORY_ID_BY_SLUG_OUTPUT_KIND,
      slug,
    );

  const F = sellerId('farmer@agrilink.vn');
  const C = sellerId('cooperative@agrilink.vn');
  const S = sellerId('supplier@agrilink.vn');
  const SANDBOX_F = sellerId('farmer@sandbox.com');
  const SANDBOX_C = sellerId('cooperative@sandbox.com');
  const D3_HUNG = sellerId('hung.nv@farm.vn');
  const D3_MAI = sellerId('mai.lt@farm.vn');
  const D3_TUAN = sellerId('tuan.pq@farm.vn');
  const D3_HTX_DALAT = sellerId('htx.dalat@coop.vn');
  const D3_HTX_TIEN_GIANG = sellerId('htx.tiengiang@coop.vn');

  const TC = categoryId('trai-cay');
  const RAU = categoryId('rau-cu-qua');
  const GAO = categoryId('lua-gao-ngu-coc');
  const TS = categoryId('thuy-san');
  const GS = categoryId('gia-suc-gia-cam');
  const CF = categoryId('ca-phe-che');
  const GV = categoryId('gia-vi-thao-moc');
  const HD = categoryId('hat-dau');
  const MO = categoryId('mat-ong-dac-san');
  const HOA = categoryId('hoa-cay-canh');

  const mockProducts: ProductDevSeedDefinition[] = [
    // ── Trái cây ──────────────────────────────────────────────
    {
      sellerId: F,
      sellerType: SellerType.FARMER,
      categoryId: TC,
      name: 'Xoài cát Hòa Lộc loại 1',
      sku: 'DEV-XOAI-HOA-LOC-001',
      description:
        'Xoài cát Hòa Lộc chính gốc Tiền Giang, trái to đều, vỏ vàng óng, thịt dày ngọt thơm, ít xơ. Canh tác theo tiêu chuẩn VietGAP, không sử dụng chất kích thích tăng trưởng.',
      pricePerUnit: 45000,
      unit: ProductUnit.KG,
      availableQuantity: 500,
      minOrderQuantity: 10,
      farmingType: FarmingType.VIETGAP,
      status: ProductStatus.ACTIVE,
      viewCount: 1284,
      harvestDate: new Date('2026-06-15'),
      expiryDate: new Date('2026-06-22'),
    },
    {
      sellerId: C,
      sellerType: SellerType.COOPERATIVE,
      categoryId: TC,
      name: 'Thanh long ruột đỏ xuất khẩu',
      sku: 'DEV-THANH-LONG-RUOT-DO-001',
      description:
        'Thanh long ruột đỏ Bình Thuận đạt chuẩn GlobalGAP, đủ điều kiện xuất khẩu sang EU và Nhật Bản. Trái đều, màu đỏ đậm, vị ngọt thanh.',
      pricePerUnit: 35000,
      unit: ProductUnit.KG,
      availableQuantity: 1000,
      minOrderQuantity: 50,
      farmingType: FarmingType.GLOBALGAP,
      status: ProductStatus.ACTIVE,
      viewCount: 2105,
      harvestDate: new Date('2026-06-20'),
      expiryDate: new Date('2026-06-27'),
    },
    {
      sellerId: C,
      sellerType: SellerType.COOPERATIVE,
      categoryId: TC,
      name: 'Sầu riêng Ri6 Cai Lậy',
      sku: 'DEV-SAU-RIENG-RI6-001',
      description:
        'Sầu riêng Ri6 vùng Cai Lậy – Tiền Giang, cơm vàng hạt lép, mùi thơm nồng đặc trưng. Thu hoạch đúng độ chín, không dùng chất thúc chín.',
      pricePerUnit: 85000,
      unit: ProductUnit.KG,
      availableQuantity: 600,
      minOrderQuantity: 5,
      farmingType: FarmingType.VIETGAP,
      status: ProductStatus.ACTIVE,
      viewCount: 3250,
      harvestDate: new Date('2026-07-15'),
      expiryDate: new Date('2026-07-22'),
    },
    {
      sellerId: C,
      sellerType: SellerType.COOPERATIVE,
      categoryId: TC,
      name: 'Bưởi da xanh Bến Tre',
      sku: 'DEV-BUOI-DA-XANH-001',
      description:
        'Bưởi da xanh đặc sản Bến Tre, vỏ xanh bóng, múi to, tép mọng nước, vị ngọt ít đắng. Đạt VietGAP, trái đồng đều từ 1.2–1.8kg/trái.',
      pricePerUnit: 32000,
      unit: ProductUnit.KG,
      availableQuantity: 800,
      minOrderQuantity: 10,
      farmingType: FarmingType.VIETGAP,
      status: ProductStatus.ACTIVE,
      viewCount: 1120,
      harvestDate: new Date('2026-07-01'),
      expiryDate: new Date('2026-07-20'),
    },
    {
      sellerId: F,
      sellerType: SellerType.FARMER,
      categoryId: TC,
      name: 'Dưa hấu không hạt Long An',
      sku: 'DEV-DUA-HAU-KHONG-HAT-001',
      description:
        'Dưa hấu không hạt trồng tại Long An, vỏ mỏng, ruột đỏ tươi, ngọt sắc. Trọng lượng 3–6kg/quả. Thích hợp dùng ngay hoặc làm nước ép.',
      pricePerUnit: 18000,
      unit: ProductUnit.KG,
      availableQuantity: 3000,
      minOrderQuantity: 30,
      farmingType: FarmingType.TRADITIONAL,
      status: ProductStatus.ACTIVE,
      viewCount: 987,
      harvestDate: new Date('2026-06-10'),
      expiryDate: new Date('2026-06-20'),
    },
    {
      sellerId: F,
      sellerType: SellerType.FARMER,
      categoryId: TC,
      name: 'Nhãn lồng Hưng Yên',
      sku: 'DEV-NHAN-LONG-HUNG-YEN-001',
      description:
        'Nhãn lồng chính gốc Hưng Yên, cùi dày, hạt nhỏ, vị ngọt đậm thơm. Mùa vụ tháng 7–8, thu hái khi trái chín đều. Không ướp hóa chất bảo quản.',
      pricePerUnit: 55000,
      unit: ProductUnit.KG,
      availableQuantity: 400,
      minOrderQuantity: 5,
      farmingType: FarmingType.TRADITIONAL,
      status: ProductStatus.ACTIVE,
      viewCount: 1890,
      harvestDate: new Date('2026-07-20'),
      expiryDate: new Date('2026-07-30'),
    },
    {
      sellerId: S,
      sellerType: SellerType.SUPPLIER,
      categoryId: TC,
      name: 'Vải thiều Lục Ngạn Bắc Giang',
      sku: 'DEV-VAI-THIEU-LUC-NGAN-001',
      description:
        'Vải thiều Lục Ngạn được cấp chỉ dẫn địa lý, xuất khẩu sang 30 quốc gia. Vỏ đỏ tươi, hạt nhỏ, cùi giòn ngọt. Đạt GlobalGAP và OCOP 4 sao.',
      pricePerUnit: 42000,
      unit: ProductUnit.KG,
      availableQuantity: 1500,
      minOrderQuantity: 20,
      farmingType: FarmingType.GLOBALGAP,
      status: ProductStatus.ACTIVE,
      viewCount: 4120,
      harvestDate: new Date('2026-06-05'),
      expiryDate: new Date('2026-06-15'),
    },
    {
      sellerId: F,
      sellerType: SellerType.FARMER,
      categoryId: TC,
      name: 'Cam sành Hà Giang',
      sku: 'DEV-CAM-SANH-HA-GIANG-001',
      description:
        'Cam sành vùng cao Hà Giang, vỏ sần xù đặc trưng, ruột vàng cam đẹp, vị chua ngọt hài hòa, nhiều vitamin C. Không dùng thuốc kích màu.',
      pricePerUnit: 38000,
      unit: ProductUnit.KG,
      availableQuantity: 700,
      minOrderQuantity: 10,
      farmingType: FarmingType.TRADITIONAL,
      status: ProductStatus.ACTIVE,
      viewCount: 654,
      harvestDate: new Date('2026-01-15'),
      expiryDate: new Date('2026-02-28'),
    },
    {
      sellerId: C,
      sellerType: SellerType.COOPERATIVE,
      categoryId: TC,
      name: 'Dứa MD2 Ninh Bình',
      sku: 'DEV-DUA-MD2-NINH-BINH-001',
      description:
        'Dứa MD2 (dứa vàng) nhập giống từ Hawaii, trồng tại Ninh Bình. Ruột vàng, ít xơ, độ Brix 15–17, ngọt hơn dứa Queen thông thường 30%.',
      pricePerUnit: 28000,
      unit: ProductUnit.KG,
      availableQuantity: 900,
      minOrderQuantity: 15,
      farmingType: FarmingType.VIETGAP,
      status: ProductStatus.ACTIVE,
      viewCount: 776,
      harvestDate: new Date('2026-05-10'),
      expiryDate: new Date('2026-05-25'),
    },
    {
      sellerId: F,
      sellerType: SellerType.FARMER,
      categoryId: TC,
      name: 'Ổi lê Đài Loan không hạt',
      sku: 'DEV-OI-LE-DAI-LOAN-001',
      description:
        'Ổi lê không hạt trồng theo quy trình VietGAP tại Bình Dương. Trái to tròn, vỏ xanh mướt, ruột trắng giòn ngọt nhẹ. Thích hợp làm quà biếu.',
      pricePerUnit: 35000,
      unit: ProductUnit.KG,
      availableQuantity: 300,
      minOrderQuantity: 5,
      farmingType: FarmingType.VIETGAP,
      status: ProductStatus.ACTIVE,
      viewCount: 512,
      harvestDate: new Date('2026-05-20'),
      expiryDate: new Date('2026-05-30'),
    },

    // ── Rau củ ────────────────────────────────────────────────
    {
      sellerId: F,
      sellerType: SellerType.FARMER,
      categoryId: RAU,
      name: 'Rau muống hữu cơ Đà Lạt',
      sku: 'DEV-RAU-MUONG-HUU-CO-001',
      description:
        'Rau muống trồng theo hướng hữu cơ tại Đà Lạt, không thuốc trừ sâu, tươi ngon mỗi ngày. Phù hợp bếp ăn gia đình và nhà hàng.',
      pricePerUnit: 25000,
      unit: ProductUnit.KG,
      availableQuantity: 200,
      minOrderQuantity: 5,
      farmingType: FarmingType.ORGANIC,
      status: ProductStatus.ACTIVE,
      viewCount: 892,
      harvestDate: new Date('2026-06-01'),
      expiryDate: new Date('2026-06-05'),
    },
    {
      sellerId: C,
      sellerType: SellerType.COOPERATIVE,
      categoryId: RAU,
      name: 'Rau cải bắp VietGAP Lâm Đồng',
      sku: 'DEV-CAI-BAP-VIETGAP-001',
      description:
        'Bắp cải trắng trồng tại cao nguyên Lâm Đồng 900m, khí hậu mát mẻ giúp cải giòn chắc, lá xanh đậm. Đạt chứng nhận VietGAP, cung cấp siêu thị.',
      pricePerUnit: 12000,
      unit: ProductUnit.KG,
      availableQuantity: 2000,
      minOrderQuantity: 50,
      farmingType: FarmingType.VIETGAP,
      status: ProductStatus.ACTIVE,
      viewCount: 445,
      harvestDate: new Date('2026-05-28'),
      expiryDate: new Date('2026-06-05'),
    },
    {
      sellerId: F,
      sellerType: SellerType.FARMER,
      categoryId: RAU,
      name: 'Cà chua bi hữu cơ Đà Lạt',
      sku: 'DEV-CA-CHUA-BI-HUU-CO-001',
      description:
        'Cà chua bi hữu cơ 100% Đà Lạt, trồng trong nhà kính. Trái nhỏ đỏ đều, vị chua ngọt đậm, giàu lycopene. Không thuốc trừ sâu, phân hóa học.',
      pricePerUnit: 48000,
      unit: ProductUnit.KG,
      availableQuantity: 150,
      minOrderQuantity: 3,
      farmingType: FarmingType.ORGANIC,
      status: ProductStatus.ACTIVE,
      viewCount: 1230,
      harvestDate: new Date('2026-06-03'),
      expiryDate: new Date('2026-06-10'),
    },
    {
      sellerId: S,
      sellerType: SellerType.SUPPLIER,
      categoryId: RAU,
      name: 'Khoai lang tím Nhật Vĩnh Long',
      sku: 'DEV-KHOAI-LANG-TIM-NHAT-001',
      description:
        'Khoai lang tím giống Nhật trồng tại Vĩnh Long, củ đều đẹp, ruột tím đậm, hàm lượng anthocyanin cao. Xuất khẩu sang Nhật và Hàn Quốc.',
      pricePerUnit: 22000,
      unit: ProductUnit.KG,
      availableQuantity: 3000,
      minOrderQuantity: 100,
      farmingType: FarmingType.GLOBALGAP,
      status: ProductStatus.ACTIVE,
      viewCount: 2340,
      harvestDate: new Date('2026-05-15'),
      expiryDate: new Date('2026-08-15'),
    },
    {
      sellerId: F,
      sellerType: SellerType.FARMER,
      categoryId: RAU,
      name: 'Bí đỏ Hokaido Gia Lai',
      sku: 'DEV-BI-DO-HOKAIDO-001',
      description:
        'Bí đỏ Hokaido (bí hồ lô Nhật) trồng tại Gia Lai, trọng lượng 1–2kg/quả, ruột vàng đặc, vị ngọt bùi. Tốt cho bé ăn dặm và người ăn kiêng.',
      pricePerUnit: 30000,
      unit: ProductUnit.KG,
      availableQuantity: 500,
      minOrderQuantity: 10,
      farmingType: FarmingType.TRADITIONAL,
      status: ProductStatus.ACTIVE,
      viewCount: 388,
      harvestDate: new Date('2026-06-12'),
      expiryDate: new Date('2026-09-12'),
    },
    {
      sellerId: C,
      sellerType: SellerType.COOPERATIVE,
      categoryId: RAU,
      name: 'Hành tím Vĩnh Châu Sóc Trăng',
      sku: 'DEV-HANH-TIM-VINH-CHAU-001',
      description:
        'Hành tím Vĩnh Châu nổi tiếng cả nước, củ nhỏ chắc, màu tím đặc trưng, mùi hăng nồng. Phơi khô tự nhiên, bảo quản được 6 tháng. Đạt OCOP 3 sao.',
      pricePerUnit: 28000,
      unit: ProductUnit.KG,
      availableQuantity: 5000,
      minOrderQuantity: 50,
      farmingType: FarmingType.TRADITIONAL,
      status: ProductStatus.ACTIVE,
      viewCount: 1540,
      harvestDate: new Date('2026-04-10'),
      expiryDate: new Date('2026-10-10'),
    },
    {
      sellerId: F,
      sellerType: SellerType.FARMER,
      categoryId: RAU,
      name: 'Măng tây xanh Ninh Thuận',
      sku: 'DEV-MANG-TAY-XANH-001',
      description:
        'Măng tây xanh trồng tại Ninh Thuận, đất pha cát thổ nhưỡng đặc biệt. Chồi non mập mạp, giòn ngọt, giàu axit folic và vitamin K. Hái tươi hàng ngày.',
      pricePerUnit: 65000,
      unit: ProductUnit.KG,
      availableQuantity: 120,
      minOrderQuantity: 2,
      farmingType: FarmingType.VIETGAP,
      status: ProductStatus.ACTIVE,
      viewCount: 921,
      harvestDate: new Date('2026-06-02'),
      expiryDate: new Date('2026-06-05'),
    },

    // ── Gạo ───────────────────────────────────────────────────
    {
      sellerId: F,
      sellerType: SellerType.FARMER,
      categoryId: GAO,
      name: 'Gạo ST25 đặc sản Sóc Trăng',
      sku: 'DEV-GAO-ST25-001',
      description:
        'Gạo ST25 do ông Hồ Quang Cua lai tạo, từng đạt giải gạo ngon nhất thế giới. Hạt dài, cơm thơm dẻo, vị ngọt tự nhiên.',
      pricePerUnit: 28000,
      unit: ProductUnit.KG,
      availableQuantity: 2000,
      minOrderQuantity: 20,
      farmingType: FarmingType.VIETGAP,
      status: ProductStatus.ACTIVE,
      viewCount: 5432,
      harvestDate: new Date('2026-05-30'),
      expiryDate: new Date('2027-05-30'),
    },
    {
      sellerId: C,
      sellerType: SellerType.COOPERATIVE,
      categoryId: GAO,
      name: 'Gạo hữu cơ Séng Cù Mường Khương',
      sku: 'DEV-GAO-SENG-CU-001',
      description:
        'Gạo Séng Cù hữu cơ vùng núi Mường Khương – Lào Cai 1200m. Hạt mập, cơm dẻo thơm mùi lá dứa tự nhiên. Được Nhật Bản cấp chứng nhận hữu cơ JAS.',
      pricePerUnit: 52000,
      unit: ProductUnit.KG,
      availableQuantity: 800,
      minOrderQuantity: 5,
      farmingType: FarmingType.ORGANIC,
      status: ProductStatus.ACTIVE,
      viewCount: 2180,
      harvestDate: new Date('2025-11-20'),
      expiryDate: new Date('2026-11-20'),
    },
    {
      sellerId: S,
      sellerType: SellerType.SUPPLIER,
      categoryId: GAO,
      name: 'Nếp cái hoa vàng Hải Dương',
      sku: 'DEV-NEP-CAI-HOA-VANG-001',
      description:
        'Nếp cái hoa vàng đặc sản đồng bằng sông Hồng, hạt trắng trong, dẻo thơm đặc biệt. Dùng làm xôi, bánh chưng, rượu nếp truyền thống.',
      pricePerUnit: 35000,
      unit: ProductUnit.KG,
      availableQuantity: 1500,
      minOrderQuantity: 20,
      farmingType: FarmingType.TRADITIONAL,
      status: ProductStatus.ACTIVE,
      viewCount: 873,
      harvestDate: new Date('2025-12-01'),
      expiryDate: new Date('2026-12-01'),
    },
    {
      sellerId: F,
      sellerType: SellerType.FARMER,
      categoryId: GAO,
      name: 'Gạo lứt đỏ hữu cơ An Giang',
      sku: 'DEV-GAO-LUT-DO-HUU-CO-001',
      description:
        'Gạo lứt đỏ hữu cơ An Giang, còn nguyên cám đỏ giàu chất xơ và vitamin B. Phù hợp người ăn kiêng, tiểu đường, muốn kiểm soát cân nặng.',
      pricePerUnit: 32000,
      unit: ProductUnit.KG,
      availableQuantity: 600,
      minOrderQuantity: 5,
      farmingType: FarmingType.ORGANIC,
      status: ProductStatus.ACTIVE,
      viewCount: 1450,
      harvestDate: new Date('2026-04-15'),
      expiryDate: new Date('2027-04-15'),
    },

    // ── Cà phê & chè ──────────────────────────────────────────
    {
      sellerId: F,
      sellerType: SellerType.FARMER,
      categoryId: CF,
      name: 'Cà phê Arabica Cầu Đất Đà Lạt',
      sku: 'DEV-CA-PHE-ARABICA-001',
      description:
        'Cà phê Arabica trồng tại vùng Cầu Đất 1500m so mực nước biển. Hữu cơ 100%, rang mộc theo phương pháp truyền thống.',
      pricePerUnit: 120000,
      unit: ProductUnit.KG,
      availableQuantity: 150,
      minOrderQuantity: 2,
      farmingType: FarmingType.ORGANIC,
      status: ProductStatus.ACTIVE,
      viewCount: 764,
      harvestDate: new Date('2025-12-01'),
      expiryDate: new Date('2026-12-01'),
    },
    {
      sellerId: C,
      sellerType: SellerType.COOPERATIVE,
      categoryId: CF,
      name: 'Cà phê Robusta Buôn Ma Thuột',
      sku: 'DEV-CA-PHE-ROBUSTA-001',
      description:
        'Cà phê Robusta nguyên bản từ Buôn Ma Thuột – thủ phủ cà phê Tây Nguyên. Hạt to đều, rang đậm, vị đắng mạnh, hậu vị ngọt lâu. Chứng nhận UTZ.',
      pricePerUnit: 75000,
      unit: ProductUnit.KG,
      availableQuantity: 500,
      minOrderQuantity: 5,
      farmingType: FarmingType.VIETGAP,
      status: ProductStatus.ACTIVE,
      viewCount: 2890,
      harvestDate: new Date('2025-12-15'),
      expiryDate: new Date('2026-12-15'),
    },
    {
      sellerId: S,
      sellerType: SellerType.SUPPLIER,
      categoryId: CF,
      name: 'Chè Shan Tuyết Hà Giang',
      sku: 'DEV-CHE-SHAN-TUYET-001',
      description:
        'Chè Shan Tuyết cổ thụ trên đỉnh núi Hà Giang 1500m. Búp trắng phủ tuyết, vị ngọt hậu dài, thơm mát. Hữu cơ tự nhiên, không phân bón hóa học.',
      pricePerUnit: 280000,
      unit: ProductUnit.KG,
      availableQuantity: 80,
      minOrderQuantity: 1,
      farmingType: FarmingType.ORGANIC,
      status: ProductStatus.ACTIVE,
      viewCount: 3420,
      harvestDate: new Date('2026-04-01'),
      expiryDate: new Date('2027-04-01'),
    },
    {
      sellerId: F,
      sellerType: SellerType.FARMER,
      categoryId: CF,
      name: 'Chè xanh Thái Nguyên loại đặc',
      sku: 'DEV-CHE-XANH-THAI-NGUYEN-001',
      description:
        'Chè xanh Tân Cương – Thái Nguyên, búp một tôm hai lá, hái thủ công. Nước xanh vàng trong, vị chát dịu, thơm mùi cốm. Hộp thiếc 500g.',
      pricePerUnit: 180000,
      unit: ProductUnit.KG,
      availableQuantity: 200,
      minOrderQuantity: 1,
      farmingType: FarmingType.TRADITIONAL,
      status: ProductStatus.ACTIVE,
      viewCount: 1876,
      harvestDate: new Date('2026-05-01'),
      expiryDate: new Date('2027-05-01'),
    },

    // ── Thủy hải sản ──────────────────────────────────────────
    {
      sellerId: S,
      sellerType: SellerType.SUPPLIER,
      categoryId: TS,
      name: 'Tôm sú sạch đông lạnh Cà Mau',
      sku: 'DEV-TOM-SU-DONG-LANH-001',
      description:
        'Tôm sú nuôi sinh thái tại Cà Mau, thịt chắc ngọt, không kháng sinh. Đóng gói đông lạnh IQF 1kg/túi. Đạt ASC và tiêu chuẩn xuất khẩu EU.',
      pricePerUnit: 185000,
      unit: ProductUnit.KG,
      availableQuantity: 2000,
      minOrderQuantity: 5,
      farmingType: FarmingType.GLOBALGAP,
      status: ProductStatus.ACTIVE,
      viewCount: 4320,
      harvestDate: new Date('2026-05-25'),
      expiryDate: new Date('2026-11-25'),
    },
    {
      sellerId: F,
      sellerType: SellerType.FARMER,
      categoryId: TS,
      name: 'Cá tra phi lê đông lạnh An Giang',
      sku: 'DEV-CA-TRA-PHI-LE-001',
      description:
        'Cá tra phi lê nuôi tại An Giang theo quy trình ASC. Thịt trắng mịn, không mùi bùn, đạt tiêu chuẩn xuất khẩu Mỹ và EU.',
      pricePerUnit: 65000,
      unit: ProductUnit.KG,
      availableQuantity: 3000,
      minOrderQuantity: 10,
      farmingType: FarmingType.GLOBALGAP,
      status: ProductStatus.ACTIVE,
      viewCount: 2105,
      harvestDate: new Date('2026-05-20'),
      expiryDate: new Date('2026-11-20'),
    },
    {
      sellerId: C,
      sellerType: SellerType.COOPERATIVE,
      categoryId: TS,
      name: 'Mực khô Phú Quốc',
      sku: 'DEV-MUC-KHO-PHU-QUOC-001',
      description:
        'Mực ống đánh bắt tự nhiên tại vùng biển Phú Quốc, phơi khô một nắng truyền thống. Mực to đều, màu hồng nhạt tự nhiên, không chất tẩy trắng.',
      pricePerUnit: 320000,
      unit: ProductUnit.KG,
      availableQuantity: 100,
      minOrderQuantity: 1,
      farmingType: FarmingType.TRADITIONAL,
      status: ProductStatus.ACTIVE,
      viewCount: 1678,
      harvestDate: new Date('2026-04-20'),
      expiryDate: new Date('2027-04-20'),
    },

    // ── Gia vị ────────────────────────────────────────────────
    {
      sellerId: C,
      sellerType: SellerType.COOPERATIVE,
      categoryId: GV,
      name: 'Tiêu đen Phú Quốc',
      sku: 'DEV-TIEU-DEN-PHU-QUOC-001',
      description:
        'Tiêu đen hạt to vùng Phú Quốc, được bảo hộ chỉ dẫn địa lý. Vị cay nồng đặc trưng, hương thơm mạnh. Hạt đều đẹp, không tạp chất. OCOP 5 sao.',
      pricePerUnit: 180000,
      unit: ProductUnit.KG,
      availableQuantity: 200,
      minOrderQuantity: 1,
      farmingType: FarmingType.TRADITIONAL,
      status: ProductStatus.ACTIVE,
      viewCount: 3210,
      harvestDate: new Date('2026-03-01'),
      expiryDate: new Date('2027-03-01'),
    },
    {
      sellerId: F,
      sellerType: SellerType.FARMER,
      categoryId: GV,
      name: 'Nghệ vàng hữu cơ Bình Định',
      sku: 'DEV-NGHE-VANG-HUU-CO-001',
      description:
        'Nghệ vàng hữu cơ trồng tại Bình Định, hàm lượng curcumin cao trên 5%. Sấy khô, xay mịn không pha trộn.',
      pricePerUnit: 95000,
      unit: ProductUnit.KG,
      availableQuantity: 300,
      minOrderQuantity: 1,
      farmingType: FarmingType.ORGANIC,
      status: ProductStatus.ACTIVE,
      viewCount: 2140,
      harvestDate: new Date('2026-02-15'),
      expiryDate: new Date('2027-02-15'),
    },
    {
      sellerId: S,
      sellerType: SellerType.SUPPLIER,
      categoryId: GV,
      name: 'Tỏi đen Lý Sơn lên men tự nhiên',
      sku: 'DEV-TOI-DEN-LY-SON-001',
      description:
        'Tỏi đen lên men từ tỏi Lý Sơn nguyên củ. Vị ngọt nhẹ, không cay, thơm mùi balsamic. Giàu S-allyl cysteine gấp 10 lần tỏi tươi. Hộp 200g.',
      pricePerUnit: 350000,
      unit: ProductUnit.KG,
      availableQuantity: 50,
      minOrderQuantity: 1,
      farmingType: FarmingType.ORGANIC,
      status: ProductStatus.ACTIVE,
      viewCount: 4890,
      harvestDate: new Date('2026-05-01'),
      expiryDate: new Date('2026-11-01'),
    },
    {
      sellerId: F,
      sellerType: SellerType.FARMER,
      categoryId: GV,
      name: 'Gừng tươi hữu cơ Kỳ Sơn',
      sku: 'DEV-GUNG-TUOI-HUU-CO-001',
      description:
        'Gừng tươi hữu cơ trồng trên núi Kỳ Sơn – Nghệ An 800m, củ già chắc, tinh dầu nhiều, vị cay nồng đậm đặc.',
      pricePerUnit: 45000,
      unit: ProductUnit.KG,
      availableQuantity: 400,
      minOrderQuantity: 5,
      farmingType: FarmingType.ORGANIC,
      status: ProductStatus.ACTIVE,
      viewCount: 1320,
      harvestDate: new Date('2026-04-20'),
      expiryDate: new Date('2026-07-20'),
    },
    {
      sellerId: F,
      sellerType: SellerType.FARMER,
      categoryId: GV,
      name: 'Tinh bột nghệ sạch Bình Định',
      sku: 'DEV-TINH-BOT-NGHE-001',
      description:
        'Tinh bột nghệ hữu cơ 100% chiết xuất từ nghệ vàng tươi Bình Định. Màu vàng tươi đẹp, mịn mượt, curcumin nguyên vẹn.',
      pricePerUnit: 250000,
      unit: ProductUnit.KG,
      availableQuantity: 100,
      minOrderQuantity: 1,
      farmingType: FarmingType.ORGANIC,
      status: ProductStatus.ACTIVE,
      viewCount: 2890,
      harvestDate: new Date('2026-04-01'),
      expiryDate: new Date('2027-04-01'),
    },

    // ── Mật ong & đặc sản ─────────────────────────────────────
    {
      sellerId: F,
      sellerType: SellerType.FARMER,
      categoryId: MO,
      name: 'Mật ong hoa nhãn nguyên chất',
      sku: 'DEV-MAT-ONG-HOA-NHAN-001',
      description:
        'Mật ong hoa nhãn từ đàn ong nuôi tại vườn nhãn Hưng Yên. Màu vàng amber, sánh đặc, vị ngọt thơm hoa nhãn.',
      pricePerUnit: 180000,
      unit: ProductUnit.LITER,
      availableQuantity: 200,
      minOrderQuantity: 1,
      farmingType: FarmingType.ORGANIC,
      status: ProductStatus.ACTIVE,
      viewCount: 2670,
      harvestDate: new Date('2026-07-01'),
      expiryDate: new Date('2027-07-01'),
    },
    {
      sellerId: C,
      sellerType: SellerType.COOPERATIVE,
      categoryId: MO,
      name: 'Mật ong rừng Tây Nguyên',
      sku: 'DEV-MAT-ONG-RUNG-001',
      description:
        'Mật ong rừng nguyên khai thu từ tổ ong trên cây cổ thụ Tây Nguyên. Màu nâu đậm, vị đậm đà phức hợp nhiều loại hoa rừng.',
      pricePerUnit: 350000,
      unit: ProductUnit.LITER,
      availableQuantity: 80,
      minOrderQuantity: 1,
      farmingType: FarmingType.ORGANIC,
      status: ProductStatus.ACTIVE,
      viewCount: 5120,
      harvestDate: new Date('2026-03-15'),
      expiryDate: new Date('2027-03-15'),
    },
    {
      sellerId: S,
      sellerType: SellerType.SUPPLIER,
      categoryId: MO,
      name: 'Muối hầm Cần Giờ',
      sku: 'DEV-MUOI-HAM-CAN-GIO-001',
      description:
        'Muối hầm thủ công tại cánh đồng muối Cần Giờ TP.HCM. Muối trắng to hạt, độ mặn cao, giàu khoáng chất tự nhiên.',
      pricePerUnit: 8000,
      unit: ProductUnit.KG,
      availableQuantity: 10000,
      minOrderQuantity: 50,
      farmingType: FarmingType.TRADITIONAL,
      status: ProductStatus.ACTIVE,
      viewCount: 543,
      harvestDate: new Date('2026-04-01'),
      expiryDate: new Date('2028-04-01'),
    },
    {
      sellerId: F,
      sellerType: SellerType.FARMER,
      categoryId: MO,
      name: 'Dừa xiêm xanh Bến Tre',
      sku: 'DEV-DUA-XIEM-XANH-001',
      description:
        'Dừa xiêm xanh Bến Tre, trái non 6–8 tháng, nước nhiều ngọt lạnh, cơm mỏng mềm. Thu hoạch tươi, giao trong 24h.',
      pricePerUnit: 15000,
      unit: ProductUnit.PIECE,
      availableQuantity: 5000,
      minOrderQuantity: 50,
      farmingType: FarmingType.TRADITIONAL,
      status: ProductStatus.ACTIVE,
      viewCount: 1234,
      harvestDate: new Date('2026-06-01'),
      expiryDate: new Date('2026-06-15'),
    },
    {
      sellerId: S,
      sellerType: SellerType.SUPPLIER,
      categoryId: MO,
      name: 'Mắm nêm thùng Phan Thiết',
      sku: 'DEV-MAM-NEM-PHAN-THIET-001',
      description:
        'Mắm nêm cá cơm ủ 12 tháng theo công thức truyền thống Phan Thiết. Màu nâu đỏ đẹp, mùi thơm đặc trưng.',
      pricePerUnit: 45000,
      unit: ProductUnit.LITER,
      availableQuantity: 300,
      minOrderQuantity: 2,
      farmingType: FarmingType.TRADITIONAL,
      status: ProductStatus.ACTIVE,
      viewCount: 1102,
      harvestDate: new Date('2026-01-01'),
      expiryDate: new Date('2026-07-01'),
    },
    {
      sellerId: C,
      sellerType: SellerType.COOPERATIVE,
      categoryId: MO,
      name: 'Nước mắm cốt nhĩ Phú Quốc 40 độ đạm',
      sku: 'DEV-NUOC-MAM-PHU-QUOC-001',
      description:
        'Nước mắm cốt nhĩ Phú Quốc chắt lọc đầu tiên, 40 độ đạm. Màu nâu cánh gián đẹp, mùi thơm dịu. Được bảo hộ GI EU.',
      pricePerUnit: 120000,
      unit: ProductUnit.LITER,
      availableQuantity: 500,
      minOrderQuantity: 2,
      farmingType: FarmingType.TRADITIONAL,
      status: ProductStatus.ACTIVE,
      viewCount: 4230,
      harvestDate: new Date('2026-01-01'),
      expiryDate: new Date('2027-01-01'),
    },
    {
      sellerId: S,
      sellerType: SellerType.SUPPLIER,
      categoryId: MO,
      name: 'Dầu dừa nguyên chất ép lạnh',
      sku: 'DEV-DAU-DUA-EP-LANH-001',
      description:
        'Dầu dừa VCO (virgin coconut oil) ép lạnh từ dừa tươi Bến Tre. Mùi dừa nhẹ, trong suốt, điểm nóng 175°C.',
      pricePerUnit: 180000,
      unit: ProductUnit.LITER,
      availableQuantity: 300,
      minOrderQuantity: 1,
      farmingType: FarmingType.ORGANIC,
      status: ProductStatus.ACTIVE,
      viewCount: 3870,
      harvestDate: new Date('2026-05-01'),
      expiryDate: new Date('2027-05-01'),
    },
    {
      sellerId: S,
      sellerType: SellerType.SUPPLIER,
      categoryId: MO,
      name: 'Cao sâm Ngọc Linh cô đặc',
      sku: 'DEV-CAO-SAM-NGOC-LINH-001',
      description:
        'Cao sâm Ngọc Linh chiết xuất cô đặc, nguồn sâm trồng tại vùng Ngọc Linh Quảng Nam 1500m. Hàm lượng ginsenoside MR2 cao.',
      pricePerUnit: 8500000,
      unit: ProductUnit.KG,
      availableQuantity: 5,
      minOrderQuantity: 1,
      farmingType: FarmingType.ORGANIC,
      status: ProductStatus.ACTIVE,
      viewCount: 9876,
      harvestDate: new Date('2026-02-01'),
      expiryDate: new Date('2028-02-01'),
    },

    // ── Hạt & đậu ─────────────────────────────────────────────
    {
      sellerId: C,
      sellerType: SellerType.COOPERATIVE,
      categoryId: HD,
      name: 'Hạt điều rang muối W320',
      sku: 'DEV-HAT-DIEU-W320-001',
      description:
        'Hạt điều rang muối W320 từ vùng điều Bình Phước, hạt to đều, không vỡ mảnh. Rang giòn, vị mặn nhẹ, thơm bơ tự nhiên.',
      pricePerUnit: 180000,
      unit: ProductUnit.KG,
      availableQuantity: 500,
      minOrderQuantity: 2,
      farmingType: FarmingType.VIETGAP,
      status: ProductStatus.ACTIVE,
      viewCount: 3456,
      harvestDate: new Date('2026-03-01'),
      expiryDate: new Date('2026-09-01'),
    },
    {
      sellerId: F,
      sellerType: SellerType.FARMER,
      categoryId: HD,
      name: 'Đậu phộng đỏ Bình Định',
      sku: 'DEV-DAU-PHONG-DO-001',
      description:
        'Đậu phộng đỏ (lạc đỏ) trồng tại Bình Định, hạt to đều, vỏ đỏ bóng đặc trưng. Hàm lượng dầu cao 45%.',
      pricePerUnit: 35000,
      unit: ProductUnit.KG,
      availableQuantity: 1200,
      minOrderQuantity: 10,
      farmingType: FarmingType.TRADITIONAL,
      status: ProductStatus.ACTIVE,
      viewCount: 867,
      harvestDate: new Date('2026-05-01'),
      expiryDate: new Date('2026-11-01'),
    },

    // ── Nấm & rau sạch cao cấp ────────────────────────────────
    {
      sellerId: F,
      sellerType: SellerType.FARMER,
      categoryId: RAU,
      name: 'Nấm linh chi đỏ hữu cơ',
      sku: 'DEV-NAM-LINH-CHI-001',
      description:
        'Nấm linh chi đỏ trồng trong nhà lưới tại Đà Lạt, bào tử nhiều. Thái lát sấy khô, hàm lượng polysaccharide cao.',
      pricePerUnit: 650000,
      unit: ProductUnit.KG,
      availableQuantity: 50,
      minOrderQuantity: 1,
      farmingType: FarmingType.ORGANIC,
      status: ProductStatus.ACTIVE,
      viewCount: 2234,
      harvestDate: new Date('2026-05-15'),
      expiryDate: new Date('2027-05-15'),
    },
    {
      sellerId: C,
      sellerType: SellerType.COOPERATIVE,
      categoryId: RAU,
      name: 'Nấm đông cô tươi Lâm Đồng',
      sku: 'DEV-NAM-DONG-CO-001',
      description:
        'Nấm đông cô (shiitake) tươi trồng trên mùn cưa sồi tại Đà Lạt. Mũ nấm dày, nâu đậm, mùi thơm đặc trưng.',
      pricePerUnit: 80000,
      unit: ProductUnit.KG,
      availableQuantity: 200,
      minOrderQuantity: 2,
      farmingType: FarmingType.ORGANIC,
      status: ProductStatus.ACTIVE,
      viewCount: 1890,
      harvestDate: new Date('2026-06-01'),
      expiryDate: new Date('2026-06-08'),
    },
    {
      sellerId: F,
      sellerType: SellerType.FARMER,
      categoryId: RAU,
      name: 'Rau xà lách thủy canh Hà Nội',
      sku: 'DEV-XA-LACH-THUY-CANH-001',
      description: 'Xà lách romano thuỷ canh không đất tại Hà Nội. Lá xanh tươi giòn, không thuốc, không chì.',
      pricePerUnit: 42000,
      unit: ProductUnit.KG,
      availableQuantity: 100,
      minOrderQuantity: 1,
      farmingType: FarmingType.ORGANIC,
      status: ProductStatus.ACTIVE,
      viewCount: 678,
      harvestDate: new Date('2026-06-03'),
      expiryDate: new Date('2026-06-07'),
    },

    // ── Trái cây phía Bắc ─────────────────────────────────────
    {
      sellerId: F,
      sellerType: SellerType.FARMER,
      categoryId: TC,
      name: 'Đào tiên Mộc Châu',
      sku: 'DEV-DAO-TIEN-MOC-CHAU-001',
      description:
        'Đào tiên Mộc Châu – Sơn La, trái to tròn, vỏ vàng ửng đỏ, thịt vàng ngọt thơm. Trồng ở độ cao 1000m.',
      pricePerUnit: 60000,
      unit: ProductUnit.KG,
      availableQuantity: 350,
      minOrderQuantity: 5,
      farmingType: FarmingType.TRADITIONAL,
      status: ProductStatus.ACTIVE,
      viewCount: 1432,
      harvestDate: new Date('2026-07-10'),
      expiryDate: new Date('2026-07-20'),
    },
    {
      sellerId: C,
      sellerType: SellerType.COOPERATIVE,
      categoryId: TC,
      name: 'Mận hậu Bắc Hà Lào Cai',
      sku: 'DEV-MAN-HAU-BAC-HA-001',
      description: 'Mận hậu Bắc Hà chín muộn tháng 6–7, quả to đồng đều, vỏ tím mỡ màng, ruột vàng giòn ngọt.',
      pricePerUnit: 38000,
      unit: ProductUnit.KG,
      availableQuantity: 600,
      minOrderQuantity: 5,
      farmingType: FarmingType.TRADITIONAL,
      status: ProductStatus.ACTIVE,
      viewCount: 2100,
      harvestDate: new Date('2026-07-05'),
      expiryDate: new Date('2026-07-15'),
    },
    {
      sellerId: F,
      sellerType: SellerType.FARMER,
      categoryId: TC,
      name: 'Lê VH6 Bắc Giang',
      sku: 'DEV-LE-VH6-BAC-GIANG-001',
      description: 'Lê VH6 lai tạo tại Bắc Giang, quả to hình quả lê cổ điển, vỏ vàng xanh, cùi giòn nhiều nước.',
      pricePerUnit: 48000,
      unit: ProductUnit.KG,
      availableQuantity: 400,
      minOrderQuantity: 5,
      farmingType: FarmingType.VIETGAP,
      status: ProductStatus.ACTIVE,
      viewCount: 543,
      harvestDate: new Date('2026-08-15'),
      expiryDate: new Date('2026-09-05'),
    },

    // ── Hoa & cây cảnh ────────────────────────────────────────
    {
      sellerId: F,
      sellerType: SellerType.FARMER,
      categoryId: HOA,
      name: 'Hoa cúc vàng Đà Lạt',
      sku: 'DEV-HOA-CUC-VANG-001',
      description:
        'Hoa cúc vàng tươi cắt cành từ trang trại Đà Lạt, mỗi bó 20 cành. Hoa nở đẹp, cánh dày, màu vàng tươi.',
      pricePerUnit: 45000,
      unit: ProductUnit.BUNCH,
      availableQuantity: 500,
      minOrderQuantity: 5,
      farmingType: FarmingType.VIETGAP,
      status: ProductStatus.ACTIVE,
      viewCount: 1120,
      harvestDate: new Date('2026-06-05'),
      expiryDate: new Date('2026-06-12'),
    },
    {
      sellerId: C,
      sellerType: SellerType.COOPERATIVE,
      categoryId: HOA,
      name: 'Hoa hồng nhập khẩu Ecuador',
      sku: 'DEV-HOA-HONG-ECUADOR-001',
      description:
        'Hoa hồng Ecuador thân dài 60–70cm, bông to đẹp 5–6cm, màu sắc đa dạng. Trồng trên cao nguyên 3000m.',
      pricePerUnit: 85000,
      unit: ProductUnit.BUNCH,
      availableQuantity: 200,
      minOrderQuantity: 2,
      farmingType: FarmingType.GLOBALGAP,
      status: ProductStatus.ACTIVE,
      viewCount: 2340,
      harvestDate: new Date('2026-06-07'),
      expiryDate: new Date('2026-06-21'),
    },

    // ── Gia súc & gia cầm ─────────────────────────────────────
    {
      sellerId: F,
      sellerType: SellerType.FARMER,
      categoryId: GS,
      name: 'Trứng gà ta thả vườn Đồng Nai',
      sku: 'DEV-TRUNG-GA-THA-VUON-001',
      description:
        'Trứng gà ta thả vườn nuôi bằng thức ăn ngũ cốc tự nhiên tại Đồng Nai. Vỏ nâu sần, lòng đỏ đậm màu cam.',
      pricePerUnit: 65000,
      unit: ProductUnit.BOX,
      availableQuantity: 1000,
      minOrderQuantity: 5,
      farmingType: FarmingType.TRADITIONAL,
      status: ProductStatus.ACTIVE,
      viewCount: 3456,
      harvestDate: new Date('2026-06-04'),
      expiryDate: new Date('2026-07-04'),
    },
    {
      sellerId: C,
      sellerType: SellerType.COOPERATIVE,
      categoryId: GS,
      name: 'Thịt bò Wagyu F1 Lâm Đồng',
      sku: 'DEV-THIT-BO-WAGYU-F1-001',
      description:
        'Thịt bò Wagyu F1 nuôi tại trang trại Lâm Đồng, vân mỡ đẹp (marbling score 4–6). Cỏ tươi kết hợp ngũ cốc.',
      pricePerUnit: 650000,
      unit: ProductUnit.KG,
      availableQuantity: 100,
      minOrderQuantity: 1,
      farmingType: FarmingType.VIETGAP,
      status: ProductStatus.ACTIVE,
      viewCount: 5670,
      harvestDate: new Date('2026-06-01'),
      expiryDate: new Date('2026-06-15'),
    },
    {
      sellerId: F,
      sellerType: SellerType.FARMER,
      categoryId: GS,
      name: 'Sữa bò tươi nguyên liệu Mộc Châu',
      sku: 'DEV-SUA-BO-TUOI-001',
      description:
        'Sữa bò tươi nguyên liệu từ trang trại bò sữa Mộc Châu, độ béo 3.6%, protein 3.2%. Thanh trùng nhiệt độ thấp.',
      pricePerUnit: 22000,
      unit: ProductUnit.LITER,
      availableQuantity: 500,
      minOrderQuantity: 5,
      farmingType: FarmingType.VIETGAP,
      status: ProductStatus.ACTIVE,
      viewCount: 1890,
      harvestDate: new Date('2026-06-04'),
      expiryDate: new Date('2026-06-11'),
    },

    // ── P8-05C2B approved central Product additions ───────────
    {
      sellerId: SANDBOX_F,
      sellerType: SellerType.FARMER,
      categoryId: TC,
      name: 'Bưởi da xanh Bến Tre',
      sku: 'DEV-BUOI-DA-XANH-FARMER-001',
      description: 'Bưởi da xanh ruột hồng, không hạt, mọng nước.',
      pricePerUnit: 32000,
      unit: ProductUnit.KG,
      availableQuantity: 800,
      minOrderQuantity: 10,
      farmingType: FarmingType.VIETGAP,
      status: ProductStatus.ACTIVE,
      viewCount: 1120,
      harvestDate: new Date('2026-07-01'),
      expiryDate: null,
      primaryImageUrl:
        'https://images.unsplash.com/photo-1576181256399-834e3b3a49bf?w=600',
    },
    {
      sellerId: SANDBOX_F,
      sellerType: SellerType.FARMER,
      categoryId: RAU,
      name: 'Cà rốt Đà Lạt',
      sku: 'DEV-CA-ROT-DA-LAT-001',
      description: 'Cà rốt Đà Lạt ngọt giòn, VietGAP, tươi mỗi ngày.',
      pricePerUnit: 22000,
      unit: ProductUnit.KG,
      availableQuantity: 400,
      minOrderQuantity: 10,
      farmingType: FarmingType.VIETGAP,
      status: ProductStatus.ACTIVE,
      viewCount: 645,
      harvestDate: new Date('2026-06-05'),
      expiryDate: null,
      primaryImageUrl:
        'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=600',
    },
    {
      sellerId: SANDBOX_F,
      sellerType: SellerType.FARMER,
      categoryId: GAO,
      name: 'Gạo Jasmine thơm',
      sku: 'DEV-GAO-JASMINE-THOM-001',
      description: 'Gạo Jasmine thơm dẻo Cần Thơ, truyền thống.',
      pricePerUnit: 24000,
      unit: ProductUnit.KG,
      availableQuantity: 1500,
      minOrderQuantity: 20,
      farmingType: FarmingType.TRADITIONAL,
      status: ProductStatus.ACTIVE,
      viewCount: 3210,
      harvestDate: new Date('2026-04-20'),
      expiryDate: null,
      primaryImageUrl:
        'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=600',
    },
    {
      sellerId: S,
      sellerType: SellerType.SUPPLIER,
      categoryId: CF,
      name: 'Cà phê Robusta BMT',
      sku: 'DEV-CA-PHE-ROBUSTA-SUPPLIER-001',
      description: 'Robusta Buôn Ma Thuột đậm vị, rang đậm.',
      pricePerUnit: 95000,
      unit: ProductUnit.KG,
      availableQuantity: 500,
      minOrderQuantity: 5,
      farmingType: FarmingType.VIETGAP,
      status: ProductStatus.ACTIVE,
      viewCount: 2890,
      harvestDate: new Date('2025-12-15'),
      expiryDate: null,
      primaryImageUrl:
        'https://images.unsplash.com/photo-1559525839-d9acfd564ca0?w=600',
    },
    {
      sellerId: S,
      sellerType: SellerType.SUPPLIER,
      categoryId: GV,
      name: 'Tiêu đen Phú Quốc',
      sku: 'DEV-TIEU-DEN-PHU-QUOC-SUPPLIER-001',
      description: 'Tiêu đen Phú Quốc OCOP 5 sao, hương vị đặc trưng.',
      pricePerUnit: 180000,
      unit: ProductUnit.KG,
      availableQuantity: 200,
      minOrderQuantity: 1,
      farmingType: FarmingType.TRADITIONAL,
      status: ProductStatus.ACTIVE,
      viewCount: 3210,
      harvestDate: new Date('2026-03-01'),
      expiryDate: null,
      primaryImageUrl:
        'https://images.unsplash.com/photo-1599582907898-5cdb44389b66?w=600',
    },
    {
      sellerId: SANDBOX_F,
      sellerType: SellerType.FARMER,
      categoryId: HD,
      name: 'Đậu phộng rang',
      sku: 'DEV-DAU-PHONG-RANG-001',
      description: 'Đậu phộng rang giòn truyền thống, Bình Định.',
      pricePerUnit: 55000,
      unit: ProductUnit.KG,
      availableQuantity: 1200,
      minOrderQuantity: 10,
      farmingType: FarmingType.TRADITIONAL,
      status: ProductStatus.ACTIVE,
      viewCount: 867,
      harvestDate: new Date('2026-05-01'),
      expiryDate: null,
      primaryImageUrl:
        'https://images.unsplash.com/photo-1567132875421-e84e6c8c0d56?w=600',
    },
    {
      sellerId: SANDBOX_C,
      sellerType: SellerType.COOPERATIVE,
      categoryId: MO,
      name: 'Mật ong hoa nhãn',
      sku: 'DEV-MAT-ONG-HOA-NHAN-COOP-001',
      description: 'Mật ong hoa nhãn nguyên chất Hưng Yên, thơm ngọt.',
      pricePerUnit: 180000,
      unit: ProductUnit.LITER,
      availableQuantity: 200,
      minOrderQuantity: 1,
      farmingType: FarmingType.ORGANIC,
      status: ProductStatus.ACTIVE,
      viewCount: 2670,
      harvestDate: new Date('2026-07-01'),
      expiryDate: null,
      primaryImageUrl:
        'https://images.unsplash.com/photo-1587049352851-8d4e8915b9c1?w=600',
    },
    {
      sellerId: SANDBOX_F,
      sellerType: SellerType.FARMER,
      categoryId: null,
      name: 'Thuốc trừ sâu không tem nhãn',
      sku: 'DEV-VIOLATION-BVTV-KHONG-TEM-001',
      description: 'Thuốc BVTV không rõ nguồn gốc, vi phạm chất lượng',
      pricePerUnit: 50000,
      unit: ProductUnit.LITER,
      availableQuantity: 100,
      minOrderQuantity: null,
      farmingType: FarmingType.TRADITIONAL,
      status: ProductStatus.SUSPENDED,
      rejectionReason:
        'Vi phạm chính sách chất lượng. Hàng hóa không rõ nguồn gốc, không tem nhãn phụ theo quy định.',
      viewCount: 0,
      harvestDate: null,
      expiryDate: null,
      primaryImageUrl: null,
    },
    {
      sellerId: S,
      sellerType: SellerType.SUPPLIER,
      categoryId: null,
      name: 'Phân bón kém chất lượng',
      sku: 'DEV-VIOLATION-PHAN-BON-KEM-CHAT-LUONG-001',
      description: 'Phân bón NPK không đạt hàm lượng cam kết',
      pricePerUnit: 120000,
      unit: ProductUnit.KG,
      availableQuantity: 500,
      minOrderQuantity: null,
      farmingType: FarmingType.TRADITIONAL,
      status: ProductStatus.SUSPENDED,
      rejectionReason:
        'Hàm lượng NPK thực tế chỉ đạt 60% so với nhãn mác. Vi phạm QC 01-2025 về phân bón.',
      viewCount: 0,
      harvestDate: null,
      expiryDate: null,
      primaryImageUrl: null,
    },
    // P8-05D3: retained Admin DEV Products approved by merged D3A1 authority.
    {
      sku: APPROVED_D3_PRODUCT_SKUS[0],
      sellerId: D3_HUNG,
      sellerType: SellerType.FARMER,
      categoryId: null,
      name: 'Xoài cát Hòa Lộc loại 1',
      description:
        'Xoài chín cây, ngọt thanh, không thuốc trừ sâu. Đóng gói 5kg/thùng.',
      pricePerUnit: 45000,
      unit: ProductUnit.KG,
      availableQuantity: 500,
      minOrderQuantity: 10,
      variety: 'Hòa Lộc',
      farmingType: FarmingType.VIETGAP,
      status: ProductStatus.PENDING_APPROVAL,
      primaryImageUrl: APPROVED_D3_PRIMARY_IMAGE_URLS[0],
    },
    {
      sku: APPROVED_D3_PRODUCT_SKUS[1],
      sellerId: D3_MAI,
      sellerType: SellerType.FARMER,
      categoryId: null,
      name: 'Rau xà lách thủy canh',
      description:
        'Xà lách trồng trong nhà kính, sạch, giòn, không thuốc bảo vệ thực vật.',
      pricePerUnit: 25000,
      unit: ProductUnit.KG,
      availableQuantity: 200,
      minOrderQuantity: 5,
      variety: 'Xà lách Mỹ',
      farmingType: FarmingType.ORGANIC,
      status: ProductStatus.PENDING_APPROVAL,
      primaryImageUrl: APPROVED_D3_PRIMARY_IMAGE_URLS[1],
    },
    {
      sku: APPROVED_D3_PRODUCT_SKUS[2],
      sellerId: D3_TUAN,
      sellerType: SellerType.FARMER,
      categoryId: null,
      name: 'Dưa lưới giống Nhật',
      description:
        'Dưa lưới trồng theo tiêu chuẩn GlobalGAP, vị ngọt đậm, mọng nước.',
      pricePerUnit: 85000,
      unit: ProductUnit.KG,
      availableQuantity: 150,
      minOrderQuantity: 2,
      variety: 'Nhật Bản',
      farmingType: FarmingType.GLOBALGAP,
      status: ProductStatus.PENDING_APPROVAL,
      primaryImageUrl: APPROVED_D3_PRIMARY_IMAGE_URLS[2],
    },
    {
      sku: APPROVED_D3_PRODUCT_SKUS[3],
      sellerId: D3_HTX_DALAT,
      sellerType: SellerType.COOPERATIVE,
      categoryId: null,
      name: 'Gạo ST25 Sóc Trăng',
      description: 'Gạo thơm đặc sản, đạt chuẩn xuất khẩu. Đóng bao 5kg.',
      pricePerUnit: 35000,
      unit: ProductUnit.KG,
      availableQuantity: 2000,
      minOrderQuantity: 20,
      variety: 'ST25',
      farmingType: FarmingType.VIETGAP,
      status: ProductStatus.PENDING_APPROVAL,
      primaryImageUrl: APPROVED_D3_PRIMARY_IMAGE_URLS[3],
    },
    {
      sku: APPROVED_D3_PRODUCT_SKUS[4],
      sellerId: D3_HTX_DALAT,
      sellerType: SellerType.COOPERATIVE,
      categoryId: null,
      name: 'Rau cải bó xôi hữu cơ',
      description:
        'Cải bó xôi organic Đà Lạt, thu hoạch trong ngày, giao tận nơi.',
      pricePerUnit: 32000,
      unit: ProductUnit.KG,
      availableQuantity: 300,
      minOrderQuantity: 5,
      variety: 'Bó xôi',
      farmingType: FarmingType.ORGANIC,
      status: ProductStatus.PENDING_APPROVAL,
      primaryImageUrl: APPROVED_D3_PRIMARY_IMAGE_URLS[4],
    },
    {
      sku: APPROVED_D3_PRODUCT_SKUS[5],
      sellerId: D3_HTX_TIEN_GIANG,
      sellerType: SellerType.COOPERATIVE,
      categoryId: null,
      name: 'Bưởi da xanh Bến Tre',
      description:
        'Bưởi da xanh chính hiệu, ngọt mát, mọng nước, xuất khẩu đi EU.',
      pricePerUnit: 65000,
      unit: ProductUnit.KG,
      availableQuantity: 800,
      minOrderQuantity: 10,
      variety: 'Da xanh',
      farmingType: FarmingType.VIETGAP,
      status: ProductStatus.PENDING_APPROVAL,
      primaryImageUrl: APPROVED_D3_PRIMARY_IMAGE_URLS[5],
    },
  ];

  return mockProducts;
}

export async function reconcileProductDevelopmentSeeds(
  writer: ProductDevSeedWriter,
  records: readonly ProductDevSeedDefinition[],
  primaryImageUrl: string = PRODUCT_DEV_PRIMARY_IMAGE_URL,
): Promise<ReadonlyMap<string, string>> {
  const inputSkus = new Set<string>();
  for (const record of records) {
    if (inputSkus.has(record.sku)) {
      throw new Error(
        `products.dev.products declares duplicate Product SKU ${record.sku}`,
      );
    }
    inputSkus.add(record.sku);
  }

  const productPreflight = await Promise.all(
    records.map(async (record) => ({
      record,
      matches: await writer.findProductsBySku(record.sku),
    })),
  );
  for (const { record, matches } of productPreflight) {
    if (matches.length > 1) {
      throw new Error(
        `products.dev.products found multiple Products for SKU ${record.sku}`,
      );
    }
  }

  const productIds = new Map<string, string>();
  for (const { record, matches } of productPreflight) {
    const { primaryImageUrl: _declaredImage, ...productData } = record;
    let productId: string;
    if (matches.length === 1) {
      await writer.updateProduct(matches[0].id, productData);
      productId = matches[0].id;
    } else {
      productId = (await writer.createProduct(productData)).id;
    }
    productIds.set(record.sku, productId);
  }

  const imagePreflight: Array<{
    readonly record: ProductDevSeedDefinition;
    readonly productId: string;
    readonly intendedImageUrl: string;
    readonly primaryImages: readonly ProductDevPrimaryImageRecord[];
  }> = [];
  for (const record of records) {
    const intendedImageUrl =
      record.primaryImageUrl === undefined
        ? primaryImageUrl
        : record.primaryImageUrl;
    if (intendedImageUrl === null) continue;

    const productId = productIds.get(record.sku);
    if (!productId) {
      throw new Error(
        `products.dev.products missing reconciled Product ID for SKU ${record.sku}`,
      );
    }
    const primaryImages = await writer.findPrimaryImages(productId);
    if (primaryImages.length > 1) {
      throw new Error(
        `products.dev.products found multiple primary images for SKU ${record.sku}`,
      );
    }
    imagePreflight.push({
      record,
      productId,
      intendedImageUrl,
      primaryImages,
    });
  }

  for (const {
    record,
    productId,
    intendedImageUrl,
    primaryImages,
  } of imagePreflight) {
    const imageData: ProductDevPrimaryImageWriteData = {
      productId,
      imageUrl: intendedImageUrl,
      altText: record.name,
      sortOrder: 0,
      isPrimary: true,
    };
    if (primaryImages.length === 1) {
      await writer.updatePrimaryImage(primaryImages[0].id, imageData);
    } else {
      await writer.createPrimaryImage(imageData);
    }
  }

  return productIds;
}

export function buildProductDevelopmentCertificationData(): readonly ProductDevCertificationDefinition[] {
  const shared = {
    certType: CertType.VIETGAP,
    issuedBy: 'Bộ NN&PTNT',
    issuedDate: new Date('2025-01-01'),
    expiryDate: new Date('2027-01-01'),
    documentUrl:
      'https://placehold.co/600x400/E8F5E9/1B5E20?text=Chung+nhan+VietGAP',
    isVerified: true as const,
    status: CertificationStatus.VERIFIED as const,
  };
  return [
    {
      ...shared,
      productSku: 'DEV-XOAI-HOA-LOC-001',
      certNumber: 'DEV-CERT-VIETGAP-XOAI-HOA-LOC-001',
    },
    {
      ...shared,
      productSku: 'DEV-THANH-LONG-RUOT-DO-001',
      certNumber: 'DEV-CERT-VIETGAP-THANH-LONG-001',
    },
    {
      ...shared,
      productSku: 'DEV-VAI-THIEU-LUC-NGAN-001',
      certNumber: 'DEV-CERT-VIETGAP-VAI-LUC-NGAN-001',
    },
    {
      ...shared,
      productSku: 'DEV-GAO-JASMINE-THOM-001',
      certNumber: 'DEV-CERT-VIETGAP-GAO-JASMINE-001',
    },
  ];
}

export async function reconcileProductDevelopmentCertifications(
  writer: ProductDevSeedWriter,
  productIds: ReadonlyMap<string, string>,
  definitions: readonly ProductDevCertificationDefinition[] = buildProductDevelopmentCertificationData(),
): Promise<void> {
  const identities = new Set<string>();
  const preflight: Array<{
    readonly matches: readonly ProductDevCertificationRecord[];
    readonly data: ProductDevCertificationWriteData;
  }> = [];

  for (const definition of definitions) {
    const productId = productIds.get(definition.productSku);
    if (!productId) {
      throw new Error(
        `products.dev.products missing Product ID for certification SKU ${definition.productSku}`,
      );
    }
    const identity = `${productId}\u0000${definition.certNumber}`;
    if (identities.has(identity)) {
      throw new Error(
        `products.dev.products declares duplicate certification ${definition.certNumber} for SKU ${definition.productSku}`,
      );
    }
    identities.add(identity);

    const { productSku: _productSku, ...certification } = definition;
    const data: ProductDevCertificationWriteData = {
      productId,
      ...certification,
    };
    const matches = await writer.findCertifications(
      productId,
      definition.certNumber,
    );
    if (matches.length > 1) {
      throw new Error(
        `products.dev.products found multiple certifications for SKU ${definition.productSku} and number ${definition.certNumber}`,
      );
    }
    preflight.push({ matches, data });
  }

  for (const { matches, data } of preflight) {
    if (matches.length === 1) {
      await writer.updateCertification(matches[0].id, data);
    } else {
      await writer.createCertification(data);
    }
  }
}

@Injectable()
export class ProductDevelopmentSeedService implements SeedGroup {
  readonly metadata = PRODUCTS_DEV_SEED_METADATA;

  constructor(
    @Inject(PRODUCT_DEV_SEED_WRITER)
    private readonly writer: ProductDevSeedWriter,
  ) {}

  async execute(context: SeedExecutionContext): Promise<SeedGroupResult> {
    if (!context.classifications.includes(SeedClassification.DEV)) {
      throw new Error(`${this.metadata.id} requires explicit DEV selection`);
    }

    const productIds = await reconcileProductDevelopmentSeeds(
      this.writer,
      buildProductDevelopmentSeedData(context),
    );
    await reconcileProductDevelopmentCertifications(this.writer, productIds);
    return {
      outputs: [...productIds].map(([key, value]) => ({
        kind: PRODUCT_ID_BY_SKU_OUTPUT_KIND,
        key,
        value,
      })),
    };
  }
}
