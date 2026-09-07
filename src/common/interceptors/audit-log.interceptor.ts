import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Logs all mutating requests (POST, PUT, PATCH, DELETE) for audit purposes.
 * TODO: Persist audit records to the audit_logs table via AdminService.
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user } = request;
    const mutateMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];

    if (!mutateMethods.includes(method)) {
      return next.handle();
    }

    const userId = user?.id ?? 'anonymous';
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        this.logger.log(
          `AUDIT | user=${userId} | ${method} ${url} | ${duration}ms`,
        );
        // TODO: Persist to audit_logs table
      }),
    );
  }
}
