import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

function toOptionalBoolean({ value }: { value: unknown }): unknown {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (value === true || value === 'true') {
    return true;
  }
  if (value === false || value === 'false') {
    return false;
  }
  return value;
}

export class ReviewPaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class SellerReviewQueryDto extends ReviewPaginationDto {
  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  replied?: boolean;
}

export class AdminReviewQueryDto extends ReviewPaginationDto {
  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  is_hidden?: boolean;
}
