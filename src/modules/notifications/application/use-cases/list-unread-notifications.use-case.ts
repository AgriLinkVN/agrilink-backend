import { Inject, Injectable } from '@nestjs/common';

import { NotificationModel } from '../models/notification.model';
import {
  NOTIFICATION_REPOSITORY,
  NotificationRepositoryPort,
} from '../ports/outbound/notification-repository.port';
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
