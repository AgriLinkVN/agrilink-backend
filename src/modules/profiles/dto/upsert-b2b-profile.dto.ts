import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpsertB2bProfileDto {
  // Common
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  taxCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  // Cooperative
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cooperativeName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  representativeName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  representativePhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  representativeCccdFrontUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  representativeCccdBackUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cooperativeCertUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  membersListUrl?: string;

  // Enterprise / Supplier
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  businessLicenseUrl?: string;
}
