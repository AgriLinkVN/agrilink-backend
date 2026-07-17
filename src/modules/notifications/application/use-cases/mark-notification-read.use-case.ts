import { Inject, Injectable } from '@nestjs/common';

import { NotificationNotFoundError } from '../../domain/errors/notification-not-found.error';
import { NotificationModel } from '../../domain/notification.types';
import {
  NOTIFICATION_REPOSITORY,
  NotificationRepositoryPort,
} from '../../domain/ports/notification-repository.port';
import {
  NOTIFICATION_REALTIME_PUBLISHER,
  NotificationRealtimePublisherPort,
} from '../../domain/ports/notification-realtime-publisher.port';

@Injectable()
export class MarkNotificationReadUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notifications: NotificationRepositoryPort,
    @Inject(NOTIFICATION_REALTIME_PUBLISHER)
    private readonly realtimePublisher: NotificationRealtimePublisherPort,
  ) {}

  async execute(notificationId: string, userId: string): Promise<NotificationModel> {
    const existing = await this.notifications.findByIdForUser(
      notificationId,
      userId,
    );

    if (!existing) {
      throw new NotificationNotFoundError(notificationId);
    }

    if (existing.isRead) {
      return existing;
    }

    const readAt = new Date();
    const updated = await this.notifications.markOneAsRead(
      notificationId,
      userId,
      readAt,
    );

    if (!updated) {
      throw new NotificationNotFoundError(notificationId);
    }

    this.realtimePublisher.publishMarkedRead(userId, {
      id: updated.id,
      readAt,
    });

    return updated;
  }
}
