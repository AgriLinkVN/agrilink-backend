import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Convert ad_campaigns.target_provinces from TEXT (JSON-string) to JSONB.
 * Falls back to '[]' for any rows containing invalid JSON.
 */
export class AdCampaignsTargetProvincesJsonb1748563300000 implements MigrationInterface {
  name = 'AdCampaignsTargetProvincesJsonb1748563300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Coerce invalid JSON to '[]' first, then alter the column type
    await queryRunner.query(`
      UPDATE "ad_campaigns"
        SET "target_provinces" = '[]'
        WHERE "target_provinces" IS NULL
           OR "target_provinces" = ''
           OR "target_provinces" !~ '^\\[.*\\]$'
    `);

    await queryRunner.query(`
      ALTER TABLE "ad_campaigns"
        ALTER COLUMN "target_provinces" TYPE jsonb
        USING "target_provinces"::jsonb
    `);

    await queryRunner.query(`
      ALTER TABLE "ad_campaigns"
        ALTER COLUMN "target_provinces" SET DEFAULT '[]'::jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "ad_campaigns"
        ALTER COLUMN "target_provinces" DROP DEFAULT
    `);

    await queryRunner.query(`
      ALTER TABLE "ad_campaigns"
        ALTER COLUMN "target_provinces" TYPE text
        USING "target_provinces"::text
    `);
  }
}
