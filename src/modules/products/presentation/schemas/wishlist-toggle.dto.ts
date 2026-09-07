import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class WishlistToggleDto {
  @ApiProperty({ description: 'ID của sản phẩm cần thêm/xóa khỏi yêu thích' })
  @IsUUID()
  productId: string;
}
