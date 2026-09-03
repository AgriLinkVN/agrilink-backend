import { Inject, Injectable } from '@nestjs/common';

import {
  EMPTY_SEED_GROUP_RESULT,
  SeedClassification,
  SeedExecutionContext,
  SeedGroup,
  SeedGroupMetadata,
  SeedGroupResult,
} from '../../../../../database/seeds/framework/seed-contract';
import {
  PRODUCT_ID_BY_SKU_OUTPUT_KIND,
  PRODUCTS_DEV_SEED_GROUP_ID,
} from '../../../../products/application/contracts/product-seed-output.contract';
import {
  USER_ID_BY_EMAIL_OUTPUT_KIND,
  USERS_DEV_SEED_GROUP_ID,
} from '../../../../users/application/contracts/user-seed-output.contract';
import { REVIEWS_DEV_PRODUCT_FEEDBACK_SEED_GROUP_ID } from '../../../application/contracts/review-seed.contract';

export const REVIEW_DEV_SEED_WRITER = Symbol('REVIEW_DEV_SEED_WRITER');

export const REVIEWS_DEV_PRODUCT_FEEDBACK_SEED_METADATA: SeedGroupMetadata = {
  id: REVIEWS_DEV_PRODUCT_FEEDBACK_SEED_GROUP_ID,
  owner: 'reviews',
  classification: SeedClassification.DEV,
  dependencies: [USERS_DEV_SEED_GROUP_ID, PRODUCTS_DEV_SEED_GROUP_ID],
  description: 'Canonical Product Review development feedback',
};

export interface ReviewDevSeedDefinition {
  readonly fixtureId: string;
  readonly reviewerEmail: string;
  readonly productSku: string;
  readonly rating: number;
  readonly comment: string;
  readonly isVerifiedPurchase: boolean;
}

export interface ReviewDevSeedWriteData {
  readonly reviewerId: string;
  readonly productId: string;
  readonly rating: number;
  readonly comment: string;
  readonly isVerifiedPurchase: boolean;
}

export type ReviewDevSeedMutableData = Omit<
  ReviewDevSeedWriteData,
  'reviewerId' | 'productId'
>;

export interface ReviewDevSeedRecord {
  readonly id: string;
}

export interface ReviewDevSeedWriter {
  findReviewsByReviewerAndProduct(
    reviewerId: string,
    productId: string,
  ): Promise<readonly ReviewDevSeedRecord[]>;
  createReview(data: ReviewDevSeedWriteData): Promise<void>;
  updateReview(id: string, data: ReviewDevSeedMutableData): Promise<void>;
}

export const REVIEW_DEV_SEED_DEFINITIONS: readonly ReviewDevSeedDefinition[] =
  Object.freeze([
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
      comment: 'Chất lượng tốt, giá hợp lý. Sẽ đặt thêm cho nhà máy chế biến.',
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
      comment: 'Vải thiều Lục Ngạn chính gốc. Trái to, ngọt đậm. Rất hài lòng!',
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

export function resolveReviewDevelopmentSeedData(
  context: SeedExecutionContext,
  definitions: readonly ReviewDevSeedDefinition[] = REVIEW_DEV_SEED_DEFINITIONS,
): readonly ReviewDevSeedWriteData[] {
  const declaredIdentities = new Set<string>();

  return definitions.map((definition) => {
    const declaredIdentity = `${definition.reviewerEmail}\u0000${definition.productSku}`;
    if (declaredIdentities.has(declaredIdentity)) {
      throw new Error(
        `${REVIEWS_DEV_PRODUCT_FEEDBACK_SEED_GROUP_ID} declares duplicate Review identity ${definition.reviewerEmail}/${definition.productSku}`,
      );
    }
    declaredIdentities.add(declaredIdentity);

    return {
      reviewerId: context.dependencies.requireString(
        USERS_DEV_SEED_GROUP_ID,
        USER_ID_BY_EMAIL_OUTPUT_KIND,
        definition.reviewerEmail,
      ),
      productId: context.dependencies.requireString(
        PRODUCTS_DEV_SEED_GROUP_ID,
        PRODUCT_ID_BY_SKU_OUTPUT_KIND,
        definition.productSku,
      ),
      rating: definition.rating,
      comment: definition.comment,
      isVerifiedPurchase: definition.isVerifiedPurchase,
    };
  });
}

export async function reconcileReviewDevelopmentSeeds(
  writer: ReviewDevSeedWriter,
  records: readonly ReviewDevSeedWriteData[],
): Promise<void> {
  const resolvedIdentities = new Set<string>();
  const preflight: Array<{
    readonly matches: readonly ReviewDevSeedRecord[];
    readonly data: ReviewDevSeedWriteData;
  }> = [];

  for (const data of records) {
    const identity = `${data.reviewerId}\u0000${data.productId}`;
    if (resolvedIdentities.has(identity)) {
      throw new Error(
        `${REVIEWS_DEV_PRODUCT_FEEDBACK_SEED_GROUP_ID} resolves duplicate Review identity ${data.reviewerId}/${data.productId}`,
      );
    }
    resolvedIdentities.add(identity);

    const matches = await writer.findReviewsByReviewerAndProduct(
      data.reviewerId,
      data.productId,
    );
    if (matches.length > 1) {
      throw new Error(
        `${REVIEWS_DEV_PRODUCT_FEEDBACK_SEED_GROUP_ID} found multiple Reviews for reviewer ${data.reviewerId} and Product ${data.productId}`,
      );
    }
    preflight.push({ matches, data });
  }

  for (const { matches, data } of preflight) {
    if (matches.length === 1) {
      const {
        reviewerId: _immutableReviewerId,
        productId: _immutableProductId,
        ...mutableData
      } = data;
      await writer.updateReview(matches[0].id, mutableData);
    } else {
      await writer.createReview(data);
    }
  }
}

@Injectable()
export class ReviewDevelopmentSeedService implements SeedGroup {
  readonly metadata = REVIEWS_DEV_PRODUCT_FEEDBACK_SEED_METADATA;

  constructor(
    @Inject(REVIEW_DEV_SEED_WRITER)
    private readonly writer: ReviewDevSeedWriter,
  ) {}

  async execute(context: SeedExecutionContext): Promise<SeedGroupResult> {
    if (!context.classifications.includes(SeedClassification.DEV)) {
      throw new Error(`${this.metadata.id} requires explicit DEV selection`);
    }

    await reconcileReviewDevelopmentSeeds(
      this.writer,
      resolveReviewDevelopmentSeedData(context),
    );
    return EMPTY_SEED_GROUP_RESULT;
  }
}
