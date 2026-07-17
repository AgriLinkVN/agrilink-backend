import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsController } from './presentation/controllers/notifications.controller';
import { NotificationsGateway } from './presentation/gateways/notifications.gateway';
import { AuthModule } from '../auth/auth.module';
import { TypeOrmNotificationRepository } from './infrastructure/repositories/typeorm-notification.repository';
import { NOTIFICATION_REPOSITORY } from './domain/ports/notification-repository.port';
import { NOTIFICATION_REALTIME_PUBLISHER } from './domain/ports/notification-realtime-publisher.port';
import { NOTIFICATION_PUBLISHER } from './domain/ports/notification-publisher.port';
import { NotificationOrmEntity } from './infrastructure/persistence/notification.orm-entity';
import { ListNotificationsUseCase } from './application/use-cases/list-notifications.use-case';
import { ListUnreadNotificationsUseCase } from './application/use-cases/list-unread-notifications.use-case';
import { CountUnreadNotificationsUseCase } from './application/use-cases/count-unread-notifications.use-case';
import { MarkNotificationReadUseCase } from './application/use-cases/mark-notification-read.use-case';
import { MarkAllNotificationsReadUseCase } from './application/use-cases/mark-all-notifications-read.use-case';
import { PublishNotificationUseCase } from './application/use-cases/publish-notification.use-case';

@Module({
  imports: [TypeOrmModule.forFeature([NotificationOrmEntity]), AuthModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsGateway,
    TypeOrmNotificationRepository,
    ListNotificationsUseCase,
    ListUnreadNotificationsUseCase,
    CountUnreadNotificationsUseCase,
    MarkNotificationReadUseCase,
    MarkAllNotificationsReadUseCase,
    PublishNotificationUseCase,
    {
      provide: NOTIFICATION_REPOSITORY,
      useExisting: TypeOrmNotificationRepository,
    },
    {
      provide: NOTIFICATION_REALTIME_PUBLISHER,
      useExisting: NotificationsGateway,
    },
    {
      provide: NOTIFICATION_PUBLISHER,
      useExisting: PublishNotificationUseCase,
    },
  ],
  exports: [NOTIFICATION_PUBLISHER],
})
export class NotificationsModule {}
