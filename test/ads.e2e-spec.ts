import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { NextFunction, Request, Response } from 'express';
import { Server } from 'http';
import * as request from 'supertest';

import { AdStatus, AdType, UserRole } from '../src/common/enums';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import {
  ApproveAdCampaignUseCase,
  CreateAdCampaignUseCase,
  GetAdCampaignForModerationUseCase,
  GetSupplierAdCampaignUseCase,
  ListActiveAdBannersUseCase,
  ListAdCampaignsForModerationUseCase,
  ListAdPackagesUseCase,
  ListSupplierAdCampaignsUseCase,
  PauseAdCampaignUseCase,
  RejectAdCampaignUseCase,
  ResumeAdCampaignUseCase,
  TrackAdEventUseCase,
} from '../src/modules/ads/application/use-cases/ads.use-cases';
import { AdCampaignNotFoundError } from '../src/modules/ads/application/errors/ads-application.error';
import { AdsController } from '../src/modules/ads/presentation/controllers/ads.controller';

const CAMPAIGN_ID = '11111111-1111-4111-8111-111111111111';
const SUPPLIER_ID = '22222222-2222-4222-8222-222222222222';
const ADMIN_ID = '33333333-3333-4333-8333-333333333333';

describe('Ads REST contract (e2e)', () => {
  let app: INestApplication;
  let server: Server;

  const listPackages = { execute: jest.fn() };
  const createCampaign = { execute: jest.fn() };
  const listCampaigns = { execute: jest.fn() };
  const getCampaign = { execute: jest.fn() };
  const pauseCampaign = { execute: jest.fn() };
  const resumeCampaign = { execute: jest.fn() };
  const listBanners = { execute: jest.fn() };
  const trackEvent = { execute: jest.fn() };
  const listModerationCampaigns = { execute: jest.fn() };
  const getModerationCampaign = { execute: jest.fn() };
  const approveCampaign = { execute: jest.fn() };
  const rejectCampaign = { execute: jest.fn() };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AdsController],
      providers: [
        { provide: ListAdPackagesUseCase, useValue: listPackages },
        { provide: CreateAdCampaignUseCase, useValue: createCampaign },
        { provide: ListSupplierAdCampaignsUseCase, useValue: listCampaigns },
        { provide: GetSupplierAdCampaignUseCase, useValue: getCampaign },
        { provide: PauseAdCampaignUseCase, useValue: pauseCampaign },
        { provide: ResumeAdCampaignUseCase, useValue: resumeCampaign },
        { provide: ListActiveAdBannersUseCase, useValue: listBanners },
        { provide: TrackAdEventUseCase, useValue: trackEvent },
        {
          provide: ListAdCampaignsForModerationUseCase,
          useValue: listModerationCampaigns,
        },
        {
          provide: GetAdCampaignForModerationUseCase,
          useValue: getModerationCampaign,
        },
        { provide: ApproveAdCampaignUseCase, useValue: approveCampaign },
        { provide: RejectAdCampaignUseCase, useValue: rejectCampaign },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(testUserMiddleware);
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();
    server = app.getHttpServer() as Server;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    listPackages.execute.mockResolvedValue([makePackage()]);
    createCampaign.execute.mockResolvedValue(makeCampaign());
    listCampaigns.execute.mockResolvedValue({
      data: [makeCampaign()],
      total: 1,
      page: 1,
      limit: 20,
    });
    getCampaign.execute.mockResolvedValue(makeCampaign());
    pauseCampaign.execute.mockResolvedValue(makeCampaign({ status: AdStatus.PAUSED }));
    resumeCampaign.execute.mockResolvedValue(makeCampaign({ status: AdStatus.ACTIVE }));
    listBanners.execute.mockResolvedValue([makeCampaign({ status: AdStatus.ACTIVE })]);
    trackEvent.execute.mockResolvedValue(undefined);
    listModerationCampaigns.execute.mockResolvedValue({
      data: [makeCampaign()],
      total: 1,
      page: 1,
      limit: 20,
    });
    getModerationCampaign.execute.mockResolvedValue(makeCampaign());
    approveCampaign.execute.mockResolvedValue(makeCampaign({ status: AdStatus.ACTIVE }));
    rejectCampaign.execute.mockResolvedValue(
      makeCampaign({
        status: AdStatus.REJECTED,
        rejectionReason: 'Thiếu thông tin pháp lý.',
      }),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /ads/packages exposes active package contract', async () => {
    const response = await request(server).get('/ads/packages').expect(200);

    expect(response.body.data[0]).toMatchObject({ id: 1, adType: AdType.BANNER });
    expect(listPackages.execute).toHaveBeenCalledWith();
  });

  it('POST /ads/campaigns forwards the supplier-owned creation payload', async () => {
    const payload = {
      title: 'Mua xoai gia tot',
      packageId: 1,
      imageUrl: 'https://example.test/banner.jpg',
      targetProvinces: [79],
    };

    await request(server)
      .post('/ads/campaigns')
      .set('Authorization', 'Bearer supplier-token')
      .send(payload)
      .expect(201);

    expect(createCampaign.execute).toHaveBeenCalledWith(SUPPLIER_ID, payload);
  });

  it('GET /ads/campaigns forwards supplier pagination', async () => {
    await request(server)
      .get('/ads/campaigns?page=2&limit=10')
      .set('Authorization', 'Bearer supplier-token')
      .expect(200);

    expect(listCampaigns.execute).toHaveBeenCalledWith(SUPPLIER_ID, {
      page: 2,
      limit: 10,
    });
  });

  it('GET /ads/banners forwards an optional province filter', async () => {
    await request(server).get('/ads/banners?province_id=79').expect(200);

    expect(listBanners.execute).toHaveBeenCalledWith(79);
  });

  it('POST /ads/events accepts anonymous impression tracking', async () => {
    await request(server)
      .post('/ads/events')
      .send({ campaignId: CAMPAIGN_ID, eventType: 'impression' })
      .expect(204);

    expect(trackEvent.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        campaignId: CAMPAIGN_ID,
        eventType: 'impression',
        userId: null,
      }),
    );
  });

  it('maps a missing supplier campaign to HTTP 404', async () => {
    getCampaign.execute.mockRejectedValueOnce(new AdCampaignNotFoundError());

    await request(server)
      .get(`/ads/campaigns/${CAMPAIGN_ID}`)
      .set('Authorization', 'Bearer supplier-token')
      .expect(404);
  });

  it('GET /ads/admin/campaigns forwards moderation status and pagination', async () => {
    await request(server)
      .get('/ads/admin/campaigns?status=pending_approval&page=2&limit=10')
      .set('Authorization', 'Bearer admin-token')
      .set('x-user-role', UserRole.ADMIN)
      .expect(200);

    expect(listModerationCampaigns.execute).toHaveBeenCalledWith({
      status: AdStatus.PENDING_APPROVAL,
      page: 2,
      limit: 10,
    });
  });

  it('PATCH /ads/admin/campaigns/:id/approve forwards the admin identity', async () => {
    await request(server)
      .patch(`/ads/admin/campaigns/${CAMPAIGN_ID}/approve`)
      .set('Authorization', 'Bearer admin-token')
      .set('x-user-role', UserRole.ADMIN)
      .set('x-user-id', ADMIN_ID)
      .expect(200);

    expect(approveCampaign.execute).toHaveBeenCalledWith(CAMPAIGN_ID, ADMIN_ID);
  });

  it('PATCH /ads/admin/campaigns/:id/reject validates and forwards the reason', async () => {
    await request(server)
      .patch(`/ads/admin/campaigns/${CAMPAIGN_ID}/reject`)
      .set('Authorization', 'Bearer admin-token')
      .set('x-user-role', UserRole.ADMIN)
      .set('x-user-id', ADMIN_ID)
      .send({ reason: 'Thiếu thông tin pháp lý.' })
      .expect(200);

    expect(rejectCampaign.execute).toHaveBeenCalledWith(
      CAMPAIGN_ID,
      ADMIN_ID,
      'Thiếu thông tin pháp lý.',
    );
  });
});

function testUserMiddleware(req: Request, _res: Response, next: NextFunction) {
  if (req.headers.authorization) {
    (req as Request & { user: { sub: string; role: UserRole } }).user = {
      sub: (req.headers['x-user-id'] as string | undefined) ?? SUPPLIER_ID,
      role: (req.headers['x-user-role'] as UserRole | undefined) ?? UserRole.SUPPLIER,
    };
  }
  next();
}

function makePackage() {
  return {
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
  };
}

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
    package: makePackage(),
    ...overrides,
  };
}
