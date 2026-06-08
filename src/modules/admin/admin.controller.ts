import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../common/enums';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { VerifyProfileDto } from './dto/verify-profile.dto';

@ApiTags('Admin')
@ApiBearerAuth('access-token')
@UseGuards(RolesGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('pending-profiles')
  @Roles(UserRole.ADMIN, UserRole.STATE_AGENCY)
  @ApiOperation({ summary: '(Admin) List all pending profiles for KYC verification' })
  @ApiResponse({ status: 200, description: 'List of pending profiles' })
  getPendingProfiles() {
    return this.adminService.getPendingProfiles();
  }

  @Patch('profiles/:type/:profileId/verify')
  @Roles(UserRole.ADMIN, UserRole.STATE_AGENCY)
  @ApiOperation({ summary: '(Admin) Verify or reject a profile' })
  @ApiResponse({ status: 200, description: 'Profile verification updated' })
  verifyProfile(
    @Param('type') type: string,
    @Param('profileId') profileId: string,
    @Body() dto: VerifyProfileDto,
    @CurrentUser('sub') adminId: string,
  ) {
    return this.adminService.verifyProfile(type, profileId, dto, adminId);
  }

  @Get('system-configs')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '(Admin) List all system configuration keys and values' })
  @ApiResponse({ status: 200, description: 'Array of system configs' })
  getSystemConfigs() {
    return this.adminService.getSystemConfigs();
  }

  @Patch('system-configs/:key')
  @Roles(UserRole.ADMIN)
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
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '(Admin) Get paginated audit logs' })
  @ApiResponse({ status: 200, description: 'Paginated audit log entries' })
  getAuditLogs(@Query() pagination: PaginationDto) {
    return this.adminService.getAuditLogs(pagination);
  }
}
