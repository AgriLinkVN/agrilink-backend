import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';
import { NotifType } from '../../../common/enums';

export class CreateNotificationDto {
  @ApiProperty({ description: 'Recipient user ID' })
  @IsUUID()
  userId: string;

  @ApiProperty({ enum: NotifType })
  @IsEnum(NotifType)
  type: NotifType;

  @ApiProperty({ example: 'San pham duoc phe duyet' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'San pham "Xoai cat Hoa Loc" cua ban da duoc phe duyet.' })
  @IsString()
  body: string;

  @ApiPropertyOptional({ description: 'Optional JSON payload for deep-linking' })
  @IsOptional()
  @IsObject()
  data?: object;
}
