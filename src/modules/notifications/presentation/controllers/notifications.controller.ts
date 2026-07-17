import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '@common/decorators/current-user.decorator';
import { ParseUuidPipe } from '@common/pipes/parse-uuid.pipe';
import { PaginationDto } from '@common/dto/pagination.dto';
import { ListNotificationsUseCase } from '../../application/use-cases/list-notifications.use-case';
import { ListUnreadNotificationsUseCase } from '../../application/use-cases/list-unread-notifications.use-case';
import { CountUnreadNotificationsUseCase } from '../../application/use-cases/count-unread-notifications.use-case';
import { MarkNotificationReadUseCase } from '../../application/use-cases/mark-notification-read.use-case';
import { MarkAllNotificationsReadUseCase } from '../../application/use-cases/mark-all-notifications-read.use-case';
import { NotificationNotFoundError } from '../../domain/errors/notification-not-found.error';
import {
  MarkAllNotificationsReadResponseDto,
  NotificationCountResponseDto,
  NotificationListResponseDto,
  NotificationResponseDto,
} from '../dto/notification-response.dto';
import {
  toMarkAllNotificationsReadResponse,
  toNotificationListResponse,
  toNotificationResponse,
} from '../mappers/notification-response.mapper';

@ApiTags('Notifications')
@ApiBearerAuth('access-token')
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly listNotificationsUseCase: ListNotificationsUseCase,
    private readonly listUnreadNotificationsUseCase: ListUnreadNotificationsUseCase,
    private readonly countUnreadNotificationsUseCase: CountUnreadNotificationsUseCase,
    private readonly markNotificationReadUseCase: MarkNotificationReadUseCase,
    private readonly markAllNotificationsReadUseCase: MarkAllNotificationsReadUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all notifications for the authenticated user' })
  @ApiResponse({ status: 200, description: 'Paginated notifications' })
  async findAll(
    @CurrentUser('sub') userId: string,
    @Query() pagination: PaginationDto,
  ): Promise<NotificationListResponseDto> {
    const result = await this.listNotificationsUseCase.execute(
      userId,
      pagination,
    );
    return toNotificationListResponse(result);
  }

  @Get('unread')
  @ApiOperation({ summary: 'Get unread notifications for the authenticated user' })
  @ApiResponse({ status: 200, description: 'Unread notifications' })
  async getUnread(
    @CurrentUser('sub') userId: string,
    @Query('limit') limit?: string,
  ): Promise<NotificationResponseDto[]> {
    const notifications = await this.listUnreadNotificationsUseCase.execute(
      userId,
      Number(limit),
    );
    return notifications.map(toNotificationResponse);
  }

  @Get('count')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiResponse({ status: 200, description: 'Unread notification count' })
  countUnread(
    @CurrentUser('sub') userId: string,
  ): Promise<NotificationCountResponseDto> {
    return this.countUnreadNotificationsUseCase.execute(userId);
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a single notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  async markAsRead(
    @Param('id', ParseUuidPipe) notifId: string,
    @CurrentUser('sub') userId: string,
  ): Promise<NotificationResponseDto> {
    try {
      const result = await this.markNotificationReadUseCase.execute(
        notifId,
        userId,
      );
      return toNotificationResponse(result);
    } catch (error) {
      this.mapNotificationError(error);
    }
  }

  @Patch('mark-all-read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read for the authenticated user' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async markAllRead(
    @CurrentUser('sub') userId: string,
  ): Promise<MarkAllNotificationsReadResponseDto> {
    const result = await this.markAllNotificationsReadUseCase.execute(userId);
    return toMarkAllNotificationsReadResponse(result);
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mark all notifications as read for the authenticated user' })
  @ApiResponse({ status: 204, description: 'All notifications marked as read' })
  async markAllAsRead(@CurrentUser('sub') userId: string) {
    await this.markAllNotificationsReadUseCase.execute(userId);
  }

  private mapNotificationError(error: unknown): never {
    if (error instanceof NotificationNotFoundError) {
      throw new NotFoundException('Không tìm thấy thông báo');
    }

    throw error;
  }
}
