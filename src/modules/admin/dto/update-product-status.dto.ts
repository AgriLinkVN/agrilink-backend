import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';
import { ProductStatus } from '../../../common/enums';

export class UpdateProductStatusDto {
  @ApiProperty({ enum: [ProductStatus.ACTIVE, ProductStatus.REJECTED, ProductStatus.SUSPENDED] })
  @IsEnum(ProductStatus)
  @IsNotEmpty()
  status: ProductStatus;

  @ApiProperty({ required: false, description: 'Required if status is REJECTED or SUSPENDED' })
  @ValidateIf(o => o.status === ProductStatus.REJECTED || o.status === ProductStatus.SUSPENDED)
  @IsString()
  @IsNotEmpty()
  rejectionReason?: string;
}
