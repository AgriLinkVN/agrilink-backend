import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';

import { createDataSourceOptions } from '../../src/database/data-source-options';
import {
  CLI_ENTITY_REGISTRY,
  excludeDeferredEntitiesFromSchemaBuild,
} from '../../src/database/entity-registry';
import { V2_MIGRATIONS } from '../../src/database/migration-registry';
import {
  createAdminDataSource,
  createDisposableDatabase,
  createDisposableDatabaseName,
  dropDisposableDatabase,
} from '../../src/database/reconciliation/disposable-database';
import { PersistenceTestPurpose } from '../../src/database/reconciliation/database-target.guard';
import { SeedClassification } from '../../src/database/seeds/framework/seed-contract';
import { executeSharedTestIdentitySeedGroupsWithOutputs } from '../../src/database/seeds/test-seed-output-executor';
import { IdempotencyConflictError } from '../../src/modules/commerce/application/errors/commerce-application.error';
import { TypeOrmCommerceOperationRepository } from '../../src/modules/commerce/infrastructure/persistence/repositories/typeorm-commerce-operation.repository';
import { TypeOrmContractRepository, TypeOrmPurchaseRequestRepository } from '../../src/modules/contracts/infrastructure/persistence/repositories/typeorm-contract.repository';
import { TypeOrmOrderRepository } from '../../src/modules/orders/infrastructure/persistence/repositories/typeorm-order.repository';
import { TypeOrmPaymentRepository } from '../../src/modules/payments/infrastructure/persistence/repositories/typeorm-payment.repository';
import {
  PRODUCT_ID_BY_SKU_OUTPUT_KIND,
  PRODUCTS_TEST_SEED_GROUP_ID,
} from '../../src/modules/products/application/contracts/product-seed-output.contract';
import { TypeOrmTransactionContext } from '../../src/shared/infrastructure/persistence/transaction/typeorm-transaction-context';
import {
  USER_ID_BY_EMAIL_OUTPUT_KIND,
  USERS_TEST_SEED_GROUP_ID,
} from '../../src/modules/users/application/contracts/user-seed-output.contract';

dotenv.config();
jest.setTimeout(120_000);

const BUYER = '11111111-1111-4111-8111-111111111111';
const ADMIN = '33333333-3333-4333-8333-333333333333';
const SHARED_SELLER_EMAIL = 'seller@example.test';
const SHARED_PRODUCT_SKU = 'TEST-COMMERCE-RICE-001';
let SELLER: string;
let PRODUCT: string;

describe('Persistence Phase 6 PostgreSQL concurrency', () => {
  const database = createDisposableDatabaseName();
  const testTarget = {
    classification: SeedClassification.TEST,
    purpose: PersistenceTestPurpose.BUSINESS_FIXTURE,
    database,
    acknowledgement: database,
  } as const;
  const admin = createAdminDataSource(process.env, testTarget);
  let dataSource: DataSource;
  let orders: TypeOrmOrderRepository;
  let payments: TypeOrmPaymentRepository;
  let requests: TypeOrmPurchaseRequestRepository;
  let contracts: TypeOrmContractRepository;

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

    const transactions = new TypeOrmTransactionContext(dataSource);
    const operations = new TypeOrmCommerceOperationRepository(transactions);
    orders = new TypeOrmOrderRepository(transactions, operations);
    payments = new TypeOrmPaymentRepository(transactions, operations);
    requests = new TypeOrmPurchaseRequestRepository(transactions, operations);
    contracts = new TypeOrmContractRepository(transactions, operations);
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) await dataSource.destroy();
    if (admin.isInitialized) {
      await dropDisposableDatabase(admin, testTarget);
      await admin.destroy();
    }
  });

  it('deduplicates same-key order creation and rejects fingerprint reuse', async () => {
    const input = orderInput('create-order-key', 'a'.repeat(64));
    const results = await Promise.all([
      orders.createAtomically(input),
      orders.createAtomically(input),
    ]);
    expect(new Set(results.map(({ id }) => id)).size).toBe(1);
    await expect(
      orders.createAtomically({ ...input, requestFingerprint: 'b'.repeat(64) }),
    ).rejects.toBeInstanceOf(IdempotencyConflictError);
    expect(await scalar('SELECT COUNT(*) FROM orders')).toBe('1');
    expect(await scalar('SELECT COUNT(*) FROM order_status_history')).toBe('1');
  });

  it('allows one transition from a shared version and one immutable history row', async () => {
    const order = await orders.findById(
      String(await scalar('SELECT id FROM orders LIMIT 1')),
    );
    expect(order).not.toBeNull();
    const results = await Promise.allSettled([
      orders.transitionAtomically({
        orderId: order!.id,
        actorId: SELLER,
        actor: 'seller',
        expectedVersion: order!.version,
        toStatus: 'confirmed',
        operationKey: 'confirm-a',
        requestFingerprint: 'c'.repeat(64),
        note: null,
      }),
      orders.transitionAtomically({
        orderId: order!.id,
        actorId: SELLER,
        actor: 'seller',
        expectedVersion: order!.version,
        toStatus: 'confirmed',
        operationKey: 'confirm-b',
        requestFingerprint: 'd'.repeat(64),
        note: null,
      }),
    ]);
    expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(1);
    expect(await scalar('SELECT COUNT(*) FROM order_status_history')).toBe('2');
  });

  it('keeps payment transitions and refunds within one version winner', async () => {
    const orderId = String(await scalar('SELECT id FROM orders LIMIT 1'));
    const payment = await payments.createAtomically({
      orderId,
      actorId: BUYER,
      amount: '100',
      method: 'manual',
      operationKey: 'create-payment-key',
      requestFingerprint: 'e'.repeat(64),
    });
    const paidResults = await Promise.allSettled([
      payments.markPaidAtomically({
        paymentId: payment.id,
        actorId: SELLER,
        actor: 'seller',
        expectedVersion: payment.version,
        operationKey: 'paid-a',
        requestFingerprint: 'f'.repeat(64),
      }),
      payments.markPaidAtomically({
        paymentId: payment.id,
        actorId: SELLER,
        actor: 'seller',
        expectedVersion: payment.version,
        operationKey: 'paid-b',
        requestFingerprint: '0'.repeat(64),
      }),
    ]);
    expect(paidResults.filter(({ status }) => status === 'fulfilled')).toHaveLength(1);
    const paid = await payments.findById(payment.id);
    expect(paid).toMatchObject({ status: 'paid', version: 2 });

    const refundResults = await Promise.allSettled([
      payments.refundAtomically({
        paymentId: payment.id,
        actorId: ADMIN,
        amount: '60',
        expectedVersion: paid!.version,
        operationKey: 'refund-a',
        requestFingerprint: '1'.repeat(64),
      }),
      payments.refundAtomically({
        paymentId: payment.id,
        actorId: ADMIN,
        amount: '50',
        expectedVersion: paid!.version,
        operationKey: 'refund-b',
        requestFingerprint: '2'.repeat(64),
      }),
    ]);
    expect(refundResults.filter(({ status }) => status === 'fulfilled')).toHaveLength(1);
    const refunded = await payments.findById(payment.id);
    expect(BigInt(refunded!.refundedAmount)).toBeLessThanOrEqual(100n);
  });

  it('serializes contract allocation and keeps duplicate same-side signing idempotent', async () => {
    const request = await requests.createAtomically({
      buyerId: BUYER,
      productCategoryId: null,
      provinceId: null,
      quantityNeeded: '10',
      unit: 'kg',
      operationKey: 'request-key',
      requestFingerprint: '3'.repeat(64),
    });
    const createResults = await Promise.allSettled([
      contracts.createFromRequestAtomically(
        contractInput(request.id, 'CTR-A', 'contract-a', '4'.repeat(64)),
      ),
      contracts.createFromRequestAtomically(
        contractInput(request.id, 'CTR-B', 'contract-b', '5'.repeat(64)),
      ),
    ]);
    expect(createResults.filter(({ status }) => status === 'fulfilled')).toHaveLength(1);
    expect(await scalar('SELECT SUM(quantity) FROM contracts')).toBe('6.000');
    const contract = await contracts.findById(
      String(await scalar('SELECT id FROM contracts LIMIT 1')),
    );
    const negotiating = await contracts.transitionAtomically({
      id: contract!.id,
      actorId: BUYER,
      toStatus: 'negotiating',
      expectedVersion: contract!.version,
      operationKey: 'contract-negotiating',
      requestFingerprint: '6'.repeat(64),
    });
    const pending = await contracts.transitionAtomically({
      id: contract!.id,
      actorId: BUYER,
      toStatus: 'pending_signature',
      expectedVersion: negotiating!.version,
      operationKey: 'contract-pending',
      requestFingerprint: '7'.repeat(64),
    });
    const signResults = await Promise.allSettled([
      contracts.signAtomically({
        id: contract!.id,
        actorId: BUYER,
        expectedVersion: pending!.version,
        operationKey: 'sign-buyer-a',
        requestFingerprint: '8'.repeat(64),
      }),
      contracts.signAtomically({
        id: contract!.id,
        actorId: BUYER,
        expectedVersion: pending!.version,
        operationKey: 'sign-buyer-b',
        requestFingerprint: '9'.repeat(64),
      }),
    ]);
    expect(signResults.filter(({ status }) => status === 'fulfilled')).toHaveLength(2);
    const buyerSigned = await contracts.findById(contract!.id);
    expect(buyerSigned!.buyerSignedAt).toBeInstanceOf(Date);
    expect(buyerSigned!.sellerSignedAt).toBeNull();

    const active = await contracts.signAtomically({
      id: contract!.id,
      actorId: SELLER,
      expectedVersion: buyerSigned!.version,
      operationKey: 'sign-seller',
      requestFingerprint: 'a'.repeat(64),
    });
    expect(active).toMatchObject({ status: 'active' });
  });

  it('exposes the reviewed Commerce constraints and indexes', async () => {
    const constraints = await dataSource.query(
      `SELECT conname FROM pg_constraint WHERE conname LIKE 'CHK_%' OR conname LIKE 'FK_%' OR conname LIKE 'UQ_%'`,
    ) as Array<{ conname: string }>;
    const indexes = await dataSource.query(
      `SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'IDX_%'`,
    ) as Array<{ indexname: string }>;
    const names = new Set(constraints.map(({ conname }) => conname));
    expect(names.has('CHK_orders_money')).toBe(true);
    expect(names.has('UQ_commerce_operations_scope')).toBe(true);
    expect(names.has('FK_contracts_request')).toBe(true);
    expect(indexes.some(({ indexname }) => indexname === 'IDX_orders_buyer_created')).toBe(true);
  });

  async function scalar(sql: string): Promise<unknown> {
    const rows = await dataSource.query(sql) as Array<Record<string, unknown>>;
    return Object.values(rows[0])[0];
  }
});

function orderInput(operationKey: string, requestFingerprint: string) {
  return {
    orderCode: 'ORD-CONCURRENCY',
    buyerId: BUYER,
    sellerId: SELLER,
    subtotal: '100',
    shippingFee: '0',
    platformFee: '0',
    totalAmount: '100',
    paymentMethod: 'manual' as const,
    shippingAddressId: null,
    note: null,
    items: [
      {
        productId: PRODUCT,
        productName: 'Rice',
        quantity: '1',
        unitPrice: '100',
        lineTotal: '100',
      },
    ],
    operationKey,
    requestFingerprint,
  };
}

function contractInput(
  requestId: string,
  contractCode: string,
  operationKey: string,
  requestFingerprint: string,
) {
  return {
    contractCode,
    purchaseRequestId: requestId,
    buyerId: BUYER,
    sellerId: SELLER,
    productCategoryId: null,
    quantity: '6',
    unit: 'kg',
    unitPrice: '10',
    totalValue: '60',
    operationKey,
    requestFingerprint,
  };
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
       ($2, 'admin@example.test', 'x', 'admin', 'active')`,
    [BUYER, ADMIN],
  );

  return { sellerId, productId };
}
