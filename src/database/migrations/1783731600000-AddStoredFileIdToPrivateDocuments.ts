import { MigrationInterface, QueryRunner } from 'typeorm';

interface PrivateDocumentLink {
  table: string;
  sourceColumn: string;
  targetColumn: string;
  ownerColumn: string;
  verifiedColumn: string;
  assetType: 'KYC_IDENTITY' | 'BUSINESS_LICENSE';
  resourceType: string;
}

const PROFILE_LINKS: PrivateDocumentLink[] = [
  {
    table: 'farmer_profiles',
    sourceColumn: 'cccd_front_url',
    targetColumn: 'cccd_front_file_id',
    ownerColumn: 'user_id',
    verifiedColumn: 'is_kyc_verified',
    assetType: 'KYC_IDENTITY',
    resourceType: 'FARMER_PROFILE',
  },
  {
    table: 'farmer_profiles',
    sourceColumn: 'cccd_back_url',
    targetColumn: 'cccd_back_file_id',
    ownerColumn: 'user_id',
    verifiedColumn: 'is_kyc_verified',
    assetType: 'KYC_IDENTITY',
    resourceType: 'FARMER_PROFILE',
  },
  {
    table: 'cooperative_profiles',
    sourceColumn: 'cooperative_cert_url',
    targetColumn: 'cooperative_cert_file_id',
    ownerColumn: 'user_id',
    verifiedColumn: 'is_verified',
    assetType: 'BUSINESS_LICENSE',
    resourceType: 'COOPERATIVE_PROFILE',
  },
  {
    table: 'cooperative_profiles',
    sourceColumn: 'business_license_url',
    targetColumn: 'business_license_file_id',
    ownerColumn: 'user_id',
    verifiedColumn: 'is_verified',
    assetType: 'BUSINESS_LICENSE',
    resourceType: 'COOPERATIVE_PROFILE',
  },
  {
    table: 'cooperative_profiles',
    sourceColumn: 'representative_cccd_front_url',
    targetColumn: 'representative_cccd_front_file_id',
    ownerColumn: 'user_id',
    verifiedColumn: 'is_verified',
    assetType: 'KYC_IDENTITY',
    resourceType: 'COOPERATIVE_PROFILE',
  },
  {
    table: 'cooperative_profiles',
    sourceColumn: 'representative_cccd_back_url',
    targetColumn: 'representative_cccd_back_file_id',
    ownerColumn: 'user_id',
    verifiedColumn: 'is_verified',
    assetType: 'KYC_IDENTITY',
    resourceType: 'COOPERATIVE_PROFILE',
  },
  {
    table: 'cooperative_profiles',
    sourceColumn: 'members_list_url',
    targetColumn: 'members_list_file_id',
    ownerColumn: 'user_id',
    verifiedColumn: 'is_verified',
    assetType: 'BUSINESS_LICENSE',
    resourceType: 'COOPERATIVE_PROFILE',
  },
  {
    table: 'enterprise_profiles',
    sourceColumn: 'business_license_url',
    targetColumn: 'business_license_file_id',
    ownerColumn: 'user_id',
    verifiedColumn: 'is_verified',
    assetType: 'BUSINESS_LICENSE',
    resourceType: 'ENTERPRISE_PROFILE',
  },
  {
    table: 'supplier_profiles',
    sourceColumn: 'business_license_url',
    targetColumn: 'business_license_file_id',
    ownerColumn: 'user_id',
    verifiedColumn: 'is_verified',
    assetType: 'BUSINESS_LICENSE',
    resourceType: 'SUPPLIER_PROFILE',
  },
];

const MIME_SQL = (column: string): string => `CASE
  WHEN lower(${column}) LIKE '%.pdf' THEN 'application/pdf'
  WHEN lower(${column}) LIKE '%.png' THEN 'image/png'
  WHEN lower(${column}) LIKE '%.jpg' OR lower(${column}) LIKE '%.jpeg' THEN 'image/jpeg'
  ELSE 'application/octet-stream'
END`;

export class AddStoredFileIdToPrivateDocuments1783731600000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "product_certifications" ADD COLUMN IF NOT EXISTS "stored_file_id" uuid',
    );

    for (const link of PROFILE_LINKS) {
      await queryRunner.query(
        `ALTER TABLE "${link.table}" ADD COLUMN IF NOT EXISTS "${link.targetColumn}" uuid`,
      );
    }

    await this.backfillProductCertifications(queryRunner);
    if (await queryRunner.hasTable('quality_certificates')) {
      await queryRunner.query(
        'ALTER TABLE "quality_certificates" ADD COLUMN IF NOT EXISTS "stored_file_id" uuid',
      );
      await this.backfillQualityCertificates(queryRunner);
      await queryRunner.query(
        'CREATE INDEX IF NOT EXISTS "IDX_quality_certificates_stored_file_id" ON "quality_certificates" ("stored_file_id")',
      );
      await this.addForeignKey(
        queryRunner,
        'quality_certificates',
        'stored_file_id',
        'FK_quality_cert_stored_file',
      );
    }
    for (const link of PROFILE_LINKS) {
      await this.backfillProfileLink(queryRunner, link);
    }

    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_product_certifications_stored_file_id" ON "product_certifications" ("stored_file_id")',
    );
    await this.addForeignKey(
      queryRunner,
      'product_certifications',
      'stored_file_id',
      'FK_pc_stored_file',
    );

    for (const link of PROFILE_LINKS) {
      const indexName = `IDX_${link.table}_${link.targetColumn}`.slice(0, 63);
      const constraintName = `FK_${link.table}_${link.targetColumn}`.slice(
        0,
        63,
      );
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "${indexName}" ON "${link.table}" ("${link.targetColumn}")`,
      );
      await this.addForeignKey(
        queryRunner,
        link.table,
        link.targetColumn,
        constraintName,
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('quality_certificates')) {
      await this.dropForeignKey(
        queryRunner,
        'quality_certificates',
        'FK_quality_cert_stored_file',
      );
      await queryRunner.query(
        'DROP INDEX IF EXISTS "IDX_quality_certificates_stored_file_id"',
      );
      await queryRunner.query(
        'ALTER TABLE "quality_certificates" DROP COLUMN IF EXISTS "stored_file_id"',
      );
    }
    await this.dropForeignKey(
      queryRunner,
      'product_certifications',
      'FK_pc_stored_file',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_product_certifications_stored_file_id"',
    );
    await queryRunner.query(
      'ALTER TABLE "product_certifications" DROP COLUMN IF EXISTS "stored_file_id"',
    );

    for (const link of [...PROFILE_LINKS].reverse()) {
      const indexName = `IDX_${link.table}_${link.targetColumn}`.slice(0, 63);
      const constraintName = `FK_${link.table}_${link.targetColumn}`.slice(
        0,
        63,
      );
      await this.dropForeignKey(queryRunner, link.table, constraintName);
      await queryRunner.query(`DROP INDEX IF EXISTS "${indexName}"`);
      await queryRunner.query(
        `ALTER TABLE "${link.table}" DROP COLUMN IF EXISTS "${link.targetColumn}"`,
      );
    }
  }

  private async backfillProductCertifications(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "stored_files" (
        "id", "owner_id", "assetType", "provider", "visibility", "status",
        "object_key", "original_name", "extension", "declared_mime",
        "size_bytes", "expires_at", "resource_type", "resource_id",
        "created_at", "updated_at", "deletion_attempts"
      )
      SELECT
        uuid_generate_v4(),
        product."seller_id"::uuid,
        'CERTIFICATION',
        'SUPABASE',
        'PRIVATE',
        CASE
          WHEN certification."status" = 'verified' THEN 'ACTIVE'
          WHEN certification."status" = 'rejected' THEN 'FAILED'
          ELSE 'QUARANTINED'
        END,
        certification."document_url",
        regexp_replace(certification."document_url", '^.*/', ''),
        lower(substring(certification."document_url" from '\\.([A-Za-z0-9]{1,10})$')),
        ${MIME_SQL('certification."document_url"')},
        0,
        now(),
        'PRODUCT',
        product."id"::varchar,
        now(),
        now(),
        0
      FROM "product_certifications" certification
      INNER JOIN "products" product ON product."id" = certification."product_id"
      WHERE certification."stored_file_id" IS NULL
        AND certification."document_url" IS NOT NULL
        AND btrim(certification."document_url") <> ''
        AND certification."document_url" !~* '^https?://'
      ON CONFLICT ("object_key") DO NOTHING
    `);

    await queryRunner.query(`
      UPDATE "product_certifications" certification
      SET "stored_file_id" = stored."id"
      FROM "products" product, "stored_files" stored
      WHERE product."id" = certification."product_id"
        AND certification."stored_file_id" IS NULL
        AND certification."document_url" IS NOT NULL
        AND btrim(certification."document_url") <> ''
        AND certification."document_url" !~* '^https?://'
        AND stored."owner_id" = product."seller_id"::uuid
        AND stored."provider" = 'SUPABASE'
        AND stored."visibility" = 'PRIVATE'
        AND stored."assetType" = 'CERTIFICATION'
        AND stored."status" IN ('QUARANTINED', 'ACTIVE', 'FAILED')
        AND stored."object_key" = certification."document_url"
        AND stored."resource_type" = 'PRODUCT'
        AND stored."resource_id" = product."id"::varchar
    `);
  }

  private async backfillQualityCertificates(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "stored_files" (
        "id", "owner_id", "assetType", "provider", "visibility", "status",
        "object_key", "original_name", "extension", "declared_mime",
        "size_bytes", "expires_at", "resource_type", "resource_id",
        "created_at", "updated_at", "deletion_attempts"
      )
      SELECT
        uuid_generate_v4(),
        certificate."issued_to",
        'CERTIFICATION',
        'SUPABASE',
        'PRIVATE',
        CASE
          WHEN certificate."status" = 'active' THEN 'ACTIVE'
          WHEN certificate."status" = 'revoked' OR certificate."revoked_reason" IS NOT NULL THEN 'FAILED'
          ELSE 'QUARANTINED'
        END,
        certificate."document_url",
        regexp_replace(certificate."document_url", '^.*/', ''),
        lower(substring(certificate."document_url" from '\\.([A-Za-z0-9]{1,10})$')),
        ${MIME_SQL('certificate."document_url"')},
        0,
        now(),
        'QUALITY_CERTIFICATE',
        certificate."id"::varchar,
        now(),
        now(),
        0
      FROM "quality_certificates" certificate
      WHERE certificate."stored_file_id" IS NULL
        AND certificate."document_url" IS NOT NULL
        AND btrim(certificate."document_url") <> ''
        AND certificate."document_url" !~* '^https?://'
      ON CONFLICT ("object_key") DO NOTHING
    `);

    await queryRunner.query(`
      UPDATE "quality_certificates" certificate
      SET "stored_file_id" = stored."id"
      FROM "stored_files" stored
      WHERE certificate."stored_file_id" IS NULL
        AND certificate."document_url" IS NOT NULL
        AND btrim(certificate."document_url") <> ''
        AND certificate."document_url" !~* '^https?://'
        AND stored."owner_id" = certificate."issued_to"
        AND stored."provider" = 'SUPABASE'
        AND stored."visibility" = 'PRIVATE'
        AND stored."assetType" = 'CERTIFICATION'
        AND stored."status" IN ('QUARANTINED', 'ACTIVE', 'FAILED')
        AND stored."object_key" = certificate."document_url"
        AND stored."resource_type" = 'QUALITY_CERTIFICATE'
        AND stored."resource_id" = certificate."id"::varchar
    `);
  }

  private async backfillProfileLink(
    queryRunner: QueryRunner,
    link: PrivateDocumentLink,
  ): Promise<void> {
    const source = `profile."${link.sourceColumn}"`;
    await queryRunner.query(`
      INSERT INTO "stored_files" (
        "id", "owner_id", "assetType", "provider", "visibility", "status",
        "object_key", "original_name", "extension", "declared_mime",
        "size_bytes", "expires_at", "resource_type", "resource_id",
        "created_at", "updated_at", "deletion_attempts"
      )
      SELECT
        uuid_generate_v4(),
        profile."${link.ownerColumn}",
        '${link.assetType}',
        'SUPABASE',
        'PRIVATE',
        CASE
          WHEN profile."${link.verifiedColumn}" = true THEN 'ACTIVE'
          WHEN profile."rejection_reason" IS NOT NULL THEN 'FAILED'
          ELSE 'QUARANTINED'
        END,
        ${source},
        regexp_replace(${source}, '^.*/', ''),
        lower(substring(${source} from '\\.([A-Za-z0-9]{1,10})$')),
        ${MIME_SQL(source)},
        0,
        now(),
        '${link.resourceType}',
        profile."id"::varchar,
        now(),
        now(),
        0
      FROM "${link.table}" profile
      WHERE profile."${link.targetColumn}" IS NULL
        AND ${source} IS NOT NULL
        AND btrim(${source}) <> ''
        AND ${source} !~* '^https?://'
      ON CONFLICT ("object_key") DO NOTHING
    `);

    await queryRunner.query(`
      UPDATE "${link.table}" profile
      SET "${link.targetColumn}" = stored."id"
      FROM "stored_files" stored
      WHERE profile."${link.targetColumn}" IS NULL
        AND ${source} IS NOT NULL
        AND btrim(${source}) <> ''
        AND ${source} !~* '^https?://'
        AND stored."owner_id" = profile."${link.ownerColumn}"
        AND stored."provider" = 'SUPABASE'
        AND stored."visibility" = 'PRIVATE'
        AND stored."assetType" = '${link.assetType}'
        AND stored."status" IN ('QUARANTINED', 'ACTIVE', 'FAILED')
        AND stored."object_key" = ${source}
        AND stored."resource_type" = '${link.resourceType}'
        AND stored."resource_id" = profile."id"::varchar
    `);
  }

  private async addForeignKey(
    queryRunner: QueryRunner,
    table: string,
    column: string,
    constraint: string,
  ): Promise<void> {
    await queryRunner.query(`
      DO $phase9$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint existing_constraint
          INNER JOIN pg_class constrained_table
            ON constrained_table.oid = existing_constraint.conrelid
          INNER JOIN pg_namespace table_namespace
            ON table_namespace.oid = constrained_table.relnamespace
          WHERE existing_constraint.conname = '${constraint}'
            AND constrained_table.relname = '${table}'
            AND table_namespace.nspname = current_schema()
        ) THEN
          ALTER TABLE "${table}"
          ADD CONSTRAINT "${constraint}"
          FOREIGN KEY ("${column}") REFERENCES "stored_files"("id")
          ON DELETE SET NULL;
        END IF;
      END
      $phase9$
    `);
  }

  private async dropForeignKey(
    queryRunner: QueryRunner,
    table: string,
    constraint: string,
  ): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "${constraint}"`,
    );
  }
}
