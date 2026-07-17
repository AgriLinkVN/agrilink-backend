import { Test, TestingModule } from '@nestjs/testing';

import { NotifType } from '@common/enums';
import { PublishNotificationUseCase } from './publish-notification.use-case';
import { NOTIFICATION_REPOSITORY, NotificationRepositoryPort } from '../../domain/ports/notification-repository.port';
import { NOTIFICATION_REALTIME_PUBLISHER, NotificationRealtimePublisherPort } from '../../domain/ports/notification-realtime-publisher.port';
import { NotificationModel, PublishNotificationInput } from '../../domain/notification.types';

describe('PublishNotificationUseCase', () => {
  let useCase: PublishNotificationUseCase;
  let repository: jest.Mocked<NotificationRepositoryPort>;
  let realtimePublisher: jest.Mocked<NotificationRealtimePublisherPort>;

  const input: PublishNotificationInput = {
    userId: 'user-1',
    type: NotifType.PRODUCT_STATUS_CHANGED,
    title: 'Cap nhat san pham',
    body: 'Trang thai san pham da thay doi.',
    data: { productId: 'product-1' },
  };

  const notification: NotificationModel = {
    id: 'notification-1',
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    data: input.data ?? {},
    isRead: false,
    readAt: null,
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    repository = {
      findAll: jest.fn(),
      findUnread: jest.fn(),
      countUnread: jest.fn(),
      findByIdForUser: jest.fn(),
      markOneAsRead: jest.fn(),
      markAllAsRead: jest.fn(),
      create: jest.fn(),
    };

    realtimePublisher = {
      publishCreated: jest.fn(),
      publishMarkedRead: jest.fn(),
      publishAllRead: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublishNotificationUseCase,
        { provide: NOTIFICATION_REPOSITORY, useValue: repository },
        { provide: NOTIFICATION_REALTIME_PUBLISHER, useValue: realtimePublisher },
      ],
    }).compile();

    useCase = module.get(PublishNotificationUseCase);
  });

  it('persists then publishes a notification', async () => {
    repository.create.mockResolvedValue(notification);

    await expect(useCase.publish(input)).resolves.toBe(notification);

    expect(repository.create).toHaveBeenCalledWith(input);
    expect(realtimePublisher.publishCreated).toHaveBeenCalledWith(
      notification.userId,
      notification,
    );
  });

  it('does not publish when persistence fails', async () => {
    repository.create.mockRejectedValue(new Error('db failed'));

    await expect(useCase.publish(input)).rejects.toThrow('db failed');

    expect(realtimePublisher.publishCreated).not.toHaveBeenCalled();
  });
});
