/**
 * Admin dev seed — chạy trực tiếp:
 *   npx ts-node src/database/seeds/seed.ts
 * hoặc:
 *   npx ts-node -r tsconfig-paths/register src/database/seeds/admin-dev.seed.ts
 *
 * Tạo data giả giống thật để test admin dashboard:
 *   - 8 user mới (farmer, cooperative, enterprise, supplier)
 *   - 8 hồ sơ KYC chờ duyệt (CCCD, GPKD)
 *   - 10 sản phẩm chờ duyệt / bị từ chối
 */
import { DataSource } from "typeorm";
import { User } from "../entities/user.entity";
import { FarmerProfile } from "../../modules/profiles/infrastructure/persistence/entities/farmer-profile.entity";
import { CooperativeProfile } from "../../modules/profiles/infrastructure/persistence/entities/cooperative-profile.entity";
import { EnterpriseProfile } from "../../modules/profiles/infrastructure/persistence/entities/enterprise-profile.entity";
import { SupplierProfile } from "../../modules/profiles/infrastructure/persistence/entities/supplier-profile.entity";
import { Product } from "../../modules/products/infrastructure/persistence/entities/product.entity";
import { UserRole, UserStatus, ProductStatus, SellerType, ProductUnit, FarmingType } from "../../common/enums";
import * as bcrypt from "bcryptjs";
import * as dotenv from "dotenv";
import { parseDatabaseEnvironment } from "../../config/database-environment";
import { SeedClassification } from "./framework/seed-contract";
import { assertSeedExecutionSafety } from "./framework/seed-environment.guard";

dotenv.config();

export async function seedAdminDevData(ds: DataSource): Promise<void> {
  assertSeedExecutionSafety({
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      DB_NAME: ds.options.database,
    },
    classifications: [SeedClassification.DEV],
  });

  const userRepo = ds.getRepository(User);
  const farmerRepo = ds.getRepository(FarmerProfile);
  const coopRepo = ds.getRepository(CooperativeProfile);
  const enterpriseRepo = ds.getRepository(EnterpriseProfile);
  const supplierRepo = ds.getRepository(SupplierProfile);
  const productRepo = ds.getRepository(Product);
  const hash = await bcrypt.hash("demo123", 10);

  // ─── Users (realistic Vietnamese) ──────────────────────────────
  const userDefs = [
    { email: "admin@agrilink.vn", phone: "0909999999", fullName: "Admin AgriLink", role: UserRole.ADMIN },
    { email: "hung.nv@farm.vn", phone: "0912345678", fullName: "Nguyễn Văn Hùng", role: UserRole.FARMER },
    { email: "mai.lt@farm.vn", phone: "0912345679", fullName: "Lê Thị Mai", role: UserRole.FARMER },
    { email: "tuan.pq@farm.vn", phone: "0912345680", fullName: "Phạm Quang Tuấn", role: UserRole.FARMER },
    { email: "htx.dalat@coop.vn", phone: "0912345681", fullName: "HTX Rau Sạch Đà Lạt", role: UserRole.COOPERATIVE },
    { email: "htx.tiengiang@coop.vn", phone: "0912345682", fullName: "HTX Trái Cây Tiền Giang", role: UserRole.COOPERATIVE },
    { email: "xnk.mekong@ent.vn", phone: "0912345683", fullName: "Công ty TNHH XNK Nông Sản Mekong", role: UserRole.ENTERPRISE },
    { email: "agri.tech@ent.vn", phone: "0912345684", fullName: "Công ty CP Công Nghệ Nông Nghiệp Xanh", role: UserRole.ENTERPRISE },
    { email: "phanbon.xanh@sup.vn", phone: "0912345685", fullName: "Công ty TNHH Phân Bón Xanh Việt", role: UserRole.SUPPLIER },
  ];

  const users: Record<string, User> = {};
  for (const def of userDefs) {
    let u = await userRepo.findOne({ where: { email: def.email } });
    if (!u) {
      u = userRepo.create({ ...def, passwordHash: hash, status: UserStatus.ACTIVE });
      u = await userRepo.save(u);
    }
    users[def.email] = u;
  }

  // ─── Farmer profiles (CCCD chờ KYC) ────────────────────────────
  const farmerProfiles = [
    { userId: users["hung.nv@farm.vn"].id, cccdNumber: "079202012345", cccdFrontUrl: "https://res.cloudinary.com/personal-media/image/upload/agrilink/profiles/cccd-front-hung.jpg", cccdBackUrl: "https://res.cloudinary.com/personal-media/image/upload/agrilink/profiles/cccd-back-hung.jpg", residenceAddress: "Ấp Bắc, xã Hòa Hưng, huyện Cái Bè", ward: "Xã Hòa Hưng", provinceId: 1, districtId: 101, isKycVerified: false },
    { userId: users["mai.lt@farm.vn"].id, cccdNumber: "079202154321", cccdFrontUrl: "https://res.cloudinary.com/personal-media/image/upload/agrilink/profiles/cccd-front-mai.jpg", cccdBackUrl: "https://res.cloudinary.com/personal-media/image/upload/agrilink/profiles/cccd-back-mai.jpg", residenceAddress: "Thôn 3, xã Lộc An, TP Bảo Lộc", ward: "Xã Lộc An", provinceId: 2, districtId: 201, isKycVerified: false },
    { userId: users["tuan.pq@farm.vn"].id, cccdNumber: "079202198765", cccdFrontUrl: "https://res.cloudinary.com/personal-media/image/upload/agrilink/profiles/cccd-front-tuan.jpg", cccdBackUrl: "https://res.cloudinary.com/personal-media/image/upload/agrilink/profiles/cccd-back-tuan.jpg", residenceAddress: "Xóm 5, xã Hải Hậu, huyện Hải Hậu", ward: "Xã Hải Hậu", provinceId: 3, districtId: 301, isKycVerified: false },
  ];

  for (const fp of farmerProfiles) {
    const exist = await farmerRepo.findOne({ where: { userId: fp.userId } });
    if (!exist) await farmerRepo.save(farmerRepo.create(fp));
  }

  // ─── Cooperative profiles (chờ duyệt HTX) ──────────────────────
  const coopProfiles = [
    { userId: users["htx.dalat@coop.vn"].id, cooperativeName: "HTX Rau Sạch Đà Lạt", businessLicenseNumber: "GPKD-68H8-001", taxCode: "5800123456", cooperativeCertUrl: "https://res.cloudinary.com/personal-media/image/upload/agrilink/profiles/gpkd-dalat.jpg", representativeName: "Trần Văn Minh", representativePhone: "0988123456", representativeCccd: "068202012345", address: "45 Nguyễn Văn Cừ, Phường 1, TP Đà Lạt, Lâm Đồng", provinceId: 2, isVerified: false },
    { userId: users["htx.tiengiang@coop.vn"].id, cooperativeName: "HTX Trái Cây Tiền Giang", businessLicenseNumber: "GPKD-82T5-002", taxCode: "1200987654", cooperativeCertUrl: "https://res.cloudinary.com/personal-media/image/upload/agrilink/profiles/gpkd-tiengiang.jpg", representativeName: "Phạm Thị Lan", representativePhone: "0988123457", representativeCccd: "082202065432", address: "12 Lê Lợi, Phường 4, TP Mỹ Tho, Tiền Giang", provinceId: 1, isVerified: false },
  ];

  for (const cp of coopProfiles) {
    const exist = await coopRepo.findOne({ where: { userId: cp.userId } });
    if (!exist) await coopRepo.save(coopRepo.create(cp));
  }

  // ─── Enterprise profiles (chờ duyệt DN) ────────────────────────
  const enterpriseProfiles = [
    { userId: users["xnk.mekong@ent.vn"].id, companyName: "Công ty TNHH XNK Nông Sản Mekong", taxCode: "0312345678", businessLicenseUrl: "https://res.cloudinary.com/personal-media/image/upload/agrilink/profiles/gpkd-mekong.jpg", representativeName: "Nguyễn Hoàng Nam", representativePhone: "0977123456", address: "88 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP Hồ Chí Minh", provinceId: 3, isVerified: false },
    { userId: users["agri.tech@ent.vn"].id, companyName: "Công ty CP Công Nghệ Nông Nghiệp Xanh", taxCode: "0102765432", businessLicenseUrl: "https://res.cloudinary.com/personal-media/image/upload/agrilink/profiles/gpkd-agritech.jpg", representativeName: "Đỗ Thanh Hà", representativePhone: "0977123457", address: "Tầng 5, Tòa nhà TechnoPark, Cầu Giấy, Hà Nội", provinceId: 3, isVerified: false },
  ];

  for (const ep of enterpriseProfiles) {
    const exist = await enterpriseRepo.findOne({ where: { userId: ep.userId } });
    if (!exist) await enterpriseRepo.save(enterpriseRepo.create(ep));
  }

  // ─── Supplier profile (chờ duyệt NCC) ──────────────────────────
  const spExist = await supplierRepo.findOne({ where: { userId: users["phanbon.xanh@sup.vn"].id } });
  if (!spExist) {
    await supplierRepo.save(supplierRepo.create({
      userId: users["phanbon.xanh@sup.vn"].id,
      companyName: "Công ty TNHH Phân Bón Xanh Việt",
      supplierType: "fertilizer" as any,
      taxCode: "0302123456",
      businessLicenseUrl: "https://res.cloudinary.com/personal-media/image/upload/agrilink/profiles/gpkd-phanbon.jpg",
      address: "KCN Tân Tạo, Bình Tân, TP Hồ Chí Minh",
      provinceId: 3,
      isVerified: false,
    }));
  }

  // ─── Products (chờ duyệt + bị từ chối) ──────────────────────────
  const productDefs = [
    { sellerId: users["hung.nv@farm.vn"].id, sellerType: SellerType.FARMER, name: "Xoài cát Hòa Lộc loại 1", description: "Xoài chín cây, ngọt thanh, không thuốc trừ sâu. Đóng gói 5kg/thùng.", pricePerUnit: 45000, unit: ProductUnit.KG, availableQuantity: 500, minOrderQuantity: 10, variety: "Hòa Lộc", farmingType: FarmingType.VIETGAP, status: ProductStatus.PENDING_APPROVAL },
    { sellerId: users["mai.lt@farm.vn"].id, sellerType: SellerType.FARMER, name: "Rau xà lách thủy canh", description: "Xà lách trồng trong nhà kính, sạch, giòn, không thuốc bảo vệ thực vật.", pricePerUnit: 25000, unit: ProductUnit.KG, availableQuantity: 200, minOrderQuantity: 5, variety: "Xà lách Mỹ", farmingType: FarmingType.ORGANIC, status: ProductStatus.PENDING_APPROVAL },
    { sellerId: users["tuan.pq@farm.vn"].id, sellerType: SellerType.FARMER, name: "Dưa lưới giống Nhật", description: "Dưa lưới trồng theo tiêu chuẩn GlobalGAP, vị ngọt đậm, mọng nước.", pricePerUnit: 85000, unit: ProductUnit.KG, availableQuantity: 150, minOrderQuantity: 2, variety: "Nhật Bản", farmingType: FarmingType.GLOBALGAP, status: ProductStatus.PENDING_APPROVAL },
    { sellerId: users["htx.dalat@coop.vn"].id, sellerType: SellerType.COOPERATIVE, name: "Gạo ST25 Sóc Trăng", description: "Gạo thơm đặc sản, đạt chuẩn xuất khẩu. Đóng bao 5kg.", pricePerUnit: 35000, unit: ProductUnit.KG, availableQuantity: 2000, minOrderQuantity: 20, variety: "ST25", farmingType: FarmingType.VIETGAP, status: ProductStatus.PENDING_APPROVAL },
    { sellerId: users["htx.dalat@coop.vn"].id, sellerType: SellerType.COOPERATIVE, name: "Rau cải bó xôi hữu cơ", description: "Cải bó xôi organic Đà Lạt, thu hoạch trong ngày, giao tận nơi.", pricePerUnit: 32000, unit: ProductUnit.KG, availableQuantity: 300, minOrderQuantity: 5, variety: "Bó xôi", farmingType: FarmingType.ORGANIC, status: ProductStatus.PENDING_APPROVAL },
    { sellerId: users["htx.tiengiang@coop.vn"].id, sellerType: SellerType.COOPERATIVE, name: "Bưởi da xanh Bến Tre", description: "Bưởi da xanh chính hiệu, ngọt mát, mọng nước, xuất khẩu đi EU.", pricePerUnit: 65000, unit: ProductUnit.KG, availableQuantity: 800, minOrderQuantity: 10, variety: "Da xanh", farmingType: FarmingType.VIETGAP, status: ProductStatus.PENDING_APPROVAL },
    { sellerId: users["xnk.mekong@ent.vn"].id, sellerType: SellerType.SUPPLIER, name: "Gạo lứt hữu cơ xuất khẩu", description: "Gạo lứt organic, đóng gói chân không 2kg, xuất khẩu EU và Nhật.", pricePerUnit: 55000, unit: ProductUnit.KG, availableQuantity: 3000, minOrderQuantity: 50, variety: "Lứt đỏ", farmingType: FarmingType.ORGANIC, status: ProductStatus.PENDING_APPROVAL },
    { sellerId: users["agri.tech@ent.vn"].id, sellerType: SellerType.SUPPLIER, name: "Cà phê robusta Buôn Ma Thuột", description: "Cà phê nhân xanh, sơ chế ướt, đạt chuẩn 4C, xuất khẩu châu Âu.", pricePerUnit: 120000, unit: ProductUnit.KG, availableQuantity: 5000, minOrderQuantity: 100, variety: "Robusta", farmingType: FarmingType.GLOBALGAP, status: ProductStatus.PENDING_APPROVAL },
    { sellerId: users["phanbon.xanh@sup.vn"].id, sellerType: SellerType.SUPPLIER, name: "Phân bón hữu cơ vi sinh Trichoderma", description: "Phân bón vi sinh đối kháng nấm bệnh, dùng cho rau màu và cây ăn trái.", pricePerUnit: 85000, unit: ProductUnit.KG, availableQuantity: 2000, minOrderQuantity: 25, status: ProductStatus.PENDING_APPROVAL },
    { sellerId: users["phanbon.xanh@sup.vn"].id, sellerType: SellerType.SUPPLIER, name: "Chế phẩm sinh học EM gốc", description: "EM gốc (Effective Microorganisms) — xử lý đất, ủ phân, khử mùi chuồng trại.", pricePerUnit: 150000, unit: ProductUnit.KG, availableQuantity: 500, minOrderQuantity: 5, status: ProductStatus.REJECTED, rejectionReason: "Thiếu giấy chứng nhận lưu hành sản phẩm của Cục Bảo vệ Thực vật" },
  ];

  for (const pd of productDefs) {
    const exist = await productRepo.findOne({ where: { name: pd.name, sellerId: pd.sellerId } });
    if (!exist) await productRepo.save(productRepo.create(pd));
  }

  // ─── Product images (each product gets 1 primary image) ──────────
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  let ProductImage: any;
  try {
    ProductImage = require("../../modules/products/infrastructure/persistence/entities/product-image.entity").ProductImage;
  } catch { /* not available in standalone mode */ }

  if (ProductImage) {
    const imageRepo = ds.getRepository(ProductImage);
    const placeholderImages: Record<string, string> = {
      "Xoài cát Hòa Lộc loại 1": "https://res.cloudinary.com/personal-media/image/upload/c_fill,w_800,h_800/agrilink/products/xoai-cat-hoa-loc.jpg",
      "Rau xà lách thủy canh": "https://res.cloudinary.com/personal-media/image/upload/c_fill,w_800,h_800/agrilink/products/xa-lach-thuy-canh.jpg",
      "Dưa lưới giống Nhật": "https://res.cloudinary.com/personal-media/image/upload/c_fill,w_800,h_800/agrilink/products/dua-luoi-nhat.jpg",
      "Gạo ST25 Sóc Trăng": "https://res.cloudinary.com/personal-media/image/upload/c_fill,w_800,h_800/agrilink/products/gao-st25.jpg",
      "Rau cải bó xôi hữu cơ": "https://res.cloudinary.com/personal-media/image/upload/c_fill,w_800,h_800/agrilink/products/cai-bo-xoi.jpg",
      "Bưởi da xanh Bến Tre": "https://res.cloudinary.com/personal-media/image/upload/c_fill,w_800,h_800/agrilink/products/buoi-da-xanh.jpg",
      "Gạo lứt hữu cơ xuất khẩu": "https://res.cloudinary.com/personal-media/image/upload/c_fill,w_800,h_800/agrilink/products/gao-lut.jpg",
      "Cà phê robusta Buôn Ma Thuột": "https://res.cloudinary.com/personal-media/image/upload/c_fill,w_800,h_800/agrilink/products/ca-phe-robusta.jpg",
      "Phân bón hữu cơ vi sinh Trichoderma": "https://res.cloudinary.com/personal-media/image/upload/c_fill,w_800,h_800/agrilink/products/phan-bon.jpg",
      "Chế phẩm sinh học EM gốc": "https://res.cloudinary.com/personal-media/image/upload/c_fill,w_800,h_800/agrilink/products/che-pham-em.jpg",
    };

    for (const pd of productDefs) {
      const product = await productRepo.findOne({ where: { name: pd.name, sellerId: pd.sellerId } });
      if (!product) continue;
      const existImg = await imageRepo.findOne({ where: { productId: product.id } });
      if (!existImg && placeholderImages[pd.name]) {
        await imageRepo.save(imageRepo.create({
          productId: product.id,
          imageUrl: placeholderImages[pd.name],
          isPrimary: true,
          sortOrder: 0,
        }));
      }
    }
  }

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✅ Admin dev data seeded successfully!");
  console.log(`   👤 ${Object.keys(users).length} users (admin@agrilink.vn / demo123)`);
  console.log(`   📋 ${farmerProfiles.length} farmer profiles (pending KYC)`);
  console.log(`   🏢 ${coopProfiles.length} cooperative profiles (pending)`);
  console.log(`   🏭 ${enterpriseProfiles.length} enterprise profiles (pending)`);
  console.log(`   🚛 1 supplier profile (pending)`);
  console.log(`   📦 ${productDefs.length} products with images`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

// ─── Run directly if called as script ───────────────────────────
if (require.main === module) {
  const safeTarget = assertSeedExecutionSafety({
    environment: process.env,
    classifications: [SeedClassification.DEV],
  });
  const database = parseDatabaseEnvironment(process.env);
  if (database.database !== safeTarget.databaseName) {
    throw new Error("Seed safety target does not match database configuration");
  }

  // Lazy imports for CLI — only loaded when running standalone
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { ProductCategory } = require("../../modules/products/infrastructure/persistence/entities/product-category.entity");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { ProductImage } = require("../../modules/products/infrastructure/persistence/entities/product-image.entity");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { ProductCertification } = require("../../modules/products/infrastructure/persistence/entities/product-certification.entity");

  const ds = new DataSource({
    type: "postgres",
    host: database.host,
    port: database.port,
    database: database.database,
    username: database.username,
    password: database.password,
    schema: database.schema,
    entities: [User, FarmerProfile, CooperativeProfile, EnterpriseProfile, SupplierProfile, Product, ProductCategory, ProductImage, ProductCertification],
    synchronize: false,
  });

  ds.initialize()
    .then((ds) => seedAdminDevData(ds))
    .then(() => { console.log("Done!"); process.exit(0); })
    .catch((e) => { console.error(e); process.exit(1); });
}
