import type { JwtPayload } from './jwt-payload.type';

export const TOKEN_GENERATOR_PORT = Symbol('TOKEN_GENERATOR_PORT');

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface ITokenGeneratorPort {
  generateTokens(userId: string): Promise<TokenPair>;
  verifyRefreshToken(token: string): Promise<JwtPayload>;
  rotateRefreshToken(
    tokenHash: string,
    userId: string,
  ): Promise<TokenPair | null>;
  revokeAllUserTokens(userId: string): Promise<void>;
  purgeRetiredTokens(cutoff: Date, now: Date): Promise<number>;
}
