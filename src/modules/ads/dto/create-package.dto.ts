import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreatePackageDto {
  @ApiProperty({ example: 'Banner 7 ngày — Toàn quốc' })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @ApiProperty({ enum: ['banner', 'featured', 'spotlight'] })
  @IsIn(['banner', 'featured', 'spotlight'])
  adType: 'banner' | 'featured' | 'spotlight';

  @ApiProperty({ example: 500000 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ example: 7 })
  @IsInt()
  @Min(1)
  durationDays: number;

  @ApiPropertyOptional({ example: 10000, nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxImpressions?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string | null;
}

export class UpdatePackageDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) price?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) durationDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) maxImpressions?: number | null;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}
