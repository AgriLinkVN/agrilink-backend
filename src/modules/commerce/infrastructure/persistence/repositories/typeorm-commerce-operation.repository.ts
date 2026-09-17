import { Injectable } from '@nestjs/common';
import {
  CommerceOperationKey,
  CommerceOperationRecord,
  CommerceOperationRepository,
} from '../../../application/ports/commerce-operation.port';
import { CommerceOperationOrmEntity } from '../entities/commerce-operation.orm-entity';
import { TypeOrmTransactionContext } from '../../../../../shared/infrastructure/persistence/transaction/typeorm-transaction-context';
import { IdempotencyConflictError } from '../../../application/errors/commerce-application.error';

@Injectable()
export class TypeOrmCommerceOperationRepository
  implements CommerceOperationRepository
{
  constructor(
    private readonly transactions: TypeOrmTransactionContext,
  ) {}

  async claim(input: CommerceOperationKey): Promise<{
    record: CommerceOperationRecord;
    claimed: boolean;
  }> {
    const operations = this.transactions.repository(CommerceOperationOrmEntity);
    const inserted = await operations
      .createQueryBuilder()
      .insert()
      .values(input)
      .orIgnore()
      .returning('*')
      .execute();
    const claimed = Array.isArray(inserted.raw) && inserted.raw.length === 1;
    const entity = await operations.findOneByOrFail({
      actorId: input.actorId,
      operationType: input.operationType,
      idempotencyKey: input.idempotencyKey,
    });
    if (entity.requestFingerprint !== input.requestFingerprint) {
      throw new IdempotencyConflictError(
        'Idempotency key was already used with a different request',
      );
    }
    return { record: entity, claimed };
  }

  async complete(
    id: string,
    aggregateId: string,
    resultReference: string,
  ): Promise<void> {
    await this.transactions.repository(CommerceOperationOrmEntity).update(
      { id, status: 'started' },
      { aggregateId, resultReference, status: 'completed' },
    );
  }
}
