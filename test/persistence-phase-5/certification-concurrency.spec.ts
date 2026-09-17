import { CertificationStatus, UserRole } from '../../src/common/enums';
import { ProductCertificationVerificationConflictError } from '../../src/modules/products/domain/errors/product-application.error';
import { VerifyProductCertificationUseCase } from '../../src/modules/products/application/use-cases/product.use-cases';

const CERTIFICATION_ID = '11111111-1111-4111-8111-111111111111';
const PRODUCT_ID = '22222222-2222-4222-8222-222222222222';
const ADMIN_ID = '33333333-3333-4333-8333-333333333333';

describe('Persistence Phase 5 certification concurrency', () => {
  it('allows one conditional certification transition winner', async () => {
    const pending = {
      id: CERTIFICATION_ID,
      productId: PRODUCT_ID,
      storedFileId: null,
      status: CertificationStatus.PENDING,
      isVerified: false,
      verifiedBy: null,
      verifiedAt: null,
      rejectionReason: null,
    };
    const repository = {
      findByIdWithProduct: jest.fn().mockResolvedValue(pending),
      transitionCertification: jest
        .fn()
        .mockImplementationOnce(async (_id, _expected, transition) => ({
          ...pending,
          ...transition,
        }))
        .mockResolvedValueOnce(null),
    };
    const storage = { reviewFile: jest.fn() };
    const useCase = new VerifyProductCertificationUseCase(
      repository as never,
      storage as never,
    );

    const results = await Promise.allSettled([
      useCase.execute(CERTIFICATION_ID, ADMIN_ID, UserRole.ADMIN, {
        status: CertificationStatus.VERIFIED,
      }),
      useCase.execute(CERTIFICATION_ID, ADMIN_ID, UserRole.ADMIN, {
        status: CertificationStatus.VERIFIED,
      }),
    ]);

    expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(
      1,
    );
    const rejected = results.find(
      ({ status }) => status === 'rejected',
    ) as PromiseRejectedResult;
    expect(rejected.reason).toBeInstanceOf(
      ProductCertificationVerificationConflictError,
    );
    expect(repository.transitionCertification).toHaveBeenCalledTimes(2);
    expect(storage.reviewFile).not.toHaveBeenCalled();
  });
});
