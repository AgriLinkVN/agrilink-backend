import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, IsEmail } from 'class-validator';
import { OtpPurpose, OtpType } from '../../../../common/enums';

export class SendOtpDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  target: string;

  @ApiProperty({ enum: OtpType, example: OtpType.SMS })
  @IsEnum(OtpType)
  type: OtpType;

  @ApiProperty({ enum: OtpPurpose, example: OtpPurpose.REGISTER })
  @IsEnum(OtpPurpose)
  purpose: OtpPurpose;
}

export class VerifyOtpDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  target: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  code: string;

  @ApiProperty({ enum: OtpPurpose, example: OtpPurpose.REGISTER })
  @IsEnum(OtpPurpose)
  purpose: OtpPurpose;
}
