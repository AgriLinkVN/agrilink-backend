import { Inject, Injectable } from '@nestjs/common';

import { CountUnreadNotificationsResult } from '../models/notification.model';
import {
  NOTIFICATION_REPOSITORY,
  NotificationRepositoryPort,
} from '../ports/outbound/notification-repository.port';

@Injectable()
export class CountUnreadNotificationsUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notifications: NotificationRepositoryPort,
  ) {}

  async execute(userId: string): Promise<CountUnreadNotificationsResult> {
    const count = await this.notifications.countUnread(userId);
    return { count };
  }
}
