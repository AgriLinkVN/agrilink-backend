import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID } from 'class-validator';
import { Region } from '../../../common/enums';

export class UpdateCooperativeProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cooperativeName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  establishedYear?: number;

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
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logoUrl?: string;
}
