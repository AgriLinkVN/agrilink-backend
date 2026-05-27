import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { ProductUnit } from '../../../common/enums';

export class CreateBulkListingDto {
  @ApiProperty({ example: 'Thu mua xoai cat Hoa Loc vu thang 6' })
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  productCategoryId?: string;

  @ApiProperty({ example: 1000 })
  @IsNumber()
  @Min(0)
  totalQuantity: number;

  @ApiProperty({ enum: ProductUnit, example: ProductUnit.kg })
  @IsEnum(ProductUnit)
  unit: ProductUnit;

  @ApiProperty({ example: 20000 })
  @IsNumber()
  @Min(0)
  pricePerUnit: number;

  @ApiPropertyOptional({ example: '2026-05-31T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  deadline?: string;
}
