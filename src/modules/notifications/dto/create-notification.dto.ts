import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { NotifType } from '../../../common/enums';

/**
 * Single source of truth for the notification creation payload.
 * Used both by the public REST endpoint and the internal `createAndEmit()`
 * helper consumed by other modules (P2 products, P3 cooperatives, etc.).
 */
export class CreateNotificationDto {
  @ApiProperty({ description: 'UUID của người nhận thông báo' })
  @IsUUID()
  userId: string;

  @ApiProperty({ enum: NotifType })
  @IsEnum(NotifType)
  type: NotifType;

  @ApiProperty({ example: 'Sản phẩm được phê duyệt', maxLength: 255 })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({ example: 'Sản phẩm "Xoài cát Hòa Lộc" của bạn đã được phê duyệt.' })
  @IsOptional()
  @IsString()
  body?: string;

  @ApiPropertyOptional({
    description: 'Optional JSON payload for deep-linking (e.g., { productId: "..." })',
  })
  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}
