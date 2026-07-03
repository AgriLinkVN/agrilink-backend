import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductCertificationVerifyFlow1783209600000
  implements MigrationInterface
{
  name = 'AddProductCertificationVerifyFlow1783209600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_type WHERE typname = 'product_certifications_status_enum'
        ) THEN
          CREATE TYPE "product_certifications_status_enum" AS ENUM ('pending', 'verified', 'rejected');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE IF EXISTS "product_certifications"
      ADD COLUMN IF NOT EXISTS "status" "product_certifications_status_enum" NOT NULL DEFAULT 'pending'
    `);

    await queryRunner.query(`
      ALTER TABLE IF EXISTS "product_certifications"
      ADD COLUMN IF NOT EXISTS "verified_at" timestamptz
    `);

    await queryRunner.query(`
      ALTER TABLE IF EXISTS "product_certifications"
      ADD COLUMN IF NOT EXISTS "rejection_reason" text
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables WHERE table_name = 'product_certifications'
        ) THEN
          UPDATE "product_certifications"
          SET "status" = 'verified',
              "verified_at" = COALESCE("verified_at", "created_at")
          WHERE "is_verified" = true;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE IF EXISTS "product_certifications"
      DROP COLUMN IF EXISTS "rejection_reason"
    `);
    await queryRunner.query(`
      ALTER TABLE IF EXISTS "product_certifications"
      DROP COLUMN IF EXISTS "verified_at"
    `);
    await queryRunner.query(`
      ALTER TABLE IF EXISTS "product_certifications"
      DROP COLUMN IF EXISTS "status"
    `);
    await queryRunner.query('DROP TYPE IF EXISTS "product_certifications_status_enum"');
  }
}
