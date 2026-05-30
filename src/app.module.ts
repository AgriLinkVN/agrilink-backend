import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { databaseConfig } from './config/database.config';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProfilesModule } from './modules/profiles/profiles.module';
import { GeographyModule } from './modules/geography/geography.module';
import { ProductsModule } from './modules/products/products.module';
import { WishlistModule } from './modules/wishlist/wishlist.module';
import { CooperativesModule } from './modules/cooperatives/cooperatives.module';
import { MarketPricesModule } from './modules/market-prices/market-prices.module';
import { TraceabilityModule } from './modules/traceability/traceability.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AdsModule } from './modules/ads/ads.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    // Configuration — must be first
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Cron / scheduled tasks
    ScheduleModule.forRoot(),

    // Database
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: databaseConfig,
    }),

    // Feature modules
    AuthModule,
    UsersModule,
    ProfilesModule,
    GeographyModule,
    ProductsModule,
    WishlistModule,
    CooperativesModule,
    MarketPricesModule,
    TraceabilityModule,
    ReviewsModule,
    NotificationsModule,
    AdsModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
