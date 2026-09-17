import { Module } from '@nestjs/common';
import { TypeOrmTransactionContext } from './typeorm-transaction-context';

@Module({
  providers: [TypeOrmTransactionContext],
  exports: [TypeOrmTransactionContext],
})
export class TypeOrmTransactionModule {}
