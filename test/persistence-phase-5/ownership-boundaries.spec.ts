import * as fs from 'fs';
import * as path from 'path';
import { getMetadataArgsStorage } from 'typeorm';

import { RUNTIME_ENTITY_ENTRIES } from '../../src/database/entity-registry';
import { ProductCategory } from '../../src/modules/products/infrastructure/persistence/entities/product-category.entity';
import { ProductCertification } from '../../src/modules/products/infrastructure/persistence/entities/product-certification.entity';
import { ProductImage } from '../../src/modules/products/infrastructure/persistence/entities/product-image.entity';
import { Product } from '../../src/modules/products/infrastructure/persistence/entities/product.entity';
import { Wishlist } from '../../src/modules/products/infrastructure/persistence/entities/wishlist.entity';
import { Review } from '../../src/modules/reviews/infrastructure/persistence/entities/review.entity';

const root = path.resolve(__dirname, '../..');
const canonical = new Map<string, unknown>([
  ['products', Product],
  ['product_categories', ProductCategory],
  ['product_images', ProductImage],
  ['product_certifications', ProductCertification],
  ['wishlists', Wishlist],
  ['reviews', Review],
]);

describe('Persistence Phase 5 ownership boundaries', () => {
  it('has exactly one writable mapping for every scoped canonical table', () => {
    const counts = new Map<string, number>();
    for (const table of getMetadataArgsStorage().tables) {
      const name = String(table.name);
      if (canonical.has(name)) {
        counts.set(name, (counts.get(name) ?? 0) + 1);
      }
    }
    expect(Object.fromEntries(counts)).toEqual({
      products: 1,
      product_categories: 1,
      product_images: 1,
      product_certifications: 1,
      wishlists: 1,
      reviews: 1,
    });
  });

  it('registers only Products- and Reviews-owned canonical classes', () => {
    const registry = new Map(
      RUNTIME_ENTITY_ENTRIES.map(({ key, entity }) => [key, entity]),
    );
    for (const [table, entity] of canonical) {
      expect(registry.get(`public.${table}`)).toBe(entity);
    }
  });

  it.each([
    ['product.entity.ts', 'Product'],
    ['product-category.entity.ts', 'ProductCategory'],
    ['product-image.entity.ts', 'ProductImage'],
    ['product-certification.entity.ts', 'ProductCertification'],
    ['product-wishlist.entity.ts', 'ProductWishlist'],
  ])('keeps central compatibility path %s decorator-free', (file, symbol) => {
    const source = read(`src/database/entities/${file}`);
    expect(source).toContain(symbol);
    expect(source).toMatch(/^export \{/);
    expect(source).not.toMatch(
      /@(Entity|Column|PrimaryGeneratedColumn|ManyToOne|OneToMany|OneToOne|JoinColumn|Index|Check)\b/,
    );
  });

  it('prevents the generator from recreating scoped central decorators', () => {
    const generator = read('generate-entities.js');
    const start = generator.indexOf('const phase5CompatibilityEntities');
    const end = generator.indexOf(
      'Object.assign(entities, phase5CompatibilityEntities)',
      start,
    );
    const overrides = generator.slice(start, end);
    expect(start).toBeGreaterThanOrEqual(0);
    for (const file of [
      'product.entity.ts',
      'product-category.entity.ts',
      'product-image.entity.ts',
      'product-certification.entity.ts',
      'product-wishlist.entity.ts',
      'review.entity.ts',
    ]) {
      expect(overrides).toContain(`'${file}':`);
    }
    expect(overrides).toContain('export {');
    expect(overrides).not.toContain('@Entity');
  });

  it('keeps Reviews and Admin behind typed capability ports', () => {
    const reviews = allTypeScriptFiles(
      path.join(root, 'src/modules/reviews'),
    ).map((file) => fs.readFileSync(file, 'utf8')).join('\n');
    const admin = [
      read('src/modules/admin/admin.route.ts'),
      read('src/modules/admin/admin.service.ts'),
    ].join('\n');

    expect(reviews).not.toMatch(
      /products\/infrastructure|users\/infrastructure|database\/entities\/(product|user)/,
    );
    expect(reviews).not.toMatch(
      /@InjectRepository\((Product|User)\)|Repository<(Product|User)>/,
    );
    expect(read('src/modules/reviews/reviews.module.ts')).not.toMatch(
      /forFeature\(\[[^\]]*\b(Product|User)\b/s,
    );
    expect(admin).not.toMatch(
      /products\/infrastructure|@InjectRepository\(Product\)|Repository<Product>/,
    );
    expect(read('src/modules/admin/admin.route.ts')).not.toMatch(
      /forFeature\(\[[^\]]*\bProduct\b/s,
    );
  });

  it('keeps cross-module ports free of TypeORM contracts', () => {
    for (const directory of [
      'src/modules/products/application/ports/inbound',
      'src/modules/users/application/ports',
      'src/modules/reviews/application/ports',
    ]) {
      for (const file of allTypeScriptFiles(path.join(root, directory))) {
        expect(fs.readFileSync(file, 'utf8')).not.toMatch(
          /from ['"]typeorm['"]|Repository<|EntityManager|QueryRunner|SelectQueryBuilder|FindOptions/,
        );
      }
    }
  });

  it('preserves wishlist/review uniqueness and baseline checks in metadata', () => {
    const metadata = getMetadataArgsStorage();
    expect(
      metadata.uniques.some(
        ({ target, columns }) =>
          target === Wishlist &&
          Array.isArray(columns) &&
          columns.join(',') === 'userId,productId',
      ),
    ).toBe(true);
    expect(
      metadata.indices.some(
        ({ target, name, unique, where }) =>
          target === Review &&
          name === 'IDX_reviews_reviewer_product_unique' &&
          unique === true &&
          where?.includes('product_id'),
      ),
    ).toBe(true);
    expect(
      metadata.checks.some(
        ({ target, name }) =>
          target === Review && name === 'CHK_reviews_rating_range',
      ),
    ).toBe(true);
  });

  it('keeps private document fields out of the public product detail model', () => {
    const publicModel = read(
      'src/modules/products/application/models/product-detail.model.ts',
    );
    expect(publicModel).not.toMatch(/documentUrl|storedFileId/);
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
