import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notifRepo: Repository<Notification>,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  async findAll(userId: string, pagination: PaginationDto): Promise<{ data: Notification[]; total: number }> {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;

    const [data, total] = await this.notifRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total };
  }

  async markAsRead(notifId: string, userId: string): Promise<Notification> {
    const notification = await this.notifRepo.findOne({
      where: { id: notifId, userId },
    });
    if (!notification) {
      throw new NotFoundException('Không tìm thấy thông báo');
    }

    notification.isRead = true;
    notification.readAt = new Date();
    return this.notifRepo.save(notification);
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notifRepo.update(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() },
    );
  }

  /** Internal use — called by other services to push a notification */
  async create(dto: CreateNotificationDto): Promise<Notification> {
    const notification = await this.notifRepo.save(this.notifRepo.create(dto));
    this.notificationsGateway.emitToUser(notification.userId, notification);
    return notification;
  }
}
