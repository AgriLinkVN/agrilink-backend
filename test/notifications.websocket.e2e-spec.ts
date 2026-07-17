import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { AddressInfo } from 'net';
import { io, Socket as ClientSocket } from 'socket.io-client';

import { NotifType } from '../src/common/enums';
import { NotificationModel } from '../src/modules/notifications/domain/notification.types';
import {
  AllNotificationsReadEvent,
  NewNotificationEvent,
  NOTIFICATION_SOCKET_EVENTS,
  NotificationMarkedReadEvent,
} from '../src/modules/notifications/presentation/contracts/notification-socket.events';
import { NotificationsGateway } from '../src/modules/notifications/presentation/gateways/notifications.gateway';

describe('Notifications WebSocket contract (e2e)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let gateway: NotificationsGateway;
  let clients: ClientSocket[] = [];

  const jwtService = {
    verify: jest.fn((token: string) => {
      if (token === 'token-user-1') return { sub: 'user-1' };
      if (token === 'token-user-2') return { sub: 'user-2' };
      throw new Error('Invalid token');
    }),
  };

  const notification: NotificationModel = {
    id: '11111111-1111-4111-8111-111111111111',
    userId: 'user-1',
    type: NotifType.PRODUCT_APPROVED,
    title: 'San pham da duoc duyet',
    body: 'San pham cua ban da duoc duyet.',
    data: { productId: 'product-1' },
    isRead: false,
    readAt: null,
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationsGateway,
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.listen(0);

    const address = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
    gateway = app.get(NotificationsGateway);
  });

  afterEach(() => {
    clients.forEach((client) => client.disconnect());
    clients = [];
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('emits new_notification only to the target user room', async () => {
    const targetClient = await connectClient('token-user-1');
    const otherClient = await connectClient('token-user-2');
    let otherUserReceived = false;

    otherClient.on(NOTIFICATION_SOCKET_EVENTS.NEW, () => {
      otherUserReceived = true;
    });

    const received = waitForEvent<NewNotificationEvent>(
      targetClient,
      NOTIFICATION_SOCKET_EVENTS.NEW,
    );

    gateway.publishCreated('user-1', notification);

    await expect(received).resolves.toEqual({
      id: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      data: notification.data,
      isRead: false,
      readAt: null,
      createdAt: '2026-06-01T00:00:00.000Z',
    });
    await delay(50);
    expect(otherUserReceived).toBe(false);
  });

  it('emits marked_read and all_notifications_read payloads through the namespace', async () => {
    const targetClient = await connectClient('token-user-1');
    const readAt = new Date('2026-06-02T00:00:00.000Z');

    const markedRead = waitForEvent<NotificationMarkedReadEvent>(
      targetClient,
      NOTIFICATION_SOCKET_EVENTS.MARKED_READ,
    );
    gateway.publishMarkedRead('user-1', {
      id: notification.id,
      readAt,
    });

    await expect(markedRead).resolves.toEqual({
      id: notification.id,
      readAt: '2026-06-02T00:00:00.000Z',
    });

    const allRead = waitForEvent<AllNotificationsReadEvent>(
      targetClient,
      NOTIFICATION_SOCKET_EVENTS.ALL_READ,
    );
    gateway.publishAllRead('user-1', {
      updated: 2,
      readAt,
    });

    await expect(allRead).resolves.toEqual({
      updated: 2,
      readAt: '2026-06-02T00:00:00.000Z',
    });
  });

  function connectClient(token: string): Promise<ClientSocket> {
    const client = io(`${baseUrl}/notifications`, {
      auth: { token },
      transports: ['websocket'],
      reconnection: false,
      forceNew: true,
    });
    clients.push(client);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error('Socket connection timed out')),
        1000,
      );

      client.once('connect', () => {
        clearTimeout(timeout);
        resolve(client);
      });
      client.once('connect_error', (error: Error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  function waitForEvent<TPayload>(
    client: ClientSocket,
    event: string,
  ): Promise<TPayload> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error(`Timed out waiting for ${event}`)),
        1000,
      );

      client.once(event, (payload: TPayload) => {
        clearTimeout(timeout);
        resolve(payload);
      });
    });
  }

  function delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
});
