import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

const RETIRED_ROUTES = new Map<string, string>([
  ['POST /storage/files/presign', 'presign'],
  ['POST /storage/files/upload', 'multipart_upload'],
  ['GET /storage/files/download-url', 'path_download'],
]);

export function classifyRetiredStorageRoute(
  method: string,
  originalUrl: string,
): string | null {
  const path = originalUrl.split('?')[0].replace(/^\/api\/v\d+/, '');
  return RETIRED_ROUTES.get(`${method.toUpperCase()} ${path}`) ?? null;
}

@Injectable()
export class RetiredStorageRouteTelemetryMiddleware implements NestMiddleware {
  private readonly logger = new Logger(
    RetiredStorageRouteTelemetryMiddleware.name,
  );

  use(request: Request, _response: Response, next: NextFunction): void {
    const route = classifyRetiredStorageRoute(
      request.method,
      request.originalUrl,
    );
    if (route) {
      const suppliedCorrelationId = request.header('x-correlation-id');
      const correlationId =
        suppliedCorrelationId &&
        /^[A-Za-z0-9._:-]{1,128}$/.test(suppliedCorrelationId)
          ? suppliedCorrelationId
          : 'unavailable';
      this.logger.warn(
        JSON.stringify({
          event: 'storage.legacy_route_rejected',
          route,
          method: request.method,
          correlationId,
        }),
      );
    }
    next();
  }
}
