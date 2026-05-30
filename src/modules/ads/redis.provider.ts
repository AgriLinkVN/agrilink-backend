import { Logger } from '@nestjs/common';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'ADS_REDIS_CLIENT';

const logger = new Logger('RedisProvider');

export const redisProvider = {
  provide: REDIS_CLIENT,
  useFactory: (): Redis => {
    // NOTE: lazyConnect=false so the client opens a connection at boot.
    // We still wrap usages in try/catch so the app keeps working if Redis is down.
    const client = new Redis({
      host: process.env.REDIS_HOST ?? 'localhost',
      port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
      lazyConnect: false,
      enableOfflineQueue: true,
      maxRetriesPerRequest: 2,
      retryStrategy: (times) => {
        if (times > 5) return null; // give up after 5 attempts
        return Math.min(times * 200, 2000);
      },
      reconnectOnError: () => true,
    });

    client.on('connect', () => logger.log('Redis connected'));
    client.on('ready', () => logger.log('Redis ready — ad impression rate-limiting enabled'));
    client.on('error', (err: Error) =>
      logger.warn(`Redis unavailable — impression rate-limiting disabled: ${err.message}`),
    );
    client.on('end', () => logger.warn('Redis connection closed'));

    return client;
  },
};
