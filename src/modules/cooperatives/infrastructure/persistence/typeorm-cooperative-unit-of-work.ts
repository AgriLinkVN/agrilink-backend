import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CooperativeUnitOfWorkPort } from '../../application/ports/outbound/cooperative-unit-of-work.port';

@Injectable()
export class TypeOrmCooperativeUnitOfWork implements CooperativeUnitOfWorkPort {
  constructor(private readonly dataSource: DataSource) {}

  withinTransaction<T>(work: () => Promise<T>): Promise<T> {
    return this.dataSource.transaction(work);
  }
}
