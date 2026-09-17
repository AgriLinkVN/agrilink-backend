import { Test, TestingModule } from '@nestjs/testing';

import { NotifType } from '@common/enums';
import { NotificationNotFoundError } from '../errors/notification-not-found.error';
import { NotificationModel } from '../models/notification.model';
import {
  NOTIFICATION_REPOSITORY,
  NotificationRepositoryPort,
} from '../ports/outbound/notification-repository.port';
import {
  NOTIFICATION_REALTIME_PUBLISHER,
  NotificationRealtimePublisherPort,
} from '../ports/outbound/notification-realtime-publisher.port';
import { MarkNotificationReadUseCase } from './mark-notification-read.use-case';

describe('MarkNotificationReadUseCase', () => {
  let useCase: MarkNotificationReadUseCase;
  let repository: jest.Mocked<NotificationRepositoryPort>;
  let realtimePublisher: jest.Mocked<NotificationRealtimePublisherPort>;

  const unreadNotification: NotificationModel = {
    id: 'notification-1',
    userId: 'user-1',
    type: NotifType.NEW_MESSAGE,
    title: 'Tin nhan moi',
    body: 'Ban co tin nhan moi.',
    data: {},
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
        MarkNotificationReadUseCase,
        { provide: NOTIFICATION_REPOSITORY, useValue: repository },
        {
          provide: NOTIFICATION_REALTIME_PUBLISHER,
          useValue: realtimePublisher,
        },
      ],
    }).compile();

    useCase = module.get(MarkNotificationReadUseCase);
  });

  it('throws when notification does not belong to the user or does not exist', async () => {
    repository.findByIdForUser.mockResolvedValue(null);

    await expect(
      useCase.execute('notification-1', 'user-2'),
    ).rejects.toBeInstanceOf(NotificationNotFoundError);

    expect(repository.markOneAsRead).not.toHaveBeenCalled();
    expect(realtimePublisher.publishMarkedRead).not.toHaveBeenCalled();
  });

  it('returns current notification without saving or publishing when already read', async () => {
    const readNotification = {
      ...unreadNotification,
      isRead: true,
      readAt: new Date('2026-06-02T00:00:00.000Z'),
    };
    repository.findByIdForUser.mockResolvedValue(readNotification);

    await expect(
      useCase.execute(readNotification.id, readNotification.userId),
    ).resolves.toBe(readNotification);

    expect(repository.markOneAsRead).not.toHaveBeenCalled();
    expect(realtimePublisher.publishMarkedRead).not.toHaveBeenCalled();
  });

  it('marks unread notification and publishes marked_read once', async () => {
    const readNotification = {
      ...unreadNotification,
      isRead: true,
      readAt: new Date('2026-06-02T00:00:00.000Z'),
    };
    repository.findByIdForUser.mockResolvedValue(unreadNotification);
    repository.markOneAsRead.mockResolvedValue(readNotification);

    await expect(
      useCase.execute(unreadNotification.id, unreadNotification.userId),
    ).resolves.toBe(readNotification);

    expect(repository.markOneAsRead).toHaveBeenCalledTimes(1);
    expect(realtimePublisher.publishMarkedRead).toHaveBeenCalledTimes(1);
    expect(realtimePublisher.publishMarkedRead).toHaveBeenCalledWith(
      unreadNotification.userId,
      expect.objectContaining({ id: unreadNotification.id }),
    );
  });

  it('returns the winning concurrent update without publishing twice', async () => {
    const readNotification = {
      ...unreadNotification,
      isRead: true,
      readAt: new Date('2026-06-02T00:00:00.000Z'),
    };
    repository.findByIdForUser
      .mockResolvedValueOnce(unreadNotification)
      .mockResolvedValueOnce(readNotification);
    repository.markOneAsRead.mockResolvedValue(null);

    await expect(
      useCase.execute(unreadNotification.id, unreadNotification.userId),
    ).resolves.toBe(readNotification);

    expect(repository.findByIdForUser).toHaveBeenCalledTimes(2);
    expect(realtimePublisher.publishMarkedRead).not.toHaveBeenCalled();
  });

  it('returns the persisted read state when realtime delivery fails', async () => {
    const readNotification = {
      ...unreadNotification,
      isRead: true,
      readAt: new Date('2026-06-02T00:00:00.000Z'),
    };
    repository.findByIdForUser.mockResolvedValue(unreadNotification);
    repository.markOneAsRead.mockResolvedValue(readNotification);
    realtimePublisher.publishMarkedRead.mockImplementation(() => {
      throw new Error('socket unavailable');
    });

    await expect(
      useCase.execute(unreadNotification.id, unreadNotification.userId),
    ).resolves.toBe(readNotification);
  });
});
