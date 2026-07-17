import { NotifType } from '@common/enums';

export type NotificationData = Record<string, unknown>;

export interface CreateNotificationInput {
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

export interface NotificationListResult<T> {
  data: T[];
  total: number;
}
