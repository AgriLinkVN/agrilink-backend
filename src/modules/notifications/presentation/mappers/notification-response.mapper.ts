import {
  AllNotificationsReadPayload,
  NotificationListResult,
  NotificationMarkedReadPayload,
  NotificationModel,
} from '../../application/models/notification.model';
import {
  MarkAllNotificationsReadResponseDto,
  NotificationListResponseDto,
  NotificationResponseDto,
} from '../dto/notification-response.dto';
import {
  AllNotificationsReadEvent,
  NotificationMarkedReadEvent,
} from '../contracts/notification-socket.events';

function toIso(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

export function toNotificationResponse(
  notification: NotificationModel,
): NotificationResponseDto {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    data: notification.data,
    isRead: notification.isRead,
    readAt: toIso(notification.readAt),
    createdAt: notification.createdAt.toISOString(),
  };
}

export function toNotificationListResponse(
  result: NotificationListResult,
): NotificationListResponseDto {
  return {
    data: result.data.map(toNotificationResponse),
    total: result.total,
    page: result.page,
    limit: result.limit,
  };
}

export function toMarkAllNotificationsReadResponse(
  result: AllNotificationsReadPayload,
): MarkAllNotificationsReadResponseDto {
  return { updated: result.updated };
}

export function toNotificationMarkedReadEvent(
  payload: NotificationMarkedReadPayload,
): NotificationMarkedReadEvent {
  return {
    id: payload.id,
    readAt: payload.readAt.toISOString(),
  };
}

export function toAllNotificationsReadEvent(
  payload: AllNotificationsReadPayload,
): AllNotificationsReadEvent {
  return {
    updated: payload.updated,
    readAt: payload.readAt.toISOString(),
  };
}
