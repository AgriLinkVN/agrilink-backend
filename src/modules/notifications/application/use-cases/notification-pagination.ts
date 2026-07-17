import {
  NormalizedNotificationPagination,
  NotificationPagination,
} from '../../domain/notification.types';

export function normalizeNotificationPagination(
  pagination: NotificationPagination,
): NormalizedNotificationPagination {
  const page = Math.max(1, Number(pagination.page ?? 1));
  const limit = Math.min(100, Math.max(1, Number(pagination.limit ?? 20)));

  return { page, limit };
}

export function normalizeUnreadNotificationLimit(limit?: number): number {
  if (!limit || Number.isNaN(limit)) return 20;
  return Math.min(50, Math.max(1, limit));
}
