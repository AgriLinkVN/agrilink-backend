import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { ForumCategory } from '../entities/forum-post.entity';

export class ListForumPostsDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ForumCategory })
  @IsOptional()
  @IsEnum(ForumCategory)
  category?: ForumCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}
