import {
  NotificationModel,
  PublishNotificationInput,
} from '../notification.types';

export const NOTIFICATION_PUBLISHER = Symbol('NOTIFICATION_PUBLISHER');

export interface NotificationPublisherPort {
  publish(input: PublishNotificationInput): Promise<NotificationModel>;
}
