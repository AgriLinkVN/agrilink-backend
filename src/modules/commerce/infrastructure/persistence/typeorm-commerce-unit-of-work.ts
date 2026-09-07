import { Injectable } from '@nestjs/common';
import { TypeOrmTransactionContext } from '../../../../shared/infrastructure/persistence/transaction/typeorm-transaction-context';
import { CommerceUnitOfWork } from '../../application/ports/commerce-operation.port';

@Injectable()
export class TypeOrmCommerceUnitOfWork implements CommerceUnitOfWork {
  constructor(private readonly transactions: TypeOrmTransactionContext) {}

  execute<T>(work: () => Promise<T>): Promise<T> {
    return this.transactions.execute(work);
  }
}
