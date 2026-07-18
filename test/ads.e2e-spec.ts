import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { NextFunction, Request, Response } from 'express';
import { Server } from 'http';
import * as request from 'supertest';

import { AdStatus, AdType, UserRole } from '../src/common/enums';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import {
  CreateAdCampaignUseCase,
  GetSupplierAdCampaignUseCase,
  ListActiveAdBannersUseCase,
  ListAdPackagesUseCase,
  ListSupplierAdCampaignsUseCase,
  PauseAdCampaignUseCase,
  ResumeAdCampaignUseCase,
  TrackAdEventUseCase,
} from '../src/modules/ads/application/use-cases/ads.use-cases';
import { AdCampaignNotFoundError } from '../src/modules/ads/application/errors/ads-application.error';
import { AdsController } from '../src/modules/ads/presentation/controllers/ads.controller';

const CAMPAIGN_ID = '11111111-1111-4111-8111-111111111111';
const SUPPLIER_ID = '22222222-2222-4222-8222-222222222222';

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
});

function testUserMiddleware(req: Request, _res: Response, next: NextFunction) {
  if (req.headers.authorization) {
    (req as Request & { user: { sub: string; role: UserRole } }).user = {
      sub: SUPPLIER_ID,
      role: UserRole.SUPPLIER,
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
