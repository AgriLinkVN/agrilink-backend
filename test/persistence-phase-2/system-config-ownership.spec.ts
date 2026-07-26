import * as fs from 'fs';
import * as path from 'path';
import { getMetadataArgsStorage } from 'typeorm';

import { RUNTIME_ENTITY_ENTRIES } from '../../src/database/entity-registry';
import { SystemConfig } from '../../src/modules/admin/entities/system-config.entity';

const root = path.resolve(__dirname, '../..');

describe('Persistence Phase 2 System Config ownership', () => {
  it('keeps one Admin-owned writable mapping', () => {
    expect(
      getMetadataArgsStorage().tables.filter(
        ({ name }) => name === 'system_configs',
      ),
    ).toEqual([
      expect.objectContaining({
        name: 'system_configs',
        target: SystemConfig,
      }),
    ]);
    expect(
      RUNTIME_ENTITY_ENTRIES.find(({ key }) => key === 'public.system_configs')
        ?.entity,
    ).toBe(SystemConfig);
  });

  it('keeps the central compatibility file decorator-free', () => {
    const source = fs.readFileSync(
      path.join(root, 'src/database/entities/system-config.entity.ts'),
      'utf8',
    );
    expect(source).not.toMatch(
      /@(Entity|Column|PrimaryColumn|PrimaryGeneratedColumn|CreateDateColumn|UpdateDateColumn)\b/,
    );
    expect(source).toContain(
      "from '../../modules/admin/entities/system-config.entity'",
    );
  });

  it('preserves the deployed UUID key/value representation', () => {
    const columns = getMetadataArgsStorage().columns.filter(
      ({ target }) => target === SystemConfig,
    );
    const id = columns.find(({ propertyName }) => propertyName === 'id');
    const key = columns.find(({ propertyName }) => propertyName === 'key');
    const value = columns.find(({ propertyName }) => propertyName === 'value');
    const updatedBy = columns.find(
      ({ propertyName }) => propertyName === 'updatedBy',
    );

    expect(id?.options.type).toBe('uuid');
    expect(key?.options.unique).toBe(true);
    expect(value?.options.type).toBe('text');
    expect(updatedBy?.options.type).toBe(String);
    expect(updatedBy?.options.nullable).toBe(true);
  });
});
