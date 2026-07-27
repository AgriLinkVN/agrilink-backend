import { createHash } from "crypto";
import { INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from "@nestjs/swagger";
import { DataSource, Logger } from "typeorm";
import { AuditLog } from "../../modules/admin/entities/audit-log.entity";
import { SystemConfig } from "../../modules/admin/entities/system-config.entity";
import { AdCampaign } from "../../modules/ads/infrastructure/persistence/entities/ad-campaign.entity";
import { AdEvent } from "../../modules/ads/infrastructure/persistence/entities/ad-event.entity";
import { AdPackage } from "../../modules/ads/infrastructure/persistence/entities/ad-package.entity";
import { TypeOrmAdsRepository } from "../../modules/ads/infrastructure/persistence/repositories/typeorm-ads.repository";
import { District } from "../../modules/geography/entities/district.entity";
import { Province } from "../../modules/geography/entities/province.entity";
import { GeographyService } from "../../modules/geography/geography.service";
import { NotificationOrmEntity } from "../../modules/notifications/infrastructure/persistence/notification.orm-entity";
import { TypeOrmNotificationRepository } from "../../modules/notifications/infrastructure/repositories/typeorm-notification.repository";
import { ProductCategory } from "../../modules/products/infrastructure/persistence/entities/product-category.entity";
import { ProductCertification } from "../../modules/products/infrastructure/persistence/entities/product-certification.entity";
import { ProductImage } from "../../modules/products/infrastructure/persistence/entities/product-image.entity";
import { Product } from "../../modules/products/infrastructure/persistence/entities/product.entity";
import { Wishlist } from "../../modules/products/infrastructure/persistence/entities/wishlist.entity";
import { TypeOrmProductRepository } from "../../modules/products/infrastructure/repositories/typeorm-product.repository";
import { ProfilesService } from "../../modules/profiles/profiles.service";
import { Review } from "../../modules/reviews/infrastructure/persistence/entities/review.entity";
import { TypeOrmReviewsRepository } from "../../modules/reviews/infrastructure/persistence/repositories/typeorm-reviews.repository";
import { StoredFileAccessPort } from "../../modules/storage/application/ports/inbound/stored-file-access.port";
import { StoredFileEntity } from "../../modules/storage/infrastructure/persistence/stored-file.entity";
import { CooperativeProfile } from "../../modules/profiles/infrastructure/persistence/entities/cooperative-profile.entity";
import { EnterpriseProfile } from "../../modules/profiles/infrastructure/persistence/entities/enterprise-profile.entity";
import { FarmerProfile } from "../../modules/profiles/infrastructure/persistence/entities/farmer-profile.entity";
import { SupplierProfile } from "../../modules/profiles/infrastructure/persistence/entities/supplier-profile.entity";

const USER_ID = "10000000-0000-4000-8000-000000000001";
const PRODUCT_ID = "20000000-0000-4000-8000-000000000001";
const CATEGORY_ID = "30000000-0000-4000-8000-000000000001";

export interface RuntimeBaseline {
  smoke: Record<string, boolean>;
  queryCounts: Record<string, number>;
  knownLimitations: Record<string, string>;
}

export interface OpenApiBaseline {
  fingerprint: string;
  pathCount: number;
  operationCount: number;
  snapshot: {
    paths: OpenAPIObject["paths"];
    components: OpenAPIObject["components"];
  };
}

class QueryCounter implements Logger {
  count = 0;

  reset(): void {
    this.count = 0;
  }

  logQuery(): void {
    this.count += 1;
  }

  logQueryError(): void {}
  logQuerySlow(): void {}
  logSchemaBuild(): void {}
  logMigration(): void {}
  log(): void {}
}

export async function captureRuntimeBaseline(
  dataSource: DataSource,
): Promise<RuntimeBaseline> {
  await seedRuntimeFixture(dataSource);
  const counter = new QueryCounter();
  dataSource.logger = counter;

  const products = new TypeOrmProductRepository(
    dataSource.getRepository(Product),
    dataSource.getRepository(ProductImage),
    dataSource.getRepository(ProductCertification),
    dataSource.getRepository(ProductCategory),
    dataSource.getRepository(Wishlist),
    dataSource,
  );
  const reviews = new TypeOrmReviewsRepository(
    dataSource.getRepository(Review),
    dataSource.getRepository(Product),
  );
  const notifications = new TypeOrmNotificationRepository(
    dataSource.getRepository(NotificationOrmEntity),
  );
  const geography = new GeographyService(
    dataSource.getRepository(Province),
    dataSource.getRepository(District),
  );
  const ads = new TypeOrmAdsRepository(
    dataSource.getRepository(AdPackage),
    dataSource.getRepository(AdCampaign),
    dataSource.getRepository(AdEvent),
  );
  const profiles = createProfilesService(dataSource);

  const queryCounts: Record<string, number> = {};
  const productList = await countQueries(
    counter,
    "product-list",
    queryCounts,
    () => products.findAll({ page: 1, limit: 20 }),
  );
  const productDetail = await countQueries(
    counter,
    "product-detail",
    queryCounts,
    () => products.findOne(PRODUCT_ID),
  );
  const publicProfile = await countQueries(
    counter,
    "profile-public-read",
    queryCounts,
    () => profiles.getPublicFarmerProfile(USER_ID),
  );
  const pendingProfiles = await countQueries(
    counter,
    "admin-profile-persistence-queue",
    queryCounts,
    () => readPendingProfileQueues(dataSource),
  );
  const reviewList = await countQueries(
    counter,
    "review-list",
    queryCounts,
    () => reviews.findPublicByProduct(PRODUCT_ID, { page: 1, limit: 10 }),
  );
  const notificationList = await countQueries(
    counter,
    "notification-list",
    queryCounts,
    () => notifications.findAll(USER_ID, { page: 1, limit: 20 }),
  );
  await countQueries(counter, "geography-province-list", queryCounts, () =>
    geography.findAllProvinces(),
  );
  await countQueries(counter, "geography-district-list", queryCounts, () =>
    geography.findDistrictsByProvince("60000000-0000-4000-8000-000000000001"),
  );
  await countQueries(counter, "ads-package-list", queryCounts, () =>
    ads.findActivePackages(),
  );
  await countQueries(counter, "ads-banner-list", queryCounts, () =>
    ads.findActiveBanners(),
  );
  await countQueries(counter, "system-config-list", queryCounts, () =>
    dataSource.getRepository(SystemConfig).find({ order: { key: "ASC" } }),
  );
  await countQueries(counter, "audit-log-list", queryCounts, () =>
    dataSource.getRepository(AuditLog).findAndCount({
      order: { createdAt: "DESC" },
      skip: 0,
      take: 20,
    }),
  );
  const wishlistWrites = await Promise.all([
    products.addIfAbsent(USER_ID, PRODUCT_ID),
    products.addIfAbsent(USER_ID, PRODUCT_ID),
  ]);
  const [{ count: wishlistCount }] = (await dataSource.query(
    `
      SELECT COUNT(*)::integer AS count
      FROM "public"."wishlists"
      WHERE user_id = $1 AND product_id = $2
    `,
    [USER_ID, PRODUCT_ID],
  )) as Array<{ count: number }>;
  const smokeCounts = await readSmokeCounts(dataSource);

  return {
    smoke: {
      authIdentity: smokeCounts.users === 1,
      userRead: Boolean(productDetail?.seller),
      profileRead: Boolean(publicProfile),
      profileAdminPersistenceQueue: pendingProfiles.farmer === 1,
      productList: productList.total === 1,
      productDetail: productDetail?.id === PRODUCT_ID,
      wishlistConcurrentDuplicate:
        wishlistWrites.length === 2 && wishlistCount === 1,
      reviewList: reviewList.total === 1,
      notificationList: notificationList.total === 1,
      ads: smokeCounts.ad_campaigns === 1,
      forum: smokeCounts.forum_posts === 1,
      adminConfigIncident:
        smokeCounts.system_configs === 1 && smokeCounts.incident_reports === 1,
      geography: smokeCounts.provinces === 1 && smokeCounts.districts === 1,
      storage: smokeCounts.stored_files === 1,
      marketPricesExcluded: smokeCounts.market_prices === 0,
      traceabilityExcluded: smokeCounts.traceability_records === 0,
    },
    queryCounts,
    knownLimitations: {},
  };
}

export async function captureOpenApiBaseline(
  database: string,
): Promise<OpenApiBaseline> {
  setApplicationEnvironment(database);
  const { AppModule } = await import("../../app.module");
  const app = await NestFactory.create(AppModule, { logger: false });
  try {
    app.setGlobalPrefix("api/v1");
    const config = new DocumentBuilder()
      .setTitle("AgriLink Vietnam API")
      .setDescription("REST API for AgriLink")
      .setVersion("1.0")
      .addBearerAuth(
        {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          name: "Authorization",
          in: "header",
        },
        "access-token",
      )
      .build();
    const document = SwaggerModule.createDocument(app, config);
    const snapshot = {
      paths: document.paths,
      components: document.components,
    };
    const operationCount = Object.values(document.paths).reduce(
      (total, pathItem) =>
        total +
        Object.keys(pathItem ?? {}).filter((key) =>
          ["get", "post", "put", "patch", "delete", "options", "head"].includes(
            key,
          ),
        ).length,
      0,
    );
    return {
      fingerprint: createHash("sha256")
        .update(stableStringify(snapshot))
        .digest("hex"),
      pathCount: Object.keys(document.paths).length,
      operationCount,
      snapshot,
    };
  } finally {
    await closeApplication(app);
  }
}

async function countQueries<T>(
  counter: QueryCounter,
  name: string,
  counts: Record<string, number>,
  operation: () => Promise<T>,
): Promise<T> {
  counter.reset();
  const result = await operation();
  // Product detail intentionally increments its view counter asynchronously.
  await new Promise<void>((resolve) => setTimeout(resolve, 25));
  counts[name] = counter.count;
  return result;
}

async function seedRuntimeFixture(dataSource: DataSource): Promise<void> {
  await dataSource.transaction(async (manager) => {
    await manager.query(
      `
        INSERT INTO users
          (id, email, password_hash, role, status, full_name)
        VALUES ($1, 'phase1@example.test', 'not-a-real-hash', 'farmer', 'active', 'Phase One Farmer')
      `,
      [USER_ID],
    );
    await manager.query(
      `
        INSERT INTO farmer_profiles
          (id, cccd_number, user_id, farm_name, experience_years)
        VALUES ('11000000-0000-4000-8000-000000000001', '001234567890', $1, 'Phase One Farm', 5)
      `,
      [USER_ID],
    );
    await manager.query(
      `
        INSERT INTO product_categories (id, name, slug)
        VALUES ($1, 'Phase One Category', 'phase-one-category')
      `,
      [CATEGORY_ID],
    );
    await manager.query(
      `
        INSERT INTO products
          (id, seller_id, seller_type, name, category_id, price_per_unit, unit, status)
        VALUES ($1, $2, 'farmer', 'Phase One Product', $3, 100, 'kg', 'active')
      `,
      [PRODUCT_ID, USER_ID, CATEGORY_ID],
    );
    await manager.query(
      `
        INSERT INTO reviews (id, reviewer_id, product_id, rating, comment)
        VALUES ('40000000-0000-4000-8000-000000000001', $1, $2, 5, 'Phase one')
      `,
      [USER_ID, PRODUCT_ID],
    );
    await manager.query(
      `
        INSERT INTO notifications (id, user_id, type, title, body)
        VALUES ('50000000-0000-4000-8000-000000000001', $1, 'new_review', 'Phase one', 'Phase one')
      `,
      [USER_ID],
    );
    await manager.query(
      `
        INSERT INTO provinces (id, name, code)
        VALUES ('60000000-0000-4000-8000-000000000001', 'Phase One Province', 'P1')
      `,
    );
    await manager.query(
      `
        INSERT INTO districts (id, province_id, name, code)
        VALUES ('61000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', 'Phase One District', 'D1')
      `,
    );
    await manager.query(
      `
        INSERT INTO stored_files
          (id, owner_id, "assetType", provider, visibility, status, object_key,
           original_name, declared_mime, size_bytes, expires_at)
        VALUES
          ('70000000-0000-4000-8000-000000000001', $1, 'KYC_IDENTITY',
           'supabase', 'private', 'ACTIVE', 'phase1/object', 'phase1.pdf',
           'application/pdf', 1, now() + interval '1 day')
      `,
      [USER_ID],
    );
    await manager.query(
      `
        INSERT INTO ad_packages (name, type, duration_days, price)
        VALUES ('Phase One Package', 'banner', 7, 100)
      `,
    );
    await manager.query(
      `
        INSERT INTO ad_campaigns
          (id, supplier_id, package_id, title, image_url, status)
        VALUES
          ('80000000-0000-4000-8000-000000000001', $1, 1, 'Phase One Ad',
           'https://example.test/ad.png', 'pending_approval')
      `,
      [USER_ID],
    );
    await manager.query(
      `
        INSERT INTO forum_posts (id, author_id, title, content, category)
        VALUES
          ('90000000-0000-4000-8000-000000000001', $1, 'Phase One Forum',
           'Phase one', 'experience')
      `,
      [USER_ID],
    );
    await manager.query(
      `
        INSERT INTO system_configs (id, key, value)
        VALUES ('a0000000-0000-4000-8000-000000000001', 'phase1', 'enabled')
      `,
    );
    await manager.query(
      `
        INSERT INTO audit_logs
          (id, user_id, action, entity_type, entity_id, changes)
        VALUES
          ('a1000000-0000-4000-8000-000000000001', $1, 'PHASE2_READ',
           'SystemConfig', 'a0000000-0000-4000-8000-000000000001',
           '{"before": null, "after": {"value": "enabled"}}'::jsonb)
      `,
      [USER_ID],
    );
    await manager.query(
      `
        INSERT INTO incident_reports
          (id, shipment_id, reported_by, incident_type, description)
        VALUES
          ('b0000000-0000-4000-8000-000000000001',
           'b1000000-0000-4000-8000-000000000001', $1, 'other', 'Phase one')
      `,
      [USER_ID],
    );
  });
}

function createProfilesService(dataSource: DataSource): ProfilesService {
  return new ProfilesService(
    dataSource.getRepository(FarmerProfile),
    dataSource.getRepository(CooperativeProfile),
    dataSource.getRepository(EnterpriseProfile),
    dataSource.getRepository(SupplierProfile),
    {
      verifyCccdImage: async () => true,
      verifyCccd: async () => ({}) as Record<string, string>,
      verifyCccdFull: async () => ({}) as Record<string, string>,
      verifyBrc: async () => ({}) as Record<string, string>,
    },
    fakeStoredFileAccess(),
  );
}

async function readPendingProfileQueues(dataSource: DataSource) {
  const [farmer, cooperative, enterprise, supplier] = await Promise.all([
    dataSource.getRepository(FarmerProfile).count({
      where: { isKycVerified: false },
    }),
    dataSource.getRepository(CooperativeProfile).count({
      where: { isVerified: false },
    }),
    dataSource.getRepository(EnterpriseProfile).count({
      where: { isVerified: false },
    }),
    dataSource.getRepository(SupplierProfile).count({
      where: { isVerified: false },
    }),
  ]);
  return { farmer, cooperative, enterprise, supplier };
}

function fakeStoredFileAccess(): StoredFileAccessPort {
  return {
    readOwnedFile: async () => Buffer.from("phase1"),
    attachOwnedFile: async () => undefined,
    detachOwnedFile: async () => undefined,
    retireOwnedFile: async () => undefined,
    reviewFile: async () => true,
    restoreReviewedFile: async () => undefined,
  };
}

async function readSmokeCounts(
  dataSource: DataSource,
): Promise<Record<string, number>> {
  const tables = [
    "users",
    "ad_campaigns",
    "forum_posts",
    "system_configs",
    "incident_reports",
    "provinces",
    "districts",
    "stored_files",
    "market_prices",
    "traceability_records",
  ];
  const result: Record<string, number> = {};
  for (const table of tables) {
    const [{ exists }] = (await dataSource.query(
      `
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = $1
        ) AS exists
      `,
      [table],
    )) as Array<{ exists: boolean }>;
    if (!exists) {
      result[table] = 0;
      continue;
    }
    const [{ count }] = (await dataSource.query(
      `SELECT COUNT(*)::integer AS count FROM "public"."${table}"`,
    )) as Array<{ count: number }>;
    result[table] = count;
  }
  return result;
}

function setApplicationEnvironment(database: string): void {
  Object.assign(process.env, {
    NODE_ENV: "test",
    DB_NAME: database,
    DB_SYNCHRONIZE: "false",
    DB_LOGGING: "false",
    PRODUCT_DEV_SEED: "false",
    PRODUCT_DEV_SEED_RESET: "false",
    SUPABASE_URL: "https://phase1.supabase.co",
    SUPABASE_SERVICE_KEY: "phase1_service_role_test_key",
    SUPABASE_BUCKET: "phase1-private",
    CLOUDINARY_CLOUD_NAME: "phase1",
    CLOUDINARY_API_KEY: "phase1",
    CLOUDINARY_API_SECRET: "phase1",
    STORAGE_ENV_PREFIX: "phase1",
    STORAGE_MAX_IMAGE_BYTES: "5242880",
    STORAGE_MAX_DOCUMENT_BYTES: "10485760",
    STORAGE_MAX_FILES_PER_REQUEST: "5",
    STORAGE_MAX_ORIGINAL_FILENAME_LENGTH: "255",
    STORAGE_DOWNLOAD_URL_TTL_SECONDS: "900",
    STORAGE_UPLOAD_INTENT_TTL_SECONDS: "900",
    STORAGE_UPLOAD_INTENT_RATE_LIMIT_PER_MINUTE: "10",
    STORAGE_MULTIPART_RATE_LIMIT_PER_MINUTE: "5",
    STORAGE_DOWNLOAD_URL_RATE_LIMIT_PER_MINUTE: "30",
    JWT_SECRET: "phase1-test-secret",
    JWT_REFRESH_SECRET: "phase1-test-refresh-secret",
  });
}

async function closeApplication(app: INestApplication): Promise<void> {
  await app.close();
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, sortValue(child)]),
    );
  }
  return value;
}
