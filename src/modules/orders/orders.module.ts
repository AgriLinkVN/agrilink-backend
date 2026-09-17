import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderItemOrmEntity } from './infrastructure/persistence/entities/order-item.orm-entity';
import { OrderOrmEntity } from './infrastructure/persistence/entities/order.orm-entity';
import { OrderStatusHistoryOrmEntity } from './infrastructure/persistence/entities/order-status-history.orm-entity';
import { CommerceOperationsModule } from '../commerce/commerce-operations.module';
import { ProductsModule } from '../products/products.module';
import {
  COMPLETED_PURCHASE_READER,
  ORDER_PAYMENT_READER,
  ORDER_REPOSITORY,
} from './application/ports/order-repository.port';
import {
  ORDER_BOUNDARY_PROVIDERS,
  OrderBoundaryService,
} from './application/services/order-boundary.service';
import { TypeOrmOrderRepository } from './infrastructure/persistence/repositories/typeorm-order.repository';
import {
  CreateOrderUseCase,
  GetOrderUseCase,
  ListBuyerOrdersUseCase,
  ListSellerOrdersUseCase,
  TransitionOrderStatusUseCase,
} from './application/use-cases/order.use-cases';
import { OrdersController } from './presentation/controllers/orders.controller';

@Module({
  imports: [
    CommerceOperationsModule,
    ProductsModule,
    TypeOrmModule.forFeature([
      OrderOrmEntity,
      OrderItemOrmEntity,
      OrderStatusHistoryOrmEntity,
    ]),
  ],
  controllers: [OrdersController],
  providers: [
    TypeOrmOrderRepository,
    OrderBoundaryService,
    ...ORDER_BOUNDARY_PROVIDERS,
    { provide: ORDER_REPOSITORY, useExisting: TypeOrmOrderRepository },
    CreateOrderUseCase,
    GetOrderUseCase,
    ListBuyerOrdersUseCase,
    ListSellerOrdersUseCase,
    TransitionOrderStatusUseCase,
  ],
  exports: [COMPLETED_PURCHASE_READER, ORDER_PAYMENT_READER],
})
export class OrdersModule {}
