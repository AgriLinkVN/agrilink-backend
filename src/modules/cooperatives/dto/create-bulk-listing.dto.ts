import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { FarmingType, ProductStatus, ProductUnit } from '../../../common/enums';

export class CreateBulkListingDto {
  @ApiProperty({ example: 'Thu mua xoài cát Hòa Lộc vụ tháng 6', maxLength: 255 })
  @IsString()
  @MinLength(5)
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ description: 'category_id UUID — product_categories.id' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiProperty({ example: 1000 })
  @IsNumber()
  @Min(0.01)
  totalQuantity: number;

  @ApiProperty({ enum: ProductUnit, example: ProductUnit.kg })
  @IsEnum(ProductUnit)
  unit: ProductUnit;

  @ApiProperty({ example: 20000 })
  @IsNumber()
  @Min(1000, { message: 'Giá không được dưới 1.000 VNĐ' })
  pricePerUnit: number;

  @ApiPropertyOptional({ enum: FarmingType })
  @IsOptional()
  @IsEnum(FarmingType)
  farmingType?: FarmingType;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  provinceId?: number;

  @ApiPropertyOptional({ example: '2026-06-01' })
  @IsOptional()
  @IsDateString()
  harvestDateFrom?: string;

  @ApiPropertyOptional({ example: '2026-06-30' })
  @IsOptional()
  @IsDateString()
  harvestDateTo?: string;
}

export class UpdateBulkListingDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0.01) totalQuantity?: number;
  @ApiPropertyOptional({ enum: ProductUnit }) @IsOptional() @IsEnum(ProductUnit) unit?: ProductUnit;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(1000) pricePerUnit?: number;
  @ApiPropertyOptional({ enum: FarmingType }) @IsOptional() @IsEnum(FarmingType) farmingType?: FarmingType;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) provinceId?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() harvestDateFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() harvestDateTo?: string;
}

export class BulkListingFilterDto {
  @ApiPropertyOptional({ enum: ProductStatus })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  provinceId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ enum: FarmingType })
  @IsOptional()
  @IsEnum(FarmingType)
  farmingType?: FarmingType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}
