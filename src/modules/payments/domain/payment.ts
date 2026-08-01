import { MoneyVnd } from '../../commerce/domain/commerce-values';

export type PaymentStatus = 'unpaid' | 'paid' | 'partially_refunded' | 'refunded';
export type PaymentMethod = 'cod' | 'bank_transfer' | 'manual';
export type PaymentActor = 'seller' | 'admin';

export class PaymentDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PaymentDomainError';
  }
}

export class Payment {
  private currentStatus: PaymentStatus = 'unpaid';
  private refunded = MoneyVnd.parse('0');
  constructor(
    readonly orderId: string,
    readonly amount: MoneyVnd,
    readonly method: PaymentMethod,
    orderTotal: MoneyVnd = amount,
  ) {
    if (amount.value !== orderTotal.value) {
      throw new PaymentDomainError('Payment amount must equal the order total');
    }
  }
  static rehydrate(input: {
    orderId: string;
    amount: string;
    method: PaymentMethod;
    status: PaymentStatus;
    refundedAmount: string;
  }): Payment {
    const amount = MoneyVnd.parse(input.amount);
    const payment = new Payment(input.orderId, amount, input.method);
    payment.currentStatus = input.status;
    payment.refunded = MoneyVnd.parse(input.refundedAmount);
    if (payment.refunded.value > amount.value) {
      throw new PaymentDomainError('Refund exceeds payment amount');
    }
    return payment;
  }
  get status(): PaymentStatus { return this.currentStatus; }
  get refundedAmount(): MoneyVnd { return this.refunded; }
  markPaid(actor: PaymentActor): void {
    if (!['seller', 'admin'].includes(actor) || this.currentStatus !== 'unpaid') {
      throw new PaymentDomainError('Payment cannot be marked paid');
    }
    this.currentStatus = 'paid';
  }
  refund(amount: MoneyVnd, actor: PaymentActor): void {
    if (
      actor !== 'admin' ||
      !['paid', 'partially_refunded'].includes(this.currentStatus)
    ) {
      throw new PaymentDomainError('Payment cannot be refunded');
    }
    if (amount.value === 0n) {
      throw new PaymentDomainError('Refund amount must be greater than zero');
    }
    const next = this.refunded.add(amount);
    if (next.value > this.amount.value) {
      throw new PaymentDomainError('Refund exceeds payment amount');
    }
    this.refunded = next;
    this.currentStatus = next.value === this.amount.value ? 'refunded' : 'partially_refunded';
  }
}
