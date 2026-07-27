import { DataSource, EntityTarget } from "typeorm";

import { IncidentReport } from "./entities/incident-report.entity";
import { AuditLog } from "../modules/admin/entities/audit-log.entity";
import { SystemConfig } from "../modules/admin/entities/system-config.entity";
import { AdCampaign } from "../modules/ads/infrastructure/persistence/entities/ad-campaign.entity";
import { AdEvent } from "../modules/ads/infrastructure/persistence/entities/ad-event.entity";
import { AdPackage } from "../modules/ads/infrastructure/persistence/entities/ad-package.entity";
import { BulkListingContributionEntity } from "../modules/cooperatives/infrastructure/persistence/entities/bulk-listing-contribution.entity";
import { BulkListingEntity } from "../modules/cooperatives/infrastructure/persistence/entities/bulk-listing.entity";
import { CooperativeMemberEntity } from "../modules/cooperatives/infrastructure/persistence/entities/cooperative-member.entity";
import { CooperativeProvinceReferenceEntity } from "../modules/cooperatives/infrastructure/persistence/entities/cooperative-province-reference.entity";
import { HarvestScheduleEntity } from "../modules/cooperatives/infrastructure/persistence/entities/harvest-schedule.entity";
import { ForumComment } from "../modules/forum/entities/forum-comment.entity";
import { ForumLike } from "../modules/forum/entities/forum-like.entity";
import { ForumPost } from "../modules/forum/entities/forum-post.entity";
import { District } from "../modules/geography/entities/district.entity";
import { Province } from "../modules/geography/entities/province.entity";
import { MarketPrice } from "../modules/market-prices/entities/market-price.entity";
import { NotificationOrmEntity } from "../modules/notifications/infrastructure/persistence/notification.orm-entity";
import { ProductCategory } from "../modules/products/infrastructure/persistence/entities/product-category.entity";
import { ProductCertification } from "../modules/products/infrastructure/persistence/entities/product-certification.entity";
import { ProductImage } from "../modules/products/infrastructure/persistence/entities/product-image.entity";
import { Product } from "../modules/products/infrastructure/persistence/entities/product.entity";
import { Wishlist } from "../modules/products/infrastructure/persistence/entities/wishlist.entity";
import { Review } from "../modules/reviews/infrastructure/persistence/entities/review.entity";
import { StoredFileEntity } from "../modules/storage/infrastructure/persistence/stored-file.entity";
import { TraceabilityRecord } from "../modules/traceability/entities/traceability-record.entity";
import { OtpVerification } from "../modules/auth/infrastructure/persistence/entities/otp-verification.entity";
import { RefreshToken } from "../modules/auth/infrastructure/persistence/entities/refresh-token.entity";
import { User } from "../modules/users/infrastructure/persistence/entities/user.entity";
import { CooperativeProfile } from "../modules/profiles/infrastructure/persistence/entities/cooperative-profile.entity";
import { EnterpriseProfile } from "../modules/profiles/infrastructure/persistence/entities/enterprise-profile.entity";
import { FarmerProfile } from "../modules/profiles/infrastructure/persistence/entities/farmer-profile.entity";
import { SupplierProfile } from "../modules/profiles/infrastructure/persistence/entities/supplier-profile.entity";

export interface RegisteredEntity {
  readonly key: `public.${string}`;
  readonly entity: EntityTarget<unknown>;
  readonly baselineV2: boolean;
}

const entry = (
  table: string,
  entity: EntityTarget<unknown>,
  baselineV2: boolean,
): RegisteredEntity => ({
  key: `public.${table}`,
  entity,
  baselineV2,
});

export const RUNTIME_ENTITY_ENTRIES = Object.freeze([
  entry("cooperative_profiles", CooperativeProfile, true),
  entry("enterprise_profiles", EnterpriseProfile, true),
  entry("farmer_profiles", FarmerProfile, true),
  entry("incident_reports", IncidentReport, true),
  entry("otp_verifications", OtpVerification, true),
  entry("refresh_tokens", RefreshToken, true),
  entry("supplier_profiles", SupplierProfile, true),
  entry("users", User, true),
  entry("audit_logs", AuditLog, true),
  entry("system_configs", SystemConfig, true),
  entry("ad_campaigns", AdCampaign, true),
  entry("ad_events", AdEvent, true),
  entry("ad_packages", AdPackage, true),
  entry("bulk_listing_contributions", BulkListingContributionEntity, false),
  entry("bulk_listings", BulkListingEntity, false),
  entry("cooperative_members", CooperativeMemberEntity, false),
  entry(
    "cooperative_province_references",
    CooperativeProvinceReferenceEntity,
    false,
  ),
  entry("harvest_schedules", HarvestScheduleEntity, false),
  entry("forum_comments", ForumComment, true),
  entry("forum_likes", ForumLike, true),
  entry("forum_posts", ForumPost, true),
  entry("districts", District, true),
  entry("provinces", Province, true),
  entry("market_prices", MarketPrice, false),
  entry("notifications", NotificationOrmEntity, true),
  entry("product_categories", ProductCategory, true),
  entry("product_certifications", ProductCertification, true),
  entry("product_images", ProductImage, true),
  entry("products", Product, true),
  entry("wishlists", Wishlist, true),
  entry("reviews", Review, true),
  entry("stored_files", StoredFileEntity, true),
  entry("traceability_records", TraceabilityRecord, false),
] as const);

export const RUNTIME_ENTITY_REGISTRY = Object.freeze(
  RUNTIME_ENTITY_ENTRIES.map(({ entity }) => entity),
);

export const CLI_ENTITY_REGISTRY = RUNTIME_ENTITY_REGISTRY;
export const TEST_ENTITY_REGISTRY = RUNTIME_ENTITY_REGISTRY;

export const CANONICAL_BASELINE_ENTITY_REGISTRY = Object.freeze(
  RUNTIME_ENTITY_ENTRIES.filter(({ baselineV2 }) => baselineV2).map(
    ({ entity }) => entity,
  ),
);

export const CANONICAL_BASELINE_TABLE_KEYS = Object.freeze(
  RUNTIME_ENTITY_ENTRIES.filter(({ baselineV2 }) => baselineV2)
    .map(({ key }) => key)
    .sort(),
);

export const EXCLUDED_RUNTIME_TABLE_KEYS = Object.freeze(
  RUNTIME_ENTITY_ENTRIES.filter(({ baselineV2 }) => !baselineV2)
    .map(({ key }) => key)
    .sort(),
);

const EXCLUDED_RUNTIME_TABLES = new Set(
  EXCLUDED_RUNTIME_TABLE_KEYS.map((key) => key.replace("public.", "")),
);

export function excludeDeferredEntitiesFromSchemaBuild(
  dataSource: DataSource,
): void {
  const excluded = dataSource.entityMetadatas.filter(({ tableName }) =>
    EXCLUDED_RUNTIME_TABLES.has(tableName),
  );
  if (excluded.length !== EXCLUDED_RUNTIME_TABLES.size) {
    throw new Error(
      `Expected ${EXCLUDED_RUNTIME_TABLES.size} deferred entity metadata entries, found ${excluded.length}`,
    );
  }
  for (const metadata of excluded) metadata.synchronize = false;
}

const TABLE_KEY_BY_ENTITY = new Map(
  RUNTIME_ENTITY_ENTRIES.map(({ entity, key }) => [entity, key]),
);

export function getEntityTableKey(
  entity: EntityTarget<unknown>,
): `public.${string}` {
  const key = TABLE_KEY_BY_ENTITY.get(entity);
  if (!key) throw new Error("Entity is not part of the canonical registry");
  return key;
}

export function getRegisteredEntityKeys(): string[] {
  return RUNTIME_ENTITY_ENTRIES.map(({ key }) => key).sort();
}
