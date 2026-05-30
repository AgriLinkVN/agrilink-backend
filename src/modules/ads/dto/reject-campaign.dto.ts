import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RejectCampaignDto {
  @ApiProperty({
    description: 'Lý do từ chối (tối thiểu 20 ký tự)',
    example: 'Hình ảnh banner không đáp ứng tiêu chuẩn chất lượng của AgriLink.',
    minLength: 20,
  })
  @IsString()
  @MinLength(20)
  reason: string;
}
