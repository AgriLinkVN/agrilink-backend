import { DataSource } from 'typeorm';
import { AdPackage } from '../entities/ad-package.entity';
import { AdType } from '../../../common/enums';

/**
 * Seeds 5 default ad packages so suppliers can create campaigns
 * immediately after deploy / fresh DB without admin intervention.
 *
 * Idempotent: re-running won't duplicate rows (matches by `name`).
 */
export async function seedAdPackages(ds: DataSource): Promise<void> {
  const repo = ds.getRepository(AdPackage);

  const packages: Array<Omit<AdPackage, 'id' | 'createdAt' | 'updatedAt'>> = [
    {
      name: 'Banner cơ bản — 7 ngày',
      adType: AdType.banner,
      price: 500_000,
      durationDays: 7,
      maxImpressions: 10_000,
      description: 'Hiển thị banner trên trang chủ trong 7 ngày, tối đa 10,000 lượt.',
      isActive: true,
    },
    {
      name: 'Banner phổ thông — 14 ngày',
      adType: AdType.banner,
      price: 900_000,
      durationDays: 14,
      maxImpressions: 25_000,
      description: 'Banner trang chủ + danh mục, 14 ngày, tối đa 25,000 lượt.',
      isActive: true,
    },
    {
      name: 'Featured — 14 ngày',
      adType: AdType.featured,
      price: 1_500_000,
      durationDays: 14,
      maxImpressions: 50_000,
      description: 'Sản phẩm hiển thị ưu tiên trong danh mục liên quan.',
      isActive: true,
    },
    {
      name: 'Spotlight — 30 ngày',
      adType: AdType.spotlight,
      price: 3_500_000,
      durationDays: 30,
      maxImpressions: null,
      description: 'Vị trí spotlight trang chủ, không giới hạn lượt hiển thị, 30 ngày.',
      isActive: true,
    },
    {
      name: 'Spotlight — 90 ngày',
      adType: AdType.spotlight,
      price: 9_000_000,
      durationDays: 90,
      maxImpressions: null,
      description: 'Vị trí spotlight cao cấp, dành cho thương hiệu lớn, 90 ngày.',
      isActive: true,
    },
  ];

  for (const pkg of packages) {
    const existing = await repo.findOne({ where: { name: pkg.name } });
    if (!existing) {
      await repo.save(repo.create(pkg));
      console.log(`  + Inserted ad_package "${pkg.name}"`);
    }
  }
  console.log(`✅ Seed ad_packages: ${packages.length} record(s) processed`);
}
