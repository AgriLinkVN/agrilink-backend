import { Inject, Injectable } from '@nestjs/common';
import {
  COMPLETED_PURCHASE_READER,
  CompletedPurchaseReader,
  ORDER_PAYMENT_READER,
  ORDER_REPOSITORY,
  OrderPaymentProjection,
  OrderPaymentReader,
  OrderRepository,
} from '../ports/order-repository.port';

@Injectable()
export class OrderBoundaryService
  implements CompletedPurchaseReader, OrderPaymentReader
{
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orders: OrderRepository,
  ) {}

  isEligible(buyerId: string, productId: string): Promise<boolean> {
    return this.orders.hasCompletedPurchase(buyerId, productId);
  }

  async findForPayment(
    orderId: string,
  ): Promise<OrderPaymentProjection | null> {
    const order = await this.orders.findById(orderId);
    if (!order) return null;
    return {
      id: order.id,
      buyerId: order.buyerId,
      sellerId: order.sellerId,
      totalAmount: order.totalAmount,
      currency: 'VND',
      status: order.status,
    };
  }
}

export const ORDER_BOUNDARY_PROVIDERS = [
  {
    provide: COMPLETED_PURCHASE_READER,
    useExisting: OrderBoundaryService,
  },
  {
    provide: ORDER_PAYMENT_READER,
    useExisting: OrderBoundaryService,
  },
];
