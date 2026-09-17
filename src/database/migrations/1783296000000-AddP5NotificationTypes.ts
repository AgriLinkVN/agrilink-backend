import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddP5NotificationTypes1783296000000
  implements MigrationInterface
{
  name = 'AddP5NotificationTypes1783296000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_type WHERE typname = 'notifications_type_enum'
        ) THEN
          ALTER TYPE "notifications_type_enum" ADD VALUE IF NOT EXISTS 'new_review';
          ALTER TYPE "notifications_type_enum" ADD VALUE IF NOT EXISTS 'review_reply';
          ALTER TYPE "notifications_type_enum" ADD VALUE IF NOT EXISTS 'ad_approved';
          ALTER TYPE "notifications_type_enum" ADD VALUE IF NOT EXISTS 'ad_rejected';
        END IF;
      END $$;
    `);
  }

  /**
   * Irreversible migration:
   * PostgreSQL enum values cannot be safely removed without rebuilding the enum.
   */
  public async down(): Promise<void> {
    return Promise.resolve();
  }
}
