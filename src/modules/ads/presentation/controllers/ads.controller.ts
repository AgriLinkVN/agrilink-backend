import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';

import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Public } from '@common/decorators/public.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { UserRole } from '@common/enums';
import { ParseUuidPipe } from '@common/pipes/parse-uuid.pipe';
import {
  ApproveAdCampaignUseCase,
  CreateAdCampaignUseCase,
  GetAdCampaignForModerationUseCase,
  GetSupplierAdCampaignUseCase,
  ListActiveAdBannersUseCase,
  ListAdCampaignsForModerationUseCase,
  ListAdPackagesUseCase,
  ListSupplierAdCampaignsUseCase,
  PauseAdCampaignUseCase,
  RejectAdCampaignUseCase,
  ResumeAdCampaignUseCase,
  TrackAdEventUseCase,
} from '../../application/use-cases/ads.use-cases';
import { CreateAdCampaignDto } from '../dto/create-ad-campaign.dto';
import {
  AdBannerQueryDto,
  AdCampaignModerationQueryDto,
  AdCampaignQueryDto,
} from '../dto/ad-campaign-query.dto';
import { RejectAdCampaignDto } from '../dto/reject-ad-campaign.dto';
import { TrackAdEventDto } from '../dto/track-ad-event.dto';
import { mapAdsApplicationError } from '../mappers/ads-error.mapper';

@ApiTags('Ads')
@ApiBearerAuth('access-token')
@Controller('ads')
export class AdsController {
  constructor(
    private readonly listPackages: ListAdPackagesUseCase,
    private readonly createCampaign: CreateAdCampaignUseCase,
    private readonly listCampaigns: ListSupplierAdCampaignsUseCase,
    private readonly getCampaign: GetSupplierAdCampaignUseCase,
    private readonly pauseCampaign: PauseAdCampaignUseCase,
    private readonly resumeCampaign: ResumeAdCampaignUseCase,
    private readonly listBanners: ListActiveAdBannersUseCase,
    private readonly trackEvent: TrackAdEventUseCase,
    private readonly listModerationCampaigns: ListAdCampaignsForModerationUseCase,
    private readonly getModerationCampaign: GetAdCampaignForModerationUseCase,
    private readonly approveCampaign: ApproveAdCampaignUseCase,
    private readonly rejectCampaign: RejectAdCampaignUseCase,
  ) {}

  private async execute<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      return mapAdsApplicationError(error);
    }
  }

  @Public()
  @Get('packages')
  @ApiOperation({ summary: 'Danh sách gói quảng cáo đang hoạt động' })
  getPackages() {
    return this.listPackages.execute();
  }

  @Public()
  @Get('banners')
  @ApiOperation({ summary: 'Danh sách banner quảng cáo đang chạy' })
  getBanners(@Query() query: AdBannerQueryDto) {
    return this.listBanners.execute(query.province_id);
  }

  @Public()
  @Post('events')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Ghi nhận impression hoặc click quảng cáo' })
  async track(
    @Body() dto: TrackAdEventDto,
    @CurrentUser('sub') userId: string | undefined,
    @Req() request: Request,
  ): Promise<void> {
    const forwardedFor = request.headers['x-forwarded-for'];
    const ipAddress = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : forwardedFor?.split(',')[0]?.trim() ?? request.ip ?? null;
    await this.trackEvent.execute({
      ...dto,
      userId: userId ?? null,
      ipAddress,
      userAgent: request.headers['user-agent'] ?? null,
    });
  }

  @Post('campaigns')
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.SUPPLIER)
  @ApiOperation({ summary: 'Tạo chiến dịch quảng cáo mới' })
  @ApiResponse({ status: 201, description: 'Chiến dịch chờ duyệt' })
  create(
    @CurrentUser('sub') supplierId: string,
    @Body() dto: CreateAdCampaignDto,
  ) {
    return this.execute(() => this.createCampaign.execute(supplierId, dto));
  }

  @Get('campaigns')
  @Roles(UserRole.SUPPLIER)
  @ApiOperation({ summary: 'Danh sách chiến dịch của supplier hiện tại' })
  list(
    @CurrentUser('sub') supplierId: string,
    @Query() query: AdCampaignQueryDto,
  ) {
    return this.listCampaigns.execute(supplierId, query);
  }

  @Get('campaigns/:id')
  @Roles(UserRole.SUPPLIER)
  @ApiOperation({ summary: 'Chi tiết chiến dịch của supplier hiện tại' })
  get(
    @Param('id', ParseUuidPipe) id: string,
    @CurrentUser('sub') supplierId: string,
  ) {
    return this.execute(() => this.getCampaign.execute(id, supplierId));
  }

  @Patch('campaigns/:id/pause')
  @Roles(UserRole.SUPPLIER)
  @ApiOperation({ summary: 'Tạm dừng chiến dịch đang chạy' })
  pause(
    @Param('id', ParseUuidPipe) id: string,
    @CurrentUser('sub') supplierId: string,
  ) {
    return this.execute(() => this.pauseCampaign.execute(id, supplierId));
  }

  @Patch('campaigns/:id/resume')
  @Roles(UserRole.SUPPLIER)
  @ApiOperation({ summary: 'Tiếp tục chiến dịch đã tạm dừng' })
  resume(
    @Param('id', ParseUuidPipe) id: string,
    @CurrentUser('sub') supplierId: string,
  ) {
    return this.execute(() => this.resumeCampaign.execute(id, supplierId));
  }

  @Get('admin/campaigns')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Danh sách chiến dịch cho admin kiểm duyệt' })
  listForModeration(@Query() query: AdCampaignModerationQueryDto) {
    return this.listModerationCampaigns.execute(query);
  }

  @Get('admin/campaigns/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Chi tiết chiến dịch cho admin kiểm duyệt' })
  getForModeration(@Param('id', ParseUuidPipe) id: string) {
    return this.execute(() => this.getModerationCampaign.execute(id));
  }

  @Patch('admin/campaigns/:id/approve')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Duyệt chiến dịch đang chờ phê duyệt' })
  approve(
    @Param('id', ParseUuidPipe) id: string,
    @CurrentUser('sub') adminId: string,
  ) {
    return this.execute(() => this.approveCampaign.execute(id, adminId));
  }

  @Patch('admin/campaigns/:id/reject')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Từ chối chiến dịch đang chờ phê duyệt' })
  reject(
    @Param('id', ParseUuidPipe) id: string,
    @CurrentUser('sub') adminId: string,
    @Body() dto: RejectAdCampaignDto,
  ) {
    return this.execute(() => this.rejectCampaign.execute(id, adminId, dto.reason));
  }
}
