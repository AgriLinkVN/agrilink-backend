import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  InvalidCredentialsError,
  InvalidLoginIdentifierError,
} from '../../domain/errors/auth.errors';

@Catch(InvalidCredentialsError, InvalidLoginIdentifierError)
export class LoginExceptionFilter implements ExceptionFilter {
  catch(
    exception: InvalidCredentialsError | InvalidLoginIdentifierError,
    host: ArgumentsHost,
  ): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const isInvalidIdentifier =
      exception instanceof InvalidLoginIdentifierError;
    const statusCode = isInvalidIdentifier
      ? HttpStatus.BAD_REQUEST
      : HttpStatus.UNAUTHORIZED;

    response.status(statusCode).json({
      statusCode,
      message: exception.message,
      error: isInvalidIdentifier
        ? 'BadRequestException'
        : 'UnauthorizedException',
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
