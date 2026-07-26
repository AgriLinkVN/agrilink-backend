import * as fs from 'fs';
import * as path from 'path';
import { getMetadataArgsStorage } from 'typeorm';

import {
  CANONICAL_BASELINE_TABLE_KEYS,
  RUNTIME_ENTITY_ENTRIES,
} from '../../src/database/entity-registry';
import { District } from '../../src/modules/geography/entities/district.entity';
import { Province } from '../../src/modules/geography/entities/province.entity';

const root = path.resolve(__dirname, '../..');

describe('Persistence Phase 2 Geography ownership', () => {
  it('keeps one capability-owned writable mapping per Geography table', () => {
    const tableMappings = getMetadataArgsStorage().tables.filter(({ name }) =>
      ['provinces', 'districts'].includes(name ?? ''),
    );
    expect(
      tableMappings
        .map(({ name, target }) => ({ name, target }))
        .sort((left, right) => (left.name ?? '').localeCompare(right.name ?? '')),
    ).toEqual([
      { name: 'districts', target: District },
      { name: 'provinces', target: Province },
    ]);
  });

  it('keeps compatibility files decorator-free and registry paths canonical', () => {
    for (const file of ['province.entity.ts', 'district.entity.ts']) {
      const source = fs.readFileSync(
        path.join(root, 'src/database/entities', file),
        'utf8',
      );
      expect(source).not.toMatch(
        /@(Entity|Column|PrimaryGeneratedColumn|ManyToOne|OneToMany|JoinColumn)\b/,
      );
      expect(source).toContain("from '../../modules/geography/entities/");
    }

    expect(
      RUNTIME_ENTITY_ENTRIES.find(({ key }) => key === 'public.provinces')
        ?.entity,
    ).toBe(Province);
    expect(
      RUNTIME_ENTITY_ENTRIES.find(({ key }) => key === 'public.districts')
        ?.entity,
    ).toBe(District);
  });

  it('does not restore unverified legacy Province fields', () => {
    const sourceFiles = [
      path.join(root, 'src/modules/geography/entities/province.entity.ts'),
      path.join(root, 'src/database/entities/province.entity.ts'),
    ];
    const source = sourceFiles
      .map((file) => fs.readFileSync(file, 'utf8'))
      .join('\n');

    expect(source).not.toMatch(
      /\bis_key_agri\b|\bisKeyAgri\b|\bcreatedAt\b|\bupdatedAt\b/,
    );

    const provinceColumns = getMetadataArgsStorage().columns
      .filter(({ target }) => target === Province)
      .map(({ propertyName }) => propertyName)
      .sort();
    expect(provinceColumns).toEqual([
      'code',
      'id',
      'lat',
      'lng',
      'name',
      'nameEn',
      'region',
      'slug',
    ]);
  });

  it('retains the reviewed 26-table baseline and canonical Geography columns', () => {
    expect(CANONICAL_BASELINE_TABLE_KEYS).toHaveLength(26);

    const catalog = JSON.parse(
      fs.readFileSync(
        path.join(
          root,
          'docs/architecture/persistence/baselines/canonical-baseline-v2-catalog.json',
        ),
        'utf8',
      ),
    ) as {
      snapshot: {
        tables: Array<{
          name: string;
          columns: Array<{ name: string }>;
        }>;
      };
    };
    const provinces = catalog.snapshot.tables.find(
      ({ name }) => name === 'provinces',
    );
    expect(provinces?.columns.map(({ name }) => name).sort()).toEqual([
      'code',
      'id',
      'lat',
      'lng',
      'name',
      'name_en',
      'region',
      'slug',
    ]);
  });
});
