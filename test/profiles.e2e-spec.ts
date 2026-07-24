import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { NextFunction, Request, Response } from 'express';
import { Server } from 'http';
import * as request from 'supertest';
import { UserRole } from '../src/common/enums';
import { ProfilesController } from '../src/modules/profiles/profiles.controller';
import { ProfilesService } from '../src/modules/profiles/profiles.service';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const FRONT_FILE_ID = '22222222-2222-4222-8222-222222222222';
const BACK_FILE_ID = '33333333-3333-4333-8333-333333333333';

describe('Profiles private document contract (e2e)', () => {
  let app: INestApplication;
  let server: Server;
  const profilesService = {
    upsertFarmerProfile: jest.fn(),
    upsertB2bProfile: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ProfilesController],
      providers: [{ provide: ProfilesService, useValue: profilesService }],
    }).compile();
    app = moduleRef.createNestApplication();
    app.use((req: Request, _res: Response, next: NextFunction) => {
      (req as Request & { user: { sub: string; role: UserRole } }).user = {
        sub: USER_ID,
        role: (req.header('x-test-role') as UserRole) ?? UserRole.FARMER,
      };
      next();
    });
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );
    await app.init();
    server = app.getHttpServer() as Server;
  });

  afterAll(() => app?.close());

  beforeEach(() => {
    jest.clearAllMocks();
    profilesService.upsertFarmerProfile.mockResolvedValue({ id: USER_ID });
    profilesService.upsertB2bProfile.mockResolvedValue({ id: USER_ID });
  });

  it('accepts owned file IDs for farmer KYC', async () => {
    await request(server)
      .put('/profiles/farmer')
      .send({
        cccdNumber: '012345678901',
        cccdFrontFileId: FRONT_FILE_ID,
        cccdBackFileId: BACK_FILE_ID,
        residenceAddress: 'Can Tho',
      })
      .expect(200);

    expect(profilesService.upsertFarmerProfile).toHaveBeenCalledWith(
      USER_ID,
      expect.objectContaining({
        cccdFrontFileId: FRONT_FILE_ID,
        cccdBackFileId: BACK_FILE_ID,
      }),
    );
  });

  it('rejects the retired CCCD URL contract', () =>
    request(server)
      .put('/profiles/farmer')
      .send({
        cccdNumber: '012345678901',
        cccdFrontUrl: 'https://res.cloudinary.com/example/front.jpg',
        cccdBackUrl: 'https://res.cloudinary.com/example/back.jpg',
        residenceAddress: 'Can Tho',
      })
      .expect(400));

  it('accepts a private business-license file ID for B2B profiles', async () => {
    await request(server)
      .put('/profiles/b2b')
      .set('x-test-role', UserRole.ENTERPRISE)
      .send({
        companyName: 'AgriLink Enterprise',
        businessLicenseFileId: FRONT_FILE_ID,
      })
      .expect(200);

    expect(profilesService.upsertB2bProfile).toHaveBeenCalledWith(
      USER_ID,
      UserRole.ENTERPRISE,
      expect.objectContaining({ businessLicenseFileId: FRONT_FILE_ID }),
    );
  });
});
