import { Injectable, forwardRef, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationsGateway } from '../../gateways/notifications.gateway';
import { NotifType } from '../../common/enums';

export interface CreateNotifDto {
  userId: string;
  type: NotifType;
  title: string;
  body?: string;
  data?: object;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notifRepo: Repository<Notification>,
    @Inject(forwardRef(() => NotificationsGateway))
    private readonly gateway: NotificationsGateway,
  ) {}

  async createAndEmit(dto: CreateNotifDto): Promise<Notification> {
    const notif = this.notifRepo.create({
      userId: dto.userId,
      type: dto.type,
      title: dto.title,
      body: dto.body ?? '',
      data: dto.data,
    });
    const saved = await this.notifRepo.save(notif);
    this.gateway.emitToUser(dto.userId, 'new_notification', saved);
    return saved;
  }

  async getAll(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: Notification[]; total: number }> {
    const [data, total] = await this.notifRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total };
  }

  async getUnread(userId: string): Promise<Notification[]> {
    return this.notifRepo.find({
      where: { userId, isRead: false },
      order: { createdAt: 'DESC' },
      take: 20,
    });
  }

  async countUnread(userId: string): Promise<number> {
    return this.notifRepo.count({ where: { userId, isRead: false } });
  }

  async markOneRead(id: string, userId: string): Promise<void> {
    await this.notifRepo.update({ id, userId }, { isRead: true, readAt: new Date() });
  }

  async markAllRead(userId: string): Promise<void> {
    await this.notifRepo.update(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() },
    );
  }
}
