import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, EntityTarget, ObjectLiteral, Repository } from 'typeorm';
import { AsyncLocalStorage } from 'async_hooks';

@Injectable()
export class TypeOrmTransactionContext {
  private readonly storage = new AsyncLocalStorage<EntityManager>();

  constructor(private readonly dataSource: DataSource) {}

  async execute<T>(work: () => Promise<T>): Promise<T> {
    if (this.storage.getStore()) return work();
    return this.dataSource.transaction((manager) =>
      this.storage.run(manager, work),
    );
  }

  repository<T extends ObjectLiteral>(target: EntityTarget<T>): Repository<T> {
    return (this.storage.getStore() ?? this.dataSource.manager).getRepository(
      target,
    );
  }
}
