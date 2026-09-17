import { NotificationResponseDto } from '../dto/notification-response.dto';

export const NOTIFICATION_SOCKET_EVENTS = {
  NEW: 'new_notification',
  MARKED_READ: 'marked_read',
  ALL_READ: 'all_notifications_read',
} as const;

export type NewNotificationEvent = NotificationResponseDto;

export interface NotificationMarkedReadEvent {
  id: string;
  readAt: string;
}

export interface AllNotificationsReadEvent {
  updated: number;
  readAt: string;
}
