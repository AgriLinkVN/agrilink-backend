import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
  UseFilters,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiExtraModels,
  ApiOperation,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from "@nestjs/swagger";
import { AuthGuard } from "@nestjs/passport";
import { RegisterDto } from "../dto/register.dto";
import { LoginDto } from "../dto/login.dto";
import { SendOtpDto, VerifyOtpDto } from "../dto/send-otp.dto";
import { FirebaseSyncDto } from "../dto/firebase-sync.dto";
import { Public } from "../../../../common/decorators/public.decorator";
import { CurrentUser } from "../../../../common/decorators/current-user.decorator";
import { FirebaseAuthGuard } from "../../../../common/guards/firebase-auth.guard";
import { Response, Request } from "express";
import { DecodedIdToken } from "firebase-admin/auth";

import { RegisterUseCase } from "../../application/use-cases/register.use-case";
import { LoginUseCase } from "../../application/use-cases/login.use-case";
import { LoginOtpUseCase } from "../../application/use-cases/login-otp.use-case";
import { SyncFirebaseUserUseCase } from "../../application/use-cases/sync-firebase-user.use-case";
import { RefreshTokenUseCase } from "../../application/use-cases/refresh-token.use-case";
import { LogoutUseCase } from "../../application/use-cases/logout.use-case";
import { SendOtpUseCase } from "../../application/use-cases/send-otp.use-case";
import { VerifyOtpUseCase } from "../../application/use-cases/verify-otp.use-case";
import { LoginExceptionFilter } from "../filters/login-exception.filter";
import { TrustedOriginGuard } from "../../../../common/guards/trusted-origin.guard";
import {
  clearRefreshTokenCookie,
  setRefreshTokenCookie,
} from "../http/refresh-token-cookie.policy";

@ApiTags("Auth")
@ApiExtraModels(LoginDto)
@Controller("auth")
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly loginOtpUseCase: LoginOtpUseCase,
    private readonly syncFirebaseUserUseCase: SyncFirebaseUserUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly sendOtpUseCase: SendOtpUseCase,
    private readonly verifyOtpUseCase: VerifyOtpUseCase,
  ) {}

  @Public()
  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Register a new user account" })
  @ApiResponse({ status: 201, description: "User created successfully" })
  @ApiResponse({
    status: 400,
    description: "Validation error or phone already taken",
  })
  register(@Body() dto: RegisterDto) {
    return this.registerUseCase.execute(dto);
  }

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @UseFilters(LoginExceptionFilter)
  @UseGuards(TrustedOriginGuard)
  @ApiOperation({
    summary:
      "Login with email or phone and password — returns access token, sets refresh cookie",
  })
  @ApiBody({
    schema: {
      allOf: [
        { $ref: getSchemaPath(LoginDto) },
        {
          oneOf: [{ required: ["email"] }, { required: ["phone"] }],
        },
      ],
    },
  })
  @ApiResponse({ status: 200, description: "Login successful" })
  @ApiResponse({
    status: 400,
    description: "Exactly one valid email or phone is required",
  })
  @ApiResponse({ status: 401, description: "Invalid credentials" })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.loginUseCase.execute(dto);

    setRefreshTokenCookie(res, tokens.refreshToken);

    return { accessToken: tokens.accessToken };
  }

  @Public()
  @Post("login-otp")
  @HttpCode(HttpStatus.OK)
  @UseGuards(TrustedOriginGuard)
  @ApiOperation({
    summary:
      "Login with phone and OTP — returns access token, sets refresh cookie",
  })
  @ApiResponse({ status: 200, description: "Login successful" })
  @ApiResponse({ status: 400, description: "Invalid OTP" })
  async loginOtp(
    @Body() dto: VerifyOtpDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.loginOtpUseCase.execute(dto);

    setRefreshTokenCookie(res, tokens.refreshToken);

    return { accessToken: tokens.accessToken };
  }

  @Public()
  @Post("sync")
  @HttpCode(HttpStatus.OK)
  @UseGuards(FirebaseAuthGuard)
  @ApiOperation({
    summary: "Sync Firebase authenticated mobile user with local JWT account",
  })
  @ApiResponse({
    status: 200,
    description: "Firebase user synced and access token returned",
  })
  @ApiResponse({ status: 401, description: "Invalid Firebase ID token" })
  async syncFirebaseUser(
    @CurrentUser() firebaseUser: DecodedIdToken,
    @Body() dto: FirebaseSyncDto,
  ) {
    const tokens = await this.syncFirebaseUserUseCase.execute(firebaseUser, dto);
    return { accessToken: tokens.accessToken };
  }

  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @UseGuards(TrustedOriginGuard, AuthGuard("jwt-refresh"))
  @ApiOperation({
    summary: "Exchange a valid refresh token cookie for a new token pair",
  })
  @ApiResponse({ status: 200, description: "Tokens refreshed" })
  @ApiResponse({ status: 401, description: "Refresh token invalid or expired" })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.refreshToken;
    const tokens = await this.refreshTokenUseCase.execute({ refreshToken });

    setRefreshTokenCookie(res, tokens.refreshToken);

    return { accessToken: tokens.accessToken };
  }

  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(TrustedOriginGuard)
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "Revoke refresh token and log out" })
  @ApiResponse({ status: 204, description: "Logged out successfully" })
  async logout(
    @CurrentUser("sub") userId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.logoutUseCase.execute(userId);
    clearRefreshTokenCookie(res);
  }

  @Public()
  @Post("send-otp")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Send OTP code via SMS or email" })
  @ApiResponse({ status: 200, description: "OTP sent" })
  sendOtp(@Body() dto: SendOtpDto) {
    return this.sendOtpUseCase.execute(dto);
  }

  @Public()
  @Post("verify-otp")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Verify OTP code and activate phone/email" })
  @ApiResponse({ status: 200, description: "OTP verified" })
  @ApiResponse({ status: 400, description: "Invalid or expired OTP" })
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.verifyOtpUseCase.execute(dto);
  }
}
