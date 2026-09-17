import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, MoreThan, Repository } from "typeorm";
import * as crypto from "crypto";
import { ITokenGeneratorPort, TokenPair } from "../../application/ports/outbound/token-generator.port";
import { JwtPayload } from "../../application/ports/outbound/jwt-payload.type";
import {
  USER_IDENTITY_READER,
  UserIdentityReader,
} from '../../../users/application/ports/user-identity-reader.port';
import { UserRole } from '../../../../common/enums';
import { AuthSessionRevocationPort } from '../../application/ports/inbound/auth-session-revocation.port';
import { RefreshToken } from '../persistence/entities/refresh-token.entity';
import { canAuthenticate } from '../../domain/services/account-access.policy';

@Injectable()
export class JwtTokenGeneratorAdapter
  implements ITokenGeneratorPort, AuthSessionRevocationPort
{
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
    @Inject(USER_IDENTITY_READER)
    private readonly userIdentityReader: UserIdentityReader,
  ) {}

  async generateTokens(userId: string): Promise<TokenPair> {
    const user = await this.userIdentityReader.findById(userId);
    if (!user || !canAuthenticate(user.status)) {
      throw new UnauthorizedException("Account is not active");
    }

    return this.issueAndPersistTokenPair(user, this.refreshTokenRepo);
  }

  async verifyRefreshToken(token: string): Promise<JwtPayload> {
    const secret = this.configService.get<string>(
      "JWT_REFRESH_SECRET",
      "fallback_refresh_secret_change_me",
    );
    return this.jwtService.verify(token, { secret });
  }

  async rotateRefreshToken(
    tokenHash: string,
    userId: string,
  ): Promise<TokenPair | null> {
    const user = await this.userIdentityReader.findById(userId);
    if (!user || !canAuthenticate(user.status)) return null;

    const now = new Date();
    return this.refreshTokenRepo.manager.transaction(async (manager) => {
      const repository = manager.getRepository(RefreshToken);
      const stored = await repository.findOneBy({ tokenHash, userId });
      if (!stored) return null;

      const revoked = await repository.update(
        {
          id: stored.id,
          userId,
          revokedAt: IsNull(),
          expiresAt: MoreThan(now),
        },
        { revokedAt: now },
      );
      if (revoked.affected !== 1) return null;

      return this.issueAndPersistTokenPair(user, repository);
    });
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.refreshTokenRepo.update(
      { userId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.revokeAllUserTokens(userId);
  }

  async purgeRetiredTokens(cutoff: Date, now: Date): Promise<number> {
    const result = await this.refreshTokenRepo
      .createQueryBuilder()
      .delete()
      .where("created_at < :cutoff", { cutoff })
      .andWhere("(revoked_at IS NOT NULL OR expires_at < :now)", { now })
      .execute();
    return result.affected ?? 0;
  }

  async hashToken(token: string): Promise<string> {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  private async issueAndPersistTokenPair(
    user: {
      id: string;
      phone: string | null;
      role: UserRole;
    },
    repository: Repository<RefreshToken>,
  ): Promise<TokenPair> {
    const payload = { sub: user.id, phone: user.phone, role: user.role };
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
    const decoded = this.jwtService.decode(refreshToken) as {
      exp?: number;
    } | null;
    const expiresAt = decoded?.exp
      ? new Date(decoded.exp * 1000)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await repository.save({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    return { accessToken, refreshToken };
  }
}
