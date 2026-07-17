import { Inject, Injectable } from '@nestjs/common';

import { AllNotificationsReadPayload } from '../../domain/notification.types';
import {
  NOTIFICATION_REPOSITORY,
  NotificationRepositoryPort,
} from '../../domain/ports/notification-repository.port';
import {
  NOTIFICATION_REALTIME_PUBLISHER,
  NotificationRealtimePublisherPort,
} from '../../domain/ports/notification-realtime-publisher.port';

@Injectable()
export class MarkAllNotificationsReadUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notifications: NotificationRepositoryPort,
    @Inject(NOTIFICATION_REALTIME_PUBLISHER)
    private readonly realtimePublisher: NotificationRealtimePublisherPort,
  ) {}

  async execute(userId: string): Promise<AllNotificationsReadPayload> {
    const readAt = new Date();
    const updated = await this.notifications.markAllAsRead(userId, readAt);
    const result = { updated, readAt };

    if (updated > 0) {
      this.realtimePublisher.publishAllRead(userId, result);
    }

    return result;
  }
}
