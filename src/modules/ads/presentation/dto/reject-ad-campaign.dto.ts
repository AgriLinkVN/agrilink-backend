import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class RejectAdCampaignDto {
  @ApiProperty({ description: 'Lý do từ chối hiển thị cho supplier' })
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  reason: string;
}
