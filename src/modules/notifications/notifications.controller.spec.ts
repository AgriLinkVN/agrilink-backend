import { NotFoundException } from '@nestjs/common';

import { NotifType } from '@common/enums';
import { CountUnreadNotificationsUseCase } from './application/use-cases/count-unread-notifications.use-case';
import { ListNotificationsUseCase } from './application/use-cases/list-notifications.use-case';
import { ListUnreadNotificationsUseCase } from './application/use-cases/list-unread-notifications.use-case';
import { MarkAllNotificationsReadUseCase } from './application/use-cases/mark-all-notifications-read.use-case';
import { MarkNotificationReadUseCase } from './application/use-cases/mark-notification-read.use-case';
import { NotificationNotFoundError } from './application/errors/notification-not-found.error';
import { NotificationModel } from './application/models/notification.model';
import { NotificationsController } from './presentation/controllers/notifications.controller';
import { PaginationDto } from '../../common/dto/pagination.dto';

describe('NotificationsController contract', () => {
  const notification: NotificationModel = {
    id: 'notification-1',
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

  let controller: NotificationsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new NotificationsController(
      listUseCase as unknown as ListNotificationsUseCase,
      unreadUseCase as unknown as ListUnreadNotificationsUseCase,
      countUseCase as unknown as CountUnreadNotificationsUseCase,
      markReadUseCase as unknown as MarkNotificationReadUseCase,
      markAllUseCase as unknown as MarkAllNotificationsReadUseCase,
    );
  });

  it('maps list result to REST response DTO without userId', async () => {
    listUseCase.execute.mockResolvedValue({
      data: [notification],
      total: 1,
      page: 1,
      limit: 20,
    });

    const pagination = Object.assign(new PaginationDto(), {
      page: 1,
      limit: 20,
    });

    await expect(controller.findAll('user-1', pagination)).resolves.toEqual({
      data: [
        {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          body: notification.body,
          data: notification.data,
          isRead: notification.isRead,
          readAt: null,
          createdAt: '2026-06-01T00:00:00.000Z',
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    });
  });

  it('maps domain not found error to HTTP 404', async () => {
    markReadUseCase.execute.mockRejectedValue(
      new NotificationNotFoundError(notification.id),
    );

    await expect(
      controller.markAsRead(notification.id, notification.userId),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
