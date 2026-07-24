import { ConfigService } from "@nestjs/config";
import { TypeOrmModuleOptions } from "@nestjs/typeorm";
import { RUNTIME_ENTITY_REGISTRY } from "../database/entity-registry";
import { createDataSourceOptions } from "../database/data-source-options";

/**
 * TypeORM configuration factory.
 * Reads all connection parameters from environment variables via ConfigService.
 * Entities are auto-loaded from the modules directory.
 */
export const databaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions =>
  createDataSourceOptions(
    {
      NODE_ENV: configService.get("NODE_ENV"),
      DB_HOST: configService.get("DB_HOST"),
      DB_PORT: configService.get("DB_PORT"),
      DB_NAME: configService.get("DB_NAME"),
      DB_USER: configService.get("DB_USER"),
      DB_PASS: configService.get("DB_PASS"),
      DB_SCHEMA: configService.get("DB_SCHEMA"),
      DB_SYNCHRONIZE: configService.get("DB_SYNCHRONIZE"),
      DB_LOGGING: configService.get("DB_LOGGING"),
      PRODUCT_DEV_SEED: configService.get("PRODUCT_DEV_SEED"),
      PRODUCT_DEV_SEED_RESET: configService.get("PRODUCT_DEV_SEED_RESET"),
    },
    {
      entities: RUNTIME_ENTITY_REGISTRY,
    },
  ) as TypeOrmModuleOptions;
