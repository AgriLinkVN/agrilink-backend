import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, IsUUID, IsUrl } from 'class-validator';

export class CreateCampaignDto {
  @ApiProperty({ description: 'The ad package to use' })
  @IsUUID()
  packageId: string;

  @ApiPropertyOptional({ description: 'Product to promote (omit for brand/store campaign)' })
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiProperty({ example: 'Khuyen mai xoai thang 6' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: 'https://cdn.agrilink.vn/banners/xoai.jpg' })
  @IsOptional()
  @IsUrl()
  bannerUrl?: string;

  @ApiPropertyOptional({ example: 'https://agrilink.vn/products/xoai-cat' })
  @IsOptional()
  @IsUrl()
  targetUrl?: string;

  @ApiPropertyOptional({ example: '2026-06-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  startsAt?: string;
}
