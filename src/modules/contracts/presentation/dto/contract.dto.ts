import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

const QUANTITY = /^(0|[1-9]\d*)(\.\d{1,3})?$/;
const MONEY = /^(0|[1-9]\d*)$/;

export class CreatePurchaseRequestDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  productCategoryId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  provinceId?: string;

  @ApiProperty({ type: String, example: '1000' })
  @IsString()
  @Matches(QUANTITY)
  quantityNeeded: string;

  @ApiProperty({ example: 'kg', maxLength: 32 })
  @IsString()
  @MaxLength(32)
  unit: string;
}

export class VersionedContractDto {
  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  expectedVersion: number;
}

export class CreateContractDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  purchaseRequestId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  sellerId: string;

  @ApiProperty({ type: String, example: '100' })
  @IsString()
  @Matches(QUANTITY)
  quantity: string;

  @ApiProperty({ type: String, example: '25000' })
  @IsString()
  @Matches(MONEY)
  unitPrice: string;
}

export class TransitionContractDto extends VersionedContractDto {
  @ApiProperty({
    enum: [
      'negotiating',
      'pending_signature',
      'active',
      'completed',
      'cancelled',
    ],
  })
  @IsIn([
    'negotiating',
    'pending_signature',
    'active',
    'completed',
    'cancelled',
  ])
  toStatus:
    | 'negotiating'
    | 'pending_signature'
    | 'active'
    | 'completed'
    | 'cancelled';
}
