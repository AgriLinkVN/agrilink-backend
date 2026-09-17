export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'handed_to_logistics' | 'shipping' | 'delivered' | 'cancelled';
export type OrderActor = 'buyer' | 'seller' | 'logistics' | 'admin';

const transitions: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  pending: ['confirmed', 'cancelled'], confirmed: ['preparing', 'cancelled'],
  preparing: ['handed_to_logistics', 'cancelled'], handed_to_logistics: ['shipping'],
  shipping: ['delivered'], delivered: [], cancelled: [],
};

export function assertOrderTransition(from: OrderStatus, to: OrderStatus, actor: OrderActor): void {
  if (!transitions[from].includes(to)) {
    throw new OrderTransitionError(`Invalid order transition: ${from} -> ${to}`);
  }
  if (actor === 'admin') return;
  const allowed = (actor === 'buyer' && from === 'pending' && to === 'cancelled') ||
    (actor === 'seller' && ((from === 'pending' && to === 'confirmed') || (from === 'confirmed' && to === 'preparing') || (from === 'preparing' && to === 'handed_to_logistics') || ((from === 'pending' || from === 'confirmed' || from === 'preparing') && to === 'cancelled'))) ||
    (actor === 'logistics' && ((from === 'handed_to_logistics' && to === 'shipping') || (from === 'shipping' && to === 'delivered')));
  if (!allowed) {
    throw new OrderAuthorizationError(
      'Actor is not allowed to perform this order transition',
    );
  }
}
import {
  OrderAuthorizationError,
  OrderTransitionError,
} from './commerce-domain.error';
