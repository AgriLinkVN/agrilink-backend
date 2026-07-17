import { Inject, Injectable } from '@nestjs/common';

import {
  NotificationModel,
  PublishNotificationInput,
} from '../models/notification.model';
import { NotificationPublisherPort } from '../ports/inbound/notification-publisher.port';
import {
  NOTIFICATION_REPOSITORY,
  NotificationRepositoryPort,
} from '../ports/outbound/notification-repository.port';
import {
  NOTIFICATION_REALTIME_PUBLISHER,
  NotificationRealtimePublisherPort,
} from '../ports/outbound/notification-realtime-publisher.port';

@Injectable()
export class PublishNotificationUseCase implements NotificationPublisherPort {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notifications: NotificationRepositoryPort,
    @Inject(NOTIFICATION_REALTIME_PUBLISHER)
    private readonly realtimePublisher: NotificationRealtimePublisherPort,
  ) {}

  async publish(input: PublishNotificationInput): Promise<NotificationModel> {
    const notification = await this.notifications.create(input);
    this.realtimePublisher.publishCreated(notification.userId, notification);
    return notification;
  }
}
