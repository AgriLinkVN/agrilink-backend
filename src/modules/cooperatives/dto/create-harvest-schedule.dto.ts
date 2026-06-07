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
} from 'class-validator';
import { ProductUnit } from '../../../common/enums';

export class CreateHarvestScheduleDto {
  @ApiPropertyOptional({ description: 'Nếu cooperative tạo lịch cho farmer trong HTX' })
  @IsOptional()
  @IsUUID()
  farmerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiProperty({ example: '2026-06-15' })
  @IsDateString()
  expectedDate: string;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedQty?: number;

  @ApiPropertyOptional({ enum: ProductUnit })
  @IsOptional()
  @IsEnum(ProductUnit)
  unit?: ProductUnit;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class UpdateHarvestScheduleDto {
  @ApiPropertyOptional() @IsOptional() @IsDateString() expectedDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) estimatedQty?: number;
  @ApiPropertyOptional({ enum: ProductUnit }) @IsOptional() @IsEnum(ProductUnit) unit?: ProductUnit;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) note?: string;
}

/** Used when farmer/coop records the actual harvested numbers. */
export class RecordActualDto {
  @ApiProperty({ example: '2026-06-18' })
  @IsDateString()
  actualDate: string;

  @ApiProperty({ example: 480 })
  @IsNumber()
  @Min(0)
  actualQty: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class HarvestFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  to?: string;

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
