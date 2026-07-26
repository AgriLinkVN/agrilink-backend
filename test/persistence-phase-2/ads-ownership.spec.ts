import * as fs from 'fs';
import * as path from 'path';
import { getMetadataArgsStorage } from 'typeorm';

import { RUNTIME_ENTITY_ENTRIES } from '../../src/database/entity-registry';
import { AdCampaign } from '../../src/modules/ads/infrastructure/persistence/entities/ad-campaign.entity';
import { AdEvent } from '../../src/modules/ads/infrastructure/persistence/entities/ad-event.entity';
import { AdPackage } from '../../src/modules/ads/infrastructure/persistence/entities/ad-package.entity';

const root = path.resolve(__dirname, '../..');

describe('Persistence Phase 2 Ads ownership', () => {
  it('keeps one Ads-owned mapping for each scoped table', () => {
    const mappings = getMetadataArgsStorage().tables
      .filter(({ name }) =>
        ['ad_packages', 'ad_campaigns', 'ad_events'].includes(name ?? ''),
      )
      .map(({ name, target }) => ({ name, target }))
      .sort((left, right) => (left.name ?? '').localeCompare(right.name ?? ''));
    expect(mappings).toEqual([
      { name: 'ad_campaigns', target: AdCampaign },
      { name: 'ad_events', target: AdEvent },
      { name: 'ad_packages', target: AdPackage },
    ]);

    for (const [key, entity] of [
      ['public.ad_campaigns', AdCampaign],
      ['public.ad_events', AdEvent],
      ['public.ad_packages', AdPackage],
    ] as const) {
      expect(RUNTIME_ENTITY_ENTRIES.find((entry) => entry.key === key)?.entity).toBe(
        entity,
      );
    }
  });

  it('keeps legacy Ads paths decorator-free', () => {
    for (const file of [
      'ad-package.entity.ts',
      'ad-campaign.entity.ts',
      'ad-event.entity.ts',
    ]) {
      const source = fs.readFileSync(
        path.join(root, 'src/database/entities', file),
        'utf8',
      );
      expect(source).not.toMatch(
        /@(Entity|Column|PrimaryGeneratedColumn|CreateDateColumn|UpdateDateColumn|ManyToOne|OneToMany|JoinColumn)\b/,
      );
      expect(source).toContain(
        "from '../../modules/ads/infrastructure/persistence/entities/",
      );
    }
  });

  it('preserves deployed price precision and relationship delete rules', () => {
    const price = getMetadataArgsStorage().columns.find(
      ({ target, propertyName }) =>
        target === AdPackage && propertyName === 'price',
    );
    expect(price?.options).toEqual(
      expect.objectContaining({
        type: 'numeric',
        precision: 12,
        scale: 2,
      }),
    );

    const campaignPackage = getMetadataArgsStorage().relations.find(
      ({ target, propertyName }) =>
        target === AdCampaign && propertyName === 'package',
    );
    const eventCampaign = getMetadataArgsStorage().relations.find(
      ({ target, propertyName }) =>
        target === AdEvent && propertyName === 'campaign',
    );
    expect(campaignPackage?.options).toEqual(
      expect.objectContaining({ onDelete: 'RESTRICT' }),
    );
    expect(eventCampaign?.options).toEqual(
      expect.objectContaining({ onDelete: 'CASCADE' }),
    );
  });
});
