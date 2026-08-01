import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  COMMERCE_OPERATION_REPOSITORY,
  COMMERCE_UNIT_OF_WORK,
} from './application/ports/commerce-operation.port';
import { CommerceOperationOrmEntity } from './infrastructure/persistence/entities/commerce-operation.orm-entity';
import { TypeOrmCommerceOperationRepository } from './infrastructure/persistence/repositories/typeorm-commerce-operation.repository';
import { TypeOrmCommerceUnitOfWork } from './infrastructure/persistence/typeorm-commerce-unit-of-work';
import { TypeOrmTransactionModule } from '../../shared/infrastructure/persistence/transaction/typeorm-transaction.module';

@Module({
  imports: [
    TypeOrmTransactionModule,
    TypeOrmModule.forFeature([CommerceOperationOrmEntity]),
  ],
  providers: [
    TypeOrmCommerceOperationRepository,
    TypeOrmCommerceUnitOfWork,
    {
      provide: COMMERCE_OPERATION_REPOSITORY,
      useExisting: TypeOrmCommerceOperationRepository,
    },
    {
      provide: COMMERCE_UNIT_OF_WORK,
      useExisting: TypeOrmCommerceUnitOfWork,
    },
  ],
  exports: [
    COMMERCE_OPERATION_REPOSITORY,
    COMMERCE_UNIT_OF_WORK,
    TypeOrmTransactionModule,
  ],
})
export class CommerceOperationsModule {}
