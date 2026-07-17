import { Notification } from '../../entities/notification.entity';
import { CreateNotificationInput } from '../notification.types';

export const NOTIFICATION_PUBLISHER = Symbol('NOTIFICATION_PUBLISHER');

export interface NotificationPublisherPort {
  create(input: CreateNotificationInput): Promise<Notification>;
  createAndEmit(input: CreateNotificationInput): Promise<Notification>;
}
