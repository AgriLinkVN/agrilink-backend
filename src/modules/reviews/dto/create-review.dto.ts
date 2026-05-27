import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class CreateReviewDto {
  @ApiProperty()
  @IsUUID()
  productId: string;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ example: 'San pham tuoi ngon, dong goi sach se' })
  @IsOptional()
  @IsString()
  comment?: string;
}

export class ReplyReviewDto {
  @ApiProperty({ example: 'Cam on quy khach da tin tuong!' })
  @IsString()
  reply: string;
}
