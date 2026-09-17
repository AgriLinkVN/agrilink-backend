import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { CertificationStatus, CertType } from '@common/enums';

export class CreateProductCertificationDto {
  @ApiProperty({ enum: CertType, example: CertType.VIETGAP })
  @IsEnum(CertType)
  certType: CertType;

  @ApiPropertyOptional({ example: 'VG-2026-001234' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  certNumber?: string;

  @ApiPropertyOptional({ example: 'Chi cục Quản lý chất lượng nông sản' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  issuedBy?: string;

  @ApiPropertyOptional({ example: '2026-06-01' })
  @IsOptional()
  @IsDateString()
  issuedDate?: string;

  @ApiPropertyOptional({ example: '2027-06-01' })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiProperty({
    format: 'uuid',
    description:
      'Private CERTIFICATION file created through a storage upload intent',
  })
  @IsUUID()
  storedFileId: string;
}

export class VerifyProductCertificationDto {
  @ApiProperty({
    enum: [CertificationStatus.VERIFIED, CertificationStatus.REJECTED],
    example: CertificationStatus.VERIFIED,
  })
  @IsEnum(CertificationStatus)
  status: CertificationStatus;

  @ApiPropertyOptional({
    example: 'Thông tin chứng nhận không khớp hồ sơ tải lên',
  })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
