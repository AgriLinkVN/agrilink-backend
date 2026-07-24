export const TOKEN_GENERATOR_PORT = Symbol('TOKEN_GENERATOR_PORT');

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface ITokenGeneratorPort {
  generateTokens(userId: string): Promise<TokenPair>;
  verifyRefreshToken(token: string): Promise<any>;
  findRefreshToken(tokenHash: string, userId: string): Promise<any>;
  revokeRefreshToken(tokenId: string): Promise<void>;
  revokeAllUserTokens(userId: string): Promise<void>;
}
