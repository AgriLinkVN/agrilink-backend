import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { ProductStatus } from '@common/enums';

export class UpdateProductStatusDto {
  @ApiProperty({
    enum: [
      ProductStatus.PENDING_APPROVAL,
      ProductStatus.ACTIVE,
      ProductStatus.OUT_OF_STOCK,
    ],
    example: ProductStatus.PENDING_APPROVAL,
  })
  @IsEnum(ProductStatus)
  status: ProductStatus;
}
