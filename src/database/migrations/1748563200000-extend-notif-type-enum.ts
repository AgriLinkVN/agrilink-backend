import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Extend the notif_type PostgreSQL enum to include the values added by P5:
 *   - new_review
 *   - review_reply
 *   - ad_approved
 *   - ad_rejected
 *   - user_locked
 *
 * Safe to run multiple times — uses IF NOT EXISTS via DO block.
 */
export class ExtendNotifTypeEnum1748563200000 implements MigrationInterface {
  name = 'ExtendNotifTypeEnum1748563200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const values = [
      'new_review',
      'review_reply',
      'ad_approved',
      'ad_rejected',
      'user_locked',
      'member_approved',
      'member_rejected',
      'member_suspended',
      'member_reactivated',
      'harvest_reminder',
    ];

    for (const v of values) {
      await queryRunner.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_enum
            WHERE enumlabel = '${v}'
              AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'notif_type')
          ) THEN
            ALTER TYPE "notif_type" ADD VALUE '${v}';
          END IF;
        END
        $$;
      `);
    }
  }

  public async down(): Promise<void> {
    // PostgreSQL doesn't support removing enum values — no-op.
  }
}
