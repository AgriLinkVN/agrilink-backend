import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ForumService } from './forum.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { ListForumPostsDto } from './dto/list-posts.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../common/enums';

@ApiTags('Forum')
@Controller('forum')
export class ForumController {
  constructor(private readonly forumService: ForumService) {}

  @Get('posts')
  @Public()
  @ApiOperation({ summary: 'List forum posts (public)' })
  @ApiQuery({ name: 'category', required: false, enum: ['technical', 'market', 'experience'] })
  @ApiQuery({ name: 'search', required: false })
  listPosts(@Query() query: ListForumPostsDto) {
    return this.forumService.listPosts(query, query.category, query.search);
  }

  @Get('posts/:id')
  @Public()
  @ApiOperation({ summary: 'Get post detail (public)' })
  getPost(@Param('id') id: string) {
    return this.forumService.getPost(id);
  }

  @Post('posts')
  @UseGuards(RolesGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create a forum post' })
  createPost(@CurrentUser('sub') userId: string, @Body() dto: CreatePostDto) {
    return this.forumService.createPost(userId, dto);
  }

  @Patch('posts/:id')
  @UseGuards(RolesGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update own post' })
  updatePost(@Param('id') id: string, @CurrentUser('sub') userId: string, @Body() dto: UpdatePostDto) {
    return this.forumService.updatePost(id, userId, dto);
  }

  @Delete('posts/:id')
  @UseGuards(RolesGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete own post' })
  deletePost(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return this.forumService.deletePost(id, userId);
  }

  @Patch('posts/:id/moderate')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STATE_AGENCY)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Hide/show a post (moderation)' })
  moderatePost(@Param('id') id: string, @Body('isHidden') isHidden: boolean) {
    return this.forumService.setHidden(id, isHidden);
  }

  @Get('posts/:id/comments')
  @Public()
  @ApiOperation({ summary: 'List comments for a post (public)' })
  listComments(@Param('id') id: string, @Query() pagination: PaginationDto) {
    return this.forumService.listComments(id, pagination);
  }

  @Post('posts/:id/comments')
  @UseGuards(RolesGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Add a comment to a post' })
  addComment(@Param('id') id: string, @CurrentUser('sub') userId: string, @Body() dto: CreateCommentDto) {
    return this.forumService.addComment(id, userId, dto);
  }

  @Delete('comments/:commentId')
  @UseGuards(RolesGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete own comment' })
  deleteComment(@Param('commentId') commentId: string, @CurrentUser('sub') userId: string) {
    return this.forumService.deleteComment(commentId, userId);
  }

  @Post('posts/:id/like')
  @UseGuards(RolesGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Toggle like on a post' })
  toggleLike(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return this.forumService.toggleLike(id, userId);
  }
}
