import {
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Server } from 'http';
import * as request from 'supertest';
import { Reflector } from '@nestjs/core';
import { StorageController } from '../src/modules/storage/presentation/controllers/storage.controller';
import { StorageService } from '../src/modules/storage/application/storage.service';
import { StorageThrottlerGuard } from '../src/modules/storage/presentation/guards/storage-throttler.guard';
import { UserRole } from '../src/common/enums';
import { RolesGuard } from '../src/common/guards/roles.guard';
import {
  InvalidStoredFileTransitionError,
  StoredFileNotFoundError,
} from '../src/modules/storage/application/storage-file.errors';

const OWNER_ID = '11111111-1111-4111-8111-111111111111';
const FILE_ID = '22222222-2222-4222-8222-222222222222';

describe('Storage REST contract (e2e)', () => {
  let app: INestApplication;
  let server: Server;
  const storage = {
    createUploadIntent: jest.fn(),
    completeUploadIntent: jest.fn(),
    createFileDownloadUrl: jest.fn(),
    deleteStoredFile: jest.fn(),
    reviewStoredFile: jest.fn(),
    uploadCustomFolder: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [StorageController],
      providers: [{ provide: StorageService, useValue: storage }],
    })
      .overrideGuard(StorageThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = moduleRef.createNestApplication();
    app.use((req, _res, next) => {
      const user = req.headers['x-test-user'];
      if (user)
        req.user = {
          sub: user,
          role: req.headers['x-test-role'] ?? UserRole.BUYER,
        };
      next();
    });
    app.useGlobalGuards(
      {
        canActivate: (context: ExecutionContext) => {
          if (!context.switchToHttp().getRequest().user)
            throw new UnauthorizedException();
          return true;
        },
      },
      new RolesGuard(app.get(Reflector)),
    );
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );
    await app.init();
    server = app.getHttpServer() as Server;
  });
  afterAll(() => app?.close());
  beforeEach(() => {
    jest.clearAllMocks();
    storage.createUploadIntent.mockResolvedValue({ fileId: FILE_ID });
    storage.createFileDownloadUrl.mockResolvedValue({
      signedUrl: 'https://example.test/signed',
    });
    storage.reviewStoredFile.mockResolvedValue({
      id: FILE_ID,
      status: 'ACTIVE',
    });
  });

  it('rejects anonymous private intent requests', () =>
    request(server).post('/storage/uploads/intents').send({}).expect(401));
  it('uses the authenticated owner, not client input, for private intents', async () => {
    await request(server)
      .post('/storage/uploads/intents')
      .set('x-test-user', OWNER_ID)
      .set('x-correlation-id', 'request-1')
      .send({
        assetType: 'KYC_IDENTITY',
        originalName: 'identity.pdf',
        declaredMime: 'application/pdf',
        sizeBytes: 32,
        ownerId: 'attacker',
        resourceType: 'FARMER_PROFILE',
        resourceId: 'another-profile',
      })
      .expect(201);
    expect(storage.createUploadIntent).toHaveBeenCalledWith(
      OWNER_ID,
      expect.objectContaining({ assetType: 'KYC_IDENTITY' }),
      'request-1',
    );
    expect(storage.createUploadIntent.mock.calls[0][1]).not.toHaveProperty(
      'ownerId',
    );
    expect(storage.createUploadIntent.mock.calls[0][1]).not.toHaveProperty(
      'resourceType',
    );
    expect(storage.createUploadIntent.mock.calls[0][1]).not.toHaveProperty(
      'resourceId',
    );
  });
  it('does not allow a cross-owner caller to obtain a private download URL', async () => {
    storage.createFileDownloadUrl.mockRejectedValue(
      new StoredFileNotFoundError('Stored file not found'),
    );
    await request(server)
      .get(`/storage/files/${FILE_ID}/download-url`)
      .set('x-test-user', '33333333-3333-4333-8333-333333333333')
      .expect(404);
    expect(storage.createFileDownloadUrl).toHaveBeenCalledWith(
      '33333333-3333-4333-8333-333333333333',
      FILE_ID,
      expect.any(String),
      UserRole.BUYER,
    );
  });
  it('rejects an anonymous private download request', () =>
    request(server)
      .get(`/storage/files/${FILE_ID}/download-url`)
      .expect(401));
  it('maps an unavailable quarantined owner file without exposing a URL', async () => {
    storage.createFileDownloadUrl.mockRejectedValue(
      new InvalidStoredFileTransitionError('File is not available'),
    );
    const response = await request(server)
      .get(`/storage/files/${FILE_ID}/download-url`)
      .set('x-test-user', OWNER_ID)
      .set('x-test-role', UserRole.FARMER)
      .expect(400);

    expect(response.body).not.toHaveProperty('signedUrl');
    expect(storage.createFileDownloadUrl).toHaveBeenCalledWith(
      OWNER_ID,
      FILE_ID,
      expect.any(String),
      UserRole.FARMER,
    );
  });
  it.each([UserRole.STATE_AGENCY, UserRole.ADMIN])(
    'allows %s to request a quarantined file by opaque ID',
    async (reviewerRole) => {
      storage.createFileDownloadUrl.mockResolvedValue({
        signedUrl: 'https://example.test/signed',
        expiresIn: 300,
      });

      const response = await request(server)
        .get(`/storage/files/${FILE_ID}/download-url`)
        .set('x-test-user', OWNER_ID)
        .set('x-test-role', reviewerRole)
        .expect(200);

      expect(response.body).toEqual({
        signedUrl: 'https://example.test/signed',
        expiresIn: 300,
      });
      expect(response.body).not.toHaveProperty('path');
      expect(storage.createFileDownloadUrl).toHaveBeenCalledWith(
        OWNER_ID,
        FILE_ID,
        expect.any(String),
        reviewerRole,
      );
    },
  );
  it('allows authorized reviewers and rejects an ordinary user', async () => {
    await request(server)
      .post(`/storage/files/${FILE_ID}/review`)
      .set('x-test-user', OWNER_ID)
      .set('x-test-role', UserRole.BUYER)
      .send({ approve: true })
      .expect(403);
    await request(server)
      .post(`/storage/files/${FILE_ID}/review`)
      .set('x-test-user', OWNER_ID)
      .set('x-test-role', UserRole.ADMIN)
      .send({ approve: true })
      .expect(201);
    expect(storage.reviewStoredFile).toHaveBeenCalledWith(
      FILE_ID,
      UserRole.ADMIN,
      true,
    );
  });
  it.each([
    ['post', '/storage/files/presign'],
    ['post', '/storage/files/upload'],
    ['get', '/storage/files/download-url?path=legacy.pdf'],
  ] as const)('returns 404 for retired %s %s route', async (method, url) => {
    await request(server)[method](url).set('x-test-user', OWNER_ID).expect(404);
  });
});
