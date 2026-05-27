import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../common/enums';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('Admin')
@ApiBearerAuth('access-token')
@UseGuards(RolesGuard)
@Roles(UserRole.admin)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('system-configs')
  @ApiOperation({ summary: '(Admin) List all system configuration keys and values' })
  @ApiResponse({ status: 200, description: 'Array of system configs' })
  getSystemConfigs() {
    return this.adminService.getSystemConfigs();
  }

  @Patch('system-configs/:key')
  @ApiOperation({ summary: '(Admin) Update a system configuration value' })
  @ApiResponse({ status: 200, description: 'Config updated' })
  updateSystemConfig(
    @Param('key') key: string,
    @Body('value') value: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.adminService.updateSystemConfig(key, value, userId);
  }

  @Get('audit-logs')
  @ApiOperation({ summary: '(Admin) Get paginated audit logs' })
  @ApiResponse({ status: 200, description: 'Paginated audit log entries' })
  getAuditLogs(@Query() pagination: PaginationDto) {
    return this.adminService.getAuditLogs(pagination);
  }
}
