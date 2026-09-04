import { readFileSync } from 'fs';
import { join } from 'path';

import {
  EMPTY_SEED_GROUP_RESULT,
  SeedClassification,
  SeedExecutionContext,
} from '../../../../../database/seeds/framework/seed-contract';
import { SeedOutputRegistry } from '../../../../../database/seeds/framework/seed-dependency-outputs';
import {
  PRODUCT_ID_BY_SKU_OUTPUT_KIND,
  PRODUCTS_DEV_SEED_GROUP_ID,
} from '../../../../products/application/contracts/product-seed-output.contract';
import {
  USER_ID_BY_EMAIL_OUTPUT_KIND,
  USERS_DEV_SEED_GROUP_ID,
} from '../../../../users/application/contracts/user-seed-output.contract';
import { REVIEWS_DEV_PRODUCT_FEEDBACK_SEED_GROUP_ID } from '../../../application/contracts/review-seed.contract';
import {
  REVIEW_DEV_SEED_DEFINITIONS,
  REVIEWS_DEV_PRODUCT_FEEDBACK_SEED_METADATA,
  ReviewDevelopmentSeedService,
  ReviewDevSeedMutableData,
  ReviewDevSeedRecord,
  ReviewDevSeedWriteData,
  ReviewDevSeedWriter,
  reconcileReviewDevelopmentSeeds,
  resolveReviewDevelopmentSeedData,
} from './review-development-seed.service';

class InMemoryReviewDevSeedWriter implements ReviewDevSeedWriter {
  readonly rows: Array<ReviewDevSeedRecord & ReviewDevSeedWriteData>;
  readonly creates: ReviewDevSeedWriteData[] = [];
  readonly updates: Array<{ id: string; data: ReviewDevSeedMutableData }> = [];

  constructor(rows: Array<ReviewDevSeedRecord & ReviewDevSeedWriteData> = []) {
    this.rows = rows;
  }

  async findReviewsByReviewerAndProduct(
    reviewerId: string,
    productId: string,
  ): Promise<readonly ReviewDevSeedRecord[]> {
    return this.rows
      .filter(
        (row) => row.reviewerId === reviewerId && row.productId === productId,
      )
      .map(({ id }) => ({ id }));
  }

  async createReview(data: ReviewDevSeedWriteData): Promise<void> {
    this.creates.push(data);
    this.rows.push({ id: `review:${this.rows.length + 1}`, ...data });
  }

  async updateReview(
    id: string,
    data: ReviewDevSeedMutableData,
  ): Promise<void> {
    this.updates.push({ id, data });
    const index = this.rows.findIndex((row) => row.id === id);
    if (index >= 0) this.rows[index] = { ...this.rows[index], ...data };
  }
}

function createContext(options?: {
  readonly omitUserEmail?: string;
  readonly omitProductSku?: string;
  readonly classifications?: readonly SeedClassification[];
}): SeedExecutionContext {
  const registry = new SeedOutputRegistry();
  const userEmails = [
    ...new Set(
      REVIEW_DEV_SEED_DEFINITIONS.map(({ reviewerEmail }) => reviewerEmail),
    ),
  ];
  const productSkus = [
    ...new Set(REVIEW_DEV_SEED_DEFINITIONS.map(({ productSku }) => productSku)),
  ];
  registry.register(USERS_DEV_SEED_GROUP_ID, {
    outputs: userEmails
      .filter((email) => email !== options?.omitUserEmail)
      .map((email) => ({
        kind: USER_ID_BY_EMAIL_OUTPUT_KIND,
        key: email,
        value: `user:${email}`,
      })),
  });
  registry.register(PRODUCTS_DEV_SEED_GROUP_ID, {
    outputs: productSkus
      .filter((sku) => sku !== options?.omitProductSku)
      .map((sku) => ({
        kind: PRODUCT_ID_BY_SKU_OUTPUT_KIND,
        key: sku,
        value: `product:${sku}`,
      })),
  });
  return {
    nodeEnv: 'development',
    databaseName: 'agrilink_dev_disposable',
    classifications: options?.classifications ?? [SeedClassification.DEV],
    dependencies: registry.viewFor(REVIEWS_DEV_PRODUCT_FEEDBACK_SEED_METADATA),
  };
}

describe('ReviewDevelopmentSeedService', () => {
  it('declares the one Reviews-owned DEV group and exact dependencies', () => {
    expect(REVIEWS_DEV_PRODUCT_FEEDBACK_SEED_GROUP_ID).toBe(
      'reviews.dev.product-feedback',
    );
    expect(REVIEWS_DEV_PRODUCT_FEEDBACK_SEED_METADATA).toEqual({
      id: 'reviews.dev.product-feedback',
      owner: 'reviews',
      classification: SeedClassification.DEV,
      dependencies: [USERS_DEV_SEED_GROUP_ID, PRODUCTS_DEV_SEED_GROUP_ID],
      description: 'Canonical Product Review development feedback',
    });
  });

  it('preserves all nine central business payloads with explicit identities', () => {
    expect(REVIEW_DEV_SEED_DEFINITIONS).toEqual([
      {
        fixtureId: 'REV-01',
        reviewerEmail: 'buyer@agrilink.vn',
        productSku: 'DEV-XOAI-HOA-LOC-001',
        rating: 5,
        comment: 'Xoài rất ngọt, thơm, đóng gói cẩn thận. Giao hàng nhanh.',
        isVerifiedPurchase: true,
      },
      {
        fixtureId: 'REV-02',
        reviewerEmail: 'enterprise@agrilink.vn',
        productSku: 'DEV-XOAI-HOA-LOC-001',
        rating: 4,
        comment:
          'Chất lượng tốt, giá hợp lý. Sẽ đặt thêm cho nhà máy chế biến.',
        isVerifiedPurchase: true,
      },
      {
        fixtureId: 'REV-03',
        reviewerEmail: 'buyer@agrilink.vn',
        productSku: 'DEV-SAU-RIENG-RI6-001',
        rating: 5,
        comment: 'Sầu riêng Ri6 chuẩn vị Cai Lậy. Cơm vàng, hột lép, thơm nức.',
        isVerifiedPurchase: true,
      },
      {
        fixtureId: 'REV-04',
        reviewerEmail: 'enterprise@agrilink.vn',
        productSku: 'DEV-BUOI-DA-XANH-FARMER-001',
        rating: 4,
        comment: 'Bưởi da xanh ngon, múi mọng nước. Giá hợp lý.',
        isVerifiedPurchase: false,
      },
      {
        fixtureId: 'REV-05',
        reviewerEmail: 'buyer@agrilink.vn',
        productSku: 'DEV-THANH-LONG-RUOT-DO-001',
        rating: 5,
        comment: 'Thanh long đỏ đẹp, ngọt. Xuất khẩu như lời giới thiệu.',
        isVerifiedPurchase: true,
      },
      {
        fixtureId: 'REV-06',
        reviewerEmail: 'enterprise@agrilink.vn',
        productSku: 'DEV-DUA-HAU-KHONG-HAT-001',
        rating: 3,
        comment: 'Dưa hấu ngon nhưng size hơi nhỏ so với yêu cầu.',
        isVerifiedPurchase: true,
      },
      {
        fixtureId: 'REV-07',
        reviewerEmail: 'buyer@agrilink.vn',
        productSku: 'DEV-VAI-THIEU-LUC-NGAN-001',
        rating: 5,
        comment:
          'Vải thiều Lục Ngạn chính gốc. Trái to, ngọt đậm. Rất hài lòng!',
        isVerifiedPurchase: true,
      },
      {
        fixtureId: 'REV-08',
        reviewerEmail: 'farmer@sandbox.com',
        productSku: 'DEV-RAU-MUONG-HUU-CO-001',
        rating: 4,
        comment:
          'Rau muống tươi ngon, không thuốc. Gia đình tôi mua thường xuyên.',
        isVerifiedPurchase: false,
      },
      {
        fixtureId: 'REV-09',
        reviewerEmail: 'buyer@agrilink.vn',
        productSku: 'DEV-CA-ROT-DA-LAT-001',
        rating: 5,
        comment: 'Cà rốt Đà Lạt ngọt giòn, làm salad rất ngon.',
        isVerifiedPurchase: true,
      },
    ]);
    expect(REVIEW_DEV_SEED_DEFINITIONS).toHaveLength(9);
    expect(
      REVIEW_DEV_SEED_DEFINITIONS.every(
        ({ reviewerEmail, productSku }) => reviewerEmail && productSku,
      ),
    ).toBe(true);
    expect(
      new Set(
        REVIEW_DEV_SEED_DEFINITIONS.map(
          ({ reviewerEmail, productSku }) => `${reviewerEmail}/${productSku}`,
        ),
      ).size,
    ).toBe(9);
    expect(
      REVIEW_DEV_SEED_DEFINITIONS.find(
        ({ fixtureId }) => fixtureId === 'REV-04',
      )?.productSku,
    ).toBe('DEV-BUOI-DA-XANH-FARMER-001');
    expect(
      REVIEW_DEV_SEED_DEFINITIONS.some(
        ({ productSku }) => productSku === 'DEV-BUOI-DA-XANH-001',
      ),
    ).toBe(false);
  });

  it('resolves only dependency-scoped User and Product scalar outputs', () => {
    const records = resolveReviewDevelopmentSeedData(createContext());
    expect(records).toHaveLength(9);
    expect(records[0]).toEqual({
      reviewerId: 'user:buyer@agrilink.vn',
      productId: 'product:DEV-XOAI-HOA-LOC-001',
      rating: 5,
      comment: 'Xoài rất ngọt, thơm, đóng gói cẩn thận. Giao hàng nhanh.',
      isVerifiedPurchase: true,
    });
  });

  it('fails closed when a required User or Product output is missing', () => {
    expect(() =>
      resolveReviewDevelopmentSeedData(
        createContext({ omitUserEmail: 'farmer@sandbox.com' }),
      ),
    ).toThrow('MISSING_REQUIRED_OUTPUT');
    expect(() =>
      resolveReviewDevelopmentSeedData(
        createContext({ omitProductSku: 'DEV-CA-ROT-DA-LAT-001' }),
      ),
    ).toThrow('MISSING_REQUIRED_OUTPUT');
  });

  it('creates missing Reviews, reconciles existing Reviews, and leaves unrelated rows untouched', async () => {
    const records = resolveReviewDevelopmentSeedData(createContext());
    const existing = {
      id: 'existing-review',
      ...records[0],
      rating: 1,
      comment: 'stale',
      isVerifiedPurchase: false,
    };
    const unrelated = {
      id: 'unrelated-review',
      reviewerId: 'unrelated-user',
      productId: 'unrelated-product',
      rating: 2,
      comment: 'preserve me',
      isVerifiedPurchase: false,
    };
    const writer = new InMemoryReviewDevSeedWriter([existing, unrelated]);

    await reconcileReviewDevelopmentSeeds(writer, records);

    expect(writer.creates).toHaveLength(8);
    expect(writer.updates).toEqual([
      {
        id: 'existing-review',
        data: {
          rating: records[0].rating,
          comment: records[0].comment,
          isVerifiedPurchase: records[0].isVerifiedPurchase,
        },
      },
    ]);
    expect(writer.rows.find(({ id }) => id === 'unrelated-review')).toEqual(
      unrelated,
    );
  });

  it('preflights all nine identities and fails before the first write on duplicates', async () => {
    const records = resolveReviewDevelopmentSeedData(createContext());
    const duplicate = records[8];
    const writer = new InMemoryReviewDevSeedWriter([
      { id: 'duplicate-a', ...duplicate },
      { id: 'duplicate-b', ...duplicate },
    ]);

    await expect(
      reconcileReviewDevelopmentSeeds(writer, records),
    ).rejects.toThrow('found multiple Reviews');
    expect(writer.creates).toHaveLength(0);
    expect(writer.updates).toHaveLength(0);
  });

  it('is idempotent on a second complete in-memory run', async () => {
    const writer = new InMemoryReviewDevSeedWriter();
    const service = new ReviewDevelopmentSeedService(writer);

    await expect(service.execute(createContext())).resolves.toEqual(
      EMPTY_SEED_GROUP_RESULT,
    );
    expect(writer.creates).toHaveLength(9);

    await expect(service.execute(createContext())).resolves.toEqual(
      EMPTY_SEED_GROUP_RESULT,
    );
    expect(writer.creates).toHaveLength(9);
    expect(writer.updates).toHaveLength(9);
    expect(writer.rows).toHaveLength(9);
  });

  it('requires explicit DEV selection and publishes no Review outputs', async () => {
    const service = new ReviewDevelopmentSeedService(
      new InMemoryReviewDevSeedWriter(),
    );
    await expect(
      service.execute(
        createContext({ classifications: [SeedClassification.REFERENCE] }),
      ),
    ).rejects.toThrow('requires explicit DEV selection');
  });

  it('keeps cross-owner entities and repositories out of Reviews DEV seed code', () => {
    const serviceSource = readFileSync(
      join(__dirname, 'review-development-seed.service.ts'),
      'utf8',
    );
    expect(serviceSource).not.toMatch(
      /modules\/(?:users|products)\/.*(?:infrastructure|entities|repositories)/,
    );
    expect(serviceSource).not.toMatch(
      /\b(?:User|Product)\b.*(?:Repository|Entity)|getRepository/,
    );
  });
});
