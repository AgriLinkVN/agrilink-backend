import { AdStatus, AdType } from '@common/enums';
import {
  AdCampaignForbiddenError,
  AdPackageNotFoundError,
} from '../errors/ads-application.error';
import { AdsRepositoryPort } from '../ports/outbound/ads-repository.port';
import {
  CreateAdCampaignUseCase,
  PauseAdCampaignUseCase,
  ResumeAdCampaignUseCase,
  TrackAdEventUseCase,
} from './ads.use-cases';
import { InvalidAdCampaignStateError } from '../../domain/errors/invalid-ad-campaign-state.error';

const CAMPAIGN_ID = '11111111-1111-4111-8111-111111111111';
const SUPPLIER_ID = '22222222-2222-4222-8222-222222222222';
const OTHER_SUPPLIER_ID = '33333333-3333-4333-8333-333333333333';

function makeCampaign(overrides = {}) {
  return {
    id: CAMPAIGN_ID,
    supplierId: SUPPLIER_ID,
    packageId: 1,
    title: 'Mua xoai gia tot',
    imageUrl: 'https://example.test/banner.jpg',
    linkUrl: null,
    targetProvinces: [],
    status: AdStatus.PENDING_APPROVAL,
    rejectionReason: null,
    startDate: null,
    endDate: null,
    totalImpressions: 0,
    totalClicks: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createRepository(): jest.Mocked<AdsRepositoryPort> {
  return {
    findActivePackages: jest.fn(),
    findActivePackageById: jest.fn(),
    createCampaign: jest.fn(),
    findCampaignsBySupplier: jest.fn(),
    findCampaignById: jest.fn(),
    updateCampaignStatus: jest.fn(),
    findActiveBanners: jest.fn(),
    recordEvent: jest.fn(),
  };
}

describe('Ads use cases', () => {
  it('only creates campaigns with an active package', async () => {
    const repository = createRepository();
    repository.findActivePackageById.mockResolvedValue(null);
    const useCase = new CreateAdCampaignUseCase(repository);

    await expect(
      useCase.execute(SUPPLIER_ID, {
        title: 'Mua xoai gia tot',
        packageId: 1,
        imageUrl: 'https://example.test/banner.jpg',
      }),
    ).rejects.toThrow(AdPackageNotFoundError);
    expect(repository.createCampaign).not.toHaveBeenCalled();
  });

  it('creates a pending campaign after validating its package', async () => {
    const repository = createRepository();
    repository.findActivePackageById.mockResolvedValue({
      id: 1,
      name: 'Banner',
      adType: AdType.BANNER,
      price: 100000,
      durationDays: 7,
      maxImpressions: null,
      description: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    repository.createCampaign.mockResolvedValue(makeCampaign());
    const useCase = new CreateAdCampaignUseCase(repository);

    await expect(
      useCase.execute(SUPPLIER_ID, {
        title: 'Mua xoai gia tot',
        packageId: 1,
        imageUrl: 'https://example.test/banner.jpg',
      }),
    ).resolves.toMatchObject({ status: AdStatus.PENDING_APPROVAL });
  });

  it('blocks a supplier from pausing another supplier campaign', async () => {
    const repository = createRepository();
    repository.findCampaignById.mockResolvedValue(
      makeCampaign({ status: AdStatus.ACTIVE }),
    );
    const useCase = new PauseAdCampaignUseCase(repository);

    await expect(useCase.execute(CAMPAIGN_ID, OTHER_SUPPLIER_ID)).rejects.toThrow(
      AdCampaignForbiddenError,
    );
    expect(repository.updateCampaignStatus).not.toHaveBeenCalled();
  });

  it('only pauses active campaigns', async () => {
    const repository = createRepository();
    repository.findCampaignById.mockResolvedValue(makeCampaign());
    const useCase = new PauseAdCampaignUseCase(repository);

    await expect(useCase.execute(CAMPAIGN_ID, SUPPLIER_ID)).rejects.toThrow(
      InvalidAdCampaignStateError,
    );
  });

  it('resumes a supplier-owned paused campaign', async () => {
    const repository = createRepository();
    repository.findCampaignById.mockResolvedValue(
      makeCampaign({ status: AdStatus.PAUSED }),
    );
    repository.updateCampaignStatus.mockResolvedValue(
      makeCampaign({ status: AdStatus.ACTIVE }),
    );
    const useCase = new ResumeAdCampaignUseCase(repository);

    await expect(useCase.execute(CAMPAIGN_ID, SUPPLIER_ID)).resolves.toMatchObject({
      status: AdStatus.ACTIVE,
    });
    expect(repository.updateCampaignStatus).toHaveBeenCalledWith(
      CAMPAIGN_ID,
      AdStatus.ACTIVE,
    );
  });

  it('does not record events for a missing or inactive campaign', async () => {
    const repository = createRepository();
    repository.findCampaignById.mockResolvedValue(
      makeCampaign({ status: AdStatus.PAUSED }),
    );
    const useCase = new TrackAdEventUseCase(repository);

    await useCase.execute({ campaignId: CAMPAIGN_ID, eventType: 'impression' });
    expect(repository.recordEvent).not.toHaveBeenCalled();
  });
});
