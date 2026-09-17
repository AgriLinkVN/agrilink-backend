import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { UserRole } from '@common/enums';
import { ParseUuidPipe } from '@common/pipes/parse-uuid.pipe';
import { CommerceInputError } from '../../../commerce/application/errors/commerce-application.error';
import { mapCommerceApplicationError } from '../../../commerce/presentation/mappers/commerce-error.mapper';
import {
  CreateOrderUseCase,
  GetOrderUseCase,
  ListBuyerOrdersUseCase,
  ListSellerOrdersUseCase,
  TransitionOrderStatusUseCase,
} from '../../application/use-cases/order.use-cases';
import { CreateOrderDto, TransitionOrderStatusDto } from '../dto/order.dto';

@ApiTags('Orders')
@ApiBearerAuth('access-token')
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly createOrder: CreateOrderUseCase,
    private readonly getOrder: GetOrderUseCase,
    private readonly listBuyerOrders: ListBuyerOrdersUseCase,
    private readonly listSellerOrders: ListSellerOrdersUseCase,
    private readonly transitionOrder: TransitionOrderStatusUseCase,
  ) {}

  @Post()
  @Roles(UserRole.BUYER)
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiOperation({ summary: 'Create an order from active product snapshots' })
  create(
    @CurrentUser('sub') id: string,
    @CurrentUser('role') role: UserRole,
    @Headers('idempotency-key') operationKey: string | undefined,
    @Body() dto: CreateOrderDto,
  ) {
    return this.execute(() =>
      this.createOrder.execute(
        { id, role },
        {
          ...dto,
          note: dto.note?.trim() || null,
        },
        requireOperationKey(operationKey),
      ),
    );
  }

  @Get('buyer/me')
  @Roles(UserRole.BUYER)
  listPurchases(
    @CurrentUser('sub') id: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.execute(() => this.listBuyerOrders.execute({ id, role }));
  }

  @Get('seller/me')
  @Roles(UserRole.FARMER, UserRole.COOPERATIVE, UserRole.SUPPLIER)
  listSales(
    @CurrentUser('sub') id: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.execute(() => this.listSellerOrders.execute({ id, role }));
  }

  @Get(':id')
  getOne(
    @Param('id', ParseUuidPipe) orderId: string,
    @CurrentUser('sub') id: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.execute(() => this.getOrder.execute({ id, role }, orderId));
  }

  @Patch(':id/status')
  @Roles(
    UserRole.BUYER,
    UserRole.FARMER,
    UserRole.COOPERATIVE,
    UserRole.SUPPLIER,
    UserRole.LOGISTICS,
    UserRole.ADMIN,
  )
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  transition(
    @Param('id', ParseUuidPipe) orderId: string,
    @CurrentUser('sub') id: string,
    @CurrentUser('role') role: UserRole,
    @Headers('idempotency-key') operationKey: string | undefined,
    @Body() dto: TransitionOrderStatusDto,
  ) {
    return this.execute(() =>
      this.transitionOrder.execute(
        {
          id,
          role,
        },
        {
          orderId,
          toStatus: dto.toStatus,
          expectedVersion: dto.expectedVersion,
          note: dto.note?.trim() || null,
        },
        requireOperationKey(operationKey),
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

function requireOperationKey(value: string | undefined): string {
  const key = value?.trim();
  if (!key || key.length > 128) {
    throw new CommerceInputError('Idempotency-Key is required and at most 128 characters');
  }
  return key;
}
