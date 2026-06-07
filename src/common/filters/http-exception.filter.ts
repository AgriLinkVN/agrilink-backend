import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Catches all HttpExceptions and formats them into a consistent error envelope:
 * { statusCode, message, error, path, timestamp }
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = exception.getResponse();
    const isObject =
      typeof exceptionResponse === 'object' && exceptionResponse !== null;
    const message = isObject
      ? (exceptionResponse as Record<string, unknown>).message ??
        'Internal server error'
      : (exceptionResponse as string);

    // Preserve extra fields from the exception body (e.g. `code`,
    // `affectedBulkListings`) so the FE can branch on them. We strip
    // `statusCode`/`message` from the spread to avoid overwriting our envelope.
    const extra: Record<string, unknown> = {};
    if (isObject) {
      for (const [k, v] of Object.entries(exceptionResponse as object)) {
        if (k !== 'statusCode' && k !== 'message' && k !== 'error') {
          extra[k] = v;
        }
      }
    }

    const errorBody = {
      statusCode,
      message,
      error: exception.name,
      ...extra,
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    this.logger.error(
      `${request.method} ${request.url} => ${statusCode}`,
      JSON.stringify(errorBody),
    );

    response.status(statusCode).json(errorBody);
  }
}
