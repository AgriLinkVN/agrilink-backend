import { Injectable, Inject } from '@nestjs/common';
import { USER_MANAGER_PORT, IUserManagerPort } from '../ports/outbound/user-manager.port';
import { PASSWORD_HASHER_PORT, IPasswordHasherPort } from '../ports/outbound/password-hasher.port';
import { TOKEN_GENERATOR_PORT, ITokenGeneratorPort, TokenPair } from '../ports/outbound/token-generator.port';
import { InvalidCredentialsError, UserNotFoundError } from '../../domain/errors/auth.errors';
import { LoginDto } from '../../presentation/dto/login.dto';

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USER_MANAGER_PORT) private readonly userManager: IUserManagerPort,
    @Inject(PASSWORD_HASHER_PORT) private readonly passwordHasher: IPasswordHasherPort,
    @Inject(TOKEN_GENERATOR_PORT) private readonly tokenGenerator: ITokenGeneratorPort,
  ) {}

  async execute(dto: LoginDto): Promise<TokenPair> {
    const user = await this.userManager.findByEmail(dto.email);
    if (!user) {
      throw new UserNotFoundError("Email chưa được đăng ký");
    }

    const isMatch = await this.passwordHasher.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new InvalidCredentialsError("Mật khẩu không chính xác");
    }

    await this.userManager.updateInternal(user.id, {
      lastLoginAt: new Date(),
    });

    return this.tokenGenerator.generateTokens(user.id);
  }
}
