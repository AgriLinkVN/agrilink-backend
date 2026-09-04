import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { UserRole } from '@common/enums';
import {
  PRODUCT_COMMERCE_READER,
  ProductCommerceReader,
} from '@modules/products/application/ports/inbound/product-commerce.port';
import {
  CommerceConflictError,
  CommerceForbiddenError,
  CommerceInputError,
  CommerceNotFoundError,
} from '../../../commerce/application/errors/commerce-application.error';
import { createCommerceFingerprint } from '../../../commerce/application/services/commerce-fingerprint';
import { MoneyVnd, Quantity } from '../../domain/commerce-values';
import { Order } from '../../domain/order';
import { OrderItem } from '../../domain/order-item';
import { OrderActor, OrderStatus } from '../../domain/order-status';
import { OrderModel } from '../models/order.model';
import {
  ORDER_REPOSITORY,
  OrderRepository,
} from '../ports/order-repository.port';

export interface CommerceActorContext {
  id: string;
  role: UserRole;
}

export interface CreateOrderInput {
  items: Array<{ productId: string; quantity: string }>;
  shippingFee: string;
  platformFee: string;
  paymentMethod: OrderModel['paymentMethod'];
  note: string | null;
}

@Injectable()
export class CreateOrderUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
    @Inject(PRODUCT_COMMERCE_READER)
    private readonly products: ProductCommerceReader,
  ) {}

  async execute(
    actor: CommerceActorContext,
    input: CreateOrderInput,
    operationKey: string,
  ): Promise<OrderModel> {
    if (actor.role !== UserRole.BUYER) {
      throw new CommerceForbiddenError('Only buyers can create orders');
    }
    if (input.items.length === 0) {
      throw new CommerceInputError('Order must contain at least one item');
    }
    const projections = await Promise.all(
      input.items.map(({ productId }) =>
        this.products.findCommerceProduct(productId),
      ),
    );
    if (projections.some((product) => product === null)) {
      throw new CommerceNotFoundError('One or more products are unavailable');
    }
    const products = projections.filter(
      (product): product is NonNullable<typeof product> => product !== null,
    );
    const sellerId = products[0].sellerId;
    if (products.some((product) => product.sellerId !== sellerId)) {
      throw new CommerceInputError('An order can contain products from one seller');
    }
    if (sellerId === actor.id) {
      throw new CommerceInputError('Buyer and seller must be different');
    }

    const items = products.map(
      (product, index) =>
        new OrderItem(
          product.id,
          product.name,
          Quantity.parse(input.items[index].quantity),
          MoneyVnd.parse(product.pricePerUnit),
        ),
    );
    const subtotal = items.reduce(
      (total, item) => total.add(item.lineTotal),
      MoneyVnd.parse('0'),
    );
    const shippingFee = MoneyVnd.parse(input.shippingFee);
    const platformFee = MoneyVnd.parse(input.platformFee);
    const totalAmount = subtotal.add(shippingFee).add(platformFee);
    Order.fromValues(
      actor.id,
      sellerId,
      subtotal,
      shippingFee,
      platformFee,
      totalAmount,
    );
    const payload = {
      ...input,
      sellerId,
      items: items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity.toString(),
        unitPrice: item.unitPrice.toString(),
      })),
    };
    return this.orders.createAtomically({
      orderCode: `ORD-${randomUUID().replace(/-/g, '').slice(0, 20)}`,
      buyerId: actor.id,
      sellerId,
      subtotal: subtotal.toString(),
      shippingFee: shippingFee.toString(),
      platformFee: platformFee.toString(),
      totalAmount: totalAmount.toString(),
      paymentMethod: input.paymentMethod,
      shippingAddressId: null,
      note: input.note,
      items: items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity.toString(),
        unitPrice: item.unitPrice.toString(),
        lineTotal: item.lineTotal.toString(),
      })),
      operationKey,
      requestFingerprint: createCommerceFingerprint(
        'create-order',
        actor.id,
        payload,
      ),
    });
  }
}

@Injectable()
export class GetOrderUseCase {
  constructor(@Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository) {}

  async execute(actor: CommerceActorContext, id: string): Promise<OrderModel> {
    const order = await this.orders.findById(id);
    if (!order) throw new CommerceNotFoundError('Order not found');
    const canRead =
      order.buyerId === actor.id ||
      order.sellerId === actor.id ||
      actor.role === UserRole.ADMIN ||
      actor.role === UserRole.LOGISTICS;
    if (!canRead) throw new CommerceForbiddenError('Order does not belong to actor');
    return order;
  }
}

@Injectable()
export class ListBuyerOrdersUseCase {
  constructor(@Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository) {}
  execute(actor: CommerceActorContext): Promise<OrderModel[]> {
    if (actor.role !== UserRole.BUYER) {
      throw new CommerceForbiddenError('Only buyers can list purchases');
    }
    return this.orders.listForBuyer(actor.id);
  }
}

@Injectable()
export class ListSellerOrdersUseCase {
  constructor(@Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository) {}
  execute(actor: CommerceActorContext): Promise<OrderModel[]> {
    if (!sellerRoles.has(actor.role)) {
      throw new CommerceForbiddenError('Only sellers can list sales');
    }
    return this.orders.listForSeller(actor.id);
  }
}

@Injectable()
export class TransitionOrderStatusUseCase {
  constructor(@Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository) {}

  async execute(
    actor: CommerceActorContext,
    input: {
      orderId: string;
      toStatus: OrderStatus;
      expectedVersion: number;
      note: string | null;
    },
    operationKey: string,
  ): Promise<OrderModel> {
    const current = await this.orders.findById(input.orderId);
    if (!current) throw new CommerceNotFoundError('Order not found');
    const domainActor = toOrderActor(actor.role);
    const domain = Order.rehydrate({ ...current });
    if (
      (domainActor === 'buyer' && current.buyerId !== actor.id) ||
      (domainActor === 'seller' && current.sellerId !== actor.id)
    ) {
      throw new CommerceForbiddenError('Order does not belong to actor');
    }
    domain.transition(input.toStatus, domainActor);
    const result = await this.orders.transitionAtomically({
      orderId: input.orderId,
      actorId: actor.id,
      actor: domainActor,
      expectedVersion: input.expectedVersion,
      toStatus: input.toStatus,
      operationKey,
      requestFingerprint: createCommerceFingerprint(
        'transition-order',
        actor.id,
        input,
      ),
      note: input.note,
    });
    if (!result) {
      throw new CommerceConflictError('Order state or version changed');
    }
    return result;
  }
}

const sellerRoles = new Set<UserRole>([
  UserRole.FARMER,
  UserRole.COOPERATIVE,
  UserRole.SUPPLIER,
]);

function toOrderActor(role: UserRole): OrderActor {
  if (role === UserRole.BUYER) return 'buyer';
  if (sellerRoles.has(role)) return 'seller';
  if (role === UserRole.LOGISTICS) return 'logistics';
  if (role === UserRole.ADMIN) return 'admin';
  throw new CommerceForbiddenError('Role cannot transition orders');
}
