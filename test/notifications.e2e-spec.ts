import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Server } from 'http';
import * as request from 'supertest';

import { NotifType } from '../src/common/enums';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { CountUnreadNotificationsUseCase } from '../src/modules/notifications/application/use-cases/count-unread-notifications.use-case';
import { ListNotificationsUseCase } from '../src/modules/notifications/application/use-cases/list-notifications.use-case';
import { ListUnreadNotificationsUseCase } from '../src/modules/notifications/application/use-cases/list-unread-notifications.use-case';
import { MarkAllNotificationsReadUseCase } from '../src/modules/notifications/application/use-cases/mark-all-notifications-read.use-case';
import { MarkNotificationReadUseCase } from '../src/modules/notifications/application/use-cases/mark-notification-read.use-case';
import { NotificationModel } from '../src/modules/notifications/domain/notification.types';
import { NotificationsController } from '../src/modules/notifications/presentation/controllers/notifications.controller';

interface TestRequest {
  headers: {
    authorization?: string;
  };
  user?: {
    sub: string;
  };
}

class TestAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<TestRequest>();
    if (!req.headers.authorization) {
      throw new UnauthorizedException();
    }

    req.user = { sub: 'user-1' };
    return true;
  }
}

describe('Notifications REST contract (e2e)', () => {
  let app: INestApplication;
  let server: Server;

  const notificationId = '11111111-1111-4111-8111-111111111111';
  const notification: NotificationModel = {
    id: notificationId,
    userId: 'user-1',
    type: NotifType.NEW_MESSAGE,
    title: 'Tin nhan moi',
    body: 'Ban co tin nhan moi.',
    data: { link: '/messages' },
    isRead: false,
    readAt: null,
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
  };

  const listUseCase = { execute: jest.fn() };
  const unreadUseCase = { execute: jest.fn() };
  const countUseCase = { execute: jest.fn() };
  const markReadUseCase = { execute: jest.fn() };
  const markAllUseCase = { execute: jest.fn() };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        { provide: ListNotificationsUseCase, useValue: listUseCase },
        { provide: ListUnreadNotificationsUseCase, useValue: unreadUseCase },
        { provide: CountUnreadNotificationsUseCase, useValue: countUseCase },
        { provide: MarkNotificationReadUseCase, useValue: markReadUseCase },
        { provide: MarkAllNotificationsReadUseCase, useValue: markAllUseCase },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalGuards(new TestAuthGuard());
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();
    server = app.getHttpServer() as Server;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    listUseCase.execute.mockResolvedValue({
      data: [notification],
      total: 1,
      page: 1,
      limit: 20,
    });
    unreadUseCase.execute.mockResolvedValue([notification]);
    countUseCase.execute.mockResolvedValue({ count: 1 });
    markReadUseCase.execute.mockResolvedValue({
      ...notification,
      isRead: true,
      readAt: new Date('2026-06-02T00:00:00.000Z'),
    });
    markAllUseCase.execute.mockResolvedValue({
      updated: 1,
      readAt: new Date('2026-06-02T00:00:00.000Z'),
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('requires authentication', async () => {
    await request(server).get('/notifications').expect(401);
  });

  it('GET /notifications returns paginated response without userId', async () => {
    const response = await request(server)
      .get('/notifications?page=1&limit=20')
      .set('Authorization', 'Bearer test-token')
      .expect(200);

    expect(response.body.data).toEqual({
      data: [
        {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          body: notification.body,
          data: notification.data,
          isRead: false,
          readAt: null,
          createdAt: '2026-06-01T00:00:00.000Z',
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    });
    expect(response.body.data.data[0]).not.toHaveProperty('userId');
  });

  it('GET /notifications/unread returns unread notifications', async () => {
    const response = await request(server)
      .get('/notifications/unread')
      .set('Authorization', 'Bearer test-token')
      .expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).not.toHaveProperty('userId');
  });

  it('GET /notifications/count returns count contract', async () => {
    const response = await request(server)
      .get('/notifications/count')
      .set('Authorization', 'Bearer test-token')
      .expect(200);

    expect(response.body.data).toEqual({ count: 1 });
  });

  it('PATCH /notifications/:id/read returns read notification', async () => {
    const response = await request(server)
      .patch(`/notifications/${notificationId}/read`)
      .set('Authorization', 'Bearer test-token')
      .expect(200);

    expect(response.body.data).toMatchObject({
      id: notificationId,
      isRead: true,
      readAt: '2026-06-02T00:00:00.000Z',
    });
  });

  it('PATCH /notifications/mark-all-read returns updated count', async () => {
    const response = await request(server)
      .patch('/notifications/mark-all-read')
      .set('Authorization', 'Bearer test-token')
      .expect(200);

    expect(response.body.data).toEqual({ updated: 1 });
  });

  it('PATCH /notifications/read-all remains legacy 204 without body', async () => {
    const response = await request(server)
      .patch('/notifications/read-all')
      .set('Authorization', 'Bearer test-token')
      .expect(204);

    expect(response.text).toBe('');
  });
});
