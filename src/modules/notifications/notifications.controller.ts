import { Controller, Get, HttpCode, HttpStatus, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('Notifications')
@ApiBearerAuth('access-token')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all notifications for the authenticated user' })
  @ApiResponse({ status: 200, description: 'Paginated notifications' })
  findAll(
    @CurrentUser('sub') userId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.notificationsService.findAll(userId, pagination);
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a single notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  markAsRead(
    @Param('id', ParseUuidPipe) notifId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.notificationsService.markAsRead(notifId, userId);
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mark all notifications as read for the authenticated user' })
  @ApiResponse({ status: 204, description: 'All notifications marked as read' })
  markAllAsRead(@CurrentUser('sub') userId: string) {
    return this.notificationsService.markAllAsRead(userId);
  }
}
