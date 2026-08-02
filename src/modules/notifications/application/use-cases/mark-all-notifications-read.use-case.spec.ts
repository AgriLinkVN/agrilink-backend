import { Test, TestingModule } from '@nestjs/testing';

import {
  NOTIFICATION_REPOSITORY,
  NotificationRepositoryPort,
} from '../ports/outbound/notification-repository.port';
import {
  NOTIFICATION_REALTIME_PUBLISHER,
  NotificationRealtimePublisherPort,
} from '../ports/outbound/notification-realtime-publisher.port';
import { MarkAllNotificationsReadUseCase } from './mark-all-notifications-read.use-case';

describe('MarkAllNotificationsReadUseCase', () => {
  let useCase: MarkAllNotificationsReadUseCase;
  let repository: jest.Mocked<NotificationRepositoryPort>;
  let realtimePublisher: jest.Mocked<NotificationRealtimePublisherPort>;

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
        MarkAllNotificationsReadUseCase,
        { provide: NOTIFICATION_REPOSITORY, useValue: repository },
        {
          provide: NOTIFICATION_REALTIME_PUBLISHER,
          useValue: realtimePublisher,
        },
      ],
    }).compile();

    useCase = module.get(MarkAllNotificationsReadUseCase);
  });

  it('publishes all-read when rows changed', async () => {
    repository.markAllAsRead.mockResolvedValue(3);

    await expect(useCase.execute('user-1')).resolves.toMatchObject({
      updated: 3,
    });

    expect(realtimePublisher.publishAllRead).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ updated: 3 }),
    );
  });

  it('does not publish all-read when no rows changed', async () => {
    repository.markAllAsRead.mockResolvedValue(0);

    await expect(useCase.execute('user-1')).resolves.toMatchObject({
      updated: 0,
    });

    expect(realtimePublisher.publishAllRead).not.toHaveBeenCalled();
  });

  it('returns the persisted update count when realtime delivery fails', async () => {
    repository.markAllAsRead.mockResolvedValue(2);
    realtimePublisher.publishAllRead.mockImplementation(() => {
      throw new Error('socket unavailable');
    });

    await expect(useCase.execute('user-1')).resolves.toEqual({
      updated: 2,
      readAt: expect.any(Date),
    });
  });
});
