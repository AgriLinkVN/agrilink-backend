import { MigrationInterface, QueryRunner } from "typeorm";

/** Fail-closed legacy recognition followed by the approved NOT NULL contract. */
export class BackfillAndContractAdPackageReferenceIdentity1800000004000 implements MigrationInterface {
  name = "BackfillAndContractAdPackageReferenceIdentity1800000004000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF (SELECT count(*) FROM "ad_packages"
            WHERE "name" = 'Banner chính (Carousel)'
              AND "type" = 'banner'
              AND "price" = 500000
              AND "duration_days" = 30
              AND "description" = 'Hiển thị trên carousel trang chủ'
              AND "is_active" IS TRUE
              AND "max_impressions" = 10000) > 1 THEN
          RAISE EXCEPTION 'Ambiguous legacy Ad Package fingerprint for HOMEPAGE_CAROUSEL';
        END IF;

        IF (SELECT count(*) FROM "ad_packages"
            WHERE "name" = 'Sản phẩm nổi bật'
              AND "type" = 'featured'
              AND "price" = 300000
              AND "duration_days" = 14
              AND "description" = 'Sản phẩm được gắn nhãn nổi bật'
              AND "is_active" IS TRUE
              AND "max_impressions" = 5000) > 1 THEN
          RAISE EXCEPTION 'Ambiguous legacy Ad Package fingerprint for FEATURED_PRODUCT';
        END IF;

        IF (SELECT count(*) FROM "ad_packages"
            WHERE "name" = 'Spotlight tuần'
              AND "type" = 'spotlight'
              AND "price" = 700000
              AND "duration_days" = 7
              AND "description" = 'Hiển thị spotlight nổi bật 7 ngày'
              AND "is_active" IS TRUE
              AND "max_impressions" = 20000) > 1 THEN
          RAISE EXCEPTION 'Ambiguous legacy Ad Package fingerprint for SPOTLIGHT_PLACEMENT';
        END IF;

        IF EXISTS (
          SELECT 1 FROM "ad_packages"
          WHERE "package_code" IS NOT NULL
            AND "package_code" NOT IN (
              'HOMEPAGE_CAROUSEL',
              'FEATURED_PRODUCT',
              'SPOTLIGHT_PLACEMENT'
            )
        ) THEN
          RAISE EXCEPTION 'Unexpected existing Ad Package package_code';
        END IF;

        IF EXISTS (
          SELECT 1 FROM "ad_packages"
          WHERE "name" = 'Banner chính (Carousel)'
            AND "type" = 'banner'
            AND "price" = 500000
            AND "duration_days" = 30
            AND "description" = 'Hiển thị trên carousel trang chủ'
            AND "is_active" IS TRUE
            AND "max_impressions" = 10000
            AND "package_code" IS NOT NULL
            AND "package_code" <> 'HOMEPAGE_CAROUSEL'
        ) THEN
          RAISE EXCEPTION 'Conflicting package_code for HOMEPAGE_CAROUSEL legacy fingerprint';
        END IF;

        IF EXISTS (
          SELECT 1 FROM "ad_packages"
          WHERE "name" = 'Sản phẩm nổi bật'
            AND "type" = 'featured'
            AND "price" = 300000
            AND "duration_days" = 14
            AND "description" = 'Sản phẩm được gắn nhãn nổi bật'
            AND "is_active" IS TRUE
            AND "max_impressions" = 5000
            AND "package_code" IS NOT NULL
            AND "package_code" <> 'FEATURED_PRODUCT'
        ) THEN
          RAISE EXCEPTION 'Conflicting package_code for FEATURED_PRODUCT legacy fingerprint';
        END IF;

        IF EXISTS (
          SELECT 1 FROM "ad_packages"
          WHERE "name" = 'Spotlight tuần'
            AND "type" = 'spotlight'
            AND "price" = 700000
            AND "duration_days" = 7
            AND "description" = 'Hiển thị spotlight nổi bật 7 ngày'
            AND "is_active" IS TRUE
            AND "max_impressions" = 20000
            AND "package_code" IS NOT NULL
            AND "package_code" <> 'SPOTLIGHT_PLACEMENT'
        ) THEN
          RAISE EXCEPTION 'Conflicting package_code for SPOTLIGHT_PLACEMENT legacy fingerprint';
        END IF;

        IF EXISTS (
          SELECT 1 FROM "ad_packages"
          WHERE "name" = 'Banner chính (Carousel)'
            AND "type" = 'banner'
            AND "price" = 500000
            AND "duration_days" = 30
            AND "description" = 'Hiển thị trên carousel trang chủ'
            AND "is_active" IS TRUE
            AND "max_impressions" = 10000
            AND "package_code" IS NULL
        ) AND EXISTS (
          SELECT 1 FROM "ad_packages"
          WHERE "package_code" = 'HOMEPAGE_CAROUSEL'
        ) THEN
          RAISE EXCEPTION 'HOMEPAGE_CAROUSEL is already assigned to another Package';
        END IF;

        IF EXISTS (
          SELECT 1 FROM "ad_packages"
          WHERE "name" = 'Sản phẩm nổi bật'
            AND "type" = 'featured'
            AND "price" = 300000
            AND "duration_days" = 14
            AND "description" = 'Sản phẩm được gắn nhãn nổi bật'
            AND "is_active" IS TRUE
            AND "max_impressions" = 5000
            AND "package_code" IS NULL
        ) AND EXISTS (
          SELECT 1 FROM "ad_packages"
          WHERE "package_code" = 'FEATURED_PRODUCT'
        ) THEN
          RAISE EXCEPTION 'FEATURED_PRODUCT is already assigned to another Package';
        END IF;

        IF EXISTS (
          SELECT 1 FROM "ad_packages"
          WHERE "name" = 'Spotlight tuần'
            AND "type" = 'spotlight'
            AND "price" = 700000
            AND "duration_days" = 7
            AND "description" = 'Hiển thị spotlight nổi bật 7 ngày'
            AND "is_active" IS TRUE
            AND "max_impressions" = 20000
            AND "package_code" IS NULL
        ) AND EXISTS (
          SELECT 1 FROM "ad_packages"
          WHERE "package_code" = 'SPOTLIGHT_PLACEMENT'
        ) THEN
          RAISE EXCEPTION 'SPOTLIGHT_PLACEMENT is already assigned to another Package';
        END IF;
      END;
      $$
    `);

    await queryRunner.query(`
      UPDATE "ad_packages"
      SET "package_code" = 'HOMEPAGE_CAROUSEL'
      WHERE "package_code" IS NULL
        AND "name" = 'Banner chính (Carousel)'
        AND "type" = 'banner'
        AND "price" = 500000
        AND "duration_days" = 30
        AND "description" = 'Hiển thị trên carousel trang chủ'
        AND "is_active" IS TRUE
        AND "max_impressions" = 10000
    `);

    await queryRunner.query(`
      UPDATE "ad_packages"
      SET "package_code" = 'FEATURED_PRODUCT'
      WHERE "package_code" IS NULL
        AND "name" = 'Sản phẩm nổi bật'
        AND "type" = 'featured'
        AND "price" = 300000
        AND "duration_days" = 14
        AND "description" = 'Sản phẩm được gắn nhãn nổi bật'
        AND "is_active" IS TRUE
        AND "max_impressions" = 5000
    `);

    await queryRunner.query(`
      UPDATE "ad_packages"
      SET "package_code" = 'SPOTLIGHT_PLACEMENT'
      WHERE "package_code" IS NULL
        AND "name" = 'Spotlight tuần'
        AND "type" = 'spotlight'
        AND "price" = 700000
        AND "duration_days" = 7
        AND "description" = 'Hiển thị spotlight nổi bật 7 ngày'
        AND "is_active" IS TRUE
        AND "max_impressions" = 20000
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM "ad_packages"
          WHERE "package_code" IS NOT NULL
            AND "package_code" NOT IN (
              'HOMEPAGE_CAROUSEL',
              'FEATURED_PRODUCT',
              'SPOTLIGHT_PLACEMENT'
            )
        ) THEN
          RAISE EXCEPTION 'Unexpected Ad Package package_code before NOT NULL contract';
        END IF;

        IF EXISTS (
          SELECT 1 FROM "ad_packages"
          WHERE "package_code" IS NULL
        ) THEN
          RAISE EXCEPTION 'Unresolved Ad Package row requires explicit package_code mapping';
        END IF;
      END;
      $$
    `);

    await queryRunner.query(
      'ALTER TABLE "ad_packages" ALTER COLUMN "package_code" SET NOT NULL',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "ad_packages" ALTER COLUMN "package_code" DROP NOT NULL',
    );
  }
}
