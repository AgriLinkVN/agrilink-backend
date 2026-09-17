import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { DataSource, Logger } from 'typeorm';

import { createDataSourceOptions } from '../../src/database/data-source-options';
import {
  CLI_ENTITY_REGISTRY,
  excludeDeferredEntitiesFromSchemaBuild,
} from '../../src/database/entity-registry';
import { V2_MIGRATIONS } from '../../src/database/migration-registry';
import {
  createAdminDataSource,
  createDisposableDatabase,
  createDisposableDatabaseName,
  dropDisposableDatabase,
} from '../../src/database/reconciliation/disposable-database';
import { PersistenceTestPurpose } from '../../src/database/reconciliation/database-target.guard';
import { SeedClassification } from '../../src/database/seeds/framework/seed-contract';
import { NotificationRealtimePublisherPort } from '../../src/modules/notifications/application/ports/outbound/notification-realtime-publisher.port';
import { MarkNotificationReadUseCase } from '../../src/modules/notifications/application/use-cases/mark-notification-read.use-case';
import { NotificationOrmEntity } from '../../src/modules/notifications/infrastructure/persistence/notification.orm-entity';
import { TypeOrmNotificationRepository } from '../../src/modules/notifications/infrastructure/repositories/typeorm-notification.repository';

dotenv.config();
jest.setTimeout(120_000);

const USER_ONE = '11111111-1111-4111-8111-111111111111';
const USER_TWO = '22222222-2222-4222-8222-222222222222';

class QueryCounter implements Logger {
  count = 0;

  logQuery(): void {
    this.count += 1;
  }

  logQueryError(): void {}
  logQuerySlow(): void {}
  logSchemaBuild(): void {}
  logMigration(): void {}
  log(): void {}
}

describe('Persistence Phase 7A notification concurrency and query count', () => {
  const database = createDisposableDatabaseName();
  const testTarget = {
    classification: SeedClassification.TEST,
    purpose: PersistenceTestPurpose.BUSINESS_FIXTURE,
    database,
    acknowledgement: database,
  } as const;
  const admin = createAdminDataSource(process.env, testTarget);
  const queryCounter = new QueryCounter();
  let dataSource: DataSource;
  let repository: TypeOrmNotificationRepository;

  beforeAll(async () => {
    await admin.initialize();
    await createDisposableDatabase(admin, testTarget);
    const options = createDataSourceOptions(
      { ...process.env, DB_NAME: database, DB_SYNCHRONIZE: 'false' },
      {
        entities: CLI_ENTITY_REGISTRY,
        migrations: V2_MIGRATIONS,
        migrationsTableName: 'migrations_v2',
        logging: false,
      },
    );
    dataSource = new DataSource({
      ...options,
      logging: ['query'],
      logger: queryCounter,
    });
    await dataSource.initialize();
    excludeDeferredEntitiesFromSchemaBuild(dataSource);
    await dataSource.runMigrations();
    repository = new TypeOrmNotificationRepository(
      dataSource.getRepository(NotificationOrmEntity),
    );
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) await dataSource.destroy();
    if (admin.isInitialized) {
      await dropDisposableDatabase(admin, testTarget);
      await admin.destroy();
    }
  });

  beforeEach(async () => {
    await dataSource.query('DELETE FROM notifications');
    queryCounter.count = 0;
  });

  it('keeps list query count bounded for N=1 and N=20', async () => {
    await seedNotifications(USER_ONE, 1);
    queryCounter.count = 0;
    const one = await repository.findAll(USER_ONE, { page: 1, limit: 50 });
    const oneQueryCount = queryCounter.count;

    await seedNotifications(USER_ONE, 19);
    queryCounter.count = 0;
    const twenty = await repository.findAll(USER_ONE, { page: 1, limit: 50 });
    const twentyQueryCount = queryCounter.count;

    expect(one.total).toBe(1);
    expect(twenty.total).toBe(20);
    expect(twentyQueryCount).toBe(oneQueryCount);
    expect(twentyQueryCount).toBe(1);
  });

  it('isolates lists by owner', async () => {
    await seedNotifications(USER_ONE, 2);
    await seedNotifications(USER_TWO, 1);

    const result = await repository.findAll(USER_ONE, { page: 1, limit: 20 });

    expect(result.total).toBe(2);
    expect(result.data.every(({ userId }) => userId === USER_ONE)).toBe(true);
  });

  it('resolves concurrent mark-read calls with one persisted transition and one event', async () => {
    await seedNotifications(USER_ONE, 1);
    const [{ id }] = (await dataSource.query(
      'SELECT id FROM notifications WHERE user_id = $1',
      [USER_ONE],
    )) as Array<{ id: string }>;
    const realtime: jest.Mocked<NotificationRealtimePublisherPort> = {
      publishCreated: jest.fn(),
      publishMarkedRead: jest.fn(),
      publishAllRead: jest.fn(),
    };
    const useCase = new MarkNotificationReadUseCase(repository, realtime);

    const results = await Promise.all([
      useCase.execute(id, USER_ONE),
      useCase.execute(id, USER_ONE),
    ]);

    expect(results.every(({ isRead }) => isRead)).toBe(true);
    expect(realtime.publishMarkedRead).toHaveBeenCalledTimes(1);
    const [{ count }] = (await dataSource.query(
      'SELECT COUNT(*)::text AS count FROM notifications WHERE id = $1 AND is_read = true',
      [id],
    )) as Array<{ count: string }>;
    expect(count).toBe('1');
  });

  async function seedNotifications(
    userId: string,
    count: number,
  ): Promise<void> {
    for (let index = 0; index < count; index += 1) {
      await dataSource.query(
        `INSERT INTO notifications (user_id, type, title, body, created_at)
         VALUES ($1, 'new_message', $2, $3, $4)`,
        [
          userId,
          `Notification ${index}`,
          'Test body without private payload',
          new Date(1_800_000_000_000 + index),
        ],
      );
    }
  }
});
