import { CertType, FarmingType, ProductUnit, SellerType } from '../../../../common/enums';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductImageDto {
  @ApiProperty({ example: 'https://res.cloudinary.com/.../xoai.jpg' })
  @IsString()
  imageUrl: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class CreateProductCertificationInputDto {
  @ApiProperty({ enum: CertType, example: CertType.VIETGAP })
  @IsEnum(CertType)
  certType: CertType;

  @ApiPropertyOptional({ example: 'VG-2026-001234' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  certNumber?: string;

  @ApiPropertyOptional({ example: 'Chi cục Quản lý chất lượng nông sản' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  issuedBy?: string;

  @ApiPropertyOptional({ example: '2026-06-01' })
  @IsOptional()
  @IsDateString()
  issuedDate?: string;

  @ApiPropertyOptional({ example: '2027-06-01' })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiPropertyOptional({ example: 'https://res.cloudinary.com/.../cert.pdf' })
  @IsOptional()
  @IsString()
  documentUrl?: string;
}

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

  @ApiPropertyOptional({ example: 'XCHL-001', description: 'Mã SKU duy nhất' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  sku?: string;

  @ApiPropertyOptional({ example: 'Hoa Loc', description: 'Giong cay/con' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  variety?: string;

  @ApiProperty({ example: 25000 })
  @IsNumber()
  @Min(0)
  pricePerUnit: number;

  @ApiProperty({ enum: ProductUnit, example: ProductUnit.KG })
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

  @ApiPropertyOptional({ example: 12.6667, description: 'Vi do nong trai' })
  @IsOptional()
  @IsLatitude()
  farmLatitude?: number;

  @ApiPropertyOptional({ example: 108.0500, description: 'Kinh do nong trai' })
  @IsOptional()
  @IsLongitude()
  farmLongitude?: number;

  @ApiPropertyOptional({ example: false, description: 'San pham noi bat (admin set)' })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ example: '2026-06-01' })
  @IsOptional()
  @IsDateString()
  harvestDate?: string;

  @ApiPropertyOptional({ example: '2026-06-15' })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;


  // seller Type
  // @ApiProperty({ enum: SellerType, example: SellerType.FARMER })
  // TODO(P1): sellerType được lấy từ JWT payload bởi controller (@CurrentUser('sellerType')).
  // Để optional ở đây để tránh validation lỗi khi client không gửi trường này trong body.
  @ApiPropertyOptional({ enum: SellerType, example: SellerType.FARMER })
  @IsOptional()
  @IsEnum(SellerType)
  // sellerType: SellerType;
  sellerType?: SellerType;

  @ApiPropertyOptional({ type: [CreateProductImageDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductImageDto)
  images?: CreateProductImageDto[];

  @ApiPropertyOptional({ type: [CreateProductCertificationInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductCertificationInputDto)
  certifications?: CreateProductCertificationInputDto[];
}
