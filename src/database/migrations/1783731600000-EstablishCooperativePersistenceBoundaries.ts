import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Establishes the P3 persistence boundary without rewriting legacy data.
 *
 * In particular, it never mutates cooperative_profiles.province_id: that
 * column is a legacy numeric Geography reference. P3's new reference table
 * accepts only the canonical UUID supplied by Geography's future mapping.
 */
export class EstablishCooperativePersistenceBoundaries1783731600000
  implements MigrationInterface
{
  name = 'EstablishCooperativePersistenceBoundaries1783731600000';

  private async createIndex(
    queryRunner: QueryRunner,
    indexName: string,
    statement: string,
  ): Promise<void> {
    const existing = (await queryRunner.query(
      'SELECT to_regclass($1) AS relation',
      [`public.${indexName}`],
    )) as { relation: string | null }[];
    if (existing?.[0]?.relation) return;

    await queryRunner.query(statement);
    await queryRunner.query(
      'INSERT INTO "p3_phase_1_migration_state" ("object_name") VALUES ($1) ON CONFLICT DO NOTHING',
      [indexName],
    );
  }

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "p3_phase_1_migration_state" (
        "object_name" varchar(128) PRIMARY KEY
      )
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF to_regclass('public.cooperative_members') IS NULL THEN
          INSERT INTO "p3_phase_1_migration_state" ("object_name") VALUES ('cooperative_members');
        END IF;
        IF to_regclass('public.bulk_listings') IS NULL THEN
          INSERT INTO "p3_phase_1_migration_state" ("object_name") VALUES ('bulk_listings');
        END IF;
        IF to_regclass('public.bulk_listing_contributions') IS NULL THEN
          INSERT INTO "p3_phase_1_migration_state" ("object_name") VALUES ('bulk_listing_contributions');
        END IF;
        IF to_regclass('public.harvest_schedules') IS NULL THEN
          INSERT INTO "p3_phase_1_migration_state" ("object_name") VALUES ('harvest_schedules');
        END IF;
        IF to_regclass('public.cooperative_province_references') IS NULL THEN
          INSERT INTO "p3_phase_1_migration_state" ("object_name") VALUES ('cooperative_province_references');
        END IF;
      END $$
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "cooperative_members" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "cooperative_id" uuid NOT NULL,
        "farmer_id" uuid NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'pending',
        "role" text,
        "joined_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "bulk_listings" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "cooperative_id" uuid NOT NULL,
        "title" varchar(255) NOT NULL,
        "description" text,
        "product_category_id" uuid,
        "total_quantity" numeric(12, 2) NOT NULL,
        "unit" varchar(20) NOT NULL,
        "price_per_unit" numeric(12, 2) NOT NULL,
        "deadline" timestamptz,
        "is_open" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "bulk_listing_contributions" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "bulk_listing_id" uuid NOT NULL,
        "farmer_id" uuid NOT NULL,
        "quantity" numeric(12, 2) NOT NULL,
        "unit" varchar(20) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "harvest_schedules" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "product_id" uuid,
        "crop_name" varchar(255) NOT NULL,
        "expected_harvest_date" date NOT NULL,
        "estimated_quantity" numeric(12, 2),
        "unit" varchar(20),
        "notes" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "cooperative_province_references" (
        "cooperative_id" uuid PRIMARY KEY,
        "province_id" uuid NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      DO $$
      DECLARE
        report jsonb;
      BEGIN
        SELECT jsonb_agg(
          jsonb_build_object(
            'issue', 'non_uuid_identifier_column',
            'table', expected.table_name,
            'column', expected.column_name,
            'actual_type', columns.data_type
          )
        )
          INTO report
        FROM (
          VALUES
            ('cooperative_members', 'id'),
            ('cooperative_members', 'cooperative_id'),
            ('cooperative_members', 'farmer_id'),
            ('bulk_listings', 'id'),
            ('bulk_listings', 'cooperative_id'),
            ('bulk_listings', 'product_category_id'),
            ('bulk_listing_contributions', 'id'),
            ('bulk_listing_contributions', 'bulk_listing_id'),
            ('bulk_listing_contributions', 'farmer_id'),
            ('harvest_schedules', 'id'),
            ('harvest_schedules', 'user_id'),
            ('harvest_schedules', 'product_id'),
            ('cooperative_province_references', 'cooperative_id'),
            ('cooperative_province_references', 'province_id')
        ) AS expected(table_name, column_name)
        LEFT JOIN information_schema.columns columns
          ON columns.table_schema = 'public'
         AND columns.table_name = expected.table_name
         AND columns.column_name = expected.column_name
        WHERE columns.data_type IS DISTINCT FROM 'uuid';

        IF report IS NOT NULL THEN
          RAISE EXCEPTION
            'P3_PRECHECK_FAILED: %. No legacy identifier was cast or rewritten. An operator must supply an approved migration plan before rerunning this migration.',
            report;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'provinces'
            AND column_name = 'id' AND data_type = 'uuid'
        ) THEN
          RAISE EXCEPTION
            'P3_PRECHECK_FAILED: Geography provinces.id is not UUID; D2 mapping must be supplied by the Geography owner before P3 can write province references.';
        END IF;

        SELECT jsonb_agg(jsonb_build_object('issue', issue, 'count', issue_count))
          INTO report
        FROM (
          SELECT 'duplicate_membership' AS issue, count(*)::integer AS issue_count
          FROM (
            SELECT "cooperative_id", "farmer_id"
            FROM "cooperative_members"
            GROUP BY "cooperative_id", "farmer_id"
            HAVING count(*) > 1
          ) duplicate_memberships
          UNION ALL
          SELECT 'orphan_member_user', count(*)::integer
          FROM "cooperative_members" member
          LEFT JOIN "users" cooperative ON cooperative.id = member."cooperative_id"
          LEFT JOIN "users" farmer ON farmer.id = member."farmer_id"
          WHERE cooperative.id IS NULL OR farmer.id IS NULL
          UNION ALL
          SELECT 'orphan_listing_cooperative', count(*)::integer
          FROM "bulk_listings" listing
          LEFT JOIN "users" cooperative ON cooperative.id = listing."cooperative_id"
          WHERE cooperative.id IS NULL
          UNION ALL
          SELECT 'orphan_contribution', count(*)::integer
          FROM "bulk_listing_contributions" contribution
          LEFT JOIN "bulk_listings" listing ON listing.id = contribution."bulk_listing_id"
          LEFT JOIN "users" farmer ON farmer.id = contribution."farmer_id"
          WHERE listing.id IS NULL OR farmer.id IS NULL
          UNION ALL
          SELECT 'orphan_harvest_owner', count(*)::integer
          FROM "harvest_schedules" schedule
          LEFT JOIN "users" owner ON owner.id = schedule."user_id"
          WHERE owner.id IS NULL
          UNION ALL
          SELECT 'orphan_harvest_product', count(*)::integer
          FROM "harvest_schedules" schedule
          LEFT JOIN "products" product ON product.id = schedule."product_id"
          WHERE schedule."product_id" IS NOT NULL AND product.id IS NULL
          UNION ALL
          SELECT 'invalid_listing_quantity_or_price', count(*)::integer
          FROM "bulk_listings"
          WHERE "total_quantity" <= 0 OR "price_per_unit" < 0
          UNION ALL
          SELECT 'invalid_contribution_quantity', count(*)::integer
          FROM "bulk_listing_contributions"
          WHERE "quantity" <= 0
          UNION ALL
          SELECT 'invalid_harvest_quantity_or_date', count(*)::integer
          FROM "harvest_schedules"
          WHERE "expected_harvest_date" IS NULL
             OR ("estimated_quantity" IS NOT NULL AND "estimated_quantity" <= 0)
          UNION ALL
          SELECT 'unknown_canonical_province', count(*)::integer
          FROM "cooperative_province_references" reference
          LEFT JOIN "provinces" province ON province.id = reference."province_id"
          WHERE province.id IS NULL
        ) checks
        WHERE issue_count > 0;

        IF report IS NOT NULL THEN
          RAISE EXCEPTION
            'P3_PRECHECK_FAILED: %. No legacy data was changed. An operator must resolve or explicitly waive each issue before rerunning this migration.',
            report;
        END IF;
      END $$
    `);

    await queryRunner.query(`
      DO $$
      DECLARE
        requirement record;
      BEGIN
        FOR requirement IN
          SELECT * FROM (VALUES
            ('cooperative_members', 'ck_p3_member_status', 'CHECK (status IN (''pending'', ''active'', ''suspended'', ''rejected'', ''left''))'),
            ('cooperative_members', 'uq_p3_member_cooperative_farmer', 'UNIQUE (cooperative_id, farmer_id)'),
            ('cooperative_members', 'fk_p3_member_cooperative', 'FOREIGN KEY (cooperative_id) REFERENCES users(id) ON DELETE CASCADE'),
            ('cooperative_members', 'fk_p3_member_farmer', 'FOREIGN KEY (farmer_id) REFERENCES users(id) ON DELETE RESTRICT'),
            ('bulk_listings', 'ck_p3_listing_quantity', 'CHECK (total_quantity > 0)'),
            ('bulk_listings', 'ck_p3_listing_price', 'CHECK (price_per_unit >= 0)'),
            ('bulk_listings', 'fk_p3_listing_cooperative', 'FOREIGN KEY (cooperative_id) REFERENCES users(id) ON DELETE CASCADE'),
            ('bulk_listing_contributions', 'ck_p3_contribution_quantity', 'CHECK (quantity > 0)'),
            ('bulk_listing_contributions', 'fk_p3_contribution_listing', 'FOREIGN KEY (bulk_listing_id) REFERENCES bulk_listings(id) ON DELETE CASCADE'),
            ('bulk_listing_contributions', 'fk_p3_contribution_farmer', 'FOREIGN KEY (farmer_id) REFERENCES users(id) ON DELETE RESTRICT'),
            ('harvest_schedules', 'ck_p3_harvest_quantity', 'CHECK (estimated_quantity IS NULL OR estimated_quantity > 0)'),
            ('harvest_schedules', 'fk_p3_harvest_owner', 'FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE'),
            ('cooperative_province_references', 'fk_p3_province_reference_cooperative', 'FOREIGN KEY (cooperative_id) REFERENCES users(id) ON DELETE CASCADE'),
            ('cooperative_province_references', 'fk_p3_province_reference_province', 'FOREIGN KEY (province_id) REFERENCES provinces(id) ON DELETE RESTRICT')
          ) AS requirements(table_name, constraint_name, definition)
        LOOP
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = requirement.constraint_name
          ) THEN
            EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I %s', requirement.table_name, requirement.constraint_name, requirement.definition);
            INSERT INTO "p3_phase_1_migration_state" ("object_name")
            VALUES (requirement.constraint_name)
            ON CONFLICT DO NOTHING;
          END IF;
        END LOOP;
      END $$
    `);

    await this.createIndex(
      queryRunner,
      'idx_p3_member_cooperative_status',
      'CREATE INDEX "idx_p3_member_cooperative_status" ON "cooperative_members" ("cooperative_id", "status")',
    );
    await this.createIndex(
      queryRunner,
      'idx_p3_listing_cooperative_open',
      'CREATE INDEX "idx_p3_listing_cooperative_open" ON "bulk_listings" ("cooperative_id", "is_open")',
    );
    await this.createIndex(
      queryRunner,
      'idx_p3_contribution_listing',
      'CREATE INDEX "idx_p3_contribution_listing" ON "bulk_listing_contributions" ("bulk_listing_id")',
    );
    await this.createIndex(
      queryRunner,
      'idx_p3_contribution_farmer',
      'CREATE INDEX "idx_p3_contribution_farmer" ON "bulk_listing_contributions" ("farmer_id")',
    );
    await this.createIndex(
      queryRunner,
      'idx_p3_harvest_user_date',
      'CREATE INDEX "idx_p3_harvest_user_date" ON "harvest_schedules" ("user_id", "expected_harvest_date")',
    );
    await this.createIndex(
      queryRunner,
      'idx_p3_province_reference_province',
      'CREATE INDEX "idx_p3_province_reference_province" ON "cooperative_province_references" ("province_id")',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      DECLARE
        requirement record;
      BEGIN
        IF to_regclass('public.p3_phase_1_migration_state') IS NULL THEN
          RETURN;
        END IF;

        FOR requirement IN
          SELECT * FROM (VALUES
            ('cooperative_members', 'ck_p3_member_status'),
            ('cooperative_members', 'uq_p3_member_cooperative_farmer'),
            ('cooperative_members', 'fk_p3_member_cooperative'),
            ('cooperative_members', 'fk_p3_member_farmer'),
            ('bulk_listings', 'ck_p3_listing_quantity'),
            ('bulk_listings', 'ck_p3_listing_price'),
            ('bulk_listings', 'fk_p3_listing_cooperative'),
            ('bulk_listing_contributions', 'ck_p3_contribution_quantity'),
            ('bulk_listing_contributions', 'fk_p3_contribution_listing'),
            ('bulk_listing_contributions', 'fk_p3_contribution_farmer'),
            ('harvest_schedules', 'ck_p3_harvest_quantity'),
            ('harvest_schedules', 'fk_p3_harvest_owner'),
            ('cooperative_province_references', 'fk_p3_province_reference_cooperative'),
            ('cooperative_province_references', 'fk_p3_province_reference_province')
          ) AS requirements(table_name, constraint_name)
        LOOP
          IF EXISTS (
            SELECT 1 FROM "p3_phase_1_migration_state"
            WHERE "object_name" = requirement.constraint_name
          ) THEN
            EXECUTE format('ALTER TABLE IF EXISTS %I DROP CONSTRAINT IF EXISTS %I', requirement.table_name, requirement.constraint_name);
          END IF;
        END LOOP;

        FOR requirement IN
          SELECT * FROM (VALUES
            ('idx_p3_member_cooperative_status'),
            ('idx_p3_listing_cooperative_open'),
            ('idx_p3_contribution_listing'),
            ('idx_p3_contribution_farmer'),
            ('idx_p3_harvest_user_date'),
            ('idx_p3_province_reference_province')
          ) AS requirements(index_name)
        LOOP
          IF EXISTS (
            SELECT 1 FROM "p3_phase_1_migration_state"
            WHERE "object_name" = requirement.index_name
          ) THEN
            EXECUTE format('DROP INDEX IF EXISTS %I', requirement.index_name);
          END IF;
        END LOOP;

        IF EXISTS (SELECT 1 FROM "p3_phase_1_migration_state" WHERE "object_name" = 'cooperative_province_references') THEN
          DROP TABLE IF EXISTS "cooperative_province_references";
        END IF;
        IF EXISTS (SELECT 1 FROM "p3_phase_1_migration_state" WHERE "object_name" = 'harvest_schedules') THEN
          DROP TABLE IF EXISTS "harvest_schedules";
        END IF;
        IF EXISTS (SELECT 1 FROM "p3_phase_1_migration_state" WHERE "object_name" = 'bulk_listing_contributions') THEN
          DROP TABLE IF EXISTS "bulk_listing_contributions";
        END IF;
        IF EXISTS (SELECT 1 FROM "p3_phase_1_migration_state" WHERE "object_name" = 'bulk_listings') THEN
          DROP TABLE IF EXISTS "bulk_listings";
        END IF;
        IF EXISTS (SELECT 1 FROM "p3_phase_1_migration_state" WHERE "object_name" = 'cooperative_members') THEN
          DROP TABLE IF EXISTS "cooperative_members";
        END IF;

        DROP TABLE "p3_phase_1_migration_state";
      END $$
    `);
  }
}
