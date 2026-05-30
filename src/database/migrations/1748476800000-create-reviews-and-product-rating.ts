import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateReviewsAndProductRating1748476800000 implements MigrationInterface {
  name = 'CreateReviewsAndProductRating1748476800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Products: add avg_rating + sold_count ─────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "products"
        ADD COLUMN IF NOT EXISTS "avg_rating"  NUMERIC(3,1) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "sold_count"  INTEGER       NOT NULL DEFAULT 0
    `);

    // ── Reviews table ─────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "reviews" (
        "id"                   UUID                     NOT NULL DEFAULT gen_random_uuid(),
        "reviewer_id"          UUID                     NOT NULL,
        "reviewee_id"          UUID                     NOT NULL,
        "product_id"           UUID,
        "rating"               SMALLINT                 NOT NULL
                               CONSTRAINT "chk_rating_range" CHECK (rating >= 1 AND rating <= 5),
        "comment"              TEXT,
        "images"               TEXT,
        "is_verified_purchase" BOOLEAN                  NOT NULL DEFAULT TRUE,
        "seller_reply"         TEXT,
        "seller_reply_at"      TIMESTAMPTZ,
        "is_hidden"            BOOLEAN                  NOT NULL DEFAULT FALSE,
        "hidden_reason"        TEXT,
        "created_at"           TIMESTAMPTZ              NOT NULL DEFAULT now(),
        CONSTRAINT "pk_reviews" PRIMARY KEY ("id"),
        CONSTRAINT "fk_reviews_reviewer"
          FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE,
        CONSTRAINT "fk_reviews_reviewee"
          FOREIGN KEY ("reviewee_id") REFERENCES "users"("id") ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE,
        CONSTRAINT "fk_reviews_product"
          FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL DEFERRABLE INITIALLY IMMEDIATE,
        CONSTRAINT "uq_reviewer_product"
          UNIQUE ("reviewer_id", "product_id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_review_product"
        ON "reviews" ("product_id", "is_hidden")
    `);

    // Index for "reviews addressed to me" seller queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_review_reviewee"
        ON "reviews" ("reviewee_id", "is_hidden", "created_at" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_review_reviewee"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_review_product"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "reviews"`);
    await queryRunner.query(`
      ALTER TABLE "products"
        DROP COLUMN IF EXISTS "avg_rating",
        DROP COLUMN IF EXISTS "sold_count"
    `);
  }
}
