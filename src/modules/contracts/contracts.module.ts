import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContractOrmEntity } from './infrastructure/persistence/entities/contract.orm-entity';
import { PurchaseRequestOrmEntity } from './infrastructure/persistence/entities/purchase-request.orm-entity';
import { CommerceOperationsModule } from '../commerce/commerce-operations.module';
import {
  CONTRACT_REPOSITORY,
  PURCHASE_REQUEST_REPOSITORY,
} from './application/ports/contract-repository.port';
import {
  CreateContractFromPurchaseRequestUseCase,
  CreatePurchaseRequestUseCase,
  GetContractUseCase,
  GetPurchaseRequestUseCase,
  ListMyContractsUseCase,
  ListPurchaseRequestsUseCase,
  SignContractUseCase,
  TransitionContractStatusUseCase,
  TransitionPurchaseRequestUseCase,
} from './application/use-cases/contract.use-cases';
import {
  TypeOrmContractRepository,
  TypeOrmPurchaseRequestRepository,
} from './infrastructure/persistence/repositories/typeorm-contract.repository';
import { ContractsController } from './presentation/controllers/contracts.controller';

@Module({
  imports: [
    CommerceOperationsModule,
    TypeOrmModule.forFeature([PurchaseRequestOrmEntity, ContractOrmEntity]),
  ],
  controllers: [ContractsController],
  providers: [
    TypeOrmPurchaseRequestRepository,
    TypeOrmContractRepository,
    {
      provide: PURCHASE_REQUEST_REPOSITORY,
      useExisting: TypeOrmPurchaseRequestRepository,
    },
    { provide: CONTRACT_REPOSITORY, useExisting: TypeOrmContractRepository },
    CreatePurchaseRequestUseCase,
    GetPurchaseRequestUseCase,
    ListPurchaseRequestsUseCase,
    TransitionPurchaseRequestUseCase,
    CreateContractFromPurchaseRequestUseCase,
    GetContractUseCase,
    ListMyContractsUseCase,
    SignContractUseCase,
    TransitionContractStatusUseCase,
  ],
})
export class ContractsModule {}
