import { PaymentActor, PaymentMethod } from '../../domain/payment';
import { PaymentModel } from '../models/payment.model';

export const PAYMENT_REPOSITORY = Symbol('PAYMENT_REPOSITORY');
export interface PaymentRepository {
  createAtomically(input: {
    orderId: string;
    actorId: string;
    amount: string;
    method: PaymentMethod;
    operationKey: string;
    requestFingerprint: string;
  }): Promise<PaymentModel>;
  findById(id: string): Promise<PaymentModel | null>;
  findByOrderId(orderId: string): Promise<PaymentModel | null>;
  markPaidAtomically(input: {
    paymentId: string;
    actorId: string;
    actor: PaymentActor;
    expectedVersion: number;
    operationKey: string;
    requestFingerprint: string;
  }): Promise<PaymentModel | null>;
  refundAtomically(input: {
    paymentId: string;
    actorId: string;
    amount: string;
    expectedVersion: number;
    operationKey: string;
    requestFingerprint: string;
  }): Promise<PaymentModel | null>;
}
