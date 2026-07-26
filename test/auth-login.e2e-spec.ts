jest.mock('../src/common/guards/firebase-auth.guard', () => ({
  FirebaseAuthGuard: class FirebaseAuthGuard {},
}));

import {
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Server } from 'http';
import * as request from 'supertest';

import { UserRole, UserStatus } from '../src/common/enums';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import {
  PASSWORD_HASHER_PORT,
  IPasswordHasherPort,
} from '../src/modules/auth/application/ports/outbound/password-hasher.port';
import {
  ITokenGeneratorPort,
  TOKEN_GENERATOR_PORT,
} from '../src/modules/auth/application/ports/outbound/token-generator.port';
import {
  IUserManagerPort,
  USER_MANAGER_PORT,
} from '../src/modules/auth/application/ports/outbound/user-manager.port';
import { LoginOtpUseCase } from '../src/modules/auth/application/use-cases/login-otp.use-case';
import { LoginUseCase } from '../src/modules/auth/application/use-cases/login.use-case';
import { LogoutUseCase } from '../src/modules/auth/application/use-cases/logout.use-case';
import { RefreshTokenUseCase } from '../src/modules/auth/application/use-cases/refresh-token.use-case';
import { RegisterUseCase } from '../src/modules/auth/application/use-cases/register.use-case';
import { SendOtpUseCase } from '../src/modules/auth/application/use-cases/send-otp.use-case';
import { SyncFirebaseUserUseCase } from '../src/modules/auth/application/use-cases/sync-firebase-user.use-case';
import { VerifyOtpUseCase } from '../src/modules/auth/application/use-cases/verify-otp.use-case';
import { AuthController } from '../src/modules/auth/presentation/controllers/auth.controller';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const CANONICAL_PHONE = '+84901234567';
const PASSWORD = 'Str0ngP@ss!';
const PASSWORD_HASH = 'stored-password-hash';
const INVALID_CREDENTIALS =
  'Email, số điện thoại hoặc mật khẩu không chính xác';

describe('Auth login REST contract (e2e)', () => {
  let app: INestApplication;
  let server: Server;

  const user = {
    id: USER_ID,
    phone: CANONICAL_PHONE,
    firebaseUid: null,
    email: 'user@example.com',
    passwordHash: PASSWORD_HASH,
    role: UserRole.FARMER,
    status: UserStatus.ACTIVE,
    avatarUrl: null,
    fullName: 'Auth Test User',
    isPhoneVerified: true,
    isEmailVerified: true,
    lastLoginAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };
  const userManager: jest.Mocked<IUserManagerPort> = {
    findByEmail: jest.fn(),
    findByPhone: jest.fn(),
    findByFirebaseUid: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    updateInternal: jest.fn(),
  };
  const passwordHasher: jest.Mocked<IPasswordHasherPort> = {
    hash: jest.fn(),
    compare: jest.fn(),
  };
  const tokenGenerator: jest.Mocked<ITokenGeneratorPort> = {
    generateTokens: jest.fn(),
    verifyRefreshToken: jest.fn(),
    rotateRefreshToken: jest.fn(),
    revokeAllUserTokens: jest.fn(),
    purgeRetiredTokens: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        LoginUseCase,
        { provide: USER_MANAGER_PORT, useValue: userManager },
        { provide: PASSWORD_HASHER_PORT, useValue: passwordHasher },
        { provide: TOKEN_GENERATOR_PORT, useValue: tokenGenerator },
        { provide: RegisterUseCase, useValue: {} },
        { provide: LoginOtpUseCase, useValue: {} },
        { provide: SyncFirebaseUserUseCase, useValue: {} },
        { provide: RefreshTokenUseCase, useValue: {} },
        { provide: LogoutUseCase, useValue: {} },
        { provide: SendOtpUseCase, useValue: {} },
        { provide: VerifyOtpUseCase, useValue: {} },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();
    server = app.getHttpServer() as Server;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    userManager.findByEmail.mockImplementation(async (email) =>
      email === user.email ? user : null,
    );
    userManager.findByPhone.mockImplementation(async (phone) =>
      phone === user.phone ? user : null,
    );
    userManager.updateInternal.mockResolvedValue(undefined);
    passwordHasher.compare.mockImplementation(
      async (password, hash) =>
        password === PASSWORD && hash === PASSWORD_HASH,
    );
    tokenGenerator.generateTokens.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('keeps the email login response contract', async () => {
    const response = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: PASSWORD })
      .expect(200);

    expect(response.body.data).toEqual({ accessToken: 'access-token' });
    expect(response.headers['set-cookie']).toEqual(
      expect.arrayContaining([
        expect.stringContaining('refreshToken=refresh-token'),
      ]),
    );
    expect(userManager.findByEmail).toHaveBeenCalledTimes(1);
    expect(userManager.findByPhone).not.toHaveBeenCalled();
  });

  it('logs in by phone after canonical normalization', async () => {
    const response = await request(server)
      .post('/api/v1/auth/login')
      .send({ phone: '0901-234-567', password: PASSWORD })
      .expect(200);

    expect(response.body.data).toEqual({ accessToken: 'access-token' });
    expect(userManager.findByPhone).toHaveBeenCalledTimes(1);
    expect(userManager.findByPhone).toHaveBeenCalledWith(CANONICAL_PHONE);
    expect(userManager.findByEmail).not.toHaveBeenCalled();
  });

  it.each([
    {
      name: 'an unknown identifier',
      payload: { phone: '+84999999999', password: PASSWORD },
    },
    {
      name: 'a wrong password',
      payload: { email: 'user@example.com', password: 'wrong-password' },
    },
  ])('returns 401 instead of 500 for $name', async ({ payload }) => {
    const response = await request(server)
      .post('/api/v1/auth/login')
      .send(payload)
      .expect(401);

    expect(response.body).toMatchObject({
      statusCode: 401,
      message: INVALID_CREDENTIALS,
      error: 'UnauthorizedException',
    });
  });

  it.each([
    {
      name: 'neither identifier',
      payload: { password: PASSWORD },
    },
    {
      name: 'both identifiers',
      payload: {
        email: 'user@example.com',
        phone: CANONICAL_PHONE,
        password: PASSWORD,
      },
    },
    {
      name: 'an invalid phone',
      payload: { phone: '0123', password: PASSWORD },
    },
  ])('returns 400 for $name', async ({ payload }) => {
    await request(server)
      .post('/api/v1/auth/login')
      .send(payload)
      .expect(400);
  });

  it('publishes optional identifiers and an exact-one OpenAPI contract', () => {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('Auth contract').setVersion('1').build(),
    );
    const loginSchema = document.components?.schemas?.LoginDto;
    const requestBody = document.paths['/api/v1/auth/login']?.post
      ?.requestBody as {
      content: {
        'application/json': {
          schema: {
            allOf: Array<{
              $ref?: string;
              oneOf?: Array<{ required: string[] }>;
            }>;
          };
        };
      };
    };

    expect(loginSchema).toMatchObject({
      type: 'object',
      properties: {
        email: expect.any(Object),
        phone: expect.any(Object),
        password: expect.any(Object),
      },
      required: ['password'],
    });
    expect(requestBody.content['application/json'].schema.allOf).toEqual([
      { $ref: '#/components/schemas/LoginDto' },
      {
        oneOf: [{ required: ['email'] }, { required: ['phone'] }],
      },
    ]);
  });
});
