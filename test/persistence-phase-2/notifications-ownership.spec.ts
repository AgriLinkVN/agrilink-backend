import * as fs from 'fs';
import * as path from 'path';
import { getMetadataArgsStorage } from 'typeorm';

import { RUNTIME_ENTITY_ENTRIES } from '../../src/database/entity-registry';
import { NotificationOrmEntity } from '../../src/modules/notifications/infrastructure/persistence/notification.orm-entity';
import { NOTIFICATION_SOCKET_EVENTS } from '../../src/modules/notifications/presentation/contracts/notification-socket.events';

const root = path.resolve(__dirname, '../..');

describe('Persistence Phase 2 Notifications ownership', () => {
  it('keeps one capability-owned writable mapping', () => {
    expect(
      getMetadataArgsStorage().tables.filter(
        ({ name }) => name === 'notifications',
      ),
    ).toEqual([
      expect.objectContaining({
        name: 'notifications',
        target: NotificationOrmEntity,
      }),
    ]);
    expect(
      RUNTIME_ENTITY_ENTRIES.find(({ key }) => key === 'public.notifications')
        ?.entity,
    ).toBe(NotificationOrmEntity);
  });

  it('keeps the compatibility path decorator-free', () => {
    const source = fs.readFileSync(
      path.join(root, 'src/database/entities/notification.entity.ts'),
      'utf8',
    );
    expect(source).not.toMatch(
      /@(Entity|Column|PrimaryGeneratedColumn|CreateDateColumn)\b/,
    );
    expect(source).toContain('NotificationOrmEntity as Notification');
  });

  it('preserves deployed nullability and the WebSocket event contract', () => {
    const columns = getMetadataArgsStorage().columns.filter(
      ({ target }) => target === NotificationOrmEntity,
    );
    const body = columns.find(({ propertyName }) => propertyName === 'body');
    const data = columns.find(({ propertyName }) => propertyName === 'data');

    expect(body?.options.nullable).not.toBe(true);
    expect(data?.options.nullable).toBe(true);
    expect(NOTIFICATION_SOCKET_EVENTS).toEqual({
      NEW: 'new_notification',
      MARKED_READ: 'marked_read',
      ALL_READ: 'all_notifications_read',
    });
  });
});
