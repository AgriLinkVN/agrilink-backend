import * as fs from 'fs';
import * as path from 'path';
import { getMetadataArgsStorage } from 'typeorm';

import { RUNTIME_ENTITY_ENTRIES } from '../../src/database/entity-registry';
import { OtpVerification } from '../../src/modules/auth/infrastructure/persistence/entities/otp-verification.entity';
import { RefreshToken } from '../../src/modules/auth/infrastructure/persistence/entities/refresh-token.entity';
import { UserAddress } from '../../src/modules/users/infrastructure/persistence/entities/user-address.entity';
import { User } from '../../src/modules/users/infrastructure/persistence/entities/user.entity';

const root = path.resolve(__dirname, '../..');
const scopedTables = new Set([
  'users',
  'user_addresses',
  'refresh_tokens',
  'otp_verifications',
]);

describe('Persistence Phase 3 ownership boundaries', () => {
  it('has one canonical writable mapping for each scoped declaration', () => {
    const mappings = getMetadataArgsStorage().tables.filter(({ target }) =>
      [User, UserAddress, RefreshToken, OtpVerification].includes(
        target as typeof User,
      ),
    );
    const counts = new Map<string, number>();
    for (const mapping of mappings) {
      const table = String(mapping.name);
      if (scopedTables.has(table)) {
        counts.set(table, (counts.get(table) ?? 0) + 1);
      }
    }

    expect(Object.fromEntries(counts)).toEqual({
      users: 1,
      user_addresses: 1,
      refresh_tokens: 1,
      otp_verifications: 1,
    });
  });

  it('registers canonical Users/Auth classes and keeps addresses deferred', () => {
    const entries = new Map(
      RUNTIME_ENTITY_ENTRIES.map(({ key, entity, baselineV2 }) => [
        key,
        { entity, baselineV2 },
      ]),
    );
    expect(entries.get('public.users')).toEqual({
      entity: User,
      baselineV2: true,
    });
    expect(entries.get('public.refresh_tokens')).toEqual({
      entity: RefreshToken,
      baselineV2: true,
    });
    expect(entries.get('public.otp_verifications')).toEqual({
      entity: OtpVerification,
      baselineV2: true,
    });
    expect(entries.has('public.user_addresses')).toBe(false);
  });

  it.each([
    'user.entity.ts',
    'user-address.entity.ts',
    'refresh-token.entity.ts',
    'otp-verification.entity.ts',
  ])('retires central compatibility file %s', (file) => {
    expect(
      fs.existsSync(path.join(root, 'src/database/entities', file)),
    ).toBe(false);
  });

  it('does not export TypeOrmModule or register User outside Users', () => {
    const usersModule = read('src/modules/users/users.module.ts');
    const adminModule = read('src/modules/admin/admin.route.ts');
    const reviewsModule = read('src/modules/reviews/reviews.module.ts');

    expect(usersModule).not.toMatch(/exports:\s*\[[^\]]*TypeOrmModule/s);
    expect(adminModule).not.toMatch(/\bUser\b/);
    expect(reviewsModule).not.toMatch(/forFeature\(\[[^\]]*\bUser\b/s);
  });

  it('has no outside writable repository injection for scoped entities', () => {
    const files = allTypeScriptFiles(path.join(root, 'src/modules'));
    const violations: string[] = [];
    for (const file of files) {
      const relative = path.relative(root, file).replace(/\\/g, '/');
      const source = fs.readFileSync(file, 'utf8');
      if (
        !relative.startsWith('src/modules/users/') &&
        /@InjectRepository\(User\)|Repository<User>/.test(source)
      ) {
        violations.push(relative);
      }
      if (
        !relative.startsWith('src/modules/auth/') &&
        /@InjectRepository\((RefreshToken|OtpVerification)\)|Repository<(RefreshToken|OtpVerification)>/.test(
          source,
        )
      ) {
        violations.push(relative);
      }
    }
    expect(violations).toEqual([]);
  });

  it('keeps application ports free of TypeORM infrastructure types', () => {
    const portFiles = [
      ...allTypeScriptFiles(
        path.join(root, 'src/modules/users/application/ports'),
      ),
      ...allTypeScriptFiles(
        path.join(root, 'src/modules/auth/application/ports'),
      ),
    ];
    for (const file of portFiles) {
      const source = fs.readFileSync(file, 'utf8');
      expect(source).not.toMatch(
        /from ['"]typeorm['"]|Repository<|EntityManager|QueryRunner|SelectQueryBuilder|FindOptions/,
      );
    }
  });

  it('prevents the legacy generator from recreating retired paths', () => {
    const generator = read('generate-entities.js');
    expect(generator).toContain('retiredCentralCompatibilityFiles');
    for (const file of [
      'user.entity.ts',
      'user-address.entity.ts',
      'refresh-token.entity.ts',
      'otp-verification.entity.ts',
    ]) {
      expect(generator).toContain(`'${file}',`);
    }
    expect(generator).toContain('delete entities[filename]');
  });
});

function read(relative: string): string {
  return fs.readFileSync(path.join(root, relative), 'utf8');
}

function allTypeScriptFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory()
      ? allTypeScriptFiles(target)
      : entry.isFile() && entry.name.endsWith('.ts')
        ? [target]
        : [];
  });
}
