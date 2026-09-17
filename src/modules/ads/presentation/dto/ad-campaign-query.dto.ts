import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { AdStatus } from '@common/enums';

export class AdCampaignQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

export class AdBannerQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  province_id?: number;
}

export class AdCampaignModerationQueryDto extends AdCampaignQueryDto {
  @IsOptional()
  @IsEnum(AdStatus)
  status?: AdStatus;
}
