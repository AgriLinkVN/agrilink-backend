import { Inject, Injectable } from '@nestjs/common';
import { In } from 'typeorm';
import {
  COMMERCE_OPERATION_REPOSITORY,
  CommerceOperationRepository,
} from '../../../../commerce/application/ports/commerce-operation.port';
import { TypeOrmTransactionContext } from '../../../../../shared/infrastructure/persistence/transaction/typeorm-transaction-context';
import {
  CreateOrderRepositoryInput,
  OrderModel,
} from '../../../application/models/order.model';
import { OrderRepository } from '../../../application/ports/order-repository.port';
import { OrderAuthorizationError } from '../../../domain/commerce-domain.error';
import { OrderPersistenceMapper } from '../mappers/order-persistence.mapper';
import { OrderItemOrmEntity } from '../entities/order-item.orm-entity';
import { OrderOrmEntity } from '../entities/order.orm-entity';
import { OrderStatusHistoryOrmEntity } from '../entities/order-status-history.orm-entity';
import { CommerceOperationInProgressError } from '../../../../commerce/application/errors/commerce-application.error';
import {
  CommerceConflictError,
  CommerceNotFoundError,
} from '../../../../commerce/application/errors/commerce-application.error';

@Injectable()
export class TypeOrmOrderRepository implements OrderRepository {
  constructor(
    private readonly transactions: TypeOrmTransactionContext,
    @Inject(COMMERCE_OPERATION_REPOSITORY)
    private readonly operations: CommerceOperationRepository,
  ) {}

  async createAtomically(
    input: CreateOrderRepositoryInput,
  ): Promise<OrderModel> {
    return this.transactions.execute(async () => {
      const operation = await this.operations.claim({
        actorId: input.buyerId,
        operationType: 'create-order',
        idempotencyKey: input.operationKey,
        requestFingerprint: input.requestFingerprint,
      });
      if (!operation.claimed) return this.replay(operation.record);

      const orders = this.transactions.repository(OrderOrmEntity);
      const order = await orders.save(
        orders.create({
          orderCode: input.orderCode,
          buyerId: input.buyerId,
          sellerId: input.sellerId,
          status: 'pending',
          subtotal: input.subtotal,
          shippingFee: input.shippingFee,
          platformFee: input.platformFee,
          totalAmount: input.totalAmount,
          paymentMethod: input.paymentMethod,
          shippingAddressId: input.shippingAddressId,
          note: input.note,
          cancelledReason: null,
          deliveredAt: null,
        }),
      );
      const items = await this.transactions.repository(OrderItemOrmEntity).save(
        input.items.map((item) => ({ ...item, orderId: order.id })),
      );
      await this.transactions.repository(OrderStatusHistoryOrmEntity).insert({
        orderId: order.id,
        fromStatus: null,
        toStatus: 'pending',
        changedBy: input.buyerId,
        note: null,
        operationKey: input.operationKey,
      });
      await this.operations.complete(operation.record.id, order.id, order.id);
      return OrderPersistenceMapper.toModel(order, items);
    });
  }

  async findById(id: string): Promise<OrderModel | null> {
    const order = await this.transactions.repository(OrderOrmEntity).findOneBy({
      id,
    });
    if (!order) return null;
    const items = await this.transactions
      .repository(OrderItemOrmEntity)
      .find({ where: { orderId: id }, order: { createdAt: 'ASC', id: 'ASC' } });
    return OrderPersistenceMapper.toModel(order, items);
  }

  async listForBuyer(buyerId: string): Promise<OrderModel[]> {
    return this.list({ buyerId });
  }

  async listForSeller(sellerId: string): Promise<OrderModel[]> {
    return this.list({ sellerId });
  }

  async transitionAtomically(
    input: Parameters<OrderRepository['transitionAtomically']>[0],
  ): Promise<OrderModel | null> {
    return this.transactions.execute(async () => {
      const operation = await this.operations.claim({
        actorId: input.actorId,
        operationType: 'transition-order',
        idempotencyKey: input.operationKey,
        requestFingerprint: input.requestFingerprint,
      });
      if (!operation.claimed) return this.replay(operation.record);

      const orders = this.transactions.repository(OrderOrmEntity);
      const entity = await orders.findOneBy({ id: input.orderId });
      if (!entity) throw new CommerceNotFoundError('Order not found');
      if (
        (input.actor === 'buyer' && entity.buyerId !== input.actorId) ||
        (input.actor === 'seller' && entity.sellerId !== input.actorId)
      ) {
        throw new OrderAuthorizationError('Order does not belong to actor');
      }
      const domain = OrderPersistenceMapper.toDomain(entity);
      const fromStatus = domain.status;
      domain.transition(input.toStatus, input.actor);
      const updated = await orders
        .createQueryBuilder()
        .update(OrderOrmEntity)
        .set({
          status: domain.status,
          version: () => '"version" + 1',
          deliveredAt:
            domain.status === 'delivered' ? new Date() : entity.deliveredAt,
        })
        .where('id = :id AND version = :version AND status = :status', {
          id: entity.id,
          version: input.expectedVersion,
          status: fromStatus,
        })
        .execute();
      if (updated.affected !== 1) {
        throw new CommerceConflictError('Order state or version changed');
      }
      await this.transactions.repository(OrderStatusHistoryOrmEntity).insert({
        orderId: entity.id,
        fromStatus,
        toStatus: domain.status,
        changedBy: input.actorId,
        note: input.note,
        operationKey: input.operationKey,
      });
      await this.operations.complete(operation.record.id, entity.id, entity.id);
      return this.findById(entity.id);
    });
  }

  async hasCompletedPurchase(
    buyerId: string,
    productId: string,
  ): Promise<boolean> {
    const count = await this.transactions
      .repository(OrderOrmEntity)
      .createQueryBuilder('orders')
      .innerJoin(OrderItemOrmEntity, 'items', 'items.order_id = orders.id')
      .where('orders.buyer_id = :buyerId', { buyerId })
      .andWhere('orders.status = :status', { status: 'delivered' })
      .andWhere('items.product_id = :productId', { productId })
      .getCount();
    return count > 0;
  }

  private async replay(
    record: Awaited<ReturnType<CommerceOperationRepository['claim']>>['record'],
  ): Promise<OrderModel> {
    if (record.status !== 'completed' || !record.resultReference) {
      throw new CommerceOperationInProgressError(
        'Commerce operation has not completed',
      );
    }
    const result = await this.findById(record.resultReference);
    if (!result) throw new Error('Idempotent order result is missing');
    return result;
  }

  private async list(
    where: { buyerId: string } | { sellerId: string },
  ): Promise<OrderModel[]> {
    const orders = await this.transactions.repository(OrderOrmEntity).find({
      where,
      order: { createdAt: 'DESC', id: 'DESC' },
    });
    if (orders.length === 0) return [];
    const items = await this.transactions.repository(OrderItemOrmEntity).find({
      where: { orderId: In(orders.map(({ id }) => id)) },
      order: { createdAt: 'ASC', id: 'ASC' },
    });
    const byOrder = new Map<string, OrderItemOrmEntity[]>();
    for (const item of items) {
      const group = byOrder.get(item.orderId) ?? [];
      group.push(item);
      byOrder.set(item.orderId, group);
    }
    return orders.map((order) =>
      OrderPersistenceMapper.toModel(order, byOrder.get(order.id) ?? []),
    );
  }
}
