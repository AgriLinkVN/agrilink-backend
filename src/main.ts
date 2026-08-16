import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { RequestLoggingInterceptor } from './common/interceptors/request-logging.interceptor';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { initSentry } from './config/sentry.config';
import * as cookieParser from 'cookie-parser';
import * as dns from 'dns';
import { DataSource } from 'typeorm';
import { ProductDevelopmentSeedService } from '@modules/products/infrastructure/database/seeds/product-development-seed.service';
import { createProductsCategoryReferenceSeedGroup } from '@modules/products/infrastructure/database/seeds/product-category.seed';
import { createUsersDevSeedGroup } from '@modules/users/infrastructure/database/seeds/user.seed';
import { createProfilesRoleProfilesDevSeedGroup } from '@modules/profiles/infrastructure/database/seeds/typeorm-profile-role-development-seed.writer';
import { DevSeedService } from './database/dev-seed.service';
import { LegacyRemainingDevSeedGroup } from './database/seeds/legacy-remaining-dev-seed.group';
import {
  buildCorsOptions,
  parseCorsOrigins,
} from './config/http-security.config';
import { parseEnvBoolean } from './config/parse-env-boolean';
import { SeedClassification } from './database/seeds/framework/seed-contract';
import { assertSeedExecutionSafety } from './database/seeds/framework/seed-environment.guard';
import { SeedOrchestrator } from './database/seeds/framework/seed-orchestrator';

// Fix Node.js 18+ DNS resolution issues (IPv6 timeout / ENOTFOUND)
dns.setDefaultResultOrder('ipv4first');

initSentry();

async function bootstrap() {
  const productDevSeed = parseEnvBoolean(
    process.env.PRODUCT_DEV_SEED,
    'PRODUCT_DEV_SEED',
    false,
  );
  const productDevSeedReset = parseEnvBoolean(
    process.env.PRODUCT_DEV_SEED_RESET,
    'PRODUCT_DEV_SEED_RESET',
    false,
  );
  if (productDevSeed || productDevSeedReset) {
    assertSeedExecutionSafety({
      environment: process.env,
      classifications: [SeedClassification.REFERENCE, SeedClassification.DEV],
    });
  }
  if (productDevSeedReset) {
    throw new Error(
      'PRODUCT_DEV_SEED_RESET is retired; Products DEV seeding is convergent and non-destructive',
    );
  }

  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('APP_PORT', 3000);
  const corsOrigins = parseCorsOrigins(
    configService.get<string>('CORS_ORIGINS'),
  );

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Cookie parser
  app.use(cookieParser());

  // CORS
  app.enableCors(buildCorsOptions(corsOrigins));

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global interceptors
  app.useGlobalInterceptors(
    new RequestLoggingInterceptor(),
    new ResponseInterceptor(),
  );

  // Swagger / OpenAPI
  const swaggerConfig = new DocumentBuilder()
    .setTitle('AgriLink Vietnam API')
    .setDescription(
      'REST API for AgriLink — the agricultural marketplace connecting Vietnamese farmers, cooperatives, enterprises, and buyers.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter your JWT access token',
        in: 'header',
      },
      'access-token',
    )
    .addTag('Health', 'Application health check')
    .addTag('Auth', 'Authentication and authorization')
    .addTag('Users', 'User profile management')
    .addTag('Profiles', 'Role-specific profile management')
    .addTag('Geography', 'Provinces and districts')
    .addTag('Products', 'Product listings and catalog')
    .addTag('Wishlist', 'User product wishlist')
    .addTag('Cooperatives', 'Cooperative members, bulk listings, harvest schedules')
    .addTag('Market Prices', 'Agricultural market price data')
    .addTag('Traceability', 'Product traceability and QR scanning')
    .addTag('Reviews', 'Product reviews and ratings')
    .addTag('Notifications', 'User notifications')
    .addTag('Ads', 'Advertising packages and campaigns')
    .addTag('Admin', 'Admin system configuration and audit logs')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  // Development data is opt-in so a local restart never resets records.
  if (process.env.NODE_ENV !== 'production' && productDevSeed) {
    const dataSource = app.get(DataSource);
    const seedOrchestrator = new SeedOrchestrator([
      createProductsCategoryReferenceSeedGroup(dataSource),
      createUsersDevSeedGroup(dataSource),
      createProfilesRoleProfilesDevSeedGroup(dataSource),
      app.get(ProductDevelopmentSeedService),
      new LegacyRemainingDevSeedGroup(app.get(DevSeedService)),
    ]);
    await seedOrchestrator.execute({
      environment: process.env,
      classifications: [SeedClassification.REFERENCE, SeedClassification.DEV],
    });
    console.log('[Seed] canonical owner groups and legacy continuation reconciled');
  }

  await app.listen(port);
  console.log(`AgriLink API running on: http://localhost:${port}/api/v1`);
  console.log(`Swagger docs:            http://localhost:${port}/api/docs`);
}

bootstrap();
