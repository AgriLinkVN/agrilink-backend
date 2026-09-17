import { QueryRunner } from 'typeorm';
import { EstablishCooperativePersistenceBoundaries1783731600000 } from './1783731600000-EstablishCooperativePersistenceBoundaries';

describe('EstablishCooperativePersistenceBoundaries1783731600000', () => {
  it('creates P3 tables and fails safely through preflight instead of fabricating legacy data', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    const migration = new EstablishCooperativePersistenceBoundaries1783731600000();

    await migration.up({ query } as unknown as QueryRunner);

    const sql = query.mock.calls.map(([statement]) => String(statement)).join('\n');
    expect(sql).toContain('cooperative_province_references');
    expect(sql).toContain('P3_PRECHECK_FAILED');
    expect(sql).toContain('No legacy data was changed');
    expect(sql).toContain('duplicate_membership');
    expect(sql).toContain('unknown_canonical_province');
    expect(sql).not.toMatch(/\bUPDATE\b/i);
    expect(sql).not.toMatch(/CURRENT_DATE/i);
  });

  it('rolls back only constraints and tables recorded as created by this migration', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    const migration = new EstablishCooperativePersistenceBoundaries1783731600000();

    await migration.down({ query } as unknown as QueryRunner);

    const sql = String(query.mock.calls[0][0]);
    expect(sql).toContain('p3_phase_1_migration_state');
    expect(sql).toContain('DROP CONSTRAINT IF EXISTS');
    expect(sql).toContain("object_name\" = 'cooperative_members'");
  });
});
