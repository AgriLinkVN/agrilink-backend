import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { AdminService } from './admin.service';
import { AdminReportService } from './admin-report.service';
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
  constructor(
    private readonly adminService: AdminService,
    private readonly adminReportService: AdminReportService,
  ) {}

  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.STATE_AGENCY)
  @ApiOperation({
    summary: 'System-wide statistics for admin/state-agency dashboard',
  })
  getStats() {
    return this.adminService.getStats();
  }

  @Get('pending-profiles')
  @Roles(UserRole.ADMIN, UserRole.STATE_AGENCY)
  @ApiOperation({ summary: 'List all pending profiles for KYC verification' })
  getPendingProfiles() {
    return this.adminService.getPendingProfiles();
  }

  @Patch('profiles/:type/:profileId/verify')
  @Roles(UserRole.ADMIN, UserRole.STATE_AGENCY)
  @ApiOperation({ summary: 'Approve or reject a profile' })
  verifyProfile(
    @Param('type') type: string,
    @Param('profileId') profileId: string,
    @Body() dto: VerifyProfileDto,
    @CurrentUser('sub') adminId: string,
    @CurrentUser('role') reviewerRole: UserRole,
  ) {
    return this.adminService.verifyProfile(
      type,
      profileId,
      dto,
      adminId,
      reviewerRole,
    );
  }

  @Get('system-configs')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List all system configuration keys' })
  getSystemConfigs() {
    return this.adminService.getSystemConfigs();
  }

  @Patch('system-configs/:key')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a system configuration value' })
  updateSystemConfig(
    @Param('key') key: string,
    @Body('value') value: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.adminService.updateSystemConfig(key, value, userId);
  }

  @Get('audit-logs')
  @Roles(UserRole.ADMIN, UserRole.STATE_AGENCY)
  @ApiOperation({ summary: 'Paginated audit logs' })
  getAuditLogs(@Query() pagination: PaginationDto) {
    return this.adminService.getAuditLogs(pagination);
  }

  @Get('disputes')
  @Roles(UserRole.ADMIN, UserRole.STATE_AGENCY)
  @ApiOperation({ summary: 'List incident reports / disputes' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['open', 'in_progress', 'resolved'],
  })
  getDisputes(
    @Query() pagination: PaginationDto,
    @Query('status') status?: string,
  ) {
    return this.adminService.getDisputes(pagination, status);
  }

  @Patch('disputes/:id/status')
  @Roles(UserRole.ADMIN, UserRole.STATE_AGENCY)
  @ApiOperation({ summary: 'Update dispute status' })
  updateDisputeStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @CurrentUser('sub') adminId: string,
  ) {
    return this.adminService.updateDisputeStatus(id, status, adminId);
  }

  @Get('products/pending')
  @Roles(UserRole.ADMIN, UserRole.STATE_AGENCY)
  @ApiOperation({ summary: 'List products awaiting approval' })
  getPendingProducts(@Query() pagination: PaginationDto) {
    return this.adminService.getPendingProducts(pagination);
  }

  @Get('products/violating')
  @Roles(UserRole.ADMIN, UserRole.STATE_AGENCY)
  @ApiOperation({
    summary: 'List suspended/rejected products (policy violations)',
  })
  getViolatingProducts(@Query() pagination: PaginationDto) {
    return this.adminService.getViolatingProducts(pagination);
  }

  @Get('cooperatives-enterprises')
  @Roles(UserRole.ADMIN, UserRole.STATE_AGENCY)
  @ApiOperation({ summary: 'List all cooperatives and enterprises' })
  getCooperativesAndEnterprises() {
    return this.adminService.getCooperativesAndEnterprises();
  }

  @Get('reports/system.pdf')
  @Roles(UserRole.ADMIN, UserRole.STATE_AGENCY)
  @ApiOperation({ summary: 'Export a system-wide overview report as PDF' })
  async exportSystemReport(@Res() res: Response) {
    const pdf = await this.adminReportService.generateSystemReportPdf();
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="agrilink-system-report-${Date.now()}.pdf"`,
      'Content-Length': pdf.length,
    });
    res.end(pdf);
  }
}
