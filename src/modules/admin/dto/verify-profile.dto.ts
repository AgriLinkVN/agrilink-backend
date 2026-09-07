import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';

export class VerifyProfileDto {
  @ApiProperty({ description: 'True to approve, false to reject' })
  @IsBoolean()
  isApproved: boolean;

  @ApiPropertyOptional({ description: 'Required if isApproved is false' })
  @ValidateIf((o) => o.isApproved === false)
  @IsString()
  @IsNotEmpty()
  rejectionReason?: string;
}
