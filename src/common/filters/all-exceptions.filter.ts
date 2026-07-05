import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import * as Sentry from '@sentry/node';

/**
 * Catches everything HttpExceptionFilter doesn't (unhandled/5xx errors) and
 * reports them to Sentry when SENTRY_DSN is configured, so production
 * crashes are visible instead of only living in stdout logs.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (exception instanceof HttpException) {
      throw exception; // let HttpExceptionFilter handle it
    }

    const statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    this.logger.error(`${request.method} ${request.url} => 500`, exception instanceof Error ? exception.stack : exception);

    if (process.env.SENTRY_DSN) {
      Sentry.captureException(exception);
    }

    response.status(statusCode).json({
      statusCode,
      message: 'Internal server error',
      error: 'InternalServerError',
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
