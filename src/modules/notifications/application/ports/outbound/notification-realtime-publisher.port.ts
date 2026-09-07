import {
  AllNotificationsReadPayload,
  NotificationMarkedReadPayload,
  NotificationModel,
} from '../../models/notification.model';

export const NOTIFICATION_REALTIME_PUBLISHER = Symbol(
  'NOTIFICATION_REALTIME_PUBLISHER',
);

export interface NotificationRealtimePublisherPort {
  publishCreated(userId: string, notification: NotificationModel): void;
  publishMarkedRead(
    userId: string,
    payload: NotificationMarkedReadPayload,
  ): void;
  publishAllRead(userId: string, payload: AllNotificationsReadPayload): void;
}
