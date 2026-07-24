import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, IsNull } from "typeorm";
import * as crypto from "crypto";
import { RefreshToken } from "../../../../database/entities/refresh-token.entity";
import { ITokenGeneratorPort, TokenPair } from "../../application/ports/outbound/token-generator.port";
import { JwtPayload } from "@modules/auth/presentation/strategies/jwt.strategy";

import { UsersService } from "../../../users/users.service";

@Injectable()
export class JwtTokenGeneratorAdapter implements ITokenGeneratorPort {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
    private readonly usersService: UsersService,
  ) {}

  async generateTokens(userId: string): Promise<TokenPair> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    const payload = { sub: userId, phone: user.phone, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    const refreshSecret = this.configService.get<string>(
      "JWT_REFRESH_SECRET",
      "fallback_refresh_secret_change_me",
    );
    const refreshExpiresIn = this.configService.get<string>(
      "JWT_REFRESH_EXPIRES_IN",
      "7d",
    );

    const refreshToken = this.jwtService.sign(payload, {
      secret: refreshSecret,
      expiresIn: refreshExpiresIn,
    });

    const tokenHash = await this.hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.refreshTokenRepo.save({
      userId,
      tokenHash,
      expiresAt,
    });

    return { accessToken, refreshToken };
  }

  async verifyRefreshToken(token: string): Promise<JwtPayload> {
    const secret = this.configService.get<string>(
      "JWT_REFRESH_SECRET",
      "fallback_refresh_secret_change_me",
    );
    return this.jwtService.verify(token, { secret });
  }

  async findRefreshToken(tokenHash: string, userId: string): Promise<RefreshToken | null> {
    return this.refreshTokenRepo.findOne({
      where: { tokenHash, user: { id: userId } },
    });
  }

  async revokeRefreshToken(tokenId: string): Promise<void> {
    await this.refreshTokenRepo.update(tokenId, {
      revokedAt: new Date(),
    });
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.refreshTokenRepo.update(
      { user: { id: userId }, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  async hashToken(token: string): Promise<string> {
    return crypto.createHash("sha256").update(token).digest("hex");
  }
}
