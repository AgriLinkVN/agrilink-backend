import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Optional,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdsService } from './ads.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { RejectCampaignDto } from './dto/reject-campaign.dto';
import { TrackEventDto } from './dto/track-event.dto';
import { CreatePackageDto, UpdatePackageDto } from './dto/create-package.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';
import { UserRole, AdStatus } from '../../common/enums';

@ApiTags('Ads')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ads')
export class AdsController {
  constructor(private readonly adsService: AdsService) {}

  // ── Public: Packages ───────────────────────────────────────────────────────

  @Public()
  @Get('packages')
  @ApiOperation({ summary: 'Lấy danh sách gói quảng cáo đang hoạt động (public)' })
  @ApiResponse({ status: 200, description: 'Danh sách gói quảng cáo active' })
  getPackages() {
    return this.adsService.getPackages();
  }

  // ── Public: Active Banners ─────────────────────────────────────────────────

  @Public()
  @Get('banners')
  @ApiOperation({ summary: 'Lấy banner quảng cáo đang chạy (public, tối đa 3)' })
  @ApiQuery({ name: 'province_id', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Mảng campaign active' })
  getActiveBanners(@Query('province_id') provinceId?: number) {
    return this.adsService.getActiveBanners(provinceId ? Number(provinceId) : undefined);
  }

  // ── Public: Event Tracking ─────────────────────────────────────────────────

  @Public()
  @Post('events')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Ghi nhận sự kiện impression/click' })
  @ApiResponse({ status: 204, description: 'Đã ghi nhận' })
  async trackEvent(
    @Body() dto: TrackEventDto,
    @Req() req: Request & { user?: { sub?: string } },
  ) {
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
      req.ip ??
      'unknown';
    const userAgent = (req.headers['user-agent'] as string) ?? '';
    // userId comes from server-side auth context if available, never from client body
    const userId = req.user?.sub ?? null;
    await this.adsService.trackEvent({
      ...dto,
      userId,
      ipAddress,
      userAgent,
    });
  }

  // ── Supplier: Campaign CRUD ────────────────────────────────────────────────

  @Post('campaigns')
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.supplier)
  @ApiOperation({ summary: '[Supplier] Tạo chiến dịch quảng cáo mới' })
  @ApiResponse({ status: 201, description: 'Chiến dịch đã tạo — chờ admin duyệt' })
  createCampaign(
    @CurrentUser('sub') supplierId: string,
    @Body() dto: CreateCampaignDto,
  ) {
    return this.adsService.createCampaign(supplierId, dto);
  }

  @Get('campaigns')
  @Roles(UserRole.supplier)
  @ApiOperation({ summary: '[Supplier] Lấy danh sách chiến dịch của mình' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Danh sách chiến dịch phân trang' })
  getCampaignsBySupplier(
    @CurrentUser('sub') supplierId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adsService.getCampaignsBySupplier(
      supplierId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Get('campaigns/:id')
  @Roles(UserRole.supplier)
  @ApiOperation({ summary: '[Supplier] Xem chi tiết một chiến dịch' })
  @ApiResponse({ status: 200, description: 'Chi tiết chiến dịch' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy' })
  getCampaignDetail(
    @Param('id', ParseUuidPipe) id: string,
    @CurrentUser('sub') supplierId: string,
  ) {
    return this.adsService.getCampaignDetail(id, supplierId);
  }

  @Get('campaigns/:id/analytics')
  @Roles(UserRole.supplier)
  @ApiOperation({ summary: '[Supplier] Phân tích hiệu quả chiến dịch (daily impressions/clicks/CTR)' })
  @ApiResponse({ status: 200, description: 'Thống kê analytics' })
  getCampaignAnalytics(
    @Param('id', ParseUuidPipe) id: string,
    @CurrentUser('sub') supplierId: string,
  ) {
    return this.adsService.getCampaignAnalytics(id, supplierId);
  }

  @Patch('campaigns/:id/pause')
  @Roles(UserRole.supplier)
  @ApiOperation({ summary: '[Supplier] Tạm dừng chiến dịch đang chạy' })
  pauseCampaign(
    @Param('id', ParseUuidPipe) id: string,
    @CurrentUser('sub') supplierId: string,
  ) {
    return this.adsService.pauseCampaign(id, supplierId);
  }

  @Patch('campaigns/:id/resume')
  @Roles(UserRole.supplier)
  @ApiOperation({ summary: '[Supplier] Tiếp tục chiến dịch đang tạm dừng' })
  resumeCampaign(
    @Param('id', ParseUuidPipe) id: string,
    @CurrentUser('sub') supplierId: string,
  ) {
    return this.adsService.resumeCampaign(id, supplierId);
  }

  // ── Admin: Campaign Moderation ─────────────────────────────────────────────

  @Get('admin/campaigns')
  @Roles(UserRole.admin)
  @ApiOperation({ summary: '[Admin] Danh sách tất cả chiến dịch' })
  @ApiQuery({ name: 'status', enum: AdStatus, required: false })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  getCampaignsAdmin(
    @Query('status') status?: AdStatus,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adsService.getCampaignsAdmin({
      status,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  @Get('admin/campaigns/:id')
  @Roles(UserRole.admin)
  @ApiOperation({ summary: '[Admin] Chi tiết một chiến dịch' })
  getCampaignAdminDetail(@Param('id', ParseUuidPipe) id: string) {
    return this.adsService.getCampaignAdminDetail(id);
  }

  @Patch('admin/campaigns/:id/approve')
  @Roles(UserRole.admin)
  @ApiOperation({ summary: '[Admin] Duyệt chiến dịch chờ phê duyệt' })
  approveCampaign(
    @Param('id', ParseUuidPipe) id: string,
    @CurrentUser('sub') adminId: string,
  ) {
    return this.adsService.approveCampaign(id, adminId);
  }

  @Patch('admin/campaigns/:id/reject')
  @Roles(UserRole.admin)
  @ApiOperation({ summary: '[Admin] Từ chối chiến dịch chờ phê duyệt' })
  rejectCampaign(
    @Param('id', ParseUuidPipe) id: string,
    @CurrentUser('sub') adminId: string,
    @Body() dto: RejectCampaignDto,
  ) {
    return this.adsService.rejectCampaign(id, adminId, dto.reason);
  }

  // ── Admin: Package CRUD ───────────────────────────────────────────────────

  @Get('admin/packages')
  @Roles(UserRole.admin)
  @ApiOperation({ summary: '[Admin] Danh sách toàn bộ gói (kể cả disabled)' })
  getAllPackages() {
    return this.adsService.getAllPackages();
  }

  @Post('admin/packages')
  @Roles(UserRole.admin)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '[Admin] Tạo gói quảng cáo mới' })
  createPackage(@Body() dto: CreatePackageDto) {
    return this.adsService.createPackage(dto);
  }

  @Put('admin/packages/:id')
  @Roles(UserRole.admin)
  @ApiOperation({ summary: '[Admin] Cập nhật gói quảng cáo' })
  updatePackage(@Param('id', ParseUuidPipe) id: string, @Body() dto: UpdatePackageDto) {
    return this.adsService.updatePackage(id, dto);
  }

  @Patch('admin/packages/:id/deactivate')
  @Roles(UserRole.admin)
  @ApiOperation({ summary: '[Admin] Vô hiệu hóa gói quảng cáo' })
  deactivatePackage(@Param('id', ParseUuidPipe) id: string) {
    return this.adsService.deactivatePackage(id);
  }
}
