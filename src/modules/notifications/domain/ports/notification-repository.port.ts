import { Notification } from '../../entities/notification.entity';
import {
  CreateNotificationInput,
  NotificationListResult,
  NotificationPagination,
} from '../notification.types';

export const NOTIFICATION_REPOSITORY = Symbol('NOTIFICATION_REPOSITORY');

export interface NotificationRepositoryPort {
  findAll(
    userId: string,
    pagination: NotificationPagination,
  ): Promise<NotificationListResult<Notification>>;
  findUnread(userId: string, limit: number): Promise<Notification[]>;
  countUnread(userId: string): Promise<number>;
  findByIdForUser(id: string, userId: string): Promise<Notification | null>;
  save(notification: Notification): Promise<Notification>;
  markAllAsRead(userId: string, readAt: Date): Promise<number>;
  create(input: CreateNotificationInput): Promise<Notification>;
}
