import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notifRepo: Repository<Notification>,
  ) {}

  async findAll(userId: string, pagination: PaginationDto): Promise<{ data: Notification[]; total: number }> {
    throw new Error('TODO: implement NotificationsService.findAll()');
  }

  async markAsRead(notifId: string, userId: string): Promise<Notification> {
    throw new Error('TODO: implement NotificationsService.markAsRead()');
  }

  async markAllAsRead(userId: string): Promise<void> {
    throw new Error('TODO: implement NotificationsService.markAllAsRead()');
  }

  /** Internal use — called by other services to push a notification */
  async create(dto: CreateNotificationDto): Promise<Notification> {
    throw new Error('TODO: implement NotificationsService.create()');
  }
}
