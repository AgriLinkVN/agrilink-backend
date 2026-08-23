/**
 * Admin dev seed — chạy trực tiếp:
 *   npx ts-node src/database/seeds/seed.ts
 * hoặc:
 *   npx ts-node -r tsconfig-paths/register src/database/seeds/admin-dev.seed.ts
 *
 * Temporary P8-05D transition entrypoint. Business persistence is delegated to
 * the canonical Users, Profiles, Product Categories, and Products SeedGroups.
 */
import { DataSource } from "typeorm";
import { User } from "../entities/user.entity";
import { FarmerProfile } from "../../modules/profiles/infrastructure/persistence/entities/farmer-profile.entity";
import { CooperativeProfile } from "../../modules/profiles/infrastructure/persistence/entities/cooperative-profile.entity";
import { EnterpriseProfile } from "../../modules/profiles/infrastructure/persistence/entities/enterprise-profile.entity";
import { SupplierProfile } from "../../modules/profiles/infrastructure/persistence/entities/supplier-profile.entity";
import { Product } from "../../modules/products/infrastructure/persistence/entities/product.entity";
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
import { createProductsCategoryReferenceSeedGroup } from "../../modules/products/infrastructure/database/seeds/product-category.seed";
import { createProductDevelopmentSeedGroup } from "../../modules/products/infrastructure/database/seeds/typeorm-product-dev-seed.writer";

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

  const categoriesGroup = createProductsCategoryReferenceSeedGroup(ds);
  const categoriesResult = await categoriesGroup.execute({
    ...safeTarget,
    classifications: [SeedClassification.REFERENCE],
    dependencies: outputRegistry.viewFor(categoriesGroup.metadata),
  });
  outputRegistry.register(categoriesGroup.metadata.id, categoriesResult);

  const productsGroup = createProductDevelopmentSeedGroup(ds);
  const productsResult = await productsGroup.execute({
    ...safeTarget,
    dependencies: outputRegistry.viewFor(productsGroup.metadata),
  });
  outputRegistry.register(productsGroup.metadata.id, productsResult);

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

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✅ Admin dev owner groups completed successfully!");
  console.log(`   👤 ${Object.keys(users).length} users via users.dev.users`);
  console.log("   📋 8 profiles via profiles.dev.role-profiles");
  console.log(
    "   📦 69 products and 67 primary images via products.dev.products",
  );
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
  const {
    ProductCategory,
  } = require("../../modules/products/infrastructure/persistence/entities/product-category.entity");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const {
    ProductImage,
  } = require("../../modules/products/infrastructure/persistence/entities/product-image.entity");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const {
    ProductCertification,
  } = require("../../modules/products/infrastructure/persistence/entities/product-certification.entity");

  const ds = new DataSource({
    type: "postgres",
    host: database.host,
    port: database.port,
    database: database.database,
    username: database.username,
    password: database.password,
    schema: database.schema,
    entities: [
      User,
      FarmerProfile,
      CooperativeProfile,
      EnterpriseProfile,
      SupplierProfile,
      Product,
      ProductCategory,
      ProductImage,
      ProductCertification,
    ],
    synchronize: false,
  });

  ds.initialize()
    .then(async (initializedDataSource) => {
      const users = await executeAdminDevOwnerGroups(
        initializedDataSource,
        safeTarget,
      );
      await seedAdminDevData(initializedDataSource, users);
    })
    .then(() => {
      console.log("Done!");
      process.exit(0);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
