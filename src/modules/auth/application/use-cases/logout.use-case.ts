import { Injectable, Inject } from '@nestjs/common';
import { TOKEN_GENERATOR_PORT, ITokenGeneratorPort } from '../ports/outbound/token-generator.port';

@Injectable()
export class LogoutUseCase {
  constructor(
    @Inject(TOKEN_GENERATOR_PORT) private readonly tokenGenerator: ITokenGeneratorPort,
  ) {}

  async execute(userId: string): Promise<void> {
    await this.tokenGenerator.revokeAllUserTokens(userId);
  }
}
