import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { ProductsService } from '@modules/products/application/products.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('APP_PORT', 3000);
  const corsOrigins = configService
    .get<string>('CORS_ORIGINS', 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim());

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // CORS
  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

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
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global response interceptor
  app.useGlobalInterceptors(new ResponseInterceptor());

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

  // Auto-seed mock products on startup
  if (process.env.NODE_ENV !== 'production') {
    const productsService = app.get(ProductsService);
    await productsService.seedCategories();
    const result = await productsService.resetAndSeed();
    if (result.seeded > 0) {
      console.log(`[Seed] Reset ${result.deleted} old → inserted ${result.seeded} mock products`);
    }
  }

  await app.listen(port);
  console.log(`AgriLink API running on: http://localhost:${port}/api/v1`);
  console.log(`Swagger docs:            http://localhost:${port}/api/docs`);
}

bootstrap();
