import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsInt, IsNumber, IsOptional, IsPhoneNumber, IsString, IsUrl, IsUUID } from 'class-validator';
import { FarmingType, Region } from '../../../common/enums';

export class UpdateFarmerProfileDto {
  @ApiPropertyOptional({ example: 'Trang trai xanh' })
  @IsOptional()
  @IsString()
  farmName?: string;

  @ApiPropertyOptional({ example: 2.5 })
  @IsOptional()
  @IsNumber()
  farmAreaHectares?: number;

  @ApiPropertyOptional({ enum: FarmingType })
  @IsOptional()
  @IsEnum(FarmingType)
  farmingType?: FarmingType;

  @ApiPropertyOptional({ enum: Region })
  @IsOptional()
  @IsEnum(Region)
  region?: Region;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  provinceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  districtId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  experienceYears?: number;

  @ApiPropertyOptional({ example: '+84901234567' })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/avatar.jpg' })
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/cover.jpg' })
  @IsOptional()
  @IsUrl()
  coverImageUrl?: string;

  @ApiPropertyOptional({ example: ['VietGAP', 'Organic'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  certifications?: string[];
}
