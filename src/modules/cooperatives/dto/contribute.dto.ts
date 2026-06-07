import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';
import { ProductUnit } from '../../../common/enums';

/**
 * Farmer member commits to contributing a quantity to an open bulk_listing.
 */
export class ContributeDto {
  @ApiProperty({ example: 50 })
  @IsNumber()
  @Min(0.01)
  quantity: number;

  @ApiProperty({ enum: ProductUnit })
  @IsEnum(ProductUnit)
  unit: ProductUnit;

  @ApiPropertyOptional({ description: 'Liên kết với 1 SKU sản phẩm của farmer' })
  @IsOptional()
  @IsUUID()
  productId?: string;
}

export class UpdateContributionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  quantity?: number;

  @ApiPropertyOptional({ enum: ProductUnit })
  @IsOptional()
  @IsEnum(ProductUnit)
  unit?: ProductUnit;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  productId?: string;
}
