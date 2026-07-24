import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { databaseConfig } from "./config/database.config";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { ProfilesRoute } from "./modules/profiles/profiles.route";
import { GeographyModule } from "./modules/geography/geography.module";
import { ProductsModule } from "./modules/products/products.module";
import { CooperativesModule } from "./modules/cooperatives/cooperatives.module";
import { MarketPricesModule } from "./modules/market-prices/market-prices.module";
import { TraceabilityModule } from "./modules/traceability/traceability.module";
import { ReviewsModule } from "./modules/reviews/reviews.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { AdsModule } from "./modules/ads/ads.module";
import { AdminRoute } from "./modules/admin/admin.route";
import { StorageModule } from "./modules/storage/storage.module";
import { ForumModule } from "./modules/forum/forum.module";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { RolesGuard } from "./common/guards/roles.guard";
import { SmsRoute } from "./shared/sms/sms.route";
import { ThrottlerModule } from "@nestjs/throttler";

@Module({
  imports: [
    // Configuration — must be first
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    ThrottlerModule.forRoot([{ name: "storage", ttl: 60_000, limit: 30 }]),

    // Database
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: databaseConfig,
    }),

    // Feature modules
    AuthModule,
    UsersModule,
    ProfilesRoute,
    GeographyModule,
    ProductsModule,
    CooperativesModule,
    MarketPricesModule,
    TraceabilityModule,
    ReviewsModule,
    NotificationsModule,
    AdsModule,
    AdminRoute,
    StorageModule,
    ForumModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
