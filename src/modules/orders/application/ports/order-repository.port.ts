import {
  CreateOrderRepositoryInput,
  OrderModel,
} from '../models/order.model';
import { OrderActor, OrderStatus } from '../../domain/order-status';

export const ORDER_REPOSITORY = Symbol('ORDER_REPOSITORY');

export interface OrderRepository {
  createAtomically(input: CreateOrderRepositoryInput): Promise<OrderModel>;
  findById(id: string): Promise<OrderModel | null>;
  listForBuyer(buyerId: string): Promise<OrderModel[]>;
  listForSeller(sellerId: string): Promise<OrderModel[]>;
  transitionAtomically(input: {
    orderId: string;
    actorId: string;
    actor: OrderActor;
    expectedVersion: number;
    toStatus: OrderStatus;
    operationKey: string;
    requestFingerprint: string;
    note: string | null;
  }): Promise<OrderModel | null>;
  hasCompletedPurchase(buyerId: string, productId: string): Promise<boolean>;
}

export const COMPLETED_PURCHASE_READER = Symbol('COMPLETED_PURCHASE_READER');
export const ORDER_PAYMENT_READER = Symbol('ORDER_PAYMENT_READER');
export interface CompletedPurchaseReader {
  isEligible(buyerId: string, productId: string): Promise<boolean>;
}

export interface OrderPaymentProjection {
  id: string;
  buyerId: string;
  sellerId: string;
  totalAmount: string;
  currency: 'VND';
  status: OrderStatus;
}

export interface OrderPaymentReader {
  findForPayment(orderId: string): Promise<OrderPaymentProjection | null>;
}
