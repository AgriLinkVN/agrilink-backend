import { OrderModel } from '../../../application/models/order.model';
import { Order } from '../../../domain/order';
import { OrderStatus } from '../../../domain/order-status';
import { OrderItemOrmEntity } from '../entities/order-item.orm-entity';
import { OrderOrmEntity } from '../entities/order.orm-entity';

export class OrderPersistenceMapper {
  static toDomain(entity: OrderOrmEntity): Order {
    return Order.rehydrate({
      id: entity.id,
      orderCode: entity.orderCode,
      buyerId: entity.buyerId,
      sellerId: entity.sellerId,
      status: entity.status as OrderStatus,
      subtotal: entity.subtotal,
      shippingFee: entity.shippingFee,
      platformFee: entity.platformFee,
      totalAmount: entity.totalAmount,
      version: entity.version,
    });
  }

  static toModel(
    entity: OrderOrmEntity,
    items: readonly OrderItemOrmEntity[],
  ): OrderModel {
    return {
      id: entity.id,
      orderCode: entity.orderCode,
      buyerId: entity.buyerId,
      sellerId: entity.sellerId,
      status: entity.status as OrderStatus,
      subtotal: entity.subtotal,
      shippingFee: entity.shippingFee,
      platformFee: entity.platformFee,
      totalAmount: entity.totalAmount,
      paymentMethod: entity.paymentMethod as OrderModel['paymentMethod'],
      version: entity.version,
      items: items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
      })),
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
