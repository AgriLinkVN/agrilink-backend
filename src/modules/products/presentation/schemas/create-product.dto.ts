import { FarmingType, ProductUnit, SellerType } from '../../../../common/enums';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'Xoai cat Hoa Loc' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Xoai tuoi, kich co lon, ngot dam.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiProperty({ example: 25000 })
  @IsNumber()
  @Min(0)
  pricePerUnit: number;

  @ApiProperty({ enum: ProductUnit, example: ProductUnit.kg })
  @IsEnum(ProductUnit)
  unit: ProductUnit;

  @ApiProperty({ example: 500 })
  @IsNumber()
  @Min(0)
  availableQuantity: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderQuantity?: number;

  @ApiPropertyOptional({ enum: FarmingType })
  @IsOptional()
  @IsEnum(FarmingType)
  farmingType?: FarmingType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  provinceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  districtId?: string;

  @ApiPropertyOptional({ example: '2026-06-01' })
  @IsOptional()
  @IsDateString()
  harvestDate?: string;

  @ApiPropertyOptional({ example: '2026-06-15' })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;


  // seller Type
  // @ApiProperty({ enum: SellerType, example: SellerType.farmer })
  // TODO(P1): sellerType được lấy từ JWT payload bởi controller (@CurrentUser('sellerType')).
  // Để optional ở đây để tránh validation lỗi khi client không gửi trường này trong body.
  @ApiPropertyOptional({ enum: SellerType, example: SellerType.farmer })
  @IsOptional()
  @IsEnum(SellerType)
  // sellerType: SellerType;
  sellerType?: SellerType;
}
