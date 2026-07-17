import { Test, TestingModule } from '@nestjs/testing';

import { NOTIFICATION_REPOSITORY, NotificationRepositoryPort } from '../../domain/ports/notification-repository.port';
import { CountUnreadNotificationsUseCase } from './count-unread-notifications.use-case';
import { ListNotificationsUseCase } from './list-notifications.use-case';
import { ListUnreadNotificationsUseCase } from './list-unread-notifications.use-case';

describe('Notification list/count use cases', () => {
  let listUseCase: ListNotificationsUseCase;
  let unreadUseCase: ListUnreadNotificationsUseCase;
  let countUseCase: CountUnreadNotificationsUseCase;
  let repository: jest.Mocked<NotificationRepositoryPort>;

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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListNotificationsUseCase,
        ListUnreadNotificationsUseCase,
        CountUnreadNotificationsUseCase,
        { provide: NOTIFICATION_REPOSITORY, useValue: repository },
      ],
    }).compile();

    listUseCase = module.get(ListNotificationsUseCase);
    unreadUseCase = module.get(ListUnreadNotificationsUseCase);
    countUseCase = module.get(CountUnreadNotificationsUseCase);
  });

  it('normalizes page and max list limit', async () => {
    repository.findAll.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 100,
    });

    await listUseCase.execute('user-1', { page: -1, limit: 500 });

    expect(repository.findAll).toHaveBeenCalledWith('user-1', {
      page: 1,
      limit: 100,
    });
  });

  it('normalizes unread limit', async () => {
    repository.findUnread.mockResolvedValue([]);

    await unreadUseCase.execute('user-1', 500);

    expect(repository.findUnread).toHaveBeenCalledWith('user-1', 50);
  });

  it('returns count contract', async () => {
    repository.countUnread.mockResolvedValue(7);

    await expect(countUseCase.execute('user-1')).resolves.toEqual({
      count: 7,
    });
  });
});
