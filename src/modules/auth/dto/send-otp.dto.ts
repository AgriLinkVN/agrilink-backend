import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';
import { OtpPurpose, OtpType } from '../../../common/enums';

export class SendOtpDto {
  @ApiProperty({ example: '+84901234567' })
  @IsString()
  target: string;

  @ApiProperty({ enum: OtpType, example: OtpType.sms })
  @IsEnum(OtpType)
  type: OtpType;

  @ApiProperty({ enum: OtpPurpose, example: OtpPurpose.register })
  @IsEnum(OtpPurpose)
  purpose: OtpPurpose;
}

export class VerifyOtpDto {
  @ApiProperty({ example: '+84901234567' })
  @IsString()
  target: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  code: string;

  @ApiProperty({ enum: OtpPurpose, example: OtpPurpose.register })
  @IsEnum(OtpPurpose)
  purpose: OtpPurpose;
}
