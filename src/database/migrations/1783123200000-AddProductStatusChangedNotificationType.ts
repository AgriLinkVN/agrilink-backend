import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductStatusChangedNotificationType1783123200000
  implements MigrationInterface
{
  name = 'AddProductStatusChangedNotificationType1783123200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_type WHERE typname = 'notifications_type_enum'
        ) THEN
          ALTER TYPE "notifications_type_enum"
          ADD VALUE IF NOT EXISTS 'product_status_changed';
        END IF;
      END $$;
    `);
  }

  public async down(): Promise<void> {
    return Promise.resolve();
  }
}
