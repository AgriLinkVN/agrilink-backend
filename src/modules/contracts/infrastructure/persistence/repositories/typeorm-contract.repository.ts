import { Inject, Injectable } from '@nestjs/common';
import { In } from 'typeorm';
import {
  CommerceConflictError,
  CommerceForbiddenError,
  CommerceNotFoundError,
  CommerceOperationInProgressError,
} from '../../../../commerce/application/errors/commerce-application.error';
import {
  COMMERCE_OPERATION_REPOSITORY,
  CommerceOperationRecord,
  CommerceOperationRepository,
} from '../../../../commerce/application/ports/commerce-operation.port';
import { Quantity } from '../../../../commerce/domain/commerce-values';
import { TypeOrmTransactionContext } from '../../../../../shared/infrastructure/persistence/transaction/typeorm-transaction-context';
import {
  ContractModel,
  PurchaseRequestModel,
} from '../../../application/models/contract.model';
import {
  ContractRepository,
  PurchaseRequestRepository,
} from '../../../application/ports/contract-repository.port';
import { ContractPersistenceMapper } from '../mappers/contract-persistence.mapper';
import { ContractOrmEntity } from '../entities/contract.orm-entity';
import { PurchaseRequestOrmEntity } from '../entities/purchase-request.orm-entity';

@Injectable()
export class TypeOrmPurchaseRequestRepository
  implements PurchaseRequestRepository
{
  constructor(
    private readonly transactions: TypeOrmTransactionContext,
    @Inject(COMMERCE_OPERATION_REPOSITORY)
    private readonly operations: CommerceOperationRepository,
  ) {}

  createAtomically(
    input: Parameters<PurchaseRequestRepository['createAtomically']>[0],
  ): Promise<PurchaseRequestModel> {
    return this.transactions.execute(async () => {
      const operation = await this.operations.claim({
        actorId: input.buyerId,
        operationType: 'create-purchase-request',
        idempotencyKey: input.operationKey,
        requestFingerprint: input.requestFingerprint,
      });
      if (!operation.claimed) return this.replay(operation.record);
      const repository = this.transactions.repository(PurchaseRequestOrmEntity);
      const entity = await repository.save(
        repository.create({
          buyerId: input.buyerId,
          productCategoryId: input.productCategoryId,
          provinceId: input.provinceId,
          quantityNeeded: input.quantityNeeded,
          unit: input.unit,
          status: 'open',
        }),
      );
      await this.operations.complete(operation.record.id, entity.id, entity.id);
      return ContractPersistenceMapper.purchaseRequestToModel(entity, '0');
    });
  }

  async findById(id: string): Promise<PurchaseRequestModel | null> {
    const entity = await this.transactions
      .repository(PurchaseRequestOrmEntity)
      .findOneBy({ id });
    if (!entity) return null;
    return ContractPersistenceMapper.purchaseRequestToModel(
      entity,
      await this.allocatedFor(id),
    );
  }

  async listForBuyer(buyerId: string): Promise<PurchaseRequestModel[]> {
    const entities = await this.transactions
      .repository(PurchaseRequestOrmEntity)
      .find({ where: { buyerId }, order: { createdAt: 'DESC', id: 'DESC' } });
    if (entities.length === 0) return [];
    const allocations = await this.allocationsFor(entities.map(({ id }) => id));
    return entities.map((entity) =>
      ContractPersistenceMapper.purchaseRequestToModel(
        entity,
        allocations.get(entity.id) ?? '0',
      ),
    );
  }

  transitionAtomically(
    input: Parameters<PurchaseRequestRepository['transitionAtomically']>[0],
  ): Promise<PurchaseRequestModel | null> {
    return this.transactions.execute(async () => {
      const operation = await this.operations.claim({
        actorId: input.buyerId,
        operationType: `${input.action}-purchase-request`,
        idempotencyKey: input.operationKey,
        requestFingerprint: input.requestFingerprint,
      });
      if (!operation.claimed) return this.replay(operation.record);
      const repository = this.transactions.repository(PurchaseRequestOrmEntity);
      const entity = await repository.findOneBy({ id: input.id });
      if (!entity) throw new CommerceNotFoundError('Purchase request not found');
      if (entity.buyerId !== input.buyerId) {
        throw new CommerceForbiddenError('Purchase request does not belong to actor');
      }
      const allocated = await this.allocatedFor(entity.id);
      const domain = ContractPersistenceMapper.purchaseRequestToDomain(
        entity,
        allocated,
      );
      input.action === 'close' ? domain.close() : domain.cancel();
      const result = await repository
        .createQueryBuilder()
        .update(PurchaseRequestOrmEntity)
        .set({ status: domain.status, version: () => '"version" + 1' })
        .where('id = :id AND version = :version AND status = :status', {
          id: entity.id,
          version: input.expectedVersion,
          status: entity.status,
        })
        .execute();
      if (result.affected !== 1) {
        throw new CommerceConflictError('Purchase request state changed');
      }
      await this.operations.complete(operation.record.id, entity.id, entity.id);
      return this.findById(entity.id);
    });
  }

  private async allocatedFor(id: string): Promise<string> {
    return (await this.allocationsFor([id])).get(id) ?? '0';
  }

  private async allocationsFor(ids: string[]): Promise<Map<string, string>> {
    const rows = await this.transactions
      .repository(ContractOrmEntity)
      .createQueryBuilder('contracts')
      .select('contracts.purchase_request_id', 'purchaseRequestId')
      .addSelect('SUM(contracts.quantity)', 'allocated')
      .where({ purchaseRequestId: In(ids) })
      .groupBy('contracts.purchase_request_id')
      .getRawMany<{ purchaseRequestId: string; allocated: string }>();
    return new Map(rows.map((row) => [row.purchaseRequestId, row.allocated]));
  }

  private async replay(
    operation: CommerceOperationRecord,
  ): Promise<PurchaseRequestModel> {
    if (operation.status !== 'completed' || !operation.resultReference) {
      throw new CommerceOperationInProgressError(
        'Commerce operation has not completed',
      );
    }
    const result = await this.findById(operation.resultReference);
    if (!result) throw new Error('Idempotent purchase request result is missing');
    return result;
  }
}

@Injectable()
export class TypeOrmContractRepository implements ContractRepository {
  constructor(
    private readonly transactions: TypeOrmTransactionContext,
    @Inject(COMMERCE_OPERATION_REPOSITORY)
    private readonly operations: CommerceOperationRepository,
  ) {}

  createFromRequestAtomically(
    input: Parameters<ContractRepository['createFromRequestAtomically']>[0],
  ): Promise<ContractModel> {
    return this.transactions.execute(async () => {
      const operation = await this.operations.claim({
        actorId: input.buyerId,
        operationType: 'create-contract',
        idempotencyKey: input.operationKey,
        requestFingerprint: input.requestFingerprint,
      });
      if (!operation.claimed) return this.replay(operation.record);
      const requests = this.transactions.repository(PurchaseRequestOrmEntity);
      const request = await requests
        .createQueryBuilder('request')
        .setLock('pessimistic_write')
        .where('request.id = :id', { id: input.purchaseRequestId })
        .getOne();
      if (!request) throw new CommerceNotFoundError('Purchase request not found');
      if (request.buyerId !== input.buyerId) {
        throw new CommerceForbiddenError('Purchase request does not belong to buyer');
      }
      const allocation = await this.readAllocated(input.purchaseRequestId);
      const requestDomain = ContractPersistenceMapper.purchaseRequestToDomain(
        request,
        allocation,
      );
      requestDomain.allocate(Quantity.parse(input.quantity));
      const repository = this.transactions.repository(ContractOrmEntity);
      const entity = await repository.save(
        repository.create({
          contractCode: input.contractCode,
          purchaseRequestId: input.purchaseRequestId,
          buyerId: input.buyerId,
          sellerId: input.sellerId,
          productCategoryId: input.productCategoryId,
          quantity: input.quantity,
          unit: input.unit,
          unitPrice: input.unitPrice,
          totalValue: input.totalValue,
          status: 'draft',
          buyerSignedAt: null,
          sellerSignedAt: null,
        }),
      );
      await this.operations.complete(operation.record.id, entity.id, entity.id);
      return ContractPersistenceMapper.contractToModel(entity);
    });
  }

  async findById(id: string): Promise<ContractModel | null> {
    const entity = await this.transactions
      .repository(ContractOrmEntity)
      .findOneBy({ id });
    return entity ? ContractPersistenceMapper.contractToModel(entity) : null;
  }

  async listForParty(userId: string): Promise<ContractModel[]> {
    const entities = await this.transactions
      .repository(ContractOrmEntity)
      .createQueryBuilder('contracts')
      .where('contracts.buyer_id = :userId OR contracts.seller_id = :userId', {
        userId,
      })
      .orderBy('contracts.created_at', 'DESC')
      .addOrderBy('contracts.id', 'DESC')
      .getMany();
    return entities.map(ContractPersistenceMapper.contractToModel);
  }

  signAtomically(
    input: Parameters<ContractRepository['signAtomically']>[0],
  ): Promise<ContractModel | null> {
    return this.transactions.execute(async () => {
      const operation = await this.operations.claim({
        actorId: input.actorId,
        operationType: 'sign-contract',
        idempotencyKey: input.operationKey,
        requestFingerprint: input.requestFingerprint,
      });
      if (!operation.claimed) return this.replay(operation.record);
      const repository = this.transactions.repository(ContractOrmEntity);
      const entity = await repository.findOneBy({ id: input.id });
      if (!entity) throw new CommerceNotFoundError('Contract not found');
      const domain = ContractPersistenceMapper.contractToDomain(entity);
      domain.sign(input.actorId);
      if (domain.buyerSignatureTime && domain.sellerSignatureTime) {
        domain.transition('active');
      }
      const result = await repository
        .createQueryBuilder()
        .update(ContractOrmEntity)
        .set({
          status: domain.status,
          buyerSignedAt: domain.buyerSignatureTime,
          sellerSignedAt: domain.sellerSignatureTime,
          version: () => '"version" + 1',
        })
        .where('id = :id AND version = :version AND status = :status', {
          id: entity.id,
          version: input.expectedVersion,
          status: entity.status,
        })
        .execute();
      if (result.affected !== 1) {
        const current = await repository.findOneByOrFail({ id: entity.id });
        const signed =
          (current.buyerId === input.actorId && current.buyerSignedAt) ||
          (current.sellerId === input.actorId && current.sellerSignedAt);
        if (!signed) throw new CommerceConflictError('Contract state changed');
        await this.operations.complete(operation.record.id, current.id, current.id);
        return ContractPersistenceMapper.contractToModel(current);
      }
      await this.operations.complete(operation.record.id, entity.id, entity.id);
      return this.findById(entity.id);
    });
  }

  transitionAtomically(
    input: Parameters<ContractRepository['transitionAtomically']>[0],
  ): Promise<ContractModel | null> {
    return this.transactions.execute(async () => {
      const operation = await this.operations.claim({
        actorId: input.actorId,
        operationType: 'transition-contract',
        idempotencyKey: input.operationKey,
        requestFingerprint: input.requestFingerprint,
      });
      if (!operation.claimed) return this.replay(operation.record);
      const repository = this.transactions.repository(ContractOrmEntity);
      const entity = await repository.findOneBy({ id: input.id });
      if (!entity) throw new CommerceNotFoundError('Contract not found');
      if (
        entity.buyerId !== input.actorId &&
        entity.sellerId !== input.actorId
      ) {
        throw new CommerceForbiddenError('Actor is not a contract party');
      }
      const domain = ContractPersistenceMapper.contractToDomain(entity);
      domain.transition(input.toStatus);
      const result = await repository
        .createQueryBuilder()
        .update(ContractOrmEntity)
        .set({ status: domain.status, version: () => '"version" + 1' })
        .where('id = :id AND version = :version AND status = :status', {
          id: entity.id,
          version: input.expectedVersion,
          status: entity.status,
        })
        .execute();
      if (result.affected !== 1) {
        throw new CommerceConflictError('Contract state changed');
      }
      await this.operations.complete(operation.record.id, entity.id, entity.id);
      return this.findById(entity.id);
    });
  }

  private async readAllocated(purchaseRequestId: string): Promise<string> {
    const row = await this.transactions
      .repository(ContractOrmEntity)
      .createQueryBuilder('contracts')
      .select('COALESCE(SUM(contracts.quantity), 0)', 'allocated')
      .where('contracts.purchase_request_id = :purchaseRequestId', {
        purchaseRequestId,
      })
      .getRawOne<{ allocated: string }>();
    return row?.allocated ?? '0';
  }

  private async replay(operation: CommerceOperationRecord): Promise<ContractModel> {
    if (operation.status !== 'completed' || !operation.resultReference) {
      throw new CommerceOperationInProgressError(
        'Commerce operation has not completed',
      );
    }
    const result = await this.findById(operation.resultReference);
    if (!result) throw new Error('Idempotent contract result is missing');
    return result;
  }
}
