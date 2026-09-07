import { Injectable, Inject } from '@nestjs/common';
import { TOKEN_GENERATOR_PORT, ITokenGeneratorPort, TokenPair } from '../ports/outbound/token-generator.port';
import { InvalidTokenError } from '../../domain/errors/auth.errors';
import { RefreshTokenDto } from '../../presentation/dto/refresh-token.dto';
import { JwtPayload } from '../ports/outbound/jwt-payload.type';
import * as crypto from 'crypto';

@Injectable()
export class RefreshTokenUseCase {
  constructor(
    @Inject(TOKEN_GENERATOR_PORT) private readonly tokenGenerator: ITokenGeneratorPort,
  ) {}

  async execute(dto: RefreshTokenDto): Promise<TokenPair> {
    let payload: JwtPayload;
    try {
      payload = await this.tokenGenerator.verifyRefreshToken(dto.refreshToken);
    } catch (e) {
      throw new InvalidTokenError("Invalid refresh token");
    }

    const tokenHash = crypto.createHash("sha256").update(dto.refreshToken).digest("hex");
    const tokens = await this.tokenGenerator.rotateRefreshToken(
      tokenHash,
      payload.sub,
    );
    if (!tokens) {
      throw new InvalidTokenError("Refresh token revoked or expired");
    }
    return tokens;
  }
}
