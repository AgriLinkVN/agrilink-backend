import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateAdCampaignDto {
  @ApiProperty({ minLength: 5, maxLength: 255 })
  @IsString()
  @MinLength(5)
  @MaxLength(255)
  title: string;

  @ApiProperty({ description: 'ID số nguyên của gói quảng cáo' })
  @IsInt()
  @Min(1)
  packageId: number;

  @ApiProperty({ description: 'URL banner đã được upload' })
  @IsUrl()
  imageUrl: string;

  @ApiPropertyOptional({ description: 'URL đích khi người dùng click banner' })
  @IsOptional()
  @IsUrl()
  linkUrl?: string;

  @ApiPropertyOptional({ type: [Number], description: 'Để trống để nhắm toàn quốc' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  targetProvinces?: number[];
}
