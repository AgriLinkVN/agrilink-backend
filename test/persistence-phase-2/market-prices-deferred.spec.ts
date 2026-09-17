import * as fs from 'fs';
import * as path from 'path';

import { RUNTIME_ENTITY_ENTRIES } from '../../src/database/entity-registry';
import { MarketPrice } from '../../src/modules/market-prices/entities/market-price.entity';

const root = path.resolve(__dirname, '../..');

describe('Persistence Phase 2 Market Prices decision', () => {
  it('keeps Market Prices outside the 26-table baseline', () => {
    const entry = RUNTIME_ENTITY_ENTRIES.find(
      ({ key }) => key === 'public.market_prices',
    );
    expect(entry?.entity).toBe(MarketPrice);
    expect(entry?.baselineV2).toBe(false);
  });

  it('records the capability as deferred while its runtime flow is TODO', () => {
    const ownership = JSON.parse(
      fs.readFileSync(
        path.join(
          root,
          'docs/architecture/persistence/entity-ownership.json',
        ),
        'utf8',
      ),
    ) as {
      tables: Array<{
        table: string;
        status: string;
        phase: string;
        currentMappings: string[];
      }>;
    };
    const entry = ownership.tables.find(
      ({ table }) => table === 'market_prices',
    );
    expect(entry).toEqual(
      expect.objectContaining({
        status: 'deferred',
        phase: 'post-phase-2',
      }),
    );
    expect(entry?.currentMappings).toHaveLength(2);

    const serviceSource = fs.readFileSync(
      path.join(
        root,
        'src/modules/market-prices/market-prices.service.ts',
      ),
      'utf8',
    );
    expect(serviceSource).toContain(
      'TODO: implement MarketPricesService.findAll()',
    );
    expect(serviceSource).toContain(
      'TODO: implement MarketPricesService.create()',
    );
  });
});
