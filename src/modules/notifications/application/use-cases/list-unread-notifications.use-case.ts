import { Inject, Injectable } from '@nestjs/common';

import { NotificationModel } from '../../domain/notification.types';
import {
  NOTIFICATION_REPOSITORY,
  NotificationRepositoryPort,
} from '../../domain/ports/notification-repository.port';
import { normalizeUnreadNotificationLimit } from './notification-pagination';

@Injectable()
export class ListUnreadNotificationsUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notifications: NotificationRepositoryPort,
  ) {}

  execute(userId: string, limit?: number): Promise<NotificationModel[]> {
    return this.notifications.findUnread(
      userId,
      normalizeUnreadNotificationLimit(limit),
    );
  }
}
