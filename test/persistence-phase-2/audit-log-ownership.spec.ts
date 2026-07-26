import * as fs from 'fs';
import * as path from 'path';
import { getMetadataArgsStorage } from 'typeorm';

import { RUNTIME_ENTITY_ENTRIES } from '../../src/database/entity-registry';
import { AuditLog } from '../../src/modules/admin/entities/audit-log.entity';

const root = path.resolve(__dirname, '../..');

describe('Persistence Phase 2 Audit Log ownership', () => {
  it('keeps one Admin-owned writable mapping', () => {
    expect(
      getMetadataArgsStorage().tables.filter(
        ({ name }) => name === 'audit_logs',
      ),
    ).toEqual([
      expect.objectContaining({
        name: 'audit_logs',
        target: AuditLog,
      }),
    ]);
    expect(
      RUNTIME_ENTITY_ENTRIES.find(({ key }) => key === 'public.audit_logs')
        ?.entity,
    ).toBe(AuditLog);
  });

  it('keeps the central compatibility file decorator-free', () => {
    const source = fs.readFileSync(
      path.join(root, 'src/database/entities/audit-log.entity.ts'),
      'utf8',
    );
    expect(source).not.toMatch(
      /@(Entity|Column|PrimaryGeneratedColumn|CreateDateColumn)\b/,
    );
    expect(source).toContain(
      "from '../../modules/admin/entities/audit-log.entity'",
    );
  });

  it('uses the deployed changes contract without legacy old/new columns', () => {
    const columns = getMetadataArgsStorage().columns
      .filter(({ target }) => target === AuditLog)
      .map(({ propertyName }) => propertyName)
      .sort();
    expect(columns).toEqual([
      'action',
      'changes',
      'createdAt',
      'entityId',
      'entityType',
      'id',
      'ipAddress',
      'method',
      'path',
      'userId',
    ]);

    const seedSource = fs.readFileSync(
      path.join(root, 'src/database/dev-seed.service.ts'),
      'utf8',
    );
    expect(seedSource).not.toMatch(/\boldData\b|\bnewData\b/);
    expect(seedSource).toContain(
      "changes: { before: { status: 'active' }, after:",
    );
  });
});
