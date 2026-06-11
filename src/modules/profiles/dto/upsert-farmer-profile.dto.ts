import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Length } from 'class-validator';

export class UpsertFarmerProfileDto {
  @ApiProperty({ example: '012345678912', description: '12-digit CCCD number' })
  @IsString()
  @Length(12, 12)
  cccdNumber: string;

  @ApiProperty({ example: 'https://cloudinary.com/front.jpg' })
  @IsString()
  @IsNotEmpty()
  cccdFrontUrl: string;

  @ApiProperty({ example: 'https://cloudinary.com/back.jpg' })
  @IsString()
  @IsNotEmpty()
  cccdBackUrl: string;

  @ApiProperty({ example: '123 Nguyen Van Linh' })
  @IsString()
  @IsNotEmpty()
  residenceAddress: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  provinceId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  districtId?: number;

  @ApiPropertyOptional({ example: 'Phuong Tan Phong' })
  @IsOptional()
  @IsString()
  ward?: string;

  @ApiPropertyOptional({ example: 'Long time farmer' })
  @IsOptional()
  @IsString()
  bio?: string;
}
