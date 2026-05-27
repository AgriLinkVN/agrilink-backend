import { registerAs } from '@nestjs/config';

/**
 * General application configuration namespace.
 * Access via ConfigService.get('app.port') etc.
 */
export default registerAs('app', () => ({
  port: parseInt(process.env.APP_PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim()),
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL ?? '60', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT ?? '100', 10),
  },
}));
