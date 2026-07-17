import { Notification } from '../../entities/notification.entity';

export const NOTIFICATION_REALTIME_PUBLISHER = Symbol(
  'NOTIFICATION_REALTIME_PUBLISHER',
);

export interface NotificationRealtimePublisherPort {
  publishCreated(userId: string, notification: Notification): void;
  publishRead(userId: string, notificationId: string): void;
  publishAllRead(userId: string): void;
}
