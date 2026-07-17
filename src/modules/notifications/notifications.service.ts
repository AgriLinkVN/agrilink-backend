import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Notification } from './entities/notification.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';
import {
  NOTIFICATION_REPOSITORY,
  NotificationRepositoryPort,
} from './domain/ports/notification-repository.port';
import {
  NOTIFICATION_REALTIME_PUBLISHER,
  NotificationRealtimePublisherPort,
} from './domain/ports/notification-realtime-publisher.port';
import { NotificationPublisherPort } from './domain/ports/notification-publisher.port';
import { CreateNotificationInput } from './domain/notification.types';

@Injectable()
export class NotificationsService implements NotificationPublisherPort {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notifications: NotificationRepositoryPort,
    @Inject(NOTIFICATION_REALTIME_PUBLISHER)
    private readonly realtimePublisher: NotificationRealtimePublisherPort,
  ) {}

  async findAll(userId: string, pagination: PaginationDto): Promise<{ data: Notification[]; total: number }> {
    return this.notifications.findAll(userId, pagination);
  }

  getUnread(userId: string, limit?: number): Promise<Notification[]> {
    return this.notifications.findUnread(userId, this.normalizeLimit(limit));
  }

  async countUnread(userId: string): Promise<{ count: number }> {
    const count = await this.notifications.countUnread(userId);
    return { count };
  }

  async markAsRead(notifId: string, userId: string): Promise<Notification> {
    const notification = await this.notifications.findByIdForUser(
      notifId,
      userId,
    );
    if (!notification) {
      throw new NotFoundException('Không tìm thấy thông báo');
    }

    if (notification.isRead) {
      return notification;
    }

    notification.isRead = true;
    notification.readAt = new Date();
    const saved = await this.notifications.save(notification);
    this.realtimePublisher.publishRead(userId, saved.id);
    return saved;
  }

  async markAllAsRead(userId: string): Promise<{ updated: number }> {
    const updated = await this.notifications.markAllAsRead(userId, new Date());
    if (updated > 0) {
      this.realtimePublisher.publishAllRead(userId);
    }

    return { updated };
  }

  /** Internal use — called by other services to push a notification */
  async create(dto: CreateNotificationInput): Promise<Notification> {
    return this.createAndEmit(dto);
  }

  async createAndEmit(dto: CreateNotificationInput): Promise<Notification> {
    const notification = await this.notifications.create(dto);
    this.realtimePublisher.publishCreated(notification.userId, notification);
    return notification;
  }

  private normalizeLimit(limit?: number): number {
    if (!limit || Number.isNaN(limit)) return 20;
    return Math.min(50, Math.max(1, limit));
  }
}
