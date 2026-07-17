import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { NotifType } from '@common/enums';
import { NotificationData } from '../../domain/notification.types';

export class NotificationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: NotifType })
  type: NotifType;

  @ApiProperty()
  title: string;

  @ApiProperty()
  body: string;

  @ApiProperty({ type: Object })
  data: NotificationData;

  @ApiProperty()
  isRead: boolean;

  @ApiPropertyOptional({ nullable: true })
  readAt: string | null;

  @ApiProperty()
  createdAt: string;
}

export class NotificationListResponseDto {
  @ApiProperty({ type: [NotificationResponseDto] })
  data: NotificationResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;
}

export class NotificationCountResponseDto {
  @ApiProperty()
  count: number;
}

export class MarkAllNotificationsReadResponseDto {
  @ApiProperty()
  updated: number;
}
