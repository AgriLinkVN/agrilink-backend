import { Injectable, Inject } from '@nestjs/common';
import { USER_MANAGER_PORT, IUserManagerPort } from '../ports/outbound/user-manager.port';
import { TOKEN_GENERATOR_PORT, ITokenGeneratorPort, TokenPair } from '../ports/outbound/token-generator.port';
import { UserNotFoundError } from '../../domain/errors/auth.errors';
import { VerifyOtpDto } from '../../presentation/dto/send-otp.dto';
import { VerifyOtpUseCase } from './verify-otp.use-case';

@Injectable()
export class LoginOtpUseCase {
  constructor(
    private readonly verifyOtpUseCase: VerifyOtpUseCase,
    @Inject(USER_MANAGER_PORT) private readonly userManager: IUserManagerPort,
    @Inject(TOKEN_GENERATOR_PORT) private readonly tokenGenerator: ITokenGeneratorPort,
  ) {}

  async execute(dto: VerifyOtpDto): Promise<TokenPair> {
    await this.verifyOtpUseCase.execute(dto);

    const user = await this.userManager.findByEmail(dto.target);
    if (!user) {
      throw new UserNotFoundError("User not found");
    }

    await this.userManager.updateInternal(user.id, {
      lastLoginAt: new Date(),
    });

    return this.tokenGenerator.generateTokens(user.id);
  }
}
