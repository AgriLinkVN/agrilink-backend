import { Test, TestingModule } from '@nestjs/testing';

import { NotifType } from '@common/enums';
import { Notification } from './entities/notification.entity';
import { NotificationsService } from './notifications.service';
import { NOTIFICATION_REPOSITORY } from './domain/ports/notification-repository.port';
import { NOTIFICATION_REALTIME_PUBLISHER } from './domain/ports/notification-realtime-publisher.port';

describe('NotificationsService', () => {
  let service: NotificationsService;

  const repository = {
    findAll: jest.fn(),
    findUnread: jest.fn(),
    countUnread: jest.fn(),
    findByIdForUser: jest.fn(),
    save: jest.fn(),
    markAllAsRead: jest.fn(),
    create: jest.fn(),
  };

  const realtimePublisher = {
    publishCreated: jest.fn(),
    publishRead: jest.fn(),
    publishAllRead: jest.fn(),
  };

  const notification: Notification = {
    id: 'notification-1',
    userId: 'user-1',
    type: NotifType.PRODUCT_STATUS_CHANGED,
    title: 'Cap nhat san pham',
    body: 'Trang thai san pham da thay doi.',
    data: { productId: 'product-1' },
    isRead: false,
    readAt: null,
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: NOTIFICATION_REPOSITORY,
          useValue: repository,
        },
        {
          provide: NOTIFICATION_REALTIME_PUBLISHER,
          useValue: realtimePublisher,
        },
      ],
    }).compile();

    service = module.get(NotificationsService);
  });

  it('creates and emits a notification through the realtime port', async () => {
    repository.create.mockResolvedValue(notification);

    await expect(
      service.create({
        userId: notification.userId,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        data: notification.data as Record<string, unknown>,
      }),
    ).resolves.toBe(notification);

    expect(repository.create).toHaveBeenCalledTimes(1);
    expect(realtimePublisher.publishCreated).toHaveBeenCalledWith(
      notification.userId,
      notification,
    );
  });

  it('marks one notification as read and emits marked_read', async () => {
    const saved = { ...notification, isRead: true, readAt: new Date() };
    repository.findByIdForUser.mockResolvedValue({ ...notification });
    repository.save.mockResolvedValue(saved);

    await expect(
      service.markAsRead(notification.id, notification.userId),
    ).resolves.toEqual(saved);

    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({ isRead: true }),
    );
    expect(realtimePublisher.publishRead).toHaveBeenCalledWith(
      notification.userId,
      notification.id,
    );
  });

  it('marks all unread notifications and emits all-read only when rows changed', async () => {
    repository.markAllAsRead.mockResolvedValue(3);

    await expect(service.markAllAsRead(notification.userId)).resolves.toEqual({
      updated: 3,
    });

    expect(realtimePublisher.publishAllRead).toHaveBeenCalledWith(
      notification.userId,
    );
  });
});
