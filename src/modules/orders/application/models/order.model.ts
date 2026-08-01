import { OrderStatus } from '../../domain/order-status';

export interface OrderItemModel {
  id: string;
  productId: string;
  productName: string;
  quantity: string;
  unitPrice: string;
  lineTotal: string;
}

export interface OrderModel {
  id: string;
  orderCode: string;
  buyerId: string;
  sellerId: string;
  status: OrderStatus;
  subtotal: string;
  shippingFee: string;
  platformFee: string;
  totalAmount: string;
  paymentMethod: 'cod' | 'bank_transfer' | 'manual';
  version: number;
  items: OrderItemModel[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOrderRepositoryInput {
  orderCode: string;
  buyerId: string;
  sellerId: string;
  subtotal: string;
  shippingFee: string;
  platformFee: string;
  totalAmount: string;
  paymentMethod: OrderModel['paymentMethod'];
  shippingAddressId: string | null;
  note: string | null;
  items: Array<Omit<OrderItemModel, 'id'>>;
  operationKey: string;
  requestFingerprint: string;
}
