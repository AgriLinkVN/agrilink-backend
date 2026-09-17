import { Injectable, Inject } from '@nestjs/common';
import { USER_MANAGER_PORT, IUserManagerPort } from '../ports/outbound/user-manager.port';
import { PASSWORD_HASHER_PORT, IPasswordHasherPort } from '../ports/outbound/password-hasher.port';
import { TOKEN_GENERATOR_PORT, ITokenGeneratorPort, TokenPair } from '../ports/outbound/token-generator.port';
import {
  InvalidCredentialsError,
  InvalidLoginIdentifierError,
} from '../../domain/errors/auth.errors';
import {
  InvalidVietnamesePhoneNumberError,
  normalizeVietnamesePhone,
} from '../../domain/services/phone-normalizer';
import { LoginDto } from '../../presentation/dto/login.dto';
import { canAuthenticate } from '../../domain/services/account-access.policy';

const INVALID_CREDENTIALS_MESSAGE =
  'Email, số điện thoại hoặc mật khẩu không chính xác';

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USER_MANAGER_PORT) private readonly userManager: IUserManagerPort,
    @Inject(PASSWORD_HASHER_PORT) private readonly passwordHasher: IPasswordHasherPort,
    @Inject(TOKEN_GENERATOR_PORT) private readonly tokenGenerator: ITokenGeneratorPort,
  ) {}

  async execute(dto: LoginDto): Promise<TokenPair> {
    const hasEmail = dto.email !== undefined;
    const hasPhone = dto.phone !== undefined;
    if (hasEmail === hasPhone) {
      throw new InvalidLoginIdentifierError();
    }

    const user =
      dto.email !== undefined
        ? await this.userManager.findByEmail(dto.email)
        : await this.findUserByPhone(dto.phone);

    if (!user || !canAuthenticate(user.status)) {
      throw new InvalidCredentialsError(INVALID_CREDENTIALS_MESSAGE);
    }

    const isMatch = await this.passwordHasher.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new InvalidCredentialsError(INVALID_CREDENTIALS_MESSAGE);
    }

    await this.userManager.updateInternal(user.id, {
      lastLoginAt: new Date(),
    });

    return this.tokenGenerator.generateTokens(user.id);
  }

  private async findUserByPhone(
    phone?: string,
  ): ReturnType<IUserManagerPort['findByPhone']> {
    if (phone === undefined) {
      throw new InvalidLoginIdentifierError();
    }

    try {
      return await this.userManager.findByPhone(
        normalizeVietnamesePhone(phone),
      );
    } catch (error) {
      if (error instanceof InvalidVietnamesePhoneNumberError) {
        throw new InvalidLoginIdentifierError(error.message);
      }
      throw error;
    }
  }
}
