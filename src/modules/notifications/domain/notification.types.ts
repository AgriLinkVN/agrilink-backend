import { NotifType } from '@common/enums';

export type NotificationData = Record<string, unknown>;

export interface NotificationModel {
  id: string;
  userId: string;
  type: NotifType;
  title: string;
  body: string;
  data: NotificationData;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
}

export interface PublishNotificationInput {
  userId: string;
  type: NotifType;
  title: string;
  body: string;
  data?: NotificationData;
}

export interface NotificationPagination {
  page?: number;
  limit?: number;
}

export interface NormalizedNotificationPagination {
  page: number;
  limit: number;
}

export interface NotificationListResult {
  data: NotificationModel[];
  total: number;
  page: number;
  limit: number;
}

export interface CountUnreadNotificationsResult {
  count: number;
}

export interface NotificationMarkedReadPayload {
  id: string;
  readAt: Date;
}

export interface AllNotificationsReadPayload {
  updated: number;
  readAt: Date;
}
