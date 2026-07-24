import { UserRole } from '../../common/enums';
import { ProfilesService } from './profiles.service';
import { StoredFileNotFoundError } from '../storage/application/storage-file.errors';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const PROFILE_ID = '22222222-2222-4222-8222-222222222222';
const FRONT_FILE_ID = '33333333-3333-4333-8333-333333333333';
const BACK_FILE_ID = '44444444-4444-4444-8444-444444444444';

function makeRepository() {
  return {
    findOne: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => ({ id: PROFILE_ID, ...value })),
  };
}

function makeService() {
  const farmerRepository = makeRepository();
  const cooperativeRepository = makeRepository();
  const enterpriseRepository = makeRepository();
  const supplierRepository = makeRepository();
  const vision = { verifyCccdImage: jest.fn().mockResolvedValue(true) };
  const storedFileAccess = {
    attachOwnedFile: jest.fn().mockResolvedValue(undefined),
    detachOwnedFile: jest.fn().mockResolvedValue(undefined),
    readOwnedFile: jest.fn().mockResolvedValue(Buffer.from('identity')),
    reviewFile: jest.fn().mockResolvedValue(true),
    restoreReviewedFile: jest.fn().mockResolvedValue(undefined),
    retireOwnedFile: jest.fn().mockResolvedValue(undefined),
  };
  const service = new ProfilesService(
    farmerRepository as never,
    cooperativeRepository as never,
    enterpriseRepository as never,
    supplierRepository as never,
    vision,
    storedFileAccess,
  );
  return {
    service,
    farmerRepository,
    enterpriseRepository,
    vision,
    storedFileAccess,
  };
}

describe('ProfilesService private documents', () => {
  it('passes owned CCCD bytes to OCR and stores only file IDs', async () => {
    const { service, farmerRepository, vision, storedFileAccess } =
      makeService();

    const saved = await service.upsertFarmerProfile(USER_ID, {
      cccdNumber: '012345678901',
      cccdFrontFileId: FRONT_FILE_ID,
      cccdBackFileId: BACK_FILE_ID,
      residenceAddress: 'Can Tho',
    });

    expect(vision.verifyCccdImage).toHaveBeenCalledWith(
      Buffer.from('identity'),
    );
    expect(storedFileAccess.readOwnedFile).toHaveBeenCalledTimes(2);
    expect(storedFileAccess.attachOwnedFile).toHaveBeenCalledWith({
      fileId: FRONT_FILE_ID,
      ownerId: USER_ID,
      assetType: 'KYC_IDENTITY',
      resourceType: 'FARMER_PROFILE',
      resourceId: saved.id,
    });
    expect(saved).toMatchObject({
      cccdFrontFileId: FRONT_FILE_ID,
      cccdBackFileId: BACK_FILE_ID,
      cccdFrontUrl: null,
      cccdBackUrl: null,
    });
    expect(farmerRepository.save).toHaveBeenCalledTimes(1);
  });

  it('rejects a cross-owner CCCD before profile persistence', async () => {
    const { service, farmerRepository, storedFileAccess } = makeService();
    storedFileAccess.readOwnedFile.mockRejectedValue(
      new StoredFileNotFoundError('Stored file not found'),
    );

    await expect(
      service.upsertFarmerProfile(USER_ID, {
        cccdNumber: '012345678901',
        cccdFrontFileId: FRONT_FILE_ID,
        cccdBackFileId: BACK_FILE_ID,
        residenceAddress: 'Can Tho',
      }),
    ).rejects.toThrow('Tài liệu riêng tư không hợp lệ');
    expect(farmerRepository.save).not.toHaveBeenCalled();
  });

  it('attaches an enterprise license as a private business document', async () => {
    const { service, enterpriseRepository, storedFileAccess } = makeService();

    const saved = await service.upsertB2bProfile(USER_ID, UserRole.ENTERPRISE, {
      companyName: 'AgriLink Enterprise',
      businessLicenseFileId: FRONT_FILE_ID,
    });

    expect(storedFileAccess.attachOwnedFile).toHaveBeenCalledWith({
      fileId: FRONT_FILE_ID,
      ownerId: USER_ID,
      assetType: 'BUSINESS_LICENSE',
      resourceType: 'ENTERPRISE_PROFILE',
      resourceId: saved.id,
    });
    expect(saved).toMatchObject({
      businessLicenseFileId: FRONT_FILE_ID,
      businessLicenseUrl: null,
    });
    expect(enterpriseRepository.save).toHaveBeenCalledTimes(1);
  });

  it('detaches newly attached files when profile persistence fails', async () => {
    const { service, farmerRepository, storedFileAccess } = makeService();
    farmerRepository.save.mockRejectedValue(new Error('database unavailable'));

    await expect(
      service.upsertFarmerProfile(USER_ID, {
        cccdNumber: '012345678901',
        cccdFrontFileId: FRONT_FILE_ID,
        cccdBackFileId: BACK_FILE_ID,
        residenceAddress: 'Can Tho',
      }),
    ).rejects.toThrow('database unavailable');

    expect(storedFileAccess.detachOwnedFile).toHaveBeenCalledTimes(2);
    expect(storedFileAccess.detachOwnedFile).toHaveBeenCalledWith(
      expect.objectContaining({
        fileId: FRONT_FILE_ID,
        ownerId: USER_ID,
        resourceType: 'FARMER_PROFILE',
      }),
    );
  });

  it('detaches earlier files when a later attachment fails', async () => {
    const { service, farmerRepository, storedFileAccess } = makeService();
    storedFileAccess.attachOwnedFile
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(
        new StoredFileNotFoundError('Stored file not found'),
      );

    await expect(
      service.upsertFarmerProfile(USER_ID, {
        cccdNumber: '012345678901',
        cccdFrontFileId: FRONT_FILE_ID,
        cccdBackFileId: BACK_FILE_ID,
        residenceAddress: 'Can Tho',
      }),
    ).rejects.toThrow('Không thể gắn tài liệu riêng tư');

    expect(storedFileAccess.detachOwnedFile).toHaveBeenCalledTimes(1);
    expect(storedFileAccess.detachOwnedFile).toHaveBeenCalledWith(
      expect.objectContaining({ fileId: FRONT_FILE_ID }),
    );
    expect(farmerRepository.save).not.toHaveBeenCalled();
  });

  it('retires the previous private file after a successful replacement', async () => {
    const { service, enterpriseRepository, storedFileAccess } = makeService();
    const previousFileId = '55555555-5555-4555-8555-555555555555';
    enterpriseRepository.findOne.mockResolvedValue({
      id: PROFILE_ID,
      user: { id: USER_ID },
      businessLicenseFileId: previousFileId,
    });

    await service.upsertB2bProfile(USER_ID, UserRole.ENTERPRISE, {
      companyName: 'AgriLink Enterprise',
      businessLicenseFileId: FRONT_FILE_ID,
    });

    expect(storedFileAccess.retireOwnedFile).toHaveBeenCalledWith({
      fileId: previousFileId,
      ownerId: USER_ID,
      correlationId: expect.any(String),
    });
    expect(storedFileAccess.retireOwnedFile.mock.invocationCallOrder[0]).toBeGreaterThan(
      enterpriseRepository.save.mock.invocationCallOrder[0],
    );
  });

  it('rethrows infrastructure failures instead of reporting invalid input', async () => {
    const { service, farmerRepository, storedFileAccess } = makeService();
    storedFileAccess.readOwnedFile.mockRejectedValue(
      new Error('provider timeout'),
    );

    await expect(
      service.upsertFarmerProfile(USER_ID, {
        cccdNumber: '012345678901',
        cccdFrontFileId: FRONT_FILE_ID,
        cccdBackFileId: BACK_FILE_ID,
        residenceAddress: 'Can Tho',
      }),
    ).rejects.toThrow('provider timeout');
    expect(farmerRepository.save).not.toHaveBeenCalled();
  });
});
