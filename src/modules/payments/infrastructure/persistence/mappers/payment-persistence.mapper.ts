import { PaymentModel } from '../../../application/models/payment.model';
import {
  Payment,
  PaymentMethod,
  PaymentStatus,
} from '../../../domain/payment';
import { PaymentOrmEntity } from '../entities/payment.orm-entity';

export class PaymentPersistenceMapper {
  static toDomain(entity: PaymentOrmEntity): Payment {
    return Payment.rehydrate({
      orderId: entity.orderId,
      amount: entity.amount,
      method: entity.method as PaymentMethod,
      status: entity.status as PaymentStatus,
      refundedAmount: entity.refundedAmount,
    });
  }

  static toModel(entity: PaymentOrmEntity): PaymentModel {
    return {
      id: entity.id,
      orderId: entity.orderId,
      amount: entity.amount,
      currency: 'VND',
      method: entity.method as PaymentMethod,
      status: entity.status as PaymentStatus,
      refundedAmount: entity.refundedAmount,
      version: entity.version,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
