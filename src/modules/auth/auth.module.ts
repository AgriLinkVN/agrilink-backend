import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuthController } from "./presentation/controllers/auth.controller";
import { JwtStrategy } from "./presentation/strategies/jwt.strategy";
import { JwtRefreshStrategy } from "./presentation/strategies/jwt-refresh.strategy";
import { jwtConfig } from "../../config/jwt.config";
import { UsersModule } from "../users/users.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import { HttpModule } from "@nestjs/axios";
import { SmsRoute } from "../../shared/sms/sms.route";
import { FirebaseModule } from "../../shared/firebase/firebase.module";
import { FirebaseAuthGuard } from "../../common/guards/firebase-auth.guard";
import { MailModule } from "../../shared/mail/mail.module";

// Ports
import { USER_MANAGER_PORT } from "./application/ports/outbound/user-manager.port";
import { TOKEN_GENERATOR_PORT } from "./application/ports/outbound/token-generator.port";
import { OTP_SENDER_PORT } from "./application/ports/outbound/otp-sender.port";
import { PASSWORD_HASHER_PORT } from "./application/ports/outbound/password-hasher.port";

// Adapters
import { LegacyUsersModuleAdapter } from "./infrastructure/adapters/legacy-users-module.adapter";
import { JwtTokenGeneratorAdapter } from "./infrastructure/adapters/jwt-token-generator.adapter";
import { NodemailerOtpSenderAdapter } from "./infrastructure/adapters/nodemailer-otp-sender.adapter";
import { BcryptPasswordHasherAdapter } from "./infrastructure/adapters/bcrypt-password-hasher.adapter";

// Use Cases
import { RegisterUseCase } from "./application/use-cases/register.use-case";
import { LoginUseCase } from "./application/use-cases/login.use-case";
import { LoginOtpUseCase } from "./application/use-cases/login-otp.use-case";
import { SyncFirebaseUserUseCase } from "./application/use-cases/sync-firebase-user.use-case";
import { RefreshTokenUseCase } from "./application/use-cases/refresh-token.use-case";
import { LogoutUseCase } from "./application/use-cases/logout.use-case";
import { SendOtpUseCase } from "./application/use-cases/send-otp.use-case";
import { VerifyOtpUseCase } from "./application/use-cases/verify-otp.use-case";
import { RefreshToken } from './infrastructure/persistence/entities/refresh-token.entity';
import { OtpVerification } from './infrastructure/persistence/entities/otp-verification.entity';
import { AUTH_SESSION_REVOCATION } from './application/ports/inbound/auth-session-revocation.port';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: jwtConfig,
    }),
    UsersModule,
    TypeOrmModule.forFeature([RefreshToken, OtpVerification]),
    HttpModule,
    SmsRoute,
    FirebaseModule,
    MailModule,
  ],
  controllers: [AuthController],
  providers: [
    // Strategies
    JwtStrategy,
    JwtRefreshStrategy,
    FirebaseAuthGuard,

    // Adapters
    JwtTokenGeneratorAdapter,
    {
      provide: USER_MANAGER_PORT,
      useClass: LegacyUsersModuleAdapter,
    },
    {
      provide: TOKEN_GENERATOR_PORT,
      useExisting: JwtTokenGeneratorAdapter,
    },
    {
      provide: AUTH_SESSION_REVOCATION,
      useExisting: JwtTokenGeneratorAdapter,
    },
    {
      provide: OTP_SENDER_PORT,
      useClass: NodemailerOtpSenderAdapter,
    },
    {
      provide: PASSWORD_HASHER_PORT,
      useClass: BcryptPasswordHasherAdapter,
    },

    // Use Cases
    RegisterUseCase,
    LoginUseCase,
    LoginOtpUseCase,
    SyncFirebaseUserUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,
    SendOtpUseCase,
    VerifyOtpUseCase,
  ],
  exports: [JwtModule, AUTH_SESSION_REVOCATION],
})
export class AuthModule {}
