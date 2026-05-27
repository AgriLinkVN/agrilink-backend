import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { ProductUnit } from '../../../common/enums';

export class CreateMarketPriceDto {
  @ApiProperty({ example: 'Xoai cat Hoa Loc' })
  @IsString()
  productName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  provinceId?: string;

  @ApiProperty({ example: 25000 })
  @IsNumber()
  @Min(0)
  pricePerUnit: number;

  @ApiProperty({ enum: ProductUnit, example: ProductUnit.kg })
  @IsEnum(ProductUnit)
  unit: ProductUnit;

  @ApiPropertyOptional({ example: 'So NN&PTNT Tien Giang' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiProperty({ example: '2026-05-27' })
  @IsDateString()
  priceDate: string;
}
