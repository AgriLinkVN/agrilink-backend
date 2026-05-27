import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateTraceabilityDto {
  @ApiProperty()
  @IsUUID()
  productId: string;

  @ApiPropertyOptional({ description: 'Custom QR code string; auto-generated if omitted' })
  @IsOptional()
  @IsString()
  qrCode?: string;

  @ApiPropertyOptional({ example: 'Hoa Loc, Tien Giang' })
  @IsOptional()
  @IsString()
  farmLocation?: string;

  @ApiPropertyOptional({ example: 'VietGAP' })
  @IsOptional()
  @IsString()
  farmingMethod?: string;

  @ApiPropertyOptional({ example: '2026-01-10' })
  @IsOptional()
  @IsDateString()
  plantedDate?: string;

  @ApiPropertyOptional({ example: '2026-06-01' })
  @IsOptional()
  @IsDateString()
  harvestedDate?: string;

  @ApiPropertyOptional({ example: 'Khong su dung thuoc tru sau' })
  @IsOptional()
  @IsString()
  pesticidesUsed?: string;

  @ApiPropertyOptional({ description: 'JSON object with certification details' })
  @IsOptional()
  @IsObject()
  certifications?: object;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
