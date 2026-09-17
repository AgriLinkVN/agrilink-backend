import type { Response } from 'express';
import {
  clearRefreshTokenCookie,
  getRefreshTokenClearOptions,
  getRefreshTokenCookieOptions,
  REFRESH_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_COOKIE_PATH,
  setRefreshTokenCookie,
} from './refresh-token-cookie.policy';

describe('refresh-token cookie policy', () => {
  it('uses SameSite=None and Secure in production', () => {
    expect(getRefreshTokenCookieOptions('production')).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: REFRESH_TOKEN_COOKIE_PATH,
    });
  });

  it('uses SameSite=Lax without Secure in development', () => {
    expect(getRefreshTokenCookieOptions('development')).toMatchObject({
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: REFRESH_TOKEN_COOKIE_PATH,
    });
  });

  it.each(['production', 'development', 'test'])(
    'always keeps refresh cookies HttpOnly in %s',
    (nodeEnv) => {
      expect(getRefreshTokenCookieOptions(nodeEnv).httpOnly).toBe(true);
    },
  );

  it('clears the cookie with identity and security options matching set', () => {
    const setOptions = getRefreshTokenCookieOptions('production');
    const clearOptions = getRefreshTokenClearOptions('production');
    const { maxAge: _maxAge, ...setCompatibilityOptions } = setOptions;

    expect(clearOptions).toEqual(setCompatibilityOptions);
    expect(clearOptions).not.toHaveProperty('domain');
  });

  it('uses the shared policy when setting and clearing the response cookie', () => {
    const response = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    } as unknown as Response;

    setRefreshTokenCookie(response, 'sensitive-refresh-token');
    clearRefreshTokenCookie(response);

    expect(response.cookie).toHaveBeenCalledWith(
      REFRESH_TOKEN_COOKIE_NAME,
      'sensitive-refresh-token',
      expect.objectContaining({ httpOnly: true }),
    );
    expect(response.clearCookie).toHaveBeenCalledWith(
      REFRESH_TOKEN_COOKIE_NAME,
      expect.objectContaining({
        httpOnly: true,
        path: REFRESH_TOKEN_COOKIE_PATH,
      }),
    );
  });
});
