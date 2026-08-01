import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

const MONEY_PATTERN = /^(0|[1-9]\d*)$/;
const QUANTITY_PATTERN = /^(0|[1-9]\d*)(\.\d{1,3})?$/;

export class CreateOrderItemDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  productId: string;

  @ApiProperty({ type: String, example: '2.5' })
  @IsString()
  @Matches(QUANTITY_PATTERN)
  quantity: string;
}

export class CreateOrderDto {
  @ApiProperty({ type: [CreateOrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @ApiProperty({ type: String, example: '0' })
  @IsString()
  @Matches(MONEY_PATTERN)
  shippingFee: string;

  @ApiProperty({ type: String, example: '0' })
  @IsString()
  @Matches(MONEY_PATTERN)
  platformFee: string;

  @ApiProperty({ enum: ['cod', 'bank_transfer', 'manual'] })
  @IsIn(['cod', 'bank_transfer', 'manual'])
  paymentMethod: 'cod' | 'bank_transfer' | 'manual';

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class TransitionOrderStatusDto {
  @ApiProperty({
    enum: [
      'pending',
      'confirmed',
      'preparing',
      'handed_to_logistics',
      'shipping',
      'delivered',
      'cancelled',
    ],
  })
  @IsIn([
    'pending',
    'confirmed',
    'preparing',
    'handed_to_logistics',
    'shipping',
    'delivered',
    'cancelled',
  ])
  toStatus:
    | 'pending'
    | 'confirmed'
    | 'preparing'
    | 'handed_to_logistics'
    | 'shipping'
    | 'delivered'
    | 'cancelled';

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  expectedVersion: number;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
