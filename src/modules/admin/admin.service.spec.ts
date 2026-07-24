import { UserRole } from '@common/enums';
import { AdminService } from './admin.service';

const ADMIN_ID = '11111111-1111-4111-8111-111111111111';
const PROFILE_ID = '22222222-2222-4222-8222-222222222222';
const FRONT_FILE_ID = '33333333-3333-4333-8333-333333333333';
const BACK_FILE_ID = '44444444-4444-4444-8444-444444444444';

function repository() {
  return {
    findOne: jest.fn(),
    save: jest.fn(async (value) => value),
  };
}

describe('AdminService profile review consistency', () => {
  it('restores changed files and profile state when a later review fails', async () => {
    const auditRepository = repository();
    const farmerRepository = repository();
    const profile = {
      id: PROFILE_ID,
      isKycVerified: false,
      verifiedBy: null,
      verifiedAt: null,
      rejectionReason: 'previous reason',
      cccdFrontFileId: FRONT_FILE_ID,
      cccdBackFileId: BACK_FILE_ID,
    };
    farmerRepository.findOne.mockResolvedValue(profile);
    const storedFileAccess = {
      attachOwnedFile: jest.fn(),
      detachOwnedFile: jest.fn(),
      readOwnedFile: jest.fn(),
      reviewFile: jest
        .fn()
        .mockResolvedValueOnce(true)
        .mockRejectedValueOnce(new Error('storage unavailable')),
      restoreReviewedFile: jest.fn().mockResolvedValue(undefined),
      retireOwnedFile: jest.fn(),
    };
    const unusedRepository = repository();
    const service = new AdminService(
      unusedRepository as never,
      auditRepository as never,
      farmerRepository as never,
      unusedRepository as never,
      unusedRepository as never,
      unusedRepository as never,
      unusedRepository as never,
      unusedRepository as never,
      unusedRepository as never,
      storedFileAccess,
    );

    await expect(
      service.verifyProfile(
        'farmer',
        PROFILE_ID,
        { isApproved: true },
        ADMIN_ID,
        UserRole.STATE_AGENCY,
      ),
    ).rejects.toThrow('storage unavailable');

    expect(storedFileAccess.restoreReviewedFile).toHaveBeenCalledWith({
      fileId: FRONT_FILE_ID,
      reviewerRole: UserRole.STATE_AGENCY,
    });
    expect(farmerRepository.save).toHaveBeenCalledTimes(2);
    expect(profile).toMatchObject({
      isKycVerified: false,
      verifiedBy: null,
      verifiedAt: null,
      rejectionReason: 'previous reason',
    });
    expect(auditRepository.save).not.toHaveBeenCalled();
  });
});
