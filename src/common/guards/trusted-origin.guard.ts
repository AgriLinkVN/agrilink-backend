import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  isCorsOriginAllowed,
  parseCorsOrigins,
} from '../../config/http-security.config';

@Injectable()
export class TrustedOriginGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const origin = request.get('origin');
    const allowedOrigins = parseCorsOrigins(process.env.CORS_ORIGINS);

    if (isCorsOriginAllowed(origin, allowedOrigins)) {
      return true;
    }

    throw new ForbiddenException('Request origin is not allowed');
  }
}
