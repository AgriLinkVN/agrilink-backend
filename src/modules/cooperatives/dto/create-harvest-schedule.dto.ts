import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { ProductUnit } from '../../../common/enums';

export class CreateHarvestScheduleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiProperty({ example: 'Xoai cat Hoa Loc' })
  @IsString()
  cropName: string;

  @ApiProperty({ example: '2026-06-15' })
  @IsDateString()
  expectedHarvestDate: string;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedQuantity?: number;

  @ApiPropertyOptional({ enum: ProductUnit })
  @IsOptional()
  @IsEnum(ProductUnit)
  unit?: ProductUnit;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
