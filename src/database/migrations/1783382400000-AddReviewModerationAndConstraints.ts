import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReviewModerationAndConstraints1783382400000
  implements MigrationInterface
{
  name = 'AddReviewModerationAndConstraints1783382400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE IF EXISTS "reviews"
        ADD COLUMN IF NOT EXISTS "reviewee_id" uuid,
        ADD COLUMN IF NOT EXISTS "images" text[] NOT NULL DEFAULT ARRAY[]::text[],
        ADD COLUMN IF NOT EXISTS "is_verified_purchase" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "seller_reply" text,
        ADD COLUMN IF NOT EXISTS "seller_reply_at" timestamptz,
        ADD COLUMN IF NOT EXISTS "is_hidden" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "hidden_reason" text,
        ADD COLUMN IF NOT EXISTS "hidden_by" uuid,
        ADD COLUMN IF NOT EXISTS "hidden_at" timestamptz,
        ADD COLUMN IF NOT EXISTS "updated_at" timestamptz NOT NULL DEFAULT NOW()
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'reviews' AND column_name = 'reply'
        ) THEN
          UPDATE "reviews"
          SET "seller_reply" = COALESCE("seller_reply", "reply")
          WHERE "reply" IS NOT NULL;
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'reviews' AND column_name = 'replied_at'
        ) THEN
          UPDATE "reviews"
          SET "seller_reply_at" = COALESCE("seller_reply_at", "replied_at")
          WHERE "replied_at" IS NOT NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      UPDATE "reviews" AS review
      SET "reviewee_id" = product."seller_id"
      FROM "products" AS product
      WHERE review."product_id" = product."id"
        AND review."reviewee_id" IS NULL
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_reviews_reviewer_product_unique"
      ON "reviews" ("reviewer_id", "product_id")
      WHERE "product_id" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_reviews_reviewer_product_unique"',
    );
    await queryRunner.query(`
      ALTER TABLE IF EXISTS "reviews"
        DROP COLUMN IF EXISTS "hidden_at",
        DROP COLUMN IF EXISTS "hidden_by",
        DROP COLUMN IF EXISTS "hidden_reason",
        DROP COLUMN IF EXISTS "is_hidden"
    `);
  }
}
