import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * P3 — Cooperatives module tables. Field names match AgriLink.sql exactly:
 *   - cooperative_members(cooperative_id, farmer_id, status, join_request_note,
 *                         approved_by, approved_at, rejected_reason)
 *   - bulk_listings(cooperative_id, category_id INT, title, description,
 *                   total_quantity, unit, price_per_unit, farming_type,
 *                   province_id, harvest_date_from, harvest_date_to,
 *                   status product_status)
 *   - bulk_listing_contributions(bulk_listing_id, farmer_id, product_id,
 *                                quantity, unit)
 *   - harvest_schedules(cooperative_id, farmer_id, product_id, expected_date,
 *                       estimated_qty, unit, actual_date, actual_qty, note)
 *
 * Required for production deploy (synchronize=false).
 */
export class CreateP3Tables1748390500000 implements MigrationInterface {
  name = 'CreateP3Tables1748390500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Reuse existing enums (member_status, product_status, product_unit,
    // farming_type) from main schema; create only if missing.
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'member_status') THEN
          CREATE TYPE "member_status" AS ENUM (
            'pending', 'active', 'suspended', 'left'
          );
        END IF;
      END
      $$;
    `);

    // ── cooperative_members ──────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "cooperative_members" (
        "id"                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "cooperative_id"    UUID NOT NULL,
        "farmer_id"         UUID NOT NULL,
        "status"            member_status NOT NULL DEFAULT 'pending',
        "join_request_note" TEXT,
        "approved_by"       UUID,
        "approved_at"       TIMESTAMPTZ,
        "rejected_reason"   TEXT,
        "created_at"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "uq_member_coop_farmer" UNIQUE ("cooperative_id", "farmer_id"),
        CONSTRAINT "fk_member_coop"   FOREIGN KEY ("cooperative_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_member_farmer" FOREIGN KEY ("farmer_id")      REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_member_approver" FOREIGN KEY ("approved_by")  REFERENCES "users"("id") ON DELETE SET NULL
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_member_coop_status"
        ON "cooperative_members" ("cooperative_id", "status");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_member_farmer"
        ON "cooperative_members" ("farmer_id");
    `);

    // ── bulk_listings ────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "bulk_listings" (
        "id"                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "cooperative_id"     UUID NOT NULL,
        "category_id"        UUID,
        "title"              VARCHAR(255) NOT NULL,
        "description"        TEXT,
        "total_quantity"     NUMERIC(12,2) NOT NULL,
        "unit"               product_unit NOT NULL,
        "price_per_unit"     NUMERIC(12,2) NOT NULL,
        "farming_type"       farming_type,
        "province_id"        INTEGER,
        "harvest_date_from"  DATE,
        "harvest_date_to"    DATE,
        "status"             product_status NOT NULL DEFAULT 'draft',
        "created_at"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "fk_bulk_coop"     FOREIGN KEY ("cooperative_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_bulk_category" FOREIGN KEY ("category_id")    REFERENCES "product_categories"("id") ON DELETE SET NULL,
        CONSTRAINT "fk_bulk_province" FOREIGN KEY ("province_id")    REFERENCES "provinces"("id") ON DELETE SET NULL
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_bulk_status_dates"
        ON "bulk_listings" ("status", "harvest_date_from", "harvest_date_to");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_bulk_coop"
        ON "bulk_listings" ("cooperative_id", "created_at" DESC);
    `);

    // ── bulk_listing_contributions ───────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "bulk_listing_contributions" (
        "id"               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "bulk_listing_id"  UUID NOT NULL,
        "farmer_id"        UUID NOT NULL,
        "product_id"       UUID,
        "quantity"         NUMERIC(12,2) NOT NULL,
        "unit"             product_unit NOT NULL,
        "created_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "uq_contrib_listing_farmer" UNIQUE ("bulk_listing_id", "farmer_id"),
        CONSTRAINT "fk_contrib_listing" FOREIGN KEY ("bulk_listing_id") REFERENCES "bulk_listings"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_contrib_farmer"  FOREIGN KEY ("farmer_id")       REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_contrib_product" FOREIGN KEY ("product_id")      REFERENCES "products"("id") ON DELETE SET NULL
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_contrib_listing"
        ON "bulk_listing_contributions" ("bulk_listing_id");
    `);

    // ── harvest_schedules ────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "harvest_schedules" (
        "id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "cooperative_id" UUID,
        "farmer_id"      UUID NOT NULL,
        "product_id"     UUID,
        "expected_date"  DATE NOT NULL,
        "estimated_qty"  NUMERIC(12,2),
        "unit"           product_unit,
        "actual_date"    DATE,
        "actual_qty"     NUMERIC(12,2),
        "note"           TEXT,
        "created_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "fk_harvest_coop"    FOREIGN KEY ("cooperative_id") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "fk_harvest_farmer"  FOREIGN KEY ("farmer_id")      REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_harvest_product" FOREIGN KEY ("product_id")     REFERENCES "products"("id") ON DELETE SET NULL
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_harvest_coop_date"
        ON "harvest_schedules" ("cooperative_id", "expected_date");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_harvest_farmer_date"
        ON "harvest_schedules" ("farmer_id", "expected_date");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "harvest_schedules"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "bulk_listing_contributions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "bulk_listings"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cooperative_members"`);
  }
}
