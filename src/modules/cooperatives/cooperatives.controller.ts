import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CooperativesService } from './cooperatives.service';
import {
  CreateBulkListingDto,
  UpdateBulkListingDto,
  BulkListingFilterDto,
} from './dto/create-bulk-listing.dto';
import {
  CreateHarvestScheduleDto,
  UpdateHarvestScheduleDto,
  RecordActualDto,
  HarvestFilterDto,
} from './dto/create-harvest-schedule.dto';
import {
  ContributeDto,
  UpdateContributionDto,
} from './dto/contribute.dto';
import {
  ApproveMemberDto,
  MemberFilterDto,
  RejectMemberDto,
  RequestJoinDto,
  SuspendMemberDto,
} from './dto/member.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';
import { UserRole } from '../../common/enums';

@ApiTags('Cooperatives')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cooperatives')
export class CooperativesController {
  constructor(private readonly service: CooperativesService) {}

  // ── Members ────────────────────────────────────────────────────────────────

  @Post(':cooperativeId/members/join')
  @Roles(UserRole.farmer)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '[Farmer] Xin gia nhập HTX' })
  @ApiResponse({ status: 201, description: 'Yêu cầu gia nhập đã gửi' })
  requestJoin(
    @CurrentUser('sub') farmerId: string,
    @Param('cooperativeId', ParseUuidPipe) cooperativeId: string,
    @Body() dto: RequestJoinDto,
  ) {
    return this.service.requestJoin(farmerId, cooperativeId, dto);
  }

  @Post(':cooperativeId/members/leave')
  @Roles(UserRole.farmer)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: '[Farmer] Rời HTX',
    description:
      'Trả 409 MEMBER_HAS_ACTIVE_CONTRIBUTIONS nếu còn contribution trong bulk listing active. Gọi lại với ?force=true để xác nhận.',
  })
  @ApiQuery({ name: 'force', required: false, type: Boolean })
  leaveCoop(
    @CurrentUser('sub') farmerId: string,
    @Param('cooperativeId', ParseUuidPipe) cooperativeId: string,
    @Query('force') force?: string,
  ) {
    return this.service.leaveCooperative(
      farmerId,
      cooperativeId,
      force === 'true',
    );
  }

  @Get('me/members')
  @Roles(UserRole.cooperative)
  @ApiOperation({ summary: '[HTX] Danh sách thành viên của tôi' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  listMembers(
    @CurrentUser('sub') cooperativeId: string,
    @Query() filter: MemberFilterDto,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.service.listMembers(
      cooperativeId,
      filter,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Get('me/my-cooperatives')
  @Roles(UserRole.farmer)
  @ApiOperation({ summary: '[Farmer] HTX của tôi (active)' })
  listMyCoops(@CurrentUser('sub') farmerId: string) {
    return this.service.listMyCooperatives(farmerId);
  }

  @Patch('me/members/:memberId/approve')
  @Roles(UserRole.cooperative)
  @ApiOperation({ summary: '[HTX] Duyệt thành viên pending' })
  approveMember(
    @CurrentUser('sub') cooperativeId: string,
    @Param('memberId', ParseUuidPipe) memberId: string,
    @Body() dto: ApproveMemberDto,
  ) {
    return this.service.approveMember(cooperativeId, memberId, dto);
  }

  @Patch('me/members/:memberId/reject')
  @Roles(UserRole.cooperative)
  @ApiOperation({ summary: '[HTX] Từ chối thành viên pending' })
  rejectMember(
    @CurrentUser('sub') cooperativeId: string,
    @Param('memberId', ParseUuidPipe) memberId: string,
    @Body() dto: RejectMemberDto,
  ) {
    return this.service.rejectMember(cooperativeId, memberId, dto);
  }

  @Patch('me/members/:memberId/suspend')
  @Roles(UserRole.cooperative)
  @ApiOperation({
    summary: '[HTX] Tạm dừng thành viên active',
    description:
      'Trả 409 MEMBER_HAS_ACTIVE_CONTRIBUTIONS nếu thành viên còn contribution trong bulk listing active. Gọi lại với ?force=true để xác nhận.',
  })
  @ApiQuery({ name: 'force', required: false, type: Boolean })
  suspendMember(
    @CurrentUser('sub') cooperativeId: string,
    @Param('memberId', ParseUuidPipe) memberId: string,
    @Body() dto: SuspendMemberDto,
    @Query('force') force?: string,
  ) {
    return this.service.suspendMember(
      cooperativeId,
      memberId,
      dto,
      force === 'true',
    );
  }

  @Patch('me/members/:memberId/reactivate')
  @Roles(UserRole.cooperative)
  @ApiOperation({ summary: '[HTX] Kích hoạt lại thành viên suspended' })
  reactivateMember(
    @CurrentUser('sub') cooperativeId: string,
    @Param('memberId', ParseUuidPipe) memberId: string,
  ) {
    return this.service.reactivateMember(cooperativeId, memberId);
  }

  // ── Bulk Listings ──────────────────────────────────────────────────────────

  @Post('me/bulk-listings')
  @Roles(UserRole.cooperative)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '[HTX] Tạo bulk listing (pending_approval)' })
  createBulk(
    @CurrentUser('sub') cooperativeId: string,
    @Body() dto: CreateBulkListingDto,
  ) {
    return this.service.createBulkListing(cooperativeId, dto);
  }

  @Get('me/bulk-listings')
  @Roles(UserRole.cooperative)
  @ApiOperation({ summary: '[HTX] Danh sách bulk listing của tôi' })
  listMyBulk(
    @CurrentUser('sub') cooperativeId: string,
    @Query() filter: BulkListingFilterDto,
  ) {
    return this.service.listMyBulkListings(cooperativeId, filter);
  }

  @Put('me/bulk-listings/:id')
  @Roles(UserRole.cooperative)
  @ApiOperation({ summary: '[HTX] Cập nhật bulk listing' })
  updateBulk(
    @CurrentUser('sub') cooperativeId: string,
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: UpdateBulkListingDto,
  ) {
    return this.service.updateBulkListing(cooperativeId, id, dto);
  }

  @Patch('me/bulk-listings/:id/publish')
  @Roles(UserRole.cooperative)
  @ApiOperation({ summary: '[HTX] Xuất bản bulk listing' })
  publishBulk(
    @CurrentUser('sub') cooperativeId: string,
    @Param('id', ParseUuidPipe) id: string,
  ) {
    return this.service.publishBulkListing(cooperativeId, id);
  }

  @Patch('me/bulk-listings/:id/archive')
  @Roles(UserRole.cooperative)
  @ApiOperation({ summary: '[HTX] Đóng / lưu trữ bulk listing' })
  archiveBulk(
    @CurrentUser('sub') cooperativeId: string,
    @Param('id', ParseUuidPipe) id: string,
  ) {
    return this.service.archiveBulkListing(cooperativeId, id);
  }

  /** Public — marketplace integration. */
  @Public()
  @Get('bulk-listings')
  @ApiOperation({ summary: '[Public] Bulk listings đang active' })
  listPublicBulk(@Query() filter: BulkListingFilterDto) {
    return this.service.listPublicBulkListings(filter);
  }

  @Public()
  @Get('bulk-listings/:id')
  @ApiOperation({ summary: '[Public] Chi tiết bulk listing + contributions' })
  getBulk(@Param('id', ParseUuidPipe) id: string) {
    return this.service.getBulkListingById(id);
  }

  // ── Contributions ──────────────────────────────────────────────────────────

  @Post('bulk-listings/:id/contributions')
  @Roles(UserRole.farmer)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '[Farmer] Đóng góp vào bulk listing' })
  contribute(
    @CurrentUser('sub') farmerId: string,
    @Param('id', ParseUuidPipe) listingId: string,
    @Body() dto: ContributeDto,
  ) {
    return this.service.contribute(farmerId, listingId, dto);
  }

  @Get('bulk-listings/:id/contributions')
  @Public()
  @ApiOperation({ summary: 'Danh sách đóng góp của 1 bulk listing' })
  listContrib(@Param('id', ParseUuidPipe) id: string) {
    return this.service.listContributions(id);
  }

  @Patch('contributions/:id')
  @Roles(UserRole.farmer)
  @ApiOperation({ summary: '[Farmer] Sửa đóng góp của mình' })
  updateContrib(
    @CurrentUser('sub') farmerId: string,
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: UpdateContributionDto,
  ) {
    return this.service.updateContribution(farmerId, id, dto);
  }

  @Delete('contributions/:id')
  @Roles(UserRole.farmer)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '[Farmer] Hủy đóng góp của mình' })
  removeContrib(
    @CurrentUser('sub') farmerId: string,
    @Param('id', ParseUuidPipe) id: string,
  ) {
    return this.service.removeContribution(farmerId, id);
  }

  // ── Harvest Schedules ──────────────────────────────────────────────────────

  @Post('harvest-schedules')
  @Roles(UserRole.farmer, UserRole.cooperative)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo lịch thu hoạch' })
  createHarvest(
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: UserRole,
    @Body() dto: CreateHarvestScheduleDto,
  ) {
    return this.service.createHarvest(userId, role, dto);
  }

  @Get('harvest-schedules')
  @Roles(UserRole.farmer, UserRole.cooperative)
  @ApiOperation({ summary: 'Danh sách lịch thu hoạch (theo role)' })
  listHarvest(
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: UserRole,
    @Query() filter: HarvestFilterDto,
  ) {
    return this.service.listHarvests(userId, role, filter);
  }

  @Put('harvest-schedules/:id')
  @Roles(UserRole.farmer, UserRole.cooperative)
  @ApiOperation({ summary: 'Cập nhật lịch thu hoạch' })
  updateHarvest(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: UpdateHarvestScheduleDto,
  ) {
    return this.service.updateHarvest(userId, id, dto);
  }

  @Patch('harvest-schedules/:id/actual')
  @Roles(UserRole.farmer, UserRole.cooperative)
  @ApiOperation({ summary: 'Ghi nhận sản lượng thực tế' })
  recordActual(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: RecordActualDto,
  ) {
    return this.service.recordActual(userId, id, dto);
  }

  @Delete('harvest-schedules/:id')
  @Roles(UserRole.farmer, UserRole.cooperative)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xóa lịch thu hoạch' })
  removeHarvest(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUuidPipe) id: string,
  ) {
    return this.service.removeHarvest(userId, id);
  }

  // ── Reports ───────────────────────────────────────────────────────────────

  @Get('me/reports/production')
  @Roles(UserRole.cooperative)
  @ApiOperation({ summary: '[HTX] Báo cáo sản lượng' })
  @ApiQuery({ name: 'from', required: false, example: '2026-01-01' })
  @ApiQuery({ name: 'to', required: false, example: '2026-12-31' })
  getReport(
    @CurrentUser('sub') cooperativeId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.getProductionReport(cooperativeId, from, to);
  }

  @Get('me/reports/production.csv')
  @Roles(UserRole.cooperative)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="production-report.csv"')
  @ApiOperation({ summary: '[HTX] Xuất CSV báo cáo sản lượng' })
  async exportCsv(
    @CurrentUser('sub') cooperativeId: string,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @Res() res: Response,
  ) {
    const csv = await this.service.exportProductionReportCsv(
      cooperativeId,
      from,
      to,
    );
    // BOM for Excel Vietnamese readability
    res.send('﻿' + csv);
  }
}
