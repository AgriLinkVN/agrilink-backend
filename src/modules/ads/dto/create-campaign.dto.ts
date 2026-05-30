import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateCampaignDto {
  @ApiProperty({ example: 'Khuyến mãi xoài cát tháng 6', minLength: 5, maxLength: 255 })
  @IsString()
  @MinLength(5)
  @MaxLength(255)
  title: string;

  @ApiProperty({ description: 'ID của gói quảng cáo (UUID)' })
  @IsUUID()
  packageId: string;

  @ApiProperty({
    description: 'URL banner đã upload lên Cloudinary',
    example: 'https://res.cloudinary.com/agrilink/image/upload/v1/ads/banner.jpg',
  })
  @IsUrl()
  imageUrl: string;

  @ApiPropertyOptional({
    description: 'URL đích khi click vào banner',
    example: 'https://agrilink.vn/products/xoai-cat',
  })
  @IsOptional()
  @IsUrl()
  linkUrl?: string;

  @ApiPropertyOptional({
    description: 'Danh sách tỉnh mục tiêu (mảng province_id). Để trống = toàn quốc.',
    example: [1, 3, 79],
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  targetProvinces?: number[];
}
