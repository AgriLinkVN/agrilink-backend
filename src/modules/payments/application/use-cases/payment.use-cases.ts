import { Inject, Injectable } from '@nestjs/common';
import { UserRole } from '@common/enums';
import {
  CommerceConflictError,
  CommerceForbiddenError,
  CommerceNotFoundError,
} from '../../../commerce/application/errors/commerce-application.error';
import { createCommerceFingerprint } from '../../../commerce/application/services/commerce-fingerprint';
import { MoneyVnd } from '../../../commerce/domain/commerce-values';
import {
  ORDER_PAYMENT_READER,
  OrderPaymentReader,
} from '../../../orders/application/ports/order-repository.port';
import { CommerceActorContext } from '../../../orders/application/use-cases/order.use-cases';
import { Payment } from '../../domain/payment';
import { PaymentModel } from '../models/payment.model';
import {
  PAYMENT_REPOSITORY,
  PaymentRepository,
} from '../ports/payment-repository.port';

@Injectable()
export class CreateManualPaymentUseCase {
  constructor(
    @Inject(PAYMENT_REPOSITORY) private readonly payments: PaymentRepository,
    @Inject(ORDER_PAYMENT_READER) private readonly orders: OrderPaymentReader,
  ) {}

  async execute(
    actor: CommerceActorContext,
    input: {
      orderId: string;
      method: PaymentModel['method'];
    },
    operationKey: string,
  ): Promise<PaymentModel> {
    if (actor.role !== UserRole.BUYER) {
      throw new CommerceForbiddenError('Only buyers can create payments');
    }
    const order = await this.orders.findForPayment(input.orderId);
    if (!order) throw new CommerceNotFoundError('Order not found');
    if (order.buyerId !== actor.id) {
      throw new CommerceForbiddenError('Order does not belong to buyer');
    }
    const amount = MoneyVnd.parse(order.totalAmount);
    new Payment(order.id, amount, input.method, amount);
    return this.payments.createAtomically({
      orderId: order.id,
      actorId: actor.id,
      amount: amount.toString(),
      method: input.method,
      operationKey,
      requestFingerprint: createCommerceFingerprint(
        'create-payment',
        actor.id,
        input,
      ),
    });
  }
}

@Injectable()
export class GetPaymentByOrderUseCase {
  constructor(
    @Inject(PAYMENT_REPOSITORY) private readonly payments: PaymentRepository,
    @Inject(ORDER_PAYMENT_READER) private readonly orders: OrderPaymentReader,
  ) {}

  async execute(
    actor: CommerceActorContext,
    orderId: string,
  ): Promise<PaymentModel> {
    const order = await this.orders.findForPayment(orderId);
    if (!order) throw new CommerceNotFoundError('Order not found');
    if (
      order.buyerId !== actor.id &&
      order.sellerId !== actor.id &&
      actor.role !== UserRole.ADMIN
    ) {
      throw new CommerceForbiddenError('Payment does not belong to actor');
    }
    const payment = await this.payments.findByOrderId(orderId);
    if (!payment) throw new CommerceNotFoundError('Payment not found');
    return payment;
  }
}

@Injectable()
export class MarkPaymentPaidUseCase {
  constructor(
    @Inject(PAYMENT_REPOSITORY) private readonly payments: PaymentRepository,
    @Inject(ORDER_PAYMENT_READER) private readonly orders: OrderPaymentReader,
  ) {}

  async execute(
    actor: CommerceActorContext,
    paymentId: string,
    expectedVersion: number,
    operationKey: string,
  ): Promise<PaymentModel> {
    const payment = await this.payments.findById(paymentId);
    if (!payment) throw new CommerceNotFoundError('Payment not found');
    const order = await this.orders.findForPayment(payment.orderId);
    if (!order) throw new CommerceNotFoundError('Order not found');
    if (
      actor.role !== UserRole.ADMIN &&
      ![
        UserRole.FARMER,
        UserRole.COOPERATIVE,
        UserRole.SUPPLIER,
      ].includes(actor.role)
    ) {
      throw new CommerceForbiddenError('Role cannot confirm payments');
    }
    const paymentActor = actor.role === UserRole.ADMIN ? 'admin' : 'seller';
    if (paymentActor === 'seller' && order.sellerId !== actor.id) {
      throw new CommerceForbiddenError('Seller does not own this order');
    }
    Payment.rehydrate(payment).markPaid(paymentActor);
    const result = await this.payments.markPaidAtomically({
      paymentId,
      actorId: actor.id,
      actor: paymentActor,
      expectedVersion,
      operationKey,
      requestFingerprint: createCommerceFingerprint(
        'mark-payment-paid',
        actor.id,
        { paymentId, expectedVersion },
      ),
    });
    if (!result) throw new CommerceConflictError('Payment state changed');
    return result;
  }
}

@Injectable()
export class RefundPaymentUseCase {
  constructor(
    @Inject(PAYMENT_REPOSITORY) private readonly payments: PaymentRepository,
  ) {}

  async execute(
    actor: CommerceActorContext,
    paymentId: string,
    amount: string,
    expectedVersion: number,
    operationKey: string,
  ): Promise<PaymentModel> {
    if (actor.role !== UserRole.ADMIN) {
      throw new CommerceForbiddenError('Only admins can refund payments');
    }
    const payment = await this.payments.findById(paymentId);
    if (!payment) throw new CommerceNotFoundError('Payment not found');
    Payment.rehydrate(payment).refund(MoneyVnd.parse(amount), 'admin');
    const result = await this.payments.refundAtomically({
      paymentId,
      actorId: actor.id,
      amount,
      expectedVersion,
      operationKey,
      requestFingerprint: createCommerceFingerprint(
        'refund-payment',
        actor.id,
        { paymentId, amount, expectedVersion },
      ),
    });
    if (!result) throw new CommerceConflictError('Payment state changed');
    return result;
  }
}
