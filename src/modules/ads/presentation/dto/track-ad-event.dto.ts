import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsUUID } from 'class-validator';

export class TrackAdEventDto {
  @ApiProperty()
  @IsUUID()
  campaignId: string;

  @ApiProperty({ enum: ['impression', 'click'] })
  @IsIn(['impression', 'click'])
  eventType: 'impression' | 'click';
}
