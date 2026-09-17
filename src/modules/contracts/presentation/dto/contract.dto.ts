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
import {
  NON_NEGATIVE_INTEGER_MONEY_PATTERN,
  POSITIVE_QUANTITY_PATTERN,
} from '../../../commerce/presentation/validation/commerce-value-patterns';

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
  @Matches(POSITIVE_QUANTITY_PATTERN)
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
  @Matches(POSITIVE_QUANTITY_PATTERN)
  quantity: string;

  @ApiProperty({ type: String, example: '25000' })
  @IsString()
  @Matches(NON_NEGATIVE_INTEGER_MONEY_PATTERN)
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
