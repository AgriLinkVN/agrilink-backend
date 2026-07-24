import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

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
  @IsUUID()
  representativeCccdFrontFileId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  representativeCccdBackFileId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  cooperativeCertFileId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  membersListFileId?: string;

  // Enterprise / Supplier
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  businessLicenseFileId?: string;
}
