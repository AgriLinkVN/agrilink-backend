import { MoneyVnd } from './commerce-values';
import { OrderInvariantError } from './commerce-domain.error';
import { assertOrderTransition, OrderActor, OrderStatus } from './order-status';

export class Order {
  private constructor(
    readonly id: string | null,
    readonly orderCode: string | null,
    readonly buyerId: string,
    readonly sellerId: string,
    private currentStatus: OrderStatus,
    readonly subtotal: MoneyVnd,
    readonly shippingFee: MoneyVnd,
    readonly platformFee: MoneyVnd,
    readonly totalAmount: MoneyVnd,
    readonly version: number,
  ) {
    if (subtotal.add(shippingFee).add(platformFee).value !== totalAmount.value) {
      throw new OrderInvariantError('Order total must equal subtotal plus fees');
    }
  }

  static fromValues(
    buyerId: string, sellerId: string, subtotal: MoneyVnd, shippingFee: MoneyVnd,
    platformFee: MoneyVnd, totalAmount: MoneyVnd, status: OrderStatus = 'pending',
  ): Order {
    return new Order(
      null,
      null,
      buyerId,
      sellerId,
      status,
      subtotal,
      shippingFee,
      platformFee,
      totalAmount,
      1,
    );
  }

  static rehydrate(input: {
    id: string;
    orderCode: string;
    buyerId: string;
    sellerId: string;
    status: OrderStatus;
    subtotal: string;
    shippingFee: string;
    platformFee: string;
    totalAmount: string;
    version: number;
  }): Order {
    return new Order(
      input.id,
      input.orderCode,
      input.buyerId,
      input.sellerId,
      input.status,
      MoneyVnd.parse(input.subtotal),
      MoneyVnd.parse(input.shippingFee),
      MoneyVnd.parse(input.platformFee),
      MoneyVnd.parse(input.totalAmount),
      input.version,
    );
  }

  get status(): OrderStatus { return this.currentStatus; }
  transition(to: OrderStatus, actor: OrderActor): void {
    assertOrderTransition(this.currentStatus, to, actor);
    this.currentStatus = to;
  }
}
