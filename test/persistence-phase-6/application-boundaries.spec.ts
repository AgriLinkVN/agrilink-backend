import { UserRole } from '../../src/common/enums';
import {
  CommerceForbiddenError,
  CommerceInputError,
} from '../../src/modules/commerce/application/errors/commerce-application.error';
import {
  CreateOrderUseCase,
  ListSellerOrdersUseCase,
  TransitionOrderStatusUseCase,
} from '../../src/modules/orders/application/use-cases/order.use-cases';
import {
  CreateManualPaymentUseCase,
  MarkPaymentPaidUseCase,
  RefundPaymentUseCase,
} from '../../src/modules/payments/application/use-cases/payment.use-cases';
import {
  CreateContractFromPurchaseRequestUseCase,
  CreatePurchaseRequestUseCase,
  SignContractUseCase,
  TransitionContractStatusUseCase,
} from '../../src/modules/contracts/application/use-cases/contract.use-cases';
import { ProductCommercePriceIncompatibleError } from '../../src/modules/products/application/ports/inbound/product-commerce.port';
import { TypeOrmProductRepository } from '../../src/modules/products/infrastructure/repositories/typeorm-product.repository';

const BUYER = '11111111-1111-4111-8111-111111111111';
const SELLER = '22222222-2222-4222-8222-222222222222';
const OTHER = '33333333-3333-4333-8333-333333333333';
const PRODUCT = '44444444-4444-4444-8444-444444444444';
const ORDER = '55555555-5555-4555-8555-555555555555';
const PAYMENT = '66666666-6666-4666-8666-666666666666';
const REQUEST = '77777777-7777-4777-8777-777777777777';
const CONTRACT = '88888888-8888-4888-8888-888888888888';

describe('Persistence Phase 6 application boundaries', () => {
  it('creates a buyer-owned order from Product projections and exact strings', async () => {
    const orders = {
      createAtomically: jest.fn(async (input) => ({
        ...orderModel(),
        buyerId: input.buyerId,
        sellerId: input.sellerId,
        subtotal: input.subtotal,
        totalAmount: input.totalAmount,
        items: input.items,
      })),
    };
    const products = {
      findCommerceProduct: jest.fn().mockResolvedValue({
        id: PRODUCT,
        sellerId: SELLER,
        name: 'Rice',
        pricePerUnit: '25000',
        unit: 'kg',
      }),
    };
    const useCase = new CreateOrderUseCase(orders as never, products as never);

    const result = await useCase.execute(
      { id: BUYER, role: UserRole.BUYER },
      {
        items: [{ productId: PRODUCT, quantity: '2.5' }],
        shippingFee: '10000',
        platformFee: '0',
        paymentMethod: 'cod',
        note: null,
      },
      'order-key',
    );

    expect(result).toMatchObject({
      buyerId: BUYER,
      sellerId: SELLER,
      subtotal: '62500',
      totalAmount: '72500',
    });
    expect(orders.createAtomically).toHaveBeenCalledWith(
      expect.objectContaining({
        buyerId: BUYER,
        sellerId: SELLER,
        requestFingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    );
  });

  it('rejects non-buyers, self-purchase and mixed-seller orders', async () => {
    const orders = { createAtomically: jest.fn() };
    const product = {
      id: PRODUCT,
      sellerId: SELLER,
      name: 'Rice',
      pricePerUnit: '1000',
      unit: 'kg',
    };
    const products = { findCommerceProduct: jest.fn().mockResolvedValue(product) };
    const useCase = new CreateOrderUseCase(orders as never, products as never);
    const input = {
      items: [{ productId: PRODUCT, quantity: '1' }],
      shippingFee: '0',
      platformFee: '0',
      paymentMethod: 'cod' as const,
      note: null,
    };
    await expect(
      useCase.execute({ id: SELLER, role: UserRole.FARMER }, input, 'a'),
    ).rejects.toBeInstanceOf(CommerceForbiddenError);

    products.findCommerceProduct.mockResolvedValueOnce({
      ...product,
      sellerId: BUYER,
    });
    await expect(
      useCase.execute({ id: BUYER, role: UserRole.BUYER }, input, 'b'),
    ).rejects.toBeInstanceOf(CommerceInputError);

    products.findCommerceProduct
      .mockResolvedValueOnce(product)
      .mockResolvedValueOnce({ ...product, id: OTHER, sellerId: OTHER });
    await expect(
      useCase.execute(
        { id: BUYER, role: UserRole.BUYER },
        { ...input, items: [input.items[0], { productId: OTHER, quantity: '1' }] },
        'c',
      ),
    ).rejects.toBeInstanceOf(CommerceInputError);
  });

  it('enforces seller ownership for listing and order transitions', async () => {
    const orders = {
      listForSeller: jest.fn().mockResolvedValue([orderModel()]),
      findById: jest.fn().mockResolvedValue(orderModel()),
      transitionAtomically: jest.fn(),
    };
    const list = new ListSellerOrdersUseCase(orders as never);
    await expect(
      list.execute({ id: SELLER, role: UserRole.FARMER }),
    ).resolves.toHaveLength(1);
    expect(orders.listForSeller).toHaveBeenCalledWith(SELLER);

    const transition = new TransitionOrderStatusUseCase(orders as never);
    await expect(
      transition.execute(
        { id: OTHER, role: UserRole.FARMER },
        {
          orderId: ORDER,
          toStatus: 'confirmed',
          expectedVersion: 1,
          note: null,
        },
        'transition-key',
      ),
    ).rejects.toBeInstanceOf(CommerceForbiddenError);
  });

  it('derives payment amount from the order and enforces payment actors', async () => {
    const orders = {
      findForPayment: jest.fn().mockResolvedValue(orderProjection()),
    };
    const payments = {
      createAtomically: jest.fn(async (input) => paymentModel(input.amount)),
      findById: jest.fn().mockResolvedValue(paymentModel('100000')),
      markPaidAtomically: jest.fn(),
      refundAtomically: jest.fn(),
    };
    const create = new CreateManualPaymentUseCase(
      payments as never,
      orders as never,
    );
    await expect(
      create.execute(
        { id: BUYER, role: UserRole.BUYER },
        { orderId: ORDER, method: 'manual' },
        'payment-key',
      ),
    ).resolves.toMatchObject({ amount: '100000' });
    expect(payments.createAtomically).toHaveBeenCalledWith(
      expect.objectContaining({ amount: '100000', actorId: BUYER }),
    );

    const markPaid = new MarkPaymentPaidUseCase(
      payments as never,
      orders as never,
    );
    await expect(
      markPaid.execute(
        { id: OTHER, role: UserRole.FARMER },
        PAYMENT,
        1,
        'paid-key',
      ),
    ).rejects.toBeInstanceOf(CommerceForbiddenError);

    const refund = new RefundPaymentUseCase(payments as never);
    await expect(
      refund.execute(
        { id: SELLER, role: UserRole.FARMER },
        PAYMENT,
        '1',
        1,
        'refund-key',
      ),
    ).rejects.toBeInstanceOf(CommerceForbiddenError);
  });

  it('derives purchase-request ownership and contract totals', async () => {
    const requests = {
      createAtomically: jest.fn(async (input) => requestModel(input.buyerId)),
      findById: jest.fn().mockResolvedValue(requestModel(BUYER)),
    };
    const contracts = {
      createFromRequestAtomically: jest.fn(async (input) => ({
        ...contractModel(),
        totalValue: input.totalValue,
      })),
      findById: jest.fn().mockResolvedValue(contractModel()),
      signAtomically: jest.fn(),
    };
    const createRequest = new CreatePurchaseRequestUseCase(requests as never);
    await expect(
      createRequest.execute(
        { id: BUYER, role: UserRole.ENTERPRISE },
        {
          productCategoryId: null,
          provinceId: null,
          quantityNeeded: '10',
          unit: 'kg',
        },
        'request-key',
      ),
    ).resolves.toMatchObject({ buyerId: BUYER });

    const createContract = new CreateContractFromPurchaseRequestUseCase(
      requests as never,
      contracts as never,
    );
    await expect(
      createContract.execute(
        { id: BUYER, role: UserRole.ENTERPRISE },
        {
          purchaseRequestId: REQUEST,
          sellerId: SELLER,
          quantity: '2.5',
          unitPrice: '20000',
        },
        'contract-key',
      ),
    ).resolves.toMatchObject({ totalValue: '50000' });

    const sign = new SignContractUseCase(contracts as never);
    await expect(
      sign.execute(
        { id: OTHER, role: UserRole.FARMER },
        CONTRACT,
        1,
        'sign-key',
      ),
    ).rejects.toBeInstanceOf(CommerceForbiddenError);

    await expect(
      sign.execute(
        { id: BUYER, role: UserRole.ADMIN },
        CONTRACT,
        1,
        'admin-sign-key',
      ),
    ).rejects.toBeInstanceOf(CommerceForbiddenError);

    const transition = new TransitionContractStatusUseCase(contracts as never);
    await expect(
      transition.execute(
        { id: BUYER, role: UserRole.STATE_AGENCY },
        { id: CONTRACT, toStatus: 'active', expectedVersion: 1 },
        'state-agency-transition-key',
      ),
    ).rejects.toBeInstanceOf(CommerceForbiddenError);
  });

  it('returns typed Commerce price failures and preserves repository errors', async () => {
    const productRepo = { findOne: jest.fn() };
    const repository = new TypeOrmProductRepository(
      productRepo as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    const product = {
      id: PRODUCT,
      sellerId: SELLER,
      name: 'Rice',
      pricePerUnit: '25000.00',
      unit: 'kg',
    };

    productRepo.findOne.mockResolvedValueOnce(product);
    await expect(repository.findCommerceProduct(PRODUCT)).resolves.toMatchObject({
      pricePerUnit: '25000',
    });

    productRepo.findOne.mockResolvedValueOnce(null);
    await expect(repository.findCommerceProduct(PRODUCT)).resolves.toBeNull();

    productRepo.findOne.mockResolvedValueOnce({
      ...product,
      pricePerUnit: '25000.50',
    });
    await expect(repository.findCommerceProduct(PRODUCT)).rejects.toBeInstanceOf(
      ProductCommercePriceIncompatibleError,
    );

    const databaseError = new Error('database unavailable');
    productRepo.findOne.mockRejectedValueOnce(databaseError);
    await expect(repository.findCommerceProduct(PRODUCT)).rejects.toBe(
      databaseError,
    );
  });
});

function orderModel() {
  return {
    id: ORDER,
    orderCode: 'ORD-1',
    buyerId: BUYER,
    sellerId: SELLER,
    status: 'pending' as const,
    subtotal: '100000',
    shippingFee: '0',
    platformFee: '0',
    totalAmount: '100000',
    paymentMethod: 'manual' as const,
    version: 1,
    items: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function orderProjection() {
  return {
    id: ORDER,
    buyerId: BUYER,
    sellerId: SELLER,
    totalAmount: '100000',
    currency: 'VND' as const,
    status: 'confirmed' as const,
  };
}

function paymentModel(amount: string) {
  return {
    id: PAYMENT,
    orderId: ORDER,
    amount,
    currency: 'VND' as const,
    method: 'manual' as const,
    status: 'unpaid' as const,
    refundedAmount: '0',
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function requestModel(buyerId: string) {
  return {
    id: REQUEST,
    buyerId,
    productCategoryId: null,
    provinceId: null,
    quantityNeeded: '10',
    allocatedQuantity: '0',
    unit: 'kg',
    status: 'open' as const,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function contractModel() {
  return {
    id: CONTRACT,
    contractCode: 'CTR-1',
    purchaseRequestId: REQUEST,
    buyerId: BUYER,
    sellerId: SELLER,
    productCategoryId: null,
    quantity: '1',
    unit: 'kg',
    unitPrice: '1000',
    totalValue: '1000',
    status: 'pending_signature' as const,
    buyerSignedAt: null,
    sellerSignedAt: null,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
