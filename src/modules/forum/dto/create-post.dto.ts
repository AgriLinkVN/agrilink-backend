import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';
import { ForumCategory } from '../entities/forum-post.entity';

export class CreatePostDto {
  @ApiProperty()
  @IsString()
  @MinLength(5)
  @MaxLength(255)
  title: string;

  @ApiProperty()
  @IsString()
  @MinLength(10)
  content: string;

  @ApiProperty({ enum: ForumCategory })
  @IsEnum(ForumCategory)
  category: ForumCategory;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  imageUrls?: string[];
}
