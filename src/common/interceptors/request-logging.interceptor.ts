import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest();
    const response = http.getResponse();
    const method = request.method;
    const url = request.originalUrl ?? request.url;
    const userId = request.user?.sub ?? request.user?.id ?? 'anonymous';
    const startedAt = process.hrtime.bigint();

    return next.handle().pipe(
      tap(() => {
        this.logRequest(method, url, response.statusCode, userId, startedAt);
      }),
      catchError((error) => {
        this.logRequest(
          method,
          url,
          this.getErrorStatus(error, response.statusCode),
          userId,
          startedAt,
          error,
        );
        return throwError(() => error);
      }),
    );
  }

  private logRequest(
    method: string,
    url: string,
    statusCode: number,
    userId: string,
    startedAt: bigint,
    error?: unknown,
  ): void {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const message = `${method} ${url} ${statusCode} - ${durationMs.toFixed(1)}ms user=${userId}`;

    if (statusCode >= 500) {
      this.logger.error(message, error instanceof Error ? error.stack : undefined);
      return;
    }

    if (statusCode >= 400) {
      this.logger.warn(message);
      return;
    }

    this.logger.log(message);
  }

  private getErrorStatus(error: any, fallbackStatus: number): number {
    if (typeof error?.getStatus === 'function') {
      return error.getStatus();
    }

    return Number(error?.status ?? error?.statusCode ?? fallbackStatus ?? 500);
  }
}
