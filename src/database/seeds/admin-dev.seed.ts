/**
 * Admin dev seed — chạy trực tiếp:
 *   npx ts-node src/database/seeds/seed.ts
 * hoặc:
 *   npx ts-node -r tsconfig-paths/register src/database/seeds/admin-dev.seed.ts
 *
 * Tạo data giả giống thật để test admin dashboard:
 *   - dùng 9 User IDs từ owner SeedGroup users.dev.users
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
import { ProductStatus, SellerType, ProductUnit, FarmingType } from "../../common/enums";
import * as dotenv from "dotenv";
import { parseDatabaseEnvironment } from "../../config/database-environment";
import {
  SeedClassification,
  SeedGroupResult,
  VerifiedSeedExecutionTarget,
} from "./framework/seed-contract";
import {
  SeedOutputRegistry,
  validateSeedGroupResult,
} from "./framework/seed-dependency-outputs";
import { assertSeedExecutionSafety } from "./framework/seed-environment.guard";
import {
  USER_ID_BY_EMAIL_OUTPUT_KIND,
  USERS_DEV_SEED_GROUP_ID,
} from "../../modules/users/application/contracts/user-seed-output.contract";
import { createUsersDevSeedGroup } from "../../modules/users/infrastructure/database/seeds/user.seed";
import { createProfilesRoleProfilesDevSeedGroup } from "../../modules/profiles/infrastructure/database/seeds/typeorm-profile-role-development-seed.writer";

dotenv.config();

export const ADMIN_DEV_USER_EMAILS = [
  "admin@agrilink.vn",
  "hung.nv@farm.vn",
  "mai.lt@farm.vn",
  "tuan.pq@farm.vn",
  "htx.dalat@coop.vn",
  "htx.tiengiang@coop.vn",
  "xnk.mekong@ent.vn",
  "agri.tech@ent.vn",
  "phanbon.xanh@sup.vn",
] as const;

export type AdminDevUserEmail = (typeof ADMIN_DEV_USER_EMAILS)[number];
export interface AdminDevResolvedUserId {
  readonly id: string;
}
export type AdminDevUserIds = Readonly<
  Record<AdminDevUserEmail, AdminDevResolvedUserId>
>;

export function resolveAdminDevUserIds(
  result: SeedGroupResult,
): AdminDevUserIds {
  const validated = validateSeedGroupResult(USERS_DEV_SEED_GROUP_ID, result);
  const userIdsByEmail = new Map(
    validated.outputs
      .filter(({ kind }) => kind === USER_ID_BY_EMAIL_OUTPUT_KIND)
      .map(({ key, value }) => [key, value] as const),
  );

  return Object.fromEntries(
    ADMIN_DEV_USER_EMAILS.map((email) => {
      const userId = userIdsByEmail.get(email);
      if (typeof userId !== "string") {
        throw new Error(
          `MISSING_REQUIRED_OUTPUT: ${USERS_DEV_SEED_GROUP_ID}/${USER_ID_BY_EMAIL_OUTPUT_KIND}/${email}`,
        );
      }
      return [email, Object.freeze({ id: userId })];
    }),
  ) as AdminDevUserIds;
}

export async function executeAdminDevOwnerGroups(
  ds: DataSource,
  safeTarget: VerifiedSeedExecutionTarget,
): Promise<AdminDevUserIds> {
  const outputRegistry = new SeedOutputRegistry();
  const usersGroup = createUsersDevSeedGroup(ds);
  const usersResult = await usersGroup.execute({
    ...safeTarget,
    dependencies: outputRegistry.viewFor(usersGroup.metadata),
  });
  outputRegistry.register(usersGroup.metadata.id, usersResult);

  const profilesGroup = createProfilesRoleProfilesDevSeedGroup(ds);
  const profilesResult = await profilesGroup.execute({
    ...safeTarget,
    dependencies: outputRegistry.viewFor(profilesGroup.metadata),
  });
  outputRegistry.register(profilesGroup.metadata.id, profilesResult);

  return resolveAdminDevUserIds(usersResult);
}

export async function seedAdminDevData(
  ds: DataSource,
  users: AdminDevUserIds,
): Promise<void> {
  assertSeedExecutionSafety({
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      DB_NAME: ds.options.database,
    },
    classifications: [SeedClassification.DEV],
  });

  const productRepo = ds.getRepository(Product);
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
  console.log("   📋 8 profiles via profiles.dev.role-profiles");
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
    .then(async (ds) => {
      const users = await executeAdminDevOwnerGroups(ds, safeTarget);
      await seedAdminDevData(ds, users);
    })
    .then(() => { console.log("Done!"); process.exit(0); })
    .catch((e) => { console.error(e); process.exit(1); });
}
