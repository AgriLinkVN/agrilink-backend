import type { JwtPayload } from '@modules/auth/presentation/strategies/jwt.strategy';
import type { RefreshToken } from '@database/entities/refresh-token.entity';

export const TOKEN_GENERATOR_PORT = Symbol('TOKEN_GENERATOR_PORT');

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface ITokenGeneratorPort {
  generateTokens(userId: string): Promise<TokenPair>;
  verifyRefreshToken(token: string): Promise<JwtPayload>;
  findRefreshToken(tokenHash: string, userId: string): Promise<RefreshToken | null>;
  revokeRefreshToken(tokenId: string): Promise<void>;
  revokeAllUserTokens(userId: string): Promise<void>;
}
