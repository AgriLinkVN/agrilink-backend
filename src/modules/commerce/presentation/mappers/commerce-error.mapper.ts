import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  CommerceConflictError,
  CommerceForbiddenError,
  CommerceInputError,
  CommerceNotFoundError,
} from '../../application/errors/commerce-application.error';
import {
  MoneyValidationError,
  QuantityValidationError,
} from '../../domain/commerce-values';
import {
  OrderAuthorizationError,
  OrderInvariantError,
  OrderTransitionError,
} from '../../../orders/domain/commerce-domain.error';
import { PaymentDomainError } from '../../../payments/domain/payment';
import { ContractDomainError } from '../../../contracts/domain/contract';
import { PurchaseRequestDomainError } from '../../../contracts/domain/purchase-request';

export function mapCommerceApplicationError(error: unknown): never {
  if (
    error instanceof CommerceForbiddenError ||
    error instanceof OrderAuthorizationError
  ) {
    throw new ForbiddenException(error.message);
  }
  if (error instanceof CommerceNotFoundError) {
    throw new NotFoundException(error.message);
  }
  if (
    error instanceof CommerceConflictError ||
    error instanceof OrderTransitionError
  ) {
    throw new ConflictException(error.message);
  }
  if (
    error instanceof CommerceInputError ||
    error instanceof MoneyValidationError ||
    error instanceof QuantityValidationError ||
    error instanceof OrderInvariantError ||
    error instanceof PaymentDomainError ||
    error instanceof ContractDomainError ||
    error instanceof PurchaseRequestDomainError
  ) {
    throw new BadRequestException(error.message);
  }
  throw error;
}
