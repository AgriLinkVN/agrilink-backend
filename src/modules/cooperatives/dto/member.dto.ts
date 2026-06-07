import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { MemberStatus } from '../../../common/enums';

/** Farmer submits a join request to a cooperative. */
export class RequestJoinDto {
  @ApiPropertyOptional({
    example: 'Tôi muốn gia nhập HTX để cùng bán xoài cát Hòa Lộc.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

/** Cooperative owner approves a pending member. (Empty body — id from URL.) */
export class ApproveMemberDto {}

/** Cooperative owner rejects a pending member with a reason. */
export class RejectMemberDto {
  @ApiProperty({ example: 'Hồ sơ chưa đầy đủ giấy chứng nhận VietGAP.' })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason: string;
}

/** Cooperative owner suspends an active member. */
export class SuspendMemberDto {
  @ApiPropertyOptional({ example: 'Tạm dừng do không tham gia 3 mùa vụ liên tiếp.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

/** Optional filter for the members list. */
export class MemberFilterDto {
  @ApiPropertyOptional({ enum: MemberStatus })
  @IsOptional()
  @IsEnum(MemberStatus)
  status?: MemberStatus;
}
