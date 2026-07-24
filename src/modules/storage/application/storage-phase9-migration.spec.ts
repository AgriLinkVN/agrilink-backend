import { QueryRunner } from 'typeorm';
import { AddStoredFileIdToPrivateDocuments1783731600000 } from '../../../database/migrations/1783731600000-AddStoredFileIdToPrivateDocuments';

describe('Phase 9 private document migration', () => {
  it('adds metadata links and backfills only retained non-public object paths', async () => {
    const queries: string[] = [];
    const runner = {
      hasTable: jest.fn().mockResolvedValue(true),
      query: jest.fn(async (sql: string) => {
        queries.push(sql);
      }),
    } as unknown as QueryRunner;

    await new AddStoredFileIdToPrivateDocuments1783731600000().up(runner);

    const sql = queries.join('\n');
    expect(sql).toContain(
      'ALTER TABLE "product_certifications" ADD COLUMN IF NOT EXISTS "stored_file_id"',
    );
    expect(sql).toContain(
      'ALTER TABLE "farmer_profiles" ADD COLUMN IF NOT EXISTS "cccd_front_file_id"',
    );
    expect(sql).toContain(`certification."document_url" !~* '^https?://'`);
    expect(sql).toContain(`product."seller_id"::uuid`);
    expect(sql).toContain(`'SUPABASE'`);
    expect(sql).toContain(`'PRIVATE'`);
    expect(sql).toContain(`stored."resource_type" = 'PRODUCT'`);
    expect(sql).toContain('REFERENCES "stored_files"("id")');
  });

  it('drops links without deleting retained stored-file metadata', async () => {
    const queries: string[] = [];
    const runner = {
      hasTable: jest.fn().mockResolvedValue(true),
      query: jest.fn(async (sql: string) => {
        queries.push(sql);
      }),
    } as unknown as QueryRunner;

    await new AddStoredFileIdToPrivateDocuments1783731600000().down(runner);

    const sql = queries.join('\n');
    expect(sql).toContain(
      'ALTER TABLE "product_certifications" DROP COLUMN IF EXISTS "stored_file_id"',
    );
    expect(sql).not.toMatch(/DELETE FROM "stored_files"/i);
  });
});
