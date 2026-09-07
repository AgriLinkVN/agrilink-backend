import { MoneyVnd, Quantity } from './commerce-values';
import { OrderInvariantError } from './commerce-domain.error';

export class OrderItem {
  readonly lineTotal: MoneyVnd;

  constructor(
    readonly productId: string,
    readonly productName: string,
    readonly quantity: Quantity,
    readonly unitPrice: MoneyVnd,
    lineTotal?: MoneyVnd,
  ) {
    const calculated = unitPrice.multiply(quantity);
    if (lineTotal && lineTotal.value !== calculated.value) {
      throw new OrderInvariantError('Order item line total is invalid');
    }
    this.lineTotal = lineTotal ?? calculated;
  }
}
