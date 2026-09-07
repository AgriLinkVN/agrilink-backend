import { MigrationInterface, QueryRunner } from "typeorm";

export const CANONICAL_BASELINE_V2_VERSION = "2.0.0";
export const CANONICAL_BASELINE_V2_TABLES = Object.freeze([
  "ad_campaigns",
  "ad_events",
  "ad_packages",
  "audit_logs",
  "cooperative_profiles",
  "districts",
  "enterprise_profiles",
  "farmer_profiles",
  "forum_comments",
  "forum_likes",
  "forum_posts",
  "incident_reports",
  "notifications",
  "otp_verifications",
  "product_categories",
  "product_certifications",
  "product_images",
  "products",
  "provinces",
  "refresh_tokens",
  "reviews",
  "stored_files",
  "supplier_profiles",
  "system_configs",
  "users",
  "wishlists",
] as const);

const BASELINE_UP_SQL = [
  `CREATE TYPE "public"."users_role_enum" AS ENUM('farmer', 'cooperative', 'buyer', 'enterprise', 'supplier', 'logistics', 'state_agency', 'admin')`,
  `CREATE TYPE "public"."users_status_enum" AS ENUM('pending_verification', 'active', 'locked', 'rejected')`,
  `CREATE TABLE "public"."users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "phone" character varying(15), "firebase_uid" character varying(128), "email" character varying(255) NOT NULL, "password_hash" text NOT NULL, "role" "public"."users_role_enum" NOT NULL, "status" "public"."users_status_enum" NOT NULL DEFAULT 'pending_verification', "avatar_url" text, "full_name" character varying(255), "is_phone_verified" boolean NOT NULL DEFAULT false, "is_email_verified" boolean NOT NULL DEFAULT false, "last_login_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_a000cca60bcf04454e727699490" UNIQUE ("phone"), CONSTRAINT "UQ_0fd54ced5cc75f7cb92925dd803" UNIQUE ("firebase_uid"), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
  `CREATE TABLE "public"."cooperative_profiles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "cooperative_name" character varying(255) NOT NULL, "business_license_number" character varying(50) NOT NULL, "tax_code" character varying(20) NOT NULL, "cooperative_cert_url" text, "business_license_url" text, "representative_name" character varying(255) NOT NULL, "representative_phone" character varying(15) NOT NULL, "representative_cccd" character varying(12) NOT NULL, "representative_cccd_front_url" text, "representative_cccd_back_url" text, "members_list_url" text, "cooperative_cert_file_id" uuid, "business_license_file_id" uuid, "representative_cccd_front_file_id" uuid, "representative_cccd_back_file_id" uuid, "members_list_file_id" uuid, "address" text NOT NULL, "province_id" integer, "total_members" integer NOT NULL DEFAULT '0', "member_count" integer, "is_verified" boolean NOT NULL DEFAULT false, "verified_by" uuid, "verified_at" TIMESTAMP WITH TIME ZONE, "rejection_reason" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" uuid, CONSTRAINT "UQ_630b29a155375bb0ff7ecc13ce0" UNIQUE ("business_license_number"), CONSTRAINT "UQ_71398f99d7a3abfc43e3bdfcaa1" UNIQUE ("tax_code"), CONSTRAINT "REL_2ee3321e75f5e1f2261baa4e80" UNIQUE ("user_id"), CONSTRAINT "PK_0740de5336ada82174537b349d4" PRIMARY KEY ("id"))`,
  `CREATE TABLE "public"."enterprise_profiles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "company_name" character varying(255) NOT NULL, "tax_code" character varying(20) NOT NULL, "business_license_url" text, "business_license_file_id" uuid, "representative_name" character varying(255) NOT NULL, "representative_phone" character varying(15) NOT NULL, "address" text NOT NULL, "province_id" integer, "industry" character varying(255), "is_verified" boolean NOT NULL DEFAULT false, "verified_by" uuid, "rejection_reason" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" uuid, CONSTRAINT "UQ_35d168bd386baa81557b209aa0e" UNIQUE ("tax_code"), CONSTRAINT "REL_7b9aac16881c9af649fd74011b" UNIQUE ("user_id"), CONSTRAINT "PK_ed347c3fa667bf48b581f29dd2b" PRIMARY KEY ("id"))`,
  `CREATE TABLE "public"."farmer_profiles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "cccd_number" character varying(12) NOT NULL, "cccd_front_url" text, "cccd_back_url" text, "cccd_front_file_id" uuid, "cccd_back_file_id" uuid, "residence_address" text, "ward" character varying, "is_kyc_verified" boolean NOT NULL DEFAULT false, "verified_by" uuid, "rejection_reason" text, "province_id" integer, "district_id" integer, "bio" text, "farm_name" character varying(255), "experience_years" integer, "trust_score" numeric(3,2) NOT NULL DEFAULT '0', "total_sales" integer NOT NULL DEFAULT '0', "verified_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" uuid, CONSTRAINT "UQ_a3d3dd6273bcbf7118d9c7fefbd" UNIQUE ("cccd_number"), CONSTRAINT "REL_77f5f5145225ffcaa3583fb0ee" UNIQUE ("user_id"), CONSTRAINT "PK_4718a4781e7bd8b1f701b9a3cc1" PRIMARY KEY ("id"))`,
  `CREATE TYPE "public"."incident_reports_incident_type_enum" AS ENUM('damaged', 'lost', 'unreachable', 'other')`,
  `CREATE TABLE "public"."incident_reports" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "shipment_id" uuid NOT NULL, "reported_by" uuid NOT NULL, "incident_type" "public"."incident_reports_incident_type_enum" NOT NULL, "description" text NOT NULL, "evidence_urls" text array NOT NULL DEFAULT '{}', "status" character varying(50) NOT NULL DEFAULT 'open', "resolved_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_8b924dea33e3dd1ef1bbac02ad6" PRIMARY KEY ("id"))`,
  `CREATE TYPE "public"."otp_verifications_type_enum" AS ENUM('sms', 'email')`,
  `CREATE TYPE "public"."otp_verifications_purpose_enum" AS ENUM('register', 'login', 'reset_password')`,
  `CREATE TABLE "public"."otp_verifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid, "phone" character varying(15), "email" character varying(255), "otp_code" character varying(6) NOT NULL, "type" "public"."otp_verifications_type_enum" NOT NULL, "purpose" "public"."otp_verifications_purpose_enum" NOT NULL, "is_used" boolean NOT NULL DEFAULT false, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_91d17e75ac3182dba6701869b39" PRIMARY KEY ("id"))`,
  `CREATE TABLE "public"."refresh_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "token_hash" text NOT NULL, "device_info" text, "ip_address" inet, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "revoked_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" uuid, CONSTRAINT "UQ_a7838d2ba25be1342091b6695f1" UNIQUE ("token_hash"), CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY ("id"))`,
  `CREATE TYPE "public"."supplier_profiles_supplier_type_enum" AS ENUM('fertilizer', 'pesticide', 'equipment', 'mixed')`,
  `CREATE TABLE "public"."supplier_profiles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "company_name" character varying(255) NOT NULL, "tax_code" character varying(20), "address" text, "province_id" integer, "supplier_type" "public"."supplier_profiles_supplier_type_enum" NOT NULL, "is_verified" boolean NOT NULL DEFAULT false, "business_license_url" text, "business_license_file_id" uuid, "verified_by" uuid, "rejection_reason" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_d8f0b495dba71509b24110ef9ea" UNIQUE ("user_id"), CONSTRAINT "PK_3206f32d21aefa46b72abffa366" PRIMARY KEY ("id"))`,
  `CREATE TABLE "public"."audit_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" character varying, "action" character varying NOT NULL, "entity_type" character varying, "entity_id" character varying, "method" character varying, "path" character varying, "changes" jsonb, "ip_address" character varying, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id"))`,
  `CREATE TABLE "public"."system_configs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "key" character varying NOT NULL, "value" text NOT NULL, "description" text, "updated_by" character varying, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_5aff9a6d272a5cedf54d7aaf617" UNIQUE ("key"), CONSTRAINT "PK_29ac548e654c799fd885e1b9b71" PRIMARY KEY ("id"))`,
  `CREATE TYPE "public"."ad_events_eventtype_enum" AS ENUM('impression', 'click')`,
  `CREATE TABLE "public"."ad_events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "campaign_id" uuid NOT NULL, "eventType" "public"."ad_events_eventtype_enum" NOT NULL, "user_id" uuid, "ip_address" inet, "user_agent" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_82199d91a8b3a397192ab63a27f" PRIMARY KEY ("id"))`,
  `CREATE TYPE "public"."ad_packages_type_enum" AS ENUM('banner', 'featured', 'spotlight')`,
  `CREATE TABLE "public"."ad_packages" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "type" "public"."ad_packages_type_enum" NOT NULL, "duration_days" integer NOT NULL, "price" numeric(12,2) NOT NULL, "max_impressions" integer, "description" text, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_83f845520e0b1e582374d435781" PRIMARY KEY ("id"))`,
  `CREATE TYPE "public"."ad_campaigns_status_enum" AS ENUM('pending_approval', 'active', 'paused', 'rejected', 'expired')`,
  `CREATE TABLE "public"."ad_campaigns" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "supplier_id" uuid NOT NULL, "package_id" integer NOT NULL, "title" character varying NOT NULL, "image_url" text NOT NULL, "link_url" text, "target_provinces" integer array NOT NULL DEFAULT '{}', "status" "public"."ad_campaigns_status_enum" NOT NULL DEFAULT 'pending_approval', "approved_by" uuid, "approved_at" TIMESTAMP WITH TIME ZONE, "rejection_reason" text, "start_date" date, "end_date" date, "total_impressions" integer NOT NULL DEFAULT '0', "total_clicks" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_7877713eb87f782dd190eed85a7" PRIMARY KEY ("id"))`,
  `CREATE TABLE "public"."forum_comments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "post_id" character varying NOT NULL, "author_id" character varying NOT NULL, "content" text NOT NULL, "is_hidden" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_1c860feac1713d199c00ce1e9d1" PRIMARY KEY ("id"))`,
  `CREATE TABLE "public"."forum_likes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "post_id" character varying NOT NULL, "user_id" character varying NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_9d0f0faa0615243262e3b689743" UNIQUE ("post_id", "user_id"), CONSTRAINT "PK_9feaf1887b12844e95c35facaa5" PRIMARY KEY ("id"))`,
  `CREATE TYPE "public"."forum_posts_category_enum" AS ENUM('technical', 'market', 'experience')`,
  `CREATE TABLE "public"."forum_posts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "author_id" character varying NOT NULL, "title" character varying(255) NOT NULL, "content" text NOT NULL, "category" "public"."forum_posts_category_enum" NOT NULL DEFAULT 'experience', "image_urls" jsonb, "like_count" integer NOT NULL DEFAULT '0', "comment_count" integer NOT NULL DEFAULT '0', "view_count" integer NOT NULL DEFAULT '0', "is_hidden" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_3e9c301114a0fd42c998681b04e" PRIMARY KEY ("id"))`,
  `CREATE TYPE "public"."provinces_region_enum" AS ENUM('north', 'central', 'south', 'highlands')`,
  `CREATE TABLE "public"."provinces" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "name_en" character varying, "code" character varying, "region" "public"."provinces_region_enum", "lat" numeric(10,6), "lng" numeric(10,6), "slug" character varying, CONSTRAINT "UQ_5c78199072262966fb68b718095" UNIQUE ("name"), CONSTRAINT "UQ_f4b684af62d5cb3aa174f6b9b8a" UNIQUE ("code"), CONSTRAINT "UQ_d9bd798de5f037f71e348d47f8d" UNIQUE ("slug"), CONSTRAINT "PK_2e4260eedbcad036ec53222e0c7" PRIMARY KEY ("id"))`,
  `CREATE TABLE "public"."districts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "province_id" uuid NOT NULL, "name" character varying NOT NULL, "name_en" character varying, "code" character varying, CONSTRAINT "PK_972a72ff4e3bea5c7f43a2b98af" PRIMARY KEY ("id"))`,
  `CREATE TYPE "public"."notifications_type_enum" AS ENUM('new_order', 'order_confirmed', 'order_shipped', 'order_delivered', 'new_message', 'product_approved', 'product_rejected', 'product_status_changed', 'price_alert', 'member_request', 'new_review', 'review_reply', 'ad_approved', 'ad_rejected', 'contract_signed', 'dispute_opened')`,
  `CREATE TABLE "public"."notifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" character varying NOT NULL, "type" "public"."notifications_type_enum" NOT NULL, "title" character varying NOT NULL, "body" text NOT NULL, "data" jsonb, "is_read" boolean NOT NULL DEFAULT false, "read_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`,
  `CREATE TABLE "public"."product_categories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100) NOT NULL, "slug" character varying(100) NOT NULL, "description" text, "parent_id" uuid, "icon_url" text, "sort_order" integer NOT NULL DEFAULT '0', "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_f314a8b42f88d87b2dcb7fc491a" UNIQUE ("slug"), CONSTRAINT "PK_7069dac60d88408eca56fdc9e0c" PRIMARY KEY ("id"))`,
  `CREATE TABLE "public"."product_images" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "product_id" uuid NOT NULL, "image_url" character varying NOT NULL, "alt_text" character varying(255), "sort_order" integer NOT NULL DEFAULT '0', "is_primary" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_1974264ea7265989af8392f63a1" PRIMARY KEY ("id"))`,
  `CREATE TYPE "public"."products_seller_type_enum" AS ENUM('farmer', 'cooperative', 'supplier')`,
  `CREATE TYPE "public"."products_unit_enum" AS ENUM('kg', 'ton', 'box', 'bunch', 'liter', 'piece')`,
  `CREATE TYPE "public"."products_status_enum" AS ENUM('draft', 'pending_approval', 'active', 'out_of_stock', 'rejected', 'archived', 'suspended')`,
  `CREATE TYPE "public"."products_farming_type_enum" AS ENUM('organic', 'traditional', 'vietgap', 'globalgap')`,
  `CREATE TABLE "public"."products" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "seller_id" character varying NOT NULL, "seller_type" "public"."products_seller_type_enum" NOT NULL, "name" character varying(255), "description" text, "category_id" uuid, "sku" character varying(50), "variety" character varying(100), "price_per_unit" numeric(12,2) NOT NULL, "unit" "public"."products_unit_enum" NOT NULL, "available_quantity" numeric(12,2) NOT NULL DEFAULT '0', "min_order_quantity" numeric(12,2), "status" "public"."products_status_enum" NOT NULL DEFAULT 'draft', "farming_type" "public"."products_farming_type_enum", "province_id" character varying, "district_id" character varying, "farm_latitude" double precision, "farm_longitude" double precision, "harvest_date" date, "expiry_date" date, "rejection_reason" text, "is_featured" boolean NOT NULL DEFAULT false, "view_count" integer NOT NULL DEFAULT '0', "sold_count" double precision NOT NULL DEFAULT '0', "avg_rating" double precision NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_c44ac33a05b144dd0d9ddcf9327" UNIQUE ("sku"), CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY ("id"))`,
  `CREATE TYPE "public"."product_certifications_cert_type_enum" AS ENUM('vietgap', 'organic', 'globalgap', 'ocop', 'other')`,
  `CREATE TYPE "public"."product_certifications_status_enum" AS ENUM('pending', 'verified', 'rejected')`,
  `CREATE TABLE "public"."product_certifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "product_id" uuid NOT NULL, "cert_type" "public"."product_certifications_cert_type_enum" NOT NULL, "cert_number" character varying, "issued_by" character varying, "issued_date" date, "expiry_date" date, "document_url" character varying, "stored_file_id" uuid, "is_verified" boolean NOT NULL DEFAULT false, "status" "public"."product_certifications_status_enum" NOT NULL DEFAULT 'pending', "verified_by" uuid, "verified_at" TIMESTAMP WITH TIME ZONE, "rejection_reason" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_d369317135cb1047e6046a86b8f" PRIMARY KEY ("id"))`,
  `CREATE TABLE "public"."wishlists" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "product_id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_9c64a981c56ba677ac17f5fba6f" UNIQUE ("user_id", "product_id"), CONSTRAINT "PK_d0a37f2848c5d268d315325f359" PRIMARY KEY ("id"))`,
  `CREATE TABLE "public"."reviews" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "order_id" uuid, "reviewer_id" uuid NOT NULL, "reviewee_id" uuid, "product_id" uuid, "rating" smallint NOT NULL, "comment" text, "images" text array NOT NULL DEFAULT '{}', "is_verified_purchase" boolean NOT NULL DEFAULT false, "seller_reply" text, "seller_reply_at" TIMESTAMP WITH TIME ZONE, "is_hidden" boolean NOT NULL DEFAULT false, "hidden_reason" text, "hidden_by" uuid, "hidden_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_231ae565c273ee700b283f15c1d" PRIMARY KEY ("id"))`,
  `CREATE TABLE "public"."stored_files" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "owner_id" uuid NOT NULL, "assetType" character varying NOT NULL, "provider" character varying NOT NULL, "visibility" character varying NOT NULL, "status" character varying NOT NULL DEFAULT 'PENDING', "object_key" character varying NOT NULL, "original_name" character varying NOT NULL, "extension" character varying, "declared_mime" character varying NOT NULL, "detected_mime" character varying, "checksum_sha256" character varying, "size_bytes" bigint NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "resource_type" character varying, "resource_id" character varying, "deletion_attempts" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_0a8766dd87c9ec99f69bc0d6629" UNIQUE ("object_key"), CONSTRAINT "PK_5d5be862bf53851c1794b4adf4e" PRIMARY KEY ("id"))`,
  `CREATE INDEX "IDX_d43c473f7addfbb1a59673ab10" ON "public"."stored_files" ("owner_id", "status")`,
  `CREATE UNIQUE INDEX "IDX_1c275a1cc5bd406b52078b0a9b" ON "public"."stored_files" ("provider", "object_key")`,
  `ALTER TABLE "public"."cooperative_profiles" ADD CONSTRAINT "FK_2ee3321e75f5e1f2261baa4e800" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
  `ALTER TABLE "public"."enterprise_profiles" ADD CONSTRAINT "FK_7b9aac16881c9af649fd74011b9" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
  `ALTER TABLE "public"."farmer_profiles" ADD CONSTRAINT "FK_77f5f5145225ffcaa3583fb0ee1" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
  `ALTER TABLE "public"."otp_verifications" ADD CONSTRAINT "FK_c7f1d281e1acc51e2a37889f5a9" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
  `ALTER TABLE "public"."refresh_tokens" ADD CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
  `ALTER TABLE "public"."ad_events" ADD CONSTRAINT "FK_4c367ce06287ffee25df821fafd" FOREIGN KEY ("campaign_id") REFERENCES "public"."ad_campaigns"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
  `ALTER TABLE "public"."ad_campaigns" ADD CONSTRAINT "FK_e62d6720c7feca78fb5fac35fdb" FOREIGN KEY ("package_id") REFERENCES "public"."ad_packages"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
  `ALTER TABLE "public"."districts" ADD CONSTRAINT "FK_9d451638507b11822dc411a2dfe" FOREIGN KEY ("province_id") REFERENCES "public"."provinces"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
  `ALTER TABLE "public"."product_categories" ADD CONSTRAINT "FK_5f151d414daab0290f65b517ed4" FOREIGN KEY ("parent_id") REFERENCES "public"."product_categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
  `ALTER TABLE "public"."product_images" ADD CONSTRAINT "FK_4f166bb8c2bfcef2498d97b4068" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
  `ALTER TABLE "public"."products" ADD CONSTRAINT "FK_9a5f6868c96e0069e699f33e124" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
  `ALTER TABLE "public"."product_certifications" ADD CONSTRAINT "FK_4ac2b9fb94b2cbe43d0fe493c80" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
  `ALTER TABLE "public"."wishlists" ADD CONSTRAINT "FK_2662acbb3868b1f0077fda61dd2" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
  `ALTER TABLE "public"."reviews" ADD CONSTRAINT "FK_92e950a2513a79bb3fab273c92e" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
  `ALTER TABLE "public"."reviews" ADD CONSTRAINT "FK_9482e9567d8dcc2bc615981ef44" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
] as const;

const PRIVATE_FILE_LINKS = [
  ["farmer_profiles", "cccd_front_file_id"],
  ["farmer_profiles", "cccd_back_file_id"],
  ["cooperative_profiles", "cooperative_cert_file_id"],
  ["cooperative_profiles", "business_license_file_id"],
  ["cooperative_profiles", "representative_cccd_front_file_id"],
  ["cooperative_profiles", "representative_cccd_back_file_id"],
  ["cooperative_profiles", "members_list_file_id"],
  ["enterprise_profiles", "business_license_file_id"],
  ["supplier_profiles", "business_license_file_id"],
] as const;

export class CreateCanonicalBaselineV21800000000000 implements MigrationInterface {
  name = "CreateCanonicalBaselineV21800000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const existing = (await queryRunner.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name <> 'migrations_v2'
      ORDER BY table_name
    `)) as Array<{ table_name: string }>;
    if (existing.length > 0) {
      throw new Error(
        `Canonical baseline v2 requires an empty public schema; found: ${existing
          .map(({ table_name }) => table_name)
          .join(", ")}`,
      );
    }

    await queryRunner.query(
      `CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "public"`,
    );
    for (const sql of BASELINE_UP_SQL) await queryRunner.query(sql);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_reviews_reviewer_product_unique"
      ON "public"."reviews" ("reviewer_id", "product_id")
      WHERE "product_id" IS NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "public"."reviews"
      ADD CONSTRAINT "CHK_reviews_rating_range"
      CHECK ("rating" BETWEEN 1 AND 5)
    `);
    await queryRunner.query(`
      ALTER TABLE "public"."stored_files"
      ADD CONSTRAINT "CHK_stored_files_status"
      CHECK ("status" IN (
        'PENDING', 'UPLOADED', 'QUARANTINED', 'ACTIVE',
        'FAILED', 'DELETE_RETRY', 'DELETED'
      ))
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_product_certifications_stored_file_id"
      ON "public"."product_certifications" ("stored_file_id")
    `);
    await queryRunner.query(`
      ALTER TABLE "public"."product_certifications"
      ADD CONSTRAINT "FK_product_certifications_stored_file"
      FOREIGN KEY ("stored_file_id") REFERENCES "public"."stored_files"("id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    for (const [table, column] of PRIVATE_FILE_LINKS) {
      const identifier = `${table}_${column}`.slice(0, 48);
      await queryRunner.query(
        `CREATE INDEX "IDX_${identifier}" ON "public"."${table}" ("${column}")`,
      );
      await queryRunner.query(`
        ALTER TABLE "public"."${table}"
        ADD CONSTRAINT "FK_${identifier}"
        FOREIGN KEY ("${column}") REFERENCES "public"."stored_files"("id")
        ON DELETE NO ACTION ON UPDATE NO ACTION
      `);
    }

    await queryRunner.query(`
      ALTER TABLE "public"."supplier_profiles"
      ADD CONSTRAINT "FK_supplier_profiles_user"
      FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "public"."wishlists"
      ADD CONSTRAINT "FK_wishlists_user"
      FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tables = [...CANONICAL_BASELINE_V2_TABLES].reverse();
    for (const table of tables) {
      await queryRunner.query(
        `DROP TABLE IF EXISTS "public"."${table}" CASCADE`,
      );
    }
    const enumTypes = [
      "product_certifications_status_enum",
      "product_certifications_cert_type_enum",
      "products_farming_type_enum",
      "products_status_enum",
      "products_unit_enum",
      "products_seller_type_enum",
      "notifications_type_enum",
      "provinces_region_enum",
      "forum_posts_category_enum",
      "ad_campaigns_status_enum",
      "ad_packages_type_enum",
      "ad_events_eventtype_enum",
      "supplier_profiles_supplier_type_enum",
      "otp_verifications_purpose_enum",
      "otp_verifications_type_enum",
      "incident_reports_incident_type_enum",
      "users_status_enum",
      "users_role_enum",
    ];
    for (const enumType of enumTypes) {
      await queryRunner.query(
        `DROP TYPE IF EXISTS "public"."${enumType}" CASCADE`,
      );
    }
  }
}
