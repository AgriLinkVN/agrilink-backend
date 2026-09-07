import { Body, Controller, Get, Headers, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { UserRole } from '@common/enums';
import { ParseUuidPipe } from '@common/pipes/parse-uuid.pipe';
import { CommerceInputError } from '../../../commerce/application/errors/commerce-application.error';
import { mapCommerceApplicationError } from '../../../commerce/presentation/mappers/commerce-error.mapper';
import {
  CreateManualPaymentUseCase,
  GetPaymentByOrderUseCase,
  MarkPaymentPaidUseCase,
  RefundPaymentUseCase,
} from '../../application/use-cases/payment.use-cases';
import {
  CreatePaymentDto,
  RefundPaymentDto,
  VersionedPaymentDto,
} from '../dto/payment.dto';

@ApiTags('Payments')
@ApiBearerAuth('access-token')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly createPayment: CreateManualPaymentUseCase,
    private readonly getByOrder: GetPaymentByOrderUseCase,
    private readonly markPaid: MarkPaymentPaidUseCase,
    private readonly refundPayment: RefundPaymentUseCase,
  ) {}

  @Post()
  @Roles(UserRole.BUYER)
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  create(
    @CurrentUser('sub') id: string,
    @CurrentUser('role') role: UserRole,
    @Headers('idempotency-key') key: string | undefined,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.execute(() =>
      this.createPayment.execute({ id, role }, dto, requireKey(key)),
    );
  }

  @Get('order/:orderId')
  get(
    @Param('orderId', ParseUuidPipe) orderId: string,
    @CurrentUser('sub') id: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.execute(() => this.getByOrder.execute({ id, role }, orderId));
  }

  @Patch(':id/paid')
  @Roles(UserRole.FARMER, UserRole.COOPERATIVE, UserRole.SUPPLIER, UserRole.ADMIN)
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  paid(
    @Param('id', ParseUuidPipe) paymentId: string,
    @CurrentUser('sub') id: string,
    @CurrentUser('role') role: UserRole,
    @Headers('idempotency-key') key: string | undefined,
    @Body() dto: VersionedPaymentDto,
  ) {
    return this.execute(() =>
      this.markPaid.execute(
        { id, role },
        paymentId,
        dto.expectedVersion,
        requireKey(key),
      ),
    );
  }

  @Patch(':id/refund')
  @Roles(UserRole.ADMIN)
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  refund(
    @Param('id', ParseUuidPipe) paymentId: string,
    @CurrentUser('sub') id: string,
    @CurrentUser('role') role: UserRole,
    @Headers('idempotency-key') key: string | undefined,
    @Body() dto: RefundPaymentDto,
  ) {
    return this.execute(() =>
      this.refundPayment.execute(
        { id, role },
        paymentId,
        dto.amount,
        dto.expectedVersion,
        requireKey(key),
      ),
    );
  }

  private async execute<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      return mapCommerceApplicationError(error);
    }
  }
}

function requireKey(value: string | undefined): string {
  const key = value?.trim();
  if (!key || key.length > 128) {
    throw new CommerceInputError('Idempotency-Key is required and at most 128 characters');
  }
  return key;
}
