import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { APP_GUARD } from '@nestjs/core';
import { DataSource } from 'typeorm';
import * as request from 'supertest';

import { UserRole, UserStatus } from '../src/common/enums';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { createDataSourceOptions } from '../src/database/data-source-options';
import {
  CLI_ENTITY_REGISTRY,
  excludeDeferredEntitiesFromSchemaBuild,
} from '../src/database/entity-registry';
import { V2_MIGRATIONS } from '../src/database/migration-registry';
import {
  createAdminDataSource,
  createDisposableDatabase,
  createDisposableDatabaseName,
  dropDisposableDatabase,
} from '../src/database/reconciliation/disposable-database';
import { PersistenceTestPurpose } from '../src/database/reconciliation/database-target.guard';
import { SeedClassification } from '../src/database/seeds/framework/seed-contract';
import { executeSharedTestIdentitySeedGroupsWithOutputs } from '../src/database/seeds/test-seed-output-executor';
import {
  COMMERCE_OPERATION_REPOSITORY,
  CommerceOperationRepository,
} from '../src/modules/commerce/application/ports/commerce-operation.port';
import { TypeOrmCommerceOperationRepository } from '../src/modules/commerce/infrastructure/persistence/repositories/typeorm-commerce-operation.repository';
import {
  CONTRACT_REPOSITORY,
  PURCHASE_REQUEST_REPOSITORY,
} from '../src/modules/contracts/application/ports/contract-repository.port';
import {
  CreateContractFromPurchaseRequestUseCase,
  CreatePurchaseRequestUseCase,
  GetContractUseCase,
  GetPurchaseRequestUseCase,
  ListMyContractsUseCase,
  ListPurchaseRequestsUseCase,
  SignContractUseCase,
  TransitionContractStatusUseCase,
  TransitionPurchaseRequestUseCase,
} from '../src/modules/contracts/application/use-cases/contract.use-cases';
import {
  TypeOrmContractRepository,
  TypeOrmPurchaseRequestRepository,
} from '../src/modules/contracts/infrastructure/persistence/repositories/typeorm-contract.repository';
import { ContractsController } from '../src/modules/contracts/presentation/controllers/contracts.controller';
import {
  COMPLETED_PURCHASE_READER,
  ORDER_PAYMENT_READER,
  ORDER_REPOSITORY,
} from '../src/modules/orders/application/ports/order-repository.port';
import {
  OrderBoundaryService,
} from '../src/modules/orders/application/services/order-boundary.service';
import {
  CreateOrderUseCase,
  GetOrderUseCase,
  ListBuyerOrdersUseCase,
  ListSellerOrdersUseCase,
  TransitionOrderStatusUseCase,
} from '../src/modules/orders/application/use-cases/order.use-cases';
import { TypeOrmOrderRepository } from '../src/modules/orders/infrastructure/persistence/repositories/typeorm-order.repository';
import { OrdersController } from '../src/modules/orders/presentation/controllers/orders.controller';
import {
  PAYMENT_REPOSITORY,
} from '../src/modules/payments/application/ports/payment-repository.port';
import {
  CreateManualPaymentUseCase,
  GetPaymentByOrderUseCase,
  MarkPaymentPaidUseCase,
  RefundPaymentUseCase,
} from '../src/modules/payments/application/use-cases/payment.use-cases';
import { TypeOrmPaymentRepository } from '../src/modules/payments/infrastructure/persistence/repositories/typeorm-payment.repository';
import { PaymentsController } from '../src/modules/payments/presentation/controllers/payments.controller';
import {
  PRODUCT_COMMERCE_READER,
  ProductCommercePriceIncompatibleError,
  ProductCommerceReader,
} from '../src/modules/products/application/ports/inbound/product-commerce.port';
import {
  PRODUCT_ID_BY_SKU_OUTPUT_KIND,
  PRODUCTS_TEST_SEED_GROUP_ID,
} from '../src/modules/products/application/contracts/product-seed-output.contract';
import { Review } from '../src/modules/reviews/infrastructure/persistence/entities/review.entity';
import { TypeOrmReviewsRepository } from '../src/modules/reviews/infrastructure/persistence/repositories/typeorm-reviews.repository';
import { CreateProductReviewUseCase } from '../src/modules/reviews/application/use-cases/reviews.use-cases';
import { TypeOrmTransactionContext } from '../src/shared/infrastructure/persistence/transaction/typeorm-transaction-context';
import {
  USER_ID_BY_EMAIL_OUTPUT_KIND,
  USERS_TEST_SEED_GROUP_ID,
} from '../src/modules/users/application/contracts/user-seed-output.contract';

dotenv.config();
jest.setTimeout(120_000);

const BUYER = '11111111-1111-4111-8111-111111111111';
const ADMIN = '33333333-3333-4333-8333-333333333333';
const LOGISTICS = '44444444-4444-4444-8444-444444444444';
const OTHER = '55555555-5555-4555-8555-555555555555';
const FRACTIONAL_PRODUCT = '77777777-7777-4777-8777-777777777777';
const SHARED_SELLER_EMAIL = 'seller@example.test';
const SHARED_PRODUCT_SKU = 'TEST-COMMERCE-RICE-001';
let SELLER: string;
let PRODUCT: string;

describe('Commerce Phase 6 E2E', () => {
  const database = createDisposableDatabaseName();
  const testTarget = {
    classification: SeedClassification.TEST,
    purpose: PersistenceTestPurpose.BUSINESS_FIXTURE,
    database,
    acknowledgement: database,
  } as const;
  const admin = createAdminDataSource(process.env, testTarget);
  let dataSource: DataSource;
  let module: TestingModule;
  let app: INestApplication;

  beforeAll(async () => {
    await admin.initialize();
    await createDisposableDatabase(admin, testTarget);
    dataSource = new DataSource(
      createDataSourceOptions(
        { ...process.env, DB_NAME: database, DB_SYNCHRONIZE: 'false' },
        {
          entities: CLI_ENTITY_REGISTRY,
          migrations: V2_MIGRATIONS,
          migrationsTableName: 'migrations_v2',
          logging: false,
        },
      ),
    );
    await dataSource.initialize();
    excludeDeferredEntitiesFromSchemaBuild(dataSource);
    await dataSource.runMigrations();
    const sharedIdentities = await seedReferences(dataSource, database);
    SELLER = sharedIdentities.sellerId;
    PRODUCT = sharedIdentities.productId;

    module = await Test.createTestingModule({
      controllers: [OrdersController, PaymentsController, ContractsController],
      providers: [
        { provide: APP_GUARD, useClass: RolesGuard },
        { provide: DataSource, useValue: dataSource },
        TypeOrmTransactionContext,
        TypeOrmCommerceOperationRepository,
        {
          provide: COMMERCE_OPERATION_REPOSITORY,
          useExisting: TypeOrmCommerceOperationRepository,
        },
        TypeOrmOrderRepository,
        { provide: ORDER_REPOSITORY, useExisting: TypeOrmOrderRepository },
        OrderBoundaryService,
        { provide: COMPLETED_PURCHASE_READER, useExisting: OrderBoundaryService },
        { provide: ORDER_PAYMENT_READER, useExisting: OrderBoundaryService },
        {
          provide: PRODUCT_COMMERCE_READER,
          useValue: {
            findCommerceProduct: async (id: string) => {
              if (id === FRACTIONAL_PRODUCT) {
                throw new ProductCommercePriceIncompatibleError();
              }
              return id === PRODUCT
                ? {
                    id: PRODUCT,
                    sellerId: SELLER,
                    name: 'Rice',
                    pricePerUnit: '100',
                    unit: 'kg',
                  }
                : null;
            },
          } satisfies ProductCommerceReader,
        },
        CreateOrderUseCase,
        GetOrderUseCase,
        ListBuyerOrdersUseCase,
        ListSellerOrdersUseCase,
        TransitionOrderStatusUseCase,
        TypeOrmPaymentRepository,
        { provide: PAYMENT_REPOSITORY, useExisting: TypeOrmPaymentRepository },
        CreateManualPaymentUseCase,
        GetPaymentByOrderUseCase,
        MarkPaymentPaidUseCase,
        RefundPaymentUseCase,
        TypeOrmPurchaseRequestRepository,
        TypeOrmContractRepository,
        {
          provide: PURCHASE_REQUEST_REPOSITORY,
          useExisting: TypeOrmPurchaseRequestRepository,
        },
        {
          provide: CONTRACT_REPOSITORY,
          useExisting: TypeOrmContractRepository,
        },
        CreatePurchaseRequestUseCase,
        GetPurchaseRequestUseCase,
        ListPurchaseRequestsUseCase,
        TransitionPurchaseRequestUseCase,
        CreateContractFromPurchaseRequestUseCase,
        GetContractUseCase,
        ListMyContractsUseCase,
        SignContractUseCase,
        TransitionContractStatusUseCase,
      ],
    }).compile();

    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.use((req, _res, next) => {
      req.user = {
        sub: req.headers['x-user-id'],
        role: req.headers['x-user-role'],
      };
      next();
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
    if (dataSource?.isInitialized) await dataSource.destroy();
    if (admin.isInitialized) {
      await dropDisposableDatabase(admin, testTarget);
      await admin.destroy();
    }
  });

  it('rejects invalid Commerce DTO values before domain execution', async () => {
    for (const quantity of ['0', '0.000']) {
      await request(app.getHttpServer())
        .post('/api/v1/orders')
        .set(actor(BUYER, UserRole.BUYER))
        .set('Idempotency-Key', `invalid-order-${quantity}`)
        .send({
          items: [{ productId: PRODUCT, quantity }],
          shippingFee: '0',
          platformFee: '0',
          paymentMethod: 'manual',
        })
        .expect(400);
    }

    await request(app.getHttpServer())
      .post('/api/v1/purchase-requests')
      .set(actor(BUYER, UserRole.ENTERPRISE))
      .set('Idempotency-Key', 'invalid-request-zero')
      .send({ quantityNeeded: '0', unit: 'kg' })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/v1/contracts/from-request')
      .set(actor(BUYER, UserRole.ENTERPRISE))
      .set('Idempotency-Key', 'invalid-contract-zero')
      .send({
        purchaseRequestId: BUYER,
        sellerId: SELLER,
        quantity: '0',
        unitPrice: '100',
      })
      .expect(400);

    await request(app.getHttpServer())
      .patch(`/api/v1/payments/${BUYER}/refund`)
      .set(actor(ADMIN, UserRole.ADMIN))
      .set('Idempotency-Key', 'invalid-refund-zero')
      .send({ expectedVersion: 1, amount: '0' })
      .expect(400);
  });

  it('maps incompatible product prices without hiding missing products', async () => {
    const payload = (productId: string) => ({
      items: [{ productId, quantity: '1' }],
      shippingFee: '0',
      platformFee: '0',
      paymentMethod: 'manual',
    });

    await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set(actor(BUYER, UserRole.BUYER))
      .set('Idempotency-Key', 'fractional-product-price')
      .send(payload(FRACTIONAL_PRODUCT))
      .expect(409)
      .expect(({ body }) =>
        expect(body.message).toBe('Product price is not compatible with Commerce'),
      );

    await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set(actor(BUYER, UserRole.BUYER))
      .set('Idempotency-Key', 'missing-product')
      .send(payload(OTHER))
      .expect(404);
  });

  it('runs order, payment, contract and verified-review workflows', async () => {
    const createdOrder = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set(actor(BUYER, UserRole.BUYER))
      .set('Idempotency-Key', 'e2e-create-order')
      .send({
        items: [{ productId: PRODUCT, quantity: '2' }],
        shippingFee: '10',
        platformFee: '0',
        paymentMethod: 'manual',
      })
      .expect(201);
    expect(createdOrder.body).toMatchObject({
      buyerId: BUYER,
      sellerId: SELLER,
      subtotal: '200',
      totalAmount: '210',
    });
    const orderId = createdOrder.body.id as string;

    await request(app.getHttpServer())
      .patch(`/api/v1/orders/${orderId}/status`)
      .set(actor(OTHER, UserRole.STATE_AGENCY))
      .set('Idempotency-Key', 'irrelevant-order-role')
      .send({ toStatus: 'confirmed', expectedVersion: 1 })
      .expect(403);
    await request(app.getHttpServer())
      .patch(`/api/v1/orders/${orderId}/status`)
      .set(actor(OTHER, UserRole.FARMER))
      .set('Idempotency-Key', 'foreign-order-seller')
      .send({ toStatus: 'confirmed', expectedVersion: 1 })
      .expect(403);
    await request(app.getHttpServer())
      .patch(`/api/v1/orders/${orderId}/status`)
      .set(actor(ADMIN, UserRole.ADMIN))
      .set('Idempotency-Key', 'admin-invalid-order-transition')
      .send({ toStatus: 'delivered', expectedVersion: 1 })
      .expect(409);

    await request(app.getHttpServer())
      .get('/api/v1/orders/buyer/me')
      .set(actor(BUYER, UserRole.BUYER))
      .expect(200)
      .expect(({ body }) => expect(body).toHaveLength(1));
    await request(app.getHttpServer())
      .get('/api/v1/orders/seller/me')
      .set(actor(SELLER, UserRole.FARMER))
      .expect(200)
      .expect(({ body }) => expect(body).toHaveLength(1));
    await request(app.getHttpServer())
      .get(`/api/v1/orders/${orderId}`)
      .set(actor(OTHER, UserRole.BUYER))
      .expect(403);

    let order = createdOrder.body;
    for (const [index, transition] of [
      [SELLER, UserRole.FARMER, 'confirmed'],
      [SELLER, UserRole.FARMER, 'preparing'],
      [SELLER, UserRole.FARMER, 'handed_to_logistics'],
      [LOGISTICS, UserRole.LOGISTICS, 'shipping'],
      [LOGISTICS, UserRole.LOGISTICS, 'delivered'],
    ].entries()) {
      const [userId, role, toStatus] = transition as [string, UserRole, string];
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/orders/${orderId}/status`)
        .set(actor(userId, role))
        .set('Idempotency-Key', `e2e-order-transition-${index}`)
        .send({ toStatus, expectedVersion: order.version })
        .expect(200);
      order = response.body;
    }
    expect(order.status).toBe('delivered');

    const createdPayment = await request(app.getHttpServer())
      .post('/api/v1/payments')
      .set(actor(BUYER, UserRole.BUYER))
      .set('Idempotency-Key', 'e2e-create-payment')
      .send({ orderId, method: 'manual' })
      .expect(201);
    expect(createdPayment.body.amount).toBe('210');
    const paid = await request(app.getHttpServer())
      .patch(`/api/v1/payments/${createdPayment.body.id}/paid`)
      .set(actor(SELLER, UserRole.FARMER))
      .set('Idempotency-Key', 'e2e-paid')
      .send({ expectedVersion: createdPayment.body.version })
      .expect(200);
    const refunded = await request(app.getHttpServer())
      .patch(`/api/v1/payments/${createdPayment.body.id}/refund`)
      .set(actor(ADMIN, UserRole.ADMIN))
      .set('Idempotency-Key', 'e2e-refund')
      .send({ expectedVersion: paid.body.version, amount: '10' })
      .expect(200);
    expect(refunded.body).toMatchObject({
      status: 'partially_refunded',
      refundedAmount: '10',
    });

    const createdRequest = await request(app.getHttpServer())
      .post('/api/v1/purchase-requests')
      .set(actor(BUYER, UserRole.ENTERPRISE))
      .set('Idempotency-Key', 'e2e-request')
      .send({ quantityNeeded: '10', unit: 'kg' })
      .expect(201);
    const createdContract = await request(app.getHttpServer())
      .post('/api/v1/contracts/from-request')
      .set(actor(BUYER, UserRole.ENTERPRISE))
      .set('Idempotency-Key', 'e2e-contract')
      .send({
        purchaseRequestId: createdRequest.body.id,
        sellerId: SELLER,
        quantity: '5',
        unitPrice: '100',
      })
      .expect(201);
    await request(app.getHttpServer())
      .patch(`/api/v1/contracts/${createdContract.body.id}/sign`)
      .set(actor(OTHER, UserRole.STATE_AGENCY))
      .set('Idempotency-Key', 'irrelevant-contract-sign-role')
      .send({ expectedVersion: createdContract.body.version })
      .expect(403);
    await request(app.getHttpServer())
      .patch(`/api/v1/contracts/${createdContract.body.id}/status`)
      .set(actor(OTHER, UserRole.STATE_AGENCY))
      .set('Idempotency-Key', 'irrelevant-contract-status-role')
      .send({
        toStatus: 'negotiating',
        expectedVersion: createdContract.body.version,
      })
      .expect(403);
    await request(app.getHttpServer())
      .patch(`/api/v1/contracts/${createdContract.body.id}/sign`)
      .set(actor(OTHER, UserRole.FARMER))
      .set('Idempotency-Key', 'foreign-contract-party')
      .send({ expectedVersion: createdContract.body.version })
      .expect(403);
    await request(app.getHttpServer())
      .patch(`/api/v1/contracts/${createdContract.body.id}/sign`)
      .set(actor(ADMIN, UserRole.ADMIN))
      .set('Idempotency-Key', 'admin-contract-sign')
      .send({ expectedVersion: createdContract.body.version })
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/v1/contracts/from-request')
      .set(actor(BUYER, UserRole.ENTERPRISE))
      .set('Idempotency-Key', 'e2e-over-allocation')
      .send({
        purchaseRequestId: createdRequest.body.id,
        sellerId: SELLER,
        quantity: '6',
        unitPrice: '100',
      })
      .expect(400);

    let contract = createdContract.body;
    for (const [index, toStatus] of ['negotiating', 'pending_signature'].entries()) {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/contracts/${contract.id}/status`)
        .set(actor(BUYER, UserRole.ENTERPRISE))
        .set('Idempotency-Key', `e2e-contract-transition-${index}`)
        .send({ toStatus, expectedVersion: contract.version })
        .expect(200);
      contract = response.body;
    }
    contract = (
      await request(app.getHttpServer())
        .patch(`/api/v1/contracts/${contract.id}/sign`)
        .set(actor(BUYER, UserRole.ENTERPRISE))
        .set('Idempotency-Key', 'e2e-buyer-sign')
        .send({ expectedVersion: contract.version })
        .expect(200)
    ).body;
    contract = (
      await request(app.getHttpServer())
        .patch(`/api/v1/contracts/${contract.id}/sign`)
        .set(actor(SELLER, UserRole.FARMER))
        .set('Idempotency-Key', 'e2e-seller-sign')
        .send({ expectedVersion: contract.version })
        .expect(200)
    ).body;
    expect(contract.status).toBe('active');
    contract = (
      await request(app.getHttpServer())
        .patch(`/api/v1/contracts/${contract.id}/status`)
        .set(actor(BUYER, UserRole.ENTERPRISE))
        .set('Idempotency-Key', 'e2e-contract-complete')
        .send({ toStatus: 'completed', expectedVersion: contract.version })
        .expect(200)
    ).body;
    expect(contract.status).toBe('completed');

    const completedPurchases = module.get(OrderBoundaryService);
    const reviews = new TypeOrmReviewsRepository(
      dataSource.getRepository(Review),
    );
    const reviewUseCase = new CreateProductReviewUseCase(
      reviews,
      {
        findReviewContext: async () => ({
          id: PRODUCT,
          sellerId: SELLER,
          name: 'Rice',
        }),
        findReviewSummariesByIds: async () => [],
      },
      {
        findReviewEligibility: async () => ({
          id: BUYER,
          status: UserStatus.ACTIVE,
        }),
        findReviewSummariesByIds: async () => [],
      },
      completedPurchases,
    );
    await expect(
      reviewUseCase.execute(BUYER, {
        productId: PRODUCT,
        rating: 5,
        comment: 'Verified delivery',
        images: [],
      }),
    ).resolves.toMatchObject({ isVerifiedPurchase: true });
  });
});

function actor(id: string, role: UserRole): Record<string, string> {
  return { 'X-User-Id': id, 'X-User-Role': role };
}

interface SharedCommerceIdentityIds {
  readonly sellerId: string;
  readonly productId: string;
}

async function seedReferences(
  dataSource: DataSource,
  database: string,
): Promise<SharedCommerceIdentityIds> {
  const sharedIdentities =
    await executeSharedTestIdentitySeedGroupsWithOutputs(dataSource, {
      environment: { NODE_ENV: 'test', DB_NAME: database },
      classifications: [SeedClassification.TEST],
    });
  const sellerId = sharedIdentities.outputs.requireString(
    USERS_TEST_SEED_GROUP_ID,
    USER_ID_BY_EMAIL_OUTPUT_KIND,
    SHARED_SELLER_EMAIL,
  );
  const productId = sharedIdentities.outputs.requireString(
    PRODUCTS_TEST_SEED_GROUP_ID,
    PRODUCT_ID_BY_SKU_OUTPUT_KIND,
    SHARED_PRODUCT_SKU,
  );

  await dataSource.query(
    `INSERT INTO users (id, email, password_hash, role, status)
     VALUES
       ($1, 'buyer@example.test', 'x', 'buyer', 'active'),
       ($2, 'admin@example.test', 'x', 'admin', 'active'),
       ($3, 'logistics@example.test', 'x', 'logistics', 'active'),
       ($4, 'other@example.test', 'x', 'buyer', 'active')`,
    [BUYER, ADMIN, LOGISTICS, OTHER],
  );

  return { sellerId, productId };
}
