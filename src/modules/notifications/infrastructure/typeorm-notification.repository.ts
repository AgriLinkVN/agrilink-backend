import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Notification } from '../entities/notification.entity';
import { NotificationRepositoryPort } from '../domain/ports/notification-repository.port';
import {
  CreateNotificationInput,
  NotificationListResult,
  NotificationPagination,
} from '../domain/notification.types';

@Injectable()
export class TypeOrmNotificationRepository implements NotificationRepositoryPort {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
  ) {}

  async findAll(
    userId: string,
    pagination: NotificationPagination,
  ): Promise<NotificationListResult<Notification>> {
    const page = Math.max(1, pagination.page ?? 1);
    const limit = Math.min(100, Math.max(1, pagination.limit ?? 20));

    const [data, total] = await this.notificationRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total };
  }

  findUnread(userId: string, limit: number): Promise<Notification[]> {
    const take = Math.min(50, Math.max(1, limit));

    return this.notificationRepo.find({
      where: { userId, isRead: false },
      order: { createdAt: 'DESC' },
      take,
    });
  }

  countUnread(userId: string): Promise<number> {
    return this.notificationRepo.count({
      where: { userId, isRead: false },
    });
  }

  findByIdForUser(id: string, userId: string): Promise<Notification | null> {
    return this.notificationRepo.findOne({
      where: { id, userId },
    });
  }

  save(notification: Notification): Promise<Notification> {
    return this.notificationRepo.save(notification);
  }

  async markAllAsRead(userId: string, readAt: Date): Promise<number> {
    const result = await this.notificationRepo.update(
      { userId, isRead: false },
      { isRead: true, readAt },
    );

    return result.affected ?? 0;
  }

  create(input: CreateNotificationInput): Promise<Notification> {
    return this.notificationRepo.save(this.notificationRepo.create(input));
  }
}
