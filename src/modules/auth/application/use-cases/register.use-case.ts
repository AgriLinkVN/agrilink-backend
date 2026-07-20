import { Injectable, Inject } from '@nestjs/common';
import { USER_MANAGER_PORT, IUserManagerPort } from '../ports/outbound/user-manager.port';
import { PASSWORD_HASHER_PORT, IPasswordHasherPort } from '../ports/outbound/password-hasher.port';
import { UserAlreadyExistsError } from '../../domain/errors/auth.errors';
import { RegisterDto } from '../../presentation/dto/register.dto';

@Injectable()
export class RegisterUseCase {
  constructor(
    @Inject(USER_MANAGER_PORT) private readonly userManager: IUserManagerPort,
    @Inject(PASSWORD_HASHER_PORT) private readonly passwordHasher: IPasswordHasherPort,
  ) {}

  async execute(dto: RegisterDto): Promise<any> {
    const existing = await this.userManager.findByEmail(dto.email);
    if (existing) {
      throw new UserAlreadyExistsError("Email already exists");
    }

    const passwordHash = await this.passwordHasher.hash(dto.password);

    const user = await this.userManager.create({
      email: dto.email,
      passwordHash,
      role: dto.role,
      fullName: dto.fullName,
    });

    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }
}
