import { Inject, Injectable } from '@nestjs/common';

import {
  NotificationListResult,
  NotificationPagination,
} from '../../domain/notification.types';
import {
  NOTIFICATION_REPOSITORY,
  NotificationRepositoryPort,
} from '../../domain/ports/notification-repository.port';
import { normalizeNotificationPagination } from './notification-pagination';

@Injectable()
export class ListNotificationsUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notifications: NotificationRepositoryPort,
  ) {}

  execute(
    userId: string,
    pagination: NotificationPagination,
  ): Promise<NotificationListResult> {
    return this.notifications.findAll(
      userId,
      normalizeNotificationPagination(pagination),
    );
  }
}
