import {
  PaymentMethod,
  PaymentStatus,
} from '../../domain/payment';

export interface PaymentModel {
  id: string;
  orderId: string;
  amount: string;
  currency: 'VND';
  method: PaymentMethod;
  status: PaymentStatus;
  refundedAmount: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}
