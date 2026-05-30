import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsUUID } from 'class-validator';

export class TrackEventDto {
  @ApiProperty({ description: 'UUID của chiến dịch' })
  @IsUUID()
  campaignId: string;

  @ApiProperty({ enum: ['impression', 'click'] })
  @IsIn(['impression', 'click'])
  eventType: 'impression' | 'click';
}
