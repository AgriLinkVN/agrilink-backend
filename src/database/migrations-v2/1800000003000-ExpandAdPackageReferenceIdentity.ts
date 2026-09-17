import { MigrationInterface, QueryRunner } from "typeorm";

/** Nullable expand only; canonical population and NOT NULL belong to C3C2A2. */
export class ExpandAdPackageReferenceIdentity1800000003000 implements MigrationInterface {
  name = "ExpandAdPackageReferenceIdentity1800000003000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "ad_packages" ADD COLUMN "package_code" varchar(64)',
    );
    await queryRunner.query(
      'ALTER TABLE "ad_packages" ADD CONSTRAINT "UQ_ad_packages_package_code" UNIQUE ("package_code")',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "ad_packages" DROP CONSTRAINT "UQ_ad_packages_package_code"',
    );
    await queryRunner.query(
      'ALTER TABLE "ad_packages" DROP COLUMN "package_code"',
    );
  }
}
