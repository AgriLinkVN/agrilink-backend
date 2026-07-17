import { JwtService } from '@nestjs/jwt';
import { Server } from 'socket.io';

import { NotifType } from '@common/enums';
import { NotificationModel } from '../../domain/notification.types';
import { NOTIFICATION_SOCKET_EVENTS } from '../contracts/notification-socket.events';
import { NotificationsGateway } from './notifications.gateway';

describe('NotificationsGateway contract', () => {
  const jwtService = { verify: jest.fn() } as unknown as JwtService;
  const gateway = new NotificationsGateway(jwtService);

  const emit = jest.fn();
  const to = jest.fn(() => ({ emit }));

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(gateway, 'server', {
      configurable: true,
      value: { to } as unknown as Server,
    });
  });

  it('publishes created notification to the user room without leaking userId', () => {
    const notification: NotificationModel = {
      id: 'notification-1',
      userId: 'user-1',
      type: NotifType.PRODUCT_APPROVED,
      title: 'San pham da duoc duyet',
      body: 'San pham cua ban da duoc duyet.',
      data: { productId: 'product-1' },
      isRead: false,
      readAt: null,
      createdAt: new Date('2026-06-01T00:00:00.000Z'),
    };

    gateway.publishCreated('user-1', notification);

    expect(to).toHaveBeenCalledWith('user:user-1');
    expect(emit).toHaveBeenCalledWith(NOTIFICATION_SOCKET_EVENTS.NEW, {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      data: notification.data,
      isRead: false,
      readAt: null,
      createdAt: '2026-06-01T00:00:00.000Z',
    });
    expect(emit.mock.calls[0][1]).not.toHaveProperty('userId');
  });

  it('publishes marked-read and all-read events with ISO timestamps', () => {
    const readAt = new Date('2026-06-02T00:00:00.000Z');

    gateway.publishMarkedRead('user-1', {
      id: 'notification-1',
      readAt,
    });
    gateway.publishAllRead('user-1', {
      updated: 3,
      readAt,
    });

    expect(emit).toHaveBeenNthCalledWith(
      1,
      NOTIFICATION_SOCKET_EVENTS.MARKED_READ,
      { id: 'notification-1', readAt: '2026-06-02T00:00:00.000Z' },
    );
    expect(emit).toHaveBeenNthCalledWith(
      2,
      NOTIFICATION_SOCKET_EVENTS.ALL_READ,
      { updated: 3, readAt: '2026-06-02T00:00:00.000Z' },
    );
  });
});
