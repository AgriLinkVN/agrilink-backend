import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { Notification } from './entities/notification.entity';
import { NotificationsGateway } from './notifications.gateway';
import { AuthModule } from '../auth/auth.module';
import { TypeOrmNotificationRepository } from './infrastructure/typeorm-notification.repository';
import { NOTIFICATION_REPOSITORY } from './domain/ports/notification-repository.port';
import { NOTIFICATION_REALTIME_PUBLISHER } from './domain/ports/notification-realtime-publisher.port';
import { NOTIFICATION_PUBLISHER } from './domain/ports/notification-publisher.port';

@Module({
  imports: [TypeOrmModule.forFeature([Notification]), AuthModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsGateway,
    {
      provide: NOTIFICATION_REPOSITORY,
      useClass: TypeOrmNotificationRepository,
    },
    {
      provide: NOTIFICATION_REALTIME_PUBLISHER,
      useExisting: NotificationsGateway,
    },
    {
      provide: NOTIFICATION_PUBLISHER,
      useExisting: NotificationsService,
    },
  ],
  exports: [NotificationsService, NOTIFICATION_PUBLISHER],
})
export class NotificationsModule {}
