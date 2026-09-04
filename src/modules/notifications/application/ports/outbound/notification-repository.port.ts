import {
  NotificationModel,
  NotificationListResult,
  NormalizedNotificationPagination,
  PublishNotificationInput,
} from '../../models/notification.model';

export const NOTIFICATION_REPOSITORY = Symbol('NOTIFICATION_REPOSITORY');

export interface NotificationRepositoryPort {
  findAll(
    userId: string,
    pagination: NormalizedNotificationPagination,
  ): Promise<NotificationListResult>;
  findUnread(userId: string, limit: number): Promise<NotificationModel[]>;
  countUnread(userId: string): Promise<number>;
  findByIdForUser(
    id: string,
    userId: string,
  ): Promise<NotificationModel | null>;
  markOneAsRead(
    id: string,
    userId: string,
    readAt: Date,
  ): Promise<NotificationModel | null>;
  markAllAsRead(userId: string, readAt: Date): Promise<number>;
  create(input: PublishNotificationInput): Promise<NotificationModel>;
}
