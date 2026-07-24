import { createHash, randomUUID } from 'crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../database/data-source';
import { validatePrivateContent } from '../modules/storage/application/content-validation.policy';

type RolloutMode = 'plan' | 'apply' | 'finalize' | 'verify';
type PrivateAssetType = 'CERTIFICATION' | 'KYC_IDENTITY' | 'BUSINESS_LICENSE';

interface SourceDefinition {
  key: string;
  table: string;
  sourceColumn: string;
  targetColumn: string;
  assetType: PrivateAssetType;
  resourceType: string;
  ownerExpression: string;
  resourceExpression: string;
  optional?: boolean;
  selectSql: string;
}

interface LegacyCandidate {
  sourceKey: string;
  recordId: string;
  ownerId: string;
  resourceId: string;
  source: string;
  storedFileId: string | null;
  approved: boolean;
  rejected: boolean;
}

const MAX_PRIVATE_DOCUMENT_BYTES = 10 * 1024 * 1024;
const MAX_EXTERNAL_REDIRECTS = 3;
const ALLOWED_EXTERNAL_HOSTS = [
  'res.cloudinary.com',
  '.supabase.co',
  '.supabase.in',
];

export const rolloutDataSource = new DataSource({
  ...dataSourceOptions,
  logging: false,
  synchronize: false,
});

export const PRIVATE_DOCUMENT_SOURCES: SourceDefinition[] = [
  {
    key: 'product_certification',
    table: 'product_certifications',
    sourceColumn: 'document_url',
    targetColumn: 'stored_file_id',
    assetType: 'CERTIFICATION',
    resourceType: 'PRODUCT',
    ownerExpression:
      '(SELECT seller_id FROM products WHERE id = legacy.product_id)',
    resourceExpression: 'legacy.product_id',
    selectSql: `
      SELECT certification.id::text AS "recordId",
        product.seller_id::text AS "ownerId",
        product.id::text AS "resourceId",
        certification.document_url AS "source",
        certification.stored_file_id::text AS "storedFileId",
        (certification.status = 'verified') AS "approved",
        (certification.status = 'rejected') AS "rejected"
      FROM product_certifications certification
      INNER JOIN products product ON product.id = certification.product_id
      WHERE certification.document_url IS NOT NULL
    `,
  },
  {
    key: 'quality_certificate',
    table: 'quality_certificates',
    sourceColumn: 'document_url',
    targetColumn: 'stored_file_id',
    assetType: 'CERTIFICATION',
    resourceType: 'QUALITY_CERTIFICATE',
    ownerExpression: 'legacy.issued_to',
    resourceExpression: 'legacy.id',
    optional: true,
    selectSql: `
      SELECT certificate.id::text AS "recordId",
        certificate.issued_to::text AS "ownerId",
        certificate.id::text AS "resourceId",
        certificate.document_url AS "source",
        certificate.stored_file_id::text AS "storedFileId",
        (certificate.status = 'active') AS "approved",
        (certificate.status = 'revoked' OR certificate.revoked_reason IS NOT NULL) AS "rejected"
      FROM quality_certificates certificate
      WHERE certificate.document_url IS NOT NULL
    `,
  },
  profileSource(
    'farmer_cccd_front',
    'farmer_profiles',
    'cccd_front_url',
    'cccd_front_file_id',
    'KYC_IDENTITY',
    'FARMER_PROFILE',
    'is_kyc_verified',
  ),
  profileSource(
    'farmer_cccd_back',
    'farmer_profiles',
    'cccd_back_url',
    'cccd_back_file_id',
    'KYC_IDENTITY',
    'FARMER_PROFILE',
    'is_kyc_verified',
  ),
  profileSource(
    'cooperative_certificate',
    'cooperative_profiles',
    'cooperative_cert_url',
    'cooperative_cert_file_id',
    'BUSINESS_LICENSE',
    'COOPERATIVE_PROFILE',
    'is_verified',
  ),
  profileSource(
    'cooperative_business_license',
    'cooperative_profiles',
    'business_license_url',
    'business_license_file_id',
    'BUSINESS_LICENSE',
    'COOPERATIVE_PROFILE',
    'is_verified',
  ),
  profileSource(
    'cooperative_representative_cccd_front',
    'cooperative_profiles',
    'representative_cccd_front_url',
    'representative_cccd_front_file_id',
    'KYC_IDENTITY',
    'COOPERATIVE_PROFILE',
    'is_verified',
  ),
  profileSource(
    'cooperative_representative_cccd_back',
    'cooperative_profiles',
    'representative_cccd_back_url',
    'representative_cccd_back_file_id',
    'KYC_IDENTITY',
    'COOPERATIVE_PROFILE',
    'is_verified',
  ),
  profileSource(
    'cooperative_members_list',
    'cooperative_profiles',
    'members_list_url',
    'members_list_file_id',
    'BUSINESS_LICENSE',
    'COOPERATIVE_PROFILE',
    'is_verified',
  ),
  profileSource(
    'enterprise_business_license',
    'enterprise_profiles',
    'business_license_url',
    'business_license_file_id',
    'BUSINESS_LICENSE',
    'ENTERPRISE_PROFILE',
    'is_verified',
  ),
  profileSource(
    'supplier_business_license',
    'supplier_profiles',
    'business_license_url',
    'business_license_file_id',
    'BUSINESS_LICENSE',
    'SUPPLIER_PROFILE',
    'is_verified',
  ),
];

function profileSource(
  key: string,
  table: string,
  sourceColumn: string,
  targetColumn: string,
  assetType: PrivateAssetType,
  resourceType: string,
  verifiedColumn: string,
): SourceDefinition {
  return {
    key,
    table,
    sourceColumn,
    targetColumn,
    assetType,
    resourceType,
    ownerExpression: 'legacy.user_id',
    resourceExpression: 'legacy.id',
    selectSql: `
      SELECT profile.id::text AS "recordId",
        profile.user_id::text AS "ownerId",
        profile.id::text AS "resourceId",
        profile.${sourceColumn} AS "source",
        profile.${targetColumn}::text AS "storedFileId",
        profile.${verifiedColumn} AS "approved",
        (profile.rejection_reason IS NOT NULL) AS "rejected"
      FROM ${table} profile
      WHERE profile.${sourceColumn} IS NOT NULL
    `,
  };
}

function parseMode(value: string | undefined): RolloutMode {
  const mode = value ?? 'plan';
  if (!['plan', 'apply', 'finalize', 'verify'].includes(mode)) {
    throw new Error('Mode must be one of: plan, apply, finalize, verify');
  }
  return mode as RolloutMode;
}

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function sourceFingerprint(source: string): string {
  return createHash('sha256').update(source).digest('hex').slice(0, 12);
}

function isExternalSource(source: string): boolean {
  return /^https:\/\//i.test(source);
}

export function assertAllowedExternalSource(source: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(source);
  } catch {
    throw new Error('Legacy external source URL is invalid');
  }
  if (parsed.protocol !== 'https:') {
    throw new Error('Legacy external source must use HTTPS');
  }
  const allowed = ALLOWED_EXTERNAL_HOSTS.some((host) =>
    host.startsWith('.')
      ? parsed.hostname.endsWith(host)
      : parsed.hostname === host,
  );
  if (!allowed) {
    throw new Error('Legacy external source host is not approved');
  }
  return parsed;
}

async function fetchAllowedExternalSource(source: string): Promise<Response> {
  let current = assertAllowedExternalSource(source);
  for (let redirects = 0; redirects <= MAX_EXTERNAL_REDIRECTS; redirects += 1) {
    const response = await fetch(current, {
      signal: AbortSignal.timeout(20_000),
      redirect: 'manual',
    });
    if (response.status < 300 || response.status >= 400) {
      return response;
    }
    if (redirects === MAX_EXTERNAL_REDIRECTS) {
      throw new Error('Legacy external source exceeded the redirect limit');
    }
    const location = response.headers.get('location');
    if (!location) {
      throw new Error('Legacy external source redirect has no location');
    }
    await response.body?.cancel();
    let redirected: URL;
    try {
      redirected = new URL(location, current);
    } catch {
      throw new Error('Legacy external source redirect URL is invalid');
    }
    current = assertAllowedExternalSource(redirected.toString());
  }
  throw new Error('Legacy external source could not be resolved');
}

async function readBoundedResponse(response: Response): Promise<Buffer> {
  const declaredLength = Number(response.headers.get('content-length') ?? 0);
  if (
    Number.isFinite(declaredLength) &&
    declaredLength > MAX_PRIVATE_DOCUMENT_BYTES
  ) {
    throw new Error('Legacy source exceeds the private document size limit');
  }
  if (!response.body) {
    throw new Error('Legacy source returned an empty response');
  }

  const chunks: Buffer[] = [];
  let totalBytes = 0;
  const reader = response.body.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_PRIVATE_DOCUMENT_BYTES) {
        await reader.cancel();
        throw new Error(
          'Legacy source exceeds the private document size limit',
        );
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks, totalBytes);
}

async function loadCandidates(): Promise<LegacyCandidate[]> {
  const results = await Promise.all(
    PRIVATE_DOCUMENT_SOURCES.map(async (source) => {
      if (source.optional && !(await tableExists(source.table))) return [];
      const rows = (await rolloutDataSource.query(source.selectSql)) as Omit<
        LegacyCandidate,
        'sourceKey'
      >[];
      return rows.map((row) => ({ ...row, sourceKey: source.key }));
    }),
  );
  return results.flat();
}

async function tableExists(table: string): Promise<boolean> {
  const [result] = (await rolloutDataSource.query(
    'SELECT to_regclass($1) AS "relation"',
    [`public.${table}`],
  )) as Array<{ relation: string | null }>;
  return !!result.relation;
}

export async function downloadExternalSource(source: string): Promise<Buffer> {
  const response = await fetchAllowedExternalSource(source);
  if (!response.ok) {
    throw new Error(`Legacy source returned HTTP ${response.status}`);
  }
  return readBoundedResponse(response);
}

async function migrateExternalCandidate(
  candidate: LegacyCandidate,
  source: SourceDefinition,
  supabase: SupabaseClient,
  bucket: string,
  environmentPrefix: string,
): Promise<void> {
  const content = await downloadExternalSource(candidate.source);
  const validation = await validatePrivateContent(content);
  const fileId = randomUUID();
  const objectKey = `${environmentPrefix}/owners/${candidate.ownerId}/${source.assetType}/${fileId}.${validation.extension}`;
  const originalName = `legacy-${source.key}-${candidate.recordId}.${validation.extension}`;
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(objectKey, content, {
      contentType: validation.detectedMime,
      upsert: false,
    });
  if (uploadError) {
    throw new Error('Private provider upload failed');
  }

  const runner = rolloutDataSource.createQueryRunner();
  await runner.connect();
  await runner.startTransaction();
  try {
    await runner.query(
      `
        INSERT INTO stored_files (
          id, owner_id, "assetType", provider, visibility, status,
          object_key, original_name, extension, declared_mime, detected_mime,
          checksum_sha256, size_bytes, expires_at, resource_type, resource_id,
          created_at, updated_at, deletion_attempts
        )
        VALUES (
          $1, $2, $3, 'SUPABASE', 'PRIVATE', $4,
          $5, $6, $7, $8, $8, $9, $10, now(), $11, $12, now(), now(), 0
        )
      `,
      [
        fileId,
        candidate.ownerId,
        source.assetType,
        candidate.approved
          ? 'ACTIVE'
          : candidate.rejected
            ? 'FAILED'
            : 'QUARANTINED',
        objectKey,
        originalName,
        validation.extension,
        validation.detectedMime,
        validation.checksumSha256,
        content.byteLength,
        source.resourceType,
        candidate.resourceId,
      ],
    );
    const update = (await runner.query(
      `
        UPDATE "${source.table}"
        SET "${source.targetColumn}" = $1
        WHERE "id" = $2 AND "${source.targetColumn}" IS NULL
        RETURNING "id"
      `,
      [fileId, candidate.recordId],
    )) as unknown[];
    if (update.length !== 1) {
      throw new Error('Legacy record was already migrated concurrently');
    }
    await runner.commitTransaction();
  } catch (error) {
    await runner.rollbackTransaction();
    await supabase.storage.from(bucket).remove([objectKey]);
    throw error;
  } finally {
    await runner.release();
  }
}

async function hydrateRetainedCandidate(
  candidate: LegacyCandidate,
  source: SourceDefinition,
  supabase: SupabaseClient,
  bucket: string,
): Promise<void> {
  if (!candidate.storedFileId) {
    throw new Error('Retained provider object is missing stored-file metadata');
  }
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(candidate.source, 60);
  if (error || !data?.signedUrl) {
    throw new Error('Retained private provider object could not be authorized');
  }
  const content = await downloadExternalSource(data.signedUrl);
  const validation = await validatePrivateContent(content);
  const update = (await rolloutDataSource.query(
    `
      UPDATE stored_files
      SET extension = $1,
        declared_mime = $2,
        detected_mime = $2,
        checksum_sha256 = $3,
        size_bytes = $4,
        updated_at = now()
      WHERE id = $5
        AND owner_id = $6
        AND provider = 'SUPABASE'
        AND visibility = 'PRIVATE'
        AND "assetType" = $7
        AND object_key = $8
        AND resource_type = $9
        AND resource_id = $10
      RETURNING id
    `,
    [
      validation.extension,
      validation.detectedMime,
      validation.checksumSha256,
      content.byteLength,
      candidate.storedFileId,
      candidate.ownerId,
      source.assetType,
      candidate.source,
      source.resourceType,
      candidate.resourceId,
    ],
  )) as unknown[];
  if (update.length !== 1) {
    throw new Error('Retained provider metadata does not match its resource');
  }
}

async function externalSourceIsRetired(source: string): Promise<boolean> {
  assertAllowedExternalSource(source);
  try {
    const response = await fetch(source, {
      method: 'HEAD',
      signal: AbortSignal.timeout(10_000),
      redirect: 'manual',
    });
    return response.status === 404 || response.status === 410;
  } catch {
    return false;
  }
}

async function finalizeCandidate(
  candidate: LegacyCandidate,
  source: SourceDefinition,
): Promise<boolean> {
  if (!candidate.storedFileId) return false;
  if (
    isExternalSource(candidate.source) &&
    !(await externalSourceIsRetired(candidate.source))
  ) {
    return false;
  }
  await rolloutDataSource.query(
    `
      UPDATE "${source.table}"
      SET "${source.sourceColumn}" = NULL
      WHERE "id" = $1 AND "${source.targetColumn}" = $2
    `,
    [candidate.recordId, candidate.storedFileId],
  );
  return true;
}

export async function verifyRollout(): Promise<void> {
  let legacySources = 0;
  let invalidLinks = 0;
  for (const source of PRIVATE_DOCUMENT_SOURCES) {
    if (source.optional && !(await tableExists(source.table))) continue;
    const [result] = (await rolloutDataSource.query(`
      SELECT
        count(*) FILTER (WHERE legacy."${source.sourceColumn}" IS NOT NULL)::int AS "legacySources",
        count(*) FILTER (
          WHERE legacy."${source.targetColumn}" IS NOT NULL
            AND (
              stored.id IS NULL
              OR stored.owner_id::text IS DISTINCT FROM owner_ref.owner_id::text
              OR stored.provider <> 'SUPABASE'
              OR stored.visibility <> 'PRIVATE'
              OR stored."assetType" <> '${source.assetType}'
              OR stored.status NOT IN ('QUARANTINED', 'ACTIVE', 'FAILED')
              OR stored.resource_type IS DISTINCT FROM '${source.resourceType}'
              OR stored.resource_id IS DISTINCT FROM resource_ref.resource_id::text
            )
        )::int AS "invalidLinks"
      FROM "${source.table}" legacy
      LEFT JOIN stored_files stored
        ON stored.id = legacy."${source.targetColumn}"
      CROSS JOIN LATERAL (
        SELECT ${source.ownerExpression} AS owner_id
      ) owner_ref
      CROSS JOIN LATERAL (
        SELECT ${source.resourceExpression} AS resource_id
      ) resource_ref
    `)) as Array<{ legacySources: number; invalidLinks: number }>;
    legacySources += Number(result.legacySources);
    invalidLinks += Number(result.invalidLinks);
  }

  const [policyResult] = (await rolloutDataSource.query(`
    SELECT count(*)::int AS "invalidPrivateMetadata"
    FROM stored_files
    WHERE "assetType" IN ('CERTIFICATION', 'KYC_IDENTITY', 'BUSINESS_LICENSE')
      AND resource_id IS NOT NULL
      AND (
        provider <> 'SUPABASE'
        OR visibility <> 'PRIVATE'
        OR size_bytes <= 0
        OR detected_mime IS NULL
        OR detected_mime NOT IN ('application/pdf', 'image/png', 'image/jpeg')
        OR checksum_sha256 IS NULL
        OR checksum_sha256 !~ '^[a-f0-9]{64}$'
        OR extension IS NULL
        OR extension NOT IN ('pdf', 'png', 'jpg', 'jpeg')
      )
  `)) as Array<{ invalidPrivateMetadata: number }>;

  const invalidPrivateMetadata = Number(policyResult.invalidPrivateMetadata);
  process.stdout.write(
    `legacySources=${legacySources} invalidLinks=${invalidLinks} invalidPrivateMetadata=${invalidPrivateMetadata}\n`,
  );
  if (legacySources || invalidLinks || invalidPrivateMetadata) {
    throw new Error('Phase 9 storage rollout verification failed');
  }
}

async function run(): Promise<void> {
  const mode = parseMode(process.argv[2]);
  await rolloutDataSource.initialize();
  try {
    if (mode === 'verify') {
      await verifyRollout();
      return;
    }

    const candidates = await loadCandidates();
    const grouped = new Map<string, number>();
    for (const candidate of candidates) {
      grouped.set(
        candidate.sourceKey,
        (grouped.get(candidate.sourceKey) ?? 0) + 1,
      );
    }
    for (const source of PRIVATE_DOCUMENT_SOURCES) {
      process.stdout.write(
        `${source.key}: ${grouped.get(source.key) ?? 0} legacy source(s)\n`,
      );
    }
    if (mode === 'plan') return;

    if (mode === 'apply') {
      const supabase = createClient(
        requiredEnvironment('SUPABASE_URL'),
        requiredEnvironment('SUPABASE_SERVICE_KEY'),
        { auth: { autoRefreshToken: false, persistSession: false } },
      );
      const bucket = requiredEnvironment('SUPABASE_BUCKET');
      const environmentPrefix = requiredEnvironment('STORAGE_ENV_PREFIX');
      const hydratedFiles = new Set<string>();
      for (const candidate of candidates) {
        const source = PRIVATE_DOCUMENT_SOURCES.find(
          (item) => item.key === candidate.sourceKey,
        )!;
        if (!isExternalSource(candidate.source)) {
          if (!candidate.storedFileId) {
            throw new Error(
              'Retained provider object is missing stored-file metadata',
            );
          }
          if (hydratedFiles.has(candidate.storedFileId)) continue;
          process.stdout.write(
            `hydrating ${source.key}/${candidate.recordId} file=${candidate.storedFileId}\n`,
          );
          await hydrateRetainedCandidate(candidate, source, supabase, bucket);
          hydratedFiles.add(candidate.storedFileId);
          continue;
        }
        if (candidate.storedFileId) continue;
        process.stdout.write(
          `migrating ${source.key}/${candidate.recordId} source=${sourceFingerprint(candidate.source)}\n`,
        );
        await migrateExternalCandidate(
          candidate,
          source,
          supabase,
          bucket,
          environmentPrefix,
        );
      }
      return;
    }

    let finalized = 0;
    let blocked = 0;
    for (const candidate of candidates) {
      const source = PRIVATE_DOCUMENT_SOURCES.find(
        (item) => item.key === candidate.sourceKey,
      )!;
      if (await finalizeCandidate(candidate, source)) {
        finalized += 1;
      } else {
        blocked += 1;
      }
    }
    process.stdout.write(`finalized=${finalized} blocked=${blocked}\n`);
    if (blocked) {
      throw new Error(
        'Some public sources are still reachable or missing metadata',
      );
    }
  } finally {
    await rolloutDataSource.destroy();
  }
}

if (require.main === module) {
  void run().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown error';
    process.stderr.write(`Storage Phase 9 rollout failed: ${message}\n`);
    process.exitCode = 1;
  });
}
