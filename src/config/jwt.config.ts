import { ConfigService } from '@nestjs/config';
import { JwtModuleOptions } from '@nestjs/jwt';

/**
 * JWT access token options factory.
 */
export const jwtConfig = (configService: ConfigService): JwtModuleOptions => ({
  secret: configService.get<string>('JWT_SECRET', 'fallback_secret_change_me'),
  signOptions: {
    expiresIn: configService.get<string>('JWT_EXPIRES_IN', '15m'),
  },
});

/**
 * JWT refresh token options — separate secret and longer expiry.
 */
export const jwtRefreshConfig = (configService: ConfigService) => ({
  secret: configService.get<string>(
    'JWT_REFRESH_SECRET',
    'fallback_refresh_secret_change_me',
  ),
  expiresIn: configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
});
