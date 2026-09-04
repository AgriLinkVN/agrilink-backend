import {
  NotificationModel,
  PublishNotificationInput,
} from '../../models/notification.model';

export const NOTIFICATION_PUBLISHER = Symbol('NOTIFICATION_PUBLISHER');

export interface NotificationPublisherPort {
  publish(input: PublishNotificationInput): Promise<NotificationModel>;
}
