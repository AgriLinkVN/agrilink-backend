import type { CookieOptions, Response } from 'express';

export const REFRESH_TOKEN_COOKIE_NAME = 'refreshToken';
export const REFRESH_TOKEN_COOKIE_PATH = '/api/v1/auth';

const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function getSharedCookieOptions(nodeEnv: string | undefined): CookieOptions {
  const production = nodeEnv === 'production';
  return {
    httpOnly: true,
    secure: production,
    sameSite: production ? 'none' : 'lax',
    path: REFRESH_TOKEN_COOKIE_PATH,
  };
}

export function getRefreshTokenCookieOptions(
  nodeEnv: string | undefined = process.env.NODE_ENV,
): CookieOptions {
  return {
    ...getSharedCookieOptions(nodeEnv),
    maxAge: REFRESH_TOKEN_MAX_AGE_MS,
  };
}

export function getRefreshTokenClearOptions(
  nodeEnv: string | undefined = process.env.NODE_ENV,
): CookieOptions {
  return getSharedCookieOptions(nodeEnv);
}

export function setRefreshTokenCookie(
  response: Response,
  refreshToken: string,
): void {
  response.cookie(
    REFRESH_TOKEN_COOKIE_NAME,
    refreshToken,
    getRefreshTokenCookieOptions(),
  );
}

export function clearRefreshTokenCookie(response: Response): void {
  response.clearCookie(
    REFRESH_TOKEN_COOKIE_NAME,
    getRefreshTokenClearOptions(),
  );
}
