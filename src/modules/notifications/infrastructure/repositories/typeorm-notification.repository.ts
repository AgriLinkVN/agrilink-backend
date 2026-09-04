import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { NotificationRepositoryPort } from '../../application/ports/outbound/notification-repository.port';
import {
  NotificationData,
  NotificationListResult,
  NotificationModel,
  NormalizedNotificationPagination,
  PublishNotificationInput,
} from '../../application/models/notification.model';
import { NotificationOrmEntity } from '../persistence/notification.orm-entity';

@Injectable()
export class TypeOrmNotificationRepository implements NotificationRepositoryPort {
  constructor(
    @InjectRepository(NotificationOrmEntity)
    private readonly notificationRepo: Repository<NotificationOrmEntity>,
  ) {}

  async findAll(
    userId: string,
    pagination: NormalizedNotificationPagination,
  ): Promise<NotificationListResult> {
    const [entities, total] = await this.notificationRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC', id: 'DESC' },
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
    });

    return {
      data: entities.map((entity) => this.toModel(entity)),
      total,
      page: pagination.page,
      limit: pagination.limit,
    };
  }

  async findUnread(
    userId: string,
    limit: number,
  ): Promise<NotificationModel[]> {
    const entities = await this.notificationRepo.find({
      where: { userId, isRead: false },
      order: { createdAt: 'DESC', id: 'DESC' },
      take: limit,
    });

    return entities.map((entity) => this.toModel(entity));
  }

  countUnread(userId: string): Promise<number> {
    return this.notificationRepo.count({
      where: { userId, isRead: false },
    });
  }

  async findByIdForUser(
    id: string,
    userId: string,
  ): Promise<NotificationModel | null> {
    const entity = await this.notificationRepo.findOne({
      where: { id, userId },
    });

    return entity ? this.toModel(entity) : null;
  }

  async markOneAsRead(
    id: string,
    userId: string,
    readAt: Date,
  ): Promise<NotificationModel | null> {
    const result = await this.notificationRepo.update(
      { id, userId, isRead: false },
      { isRead: true, readAt },
    );

    if (!result.affected) return null;
    return this.findByIdForUser(id, userId);
  }

  async markAllAsRead(userId: string, readAt: Date): Promise<number> {
    const result = await this.notificationRepo.update(
      { userId, isRead: false },
      { isRead: true, readAt },
    );

    return result.affected ?? 0;
  }

  async create(input: PublishNotificationInput): Promise<NotificationModel> {
    const entity = this.notificationRepo.create({
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      data: input.data ?? {},
    });

    return this.toModel(await this.notificationRepo.save(entity));
  }

  private toModel(entity: NotificationOrmEntity): NotificationModel {
    return {
      id: entity.id,
      userId: entity.userId,
      type: entity.type,
      title: entity.title,
      body: entity.body,
      data: this.toData(entity.data),
      isRead: entity.isRead,
      readAt: entity.readAt,
      createdAt: entity.createdAt,
    };
  }

  private toData(value: object | null): NotificationData {
    if (!value || Array.isArray(value)) return {};
    return value as NotificationData;
  }
}
