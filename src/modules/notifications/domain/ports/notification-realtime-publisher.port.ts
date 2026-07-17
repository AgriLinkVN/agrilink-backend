import {
  AllNotificationsReadPayload,
  NotificationMarkedReadPayload,
  NotificationModel,
} from '../notification.types';

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
