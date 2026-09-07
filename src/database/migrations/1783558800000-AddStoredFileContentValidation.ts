import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStoredFileContentValidation1783558800000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "stored_files" ADD COLUMN IF NOT EXISTS "detected_mime" varchar, ADD COLUMN IF NOT EXISTS "checksum_sha256" varchar');
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "stored_files" DROP COLUMN IF EXISTS "checksum_sha256", DROP COLUMN IF EXISTS "detected_mime"');
  }
}
