import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { SendOtpDto, VerifyOtpDto } from './dto/send-otp.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Response, Request } from 'express';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error or phone already taken' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with phone and password — returns access token, sets refresh cookie' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.authService.login(dto);
    
    // Set refresh token in httpOnly cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, 
    });

    return { accessToken: tokens.accessToken };
  }

  @Public()
  @Post('login-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with phone and OTP — returns access token, sets refresh cookie' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 400, description: 'Invalid OTP' })
  async loginOtp(@Body() dto: VerifyOtpDto, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.authService.loginWithOtp(dto);
    
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, 
    });

    return { accessToken: tokens.accessToken };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt-refresh'))
  @ApiOperation({ summary: 'Exchange a valid refresh token cookie for a new token pair' })
  @ApiResponse({ status: 200, description: 'Tokens refreshed' })
  @ApiResponse({ status: 401, description: 'Refresh token invalid or expired' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.refreshToken;
    const tokens = await this.authService.refreshTokens({ refreshToken });

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { accessToken: tokens.accessToken };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Revoke refresh token and log out' })
  @ApiResponse({ status: 204, description: 'Logged out successfully' })
  async logout(@CurrentUser('sub') userId: string, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(userId);
    res.clearCookie('refreshToken');
  }

  @Public()
  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send OTP code via SMS or email' })
  @ApiResponse({ status: 200, description: 'OTP sent' })
  sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto);
  }

  @Public()
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP code and activate phone/email' })
  @ApiResponse({ status: 200, description: 'OTP verified' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }
}
