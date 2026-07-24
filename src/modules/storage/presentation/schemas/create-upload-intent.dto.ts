import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
export class CreateUploadIntentDto {
  @IsIn(['KYC_IDENTITY', 'BUSINESS_LICENSE', 'CERTIFICATION']) assetType: 'KYC_IDENTITY' | 'BUSINESS_LICENSE' | 'CERTIFICATION';
  @IsString() @MaxLength(255) originalName: string;
  @IsString() @MaxLength(100) declaredMime: string;
  @IsInt() @Min(1) @Max(10 * 1024 * 1024) sizeBytes: number;
  @IsOptional() @IsString() @MaxLength(64) resourceType?: string;
  @IsOptional() @IsString() @MaxLength(64) resourceId?: string;
}
