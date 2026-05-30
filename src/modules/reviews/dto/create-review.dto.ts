import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({ description: 'UUID của sản phẩm được đánh giá' })
  @IsUUID()
  productId: string;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ example: 'Sản phẩm tươi ngon, đóng gói sạch sẽ', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;

  @ApiPropertyOptional({ description: 'Danh sách URL ảnh (tối đa 5)', type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsUrl({}, { each: true })
  images?: string[];
}

export class ReplyReviewDto {
  @ApiProperty({ example: 'Cảm ơn quý khách đã tin tưởng!', minLength: 5, maxLength: 500 })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reply: string;
}

export class HideReviewDto {
  @ApiProperty({ example: 'Vi phạm tiêu chuẩn cộng đồng' })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason: string;
}
