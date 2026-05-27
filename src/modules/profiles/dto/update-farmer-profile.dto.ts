import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';
import { FarmingType, Region } from '../../../common/enums';

export class UpdateFarmerProfileDto {
  @ApiPropertyOptional({ example: 'Trang trai xanh' })
  @IsOptional()
  @IsString()
  farmName?: string;

  @ApiPropertyOptional({ example: 2.5 })
  @IsOptional()
  @IsNumber()
  farmAreaHectares?: number;

  @ApiPropertyOptional({ enum: FarmingType })
  @IsOptional()
  @IsEnum(FarmingType)
  farmingType?: FarmingType;

  @ApiPropertyOptional({ enum: Region })
  @IsOptional()
  @IsEnum(Region)
  region?: Region;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  provinceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  districtId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  experienceYears?: number;
}
