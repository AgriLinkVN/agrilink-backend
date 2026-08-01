import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentOrmEntity } from './infrastructure/persistence/entities/payment.orm-entity';
import { CommerceOperationsModule } from '../commerce/commerce-operations.module';
import { OrdersModule } from '../orders/orders.module';
import {
  PAYMENT_REPOSITORY,
} from './application/ports/payment-repository.port';
import {
  CreateManualPaymentUseCase,
  GetPaymentByOrderUseCase,
  MarkPaymentPaidUseCase,
  RefundPaymentUseCase,
} from './application/use-cases/payment.use-cases';
import { TypeOrmPaymentRepository } from './infrastructure/persistence/repositories/typeorm-payment.repository';
import { PaymentsController } from './presentation/controllers/payments.controller';

@Module({
  imports: [
    CommerceOperationsModule,
    OrdersModule,
    TypeOrmModule.forFeature([PaymentOrmEntity]),
  ],
  controllers: [PaymentsController],
  providers: [
    TypeOrmPaymentRepository,
    { provide: PAYMENT_REPOSITORY, useExisting: TypeOrmPaymentRepository },
    CreateManualPaymentUseCase,
    GetPaymentByOrderUseCase,
    MarkPaymentPaidUseCase,
    RefundPaymentUseCase,
  ],
})
export class PaymentsModule {}
