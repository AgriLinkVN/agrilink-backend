import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsModule } from '../modules/notifications/notifications.module';
import { jwtConfig } from '../config/jwt.config';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: jwtConfig,
    }),
    // Avoid circular dep: NotificationsModule imports GatewaysModule too
    forwardRef(() => NotificationsModule),
  ],
  providers: [NotificationsGateway],
  exports: [NotificationsGateway],
})
export class GatewaysModule {}
