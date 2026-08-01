import { Inject, Injectable } from '@nestjs/common';
import {
  CommerceConflictError,
  CommerceNotFoundError,
  CommerceOperationInProgressError,
} from '../../../../commerce/application/errors/commerce-application.error';
import {
  COMMERCE_OPERATION_REPOSITORY,
  CommerceOperationRecord,
  CommerceOperationRepository,
} from '../../../../commerce/application/ports/commerce-operation.port';
import { TypeOrmTransactionContext } from '../../../../../shared/infrastructure/persistence/transaction/typeorm-transaction-context';
import { PaymentModel } from '../../../application/models/payment.model';
import { PaymentRepository } from '../../../application/ports/payment-repository.port';
import { MoneyVnd } from '../../../../commerce/domain/commerce-values';
import { PaymentPersistenceMapper } from '../mappers/payment-persistence.mapper';
import { PaymentOrmEntity } from '../entities/payment.orm-entity';

@Injectable()
export class TypeOrmPaymentRepository implements PaymentRepository {
  constructor(
    private readonly transactions: TypeOrmTransactionContext,
    @Inject(COMMERCE_OPERATION_REPOSITORY)
    private readonly operations: CommerceOperationRepository,
  ) {}

  createAtomically(
    input: Parameters<PaymentRepository['createAtomically']>[0],
  ): Promise<PaymentModel> {
    return this.transactions.execute(async () => {
      const operation = await this.operations.claim({
        actorId: input.actorId,
        operationType: 'create-payment',
        idempotencyKey: input.operationKey,
        requestFingerprint: input.requestFingerprint,
      });
      if (!operation.claimed) return this.replay(operation.record);
      const repository = this.transactions.repository(PaymentOrmEntity);
      try {
        const entity = await repository.save(
          repository.create({
            orderId: input.orderId,
            amount: input.amount,
            currency: 'VND',
            method: input.method,
            status: 'unpaid',
            refundedAmount: '0',
          }),
        );
        await this.operations.complete(operation.record.id, entity.id, entity.id);
        return PaymentPersistenceMapper.toModel(entity);
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new CommerceConflictError('Payment already exists for order');
        }
        throw error;
      }
    });
  }

  async findById(id: string): Promise<PaymentModel | null> {
    const entity = await this.transactions
      .repository(PaymentOrmEntity)
      .findOneBy({ id });
    return entity ? PaymentPersistenceMapper.toModel(entity) : null;
  }

  async findByOrderId(orderId: string): Promise<PaymentModel | null> {
    const entity = await this.transactions
      .repository(PaymentOrmEntity)
      .findOneBy({ orderId });
    return entity ? PaymentPersistenceMapper.toModel(entity) : null;
  }

  markPaidAtomically(
    input: Parameters<PaymentRepository['markPaidAtomically']>[0],
  ): Promise<PaymentModel | null> {
    return this.transactions.execute(async () => {
      const operation = await this.operations.claim({
        actorId: input.actorId,
        operationType: 'mark-payment-paid',
        idempotencyKey: input.operationKey,
        requestFingerprint: input.requestFingerprint,
      });
      if (!operation.claimed) return this.replay(operation.record);
      const repository = this.transactions.repository(PaymentOrmEntity);
      const entity = await repository.findOneBy({ id: input.paymentId });
      if (!entity) throw new CommerceNotFoundError('Payment not found');
      const payment = PaymentPersistenceMapper.toDomain(entity);
      payment.markPaid(input.actor);
      const updated = await repository
        .createQueryBuilder()
        .update(PaymentOrmEntity)
        .set({ status: payment.status, version: () => '"version" + 1' })
        .where('id = :id AND version = :version AND status = :status', {
          id: entity.id,
          version: input.expectedVersion,
          status: entity.status,
        })
        .execute();
      if (updated.affected !== 1) {
        throw new CommerceConflictError('Payment state or version changed');
      }
      await this.operations.complete(operation.record.id, entity.id, entity.id);
      return this.findById(entity.id);
    });
  }

  refundAtomically(
    input: Parameters<PaymentRepository['refundAtomically']>[0],
  ): Promise<PaymentModel | null> {
    return this.transactions.execute(async () => {
      const operation = await this.operations.claim({
        actorId: input.actorId,
        operationType: 'refund-payment',
        idempotencyKey: input.operationKey,
        requestFingerprint: input.requestFingerprint,
      });
      if (!operation.claimed) return this.replay(operation.record);
      const repository = this.transactions.repository(PaymentOrmEntity);
      const entity = await repository.findOneBy({ id: input.paymentId });
      if (!entity) throw new CommerceNotFoundError('Payment not found');
      const payment = PaymentPersistenceMapper.toDomain(entity);
      payment.refund(MoneyVnd.parse(input.amount), 'admin');
      const updated = await repository
        .createQueryBuilder()
        .update(PaymentOrmEntity)
        .set({
          status: payment.status,
          refundedAmount: payment.refundedAmount.toString(),
          version: () => '"version" + 1',
        })
        .where('id = :id AND version = :version AND status = :status', {
          id: entity.id,
          version: input.expectedVersion,
          status: entity.status,
        })
        .execute();
      if (updated.affected !== 1) {
        throw new CommerceConflictError('Payment state or version changed');
      }
      await this.operations.complete(operation.record.id, entity.id, entity.id);
      return this.findById(entity.id);
    });
  }

  private async replay(record: CommerceOperationRecord): Promise<PaymentModel> {
    if (record.status !== 'completed' || !record.resultReference) {
      throw new CommerceOperationInProgressError(
        'Commerce operation has not completed',
      );
    }
    const result = await this.findById(record.resultReference);
    if (!result) throw new Error('Idempotent payment result is missing');
    return result;
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === '23505'
  );
}
