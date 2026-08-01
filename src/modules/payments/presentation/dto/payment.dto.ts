import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsString, IsUUID, Matches, Min } from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  orderId: string;

  @ApiProperty({ enum: ['cod', 'bank_transfer', 'manual'] })
  @IsIn(['cod', 'bank_transfer', 'manual'])
  method: 'cod' | 'bank_transfer' | 'manual';
}

export class VersionedPaymentDto {
  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  expectedVersion: number;
}

export class RefundPaymentDto extends VersionedPaymentDto {
  @ApiProperty({ type: String, example: '10000' })
  @IsString()
  @Matches(/^(0|[1-9]\d*)$/)
  amount: string;
}
