import { Injectable, Inject } from '@nestjs/common';
import { USER_MANAGER_PORT, IUserManagerPort } from '../ports/outbound/user-manager.port';
import { PASSWORD_HASHER_PORT, IPasswordHasherPort } from '../ports/outbound/password-hasher.port';
import { TOKEN_GENERATOR_PORT, ITokenGeneratorPort, TokenPair } from '../ports/outbound/token-generator.port';
import { FirebaseSyncDto } from '../../presentation/dto/firebase-sync.dto';
import { InvalidTokenError } from '../../domain/errors/auth.errors';
import { UserRole, UserStatus } from '../../../../common/enums';
import * as crypto from 'crypto';

@Injectable()
export class SyncFirebaseUserUseCase {
  constructor(
    @Inject(USER_MANAGER_PORT) private readonly userManager: IUserManagerPort,
    @Inject(PASSWORD_HASHER_PORT) private readonly passwordHasher: IPasswordHasherPort,
    @Inject(TOKEN_GENERATOR_PORT) private readonly tokenGenerator: ITokenGeneratorPort,
  ) {}

  async execute(firebaseUser: any, dto: FirebaseSyncDto = {}): Promise<TokenPair> {
    const firebaseUid = firebaseUser.uid;
    const email = firebaseUser.email ?? dto.email;

    if (!firebaseUid) {
      throw new InvalidTokenError("Firebase token does not contain uid");
    }

    if (!email) {
      throw new InvalidTokenError("Firebase token does not contain a verified email");
    }

    const phone = firebaseUser.phone_number ?? null;
    const fullName = dto.fullName ?? firebaseUser.name ?? null;

    let user =
      (await this.userManager.findByFirebaseUid(firebaseUid)) ??
      (await this.userManager.findByEmail(email));

    if (!user) {
      const randomPassword = crypto.randomBytes(32).toString("hex");
      const passwordHash = await this.passwordHasher.hash(randomPassword);

      user = await this.userManager.create({
        firebaseUid,
        phone,
        email,
        passwordHash,
        role: this.toMobileRole(dto.role) ?? UserRole.BUYER,
        status: UserStatus.ACTIVE,
        fullName,
        isEmailVerified: true,
        lastLoginAt: new Date(),
      });
    } else {
      await this.userManager.updateInternal(user.id, {
        firebaseUid,
        isEmailVerified: true,
        lastLoginAt: new Date(),
        email: user.email ?? email,
        fullName: user.fullName ?? fullName,
      });
    }

    return this.tokenGenerator.generateTokens(user.id);
  }

  private toMobileRole(role?: UserRole): UserRole | null {
    if (role === UserRole.FARMER || role === UserRole.SUPPLIER || role === UserRole.BUYER) {
      return role;
    }
    return null;
  }
}
