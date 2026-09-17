import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import type { Request } from 'express';
import { TrustedOriginGuard } from './trusted-origin.guard';

function createContext(origin: string | undefined): ExecutionContext {
  const request = {
    get: (header: string) =>
      header.toLowerCase() === 'origin' ? origin : undefined,
  } as Request;

  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

describe('TrustedOriginGuard', () => {
  const originalCorsOrigins = process.env.CORS_ORIGINS;
  const guard = new TrustedOriginGuard();

  beforeEach(() => {
    process.env.CORS_ORIGINS =
      'https://frontend.example.com,http://localhost:3000';
  });

  afterAll(() => {
    if (originalCorsOrigins === undefined) {
      delete process.env.CORS_ORIGINS;
    } else {
      process.env.CORS_ORIGINS = originalCorsOrigins;
    }
  });

  it('allows an explicitly configured browser origin', () => {
    expect(
      guard.canActivate(createContext('https://frontend.example.com')),
    ).toBe(true);
  });

  it('rejects an unknown browser origin', () => {
    expect(() =>
      guard.canActivate(createContext('https://attacker.example.com')),
    ).toThrow(ForbiddenException);
  });

  it('allows non-browser clients that do not send Origin', () => {
    expect(guard.canActivate(createContext(undefined))).toBe(true);
  });
});
