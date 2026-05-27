import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AdsService } from './ads.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { AdEventType } from './entities/ad-event.entity';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Ads')
@Controller('ads')
export class AdsController {
  constructor(private readonly adsService: AdsService) {}

  // ── Packages ───────────────────────────────────────────────────────────────

  @Public()
  @Get('packages')
  @ApiOperation({ summary: 'List all available ad packages (public)' })
  @ApiResponse({ status: 200, description: 'Array of ad packages' })
  getPackages() {
    return this.adsService.getPackages();
  }

  // ── Campaigns ──────────────────────────────────────────────────────────────

  @Post('campaigns')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create a new ad campaign' })
  @ApiResponse({ status: 201, description: 'Campaign created (pending approval)' })
  createCampaign(
    @CurrentUser('sub') advertiserId: string,
    @Body() dto: CreateCampaignDto,
  ) {
    return this.adsService.createCampaign(advertiserId, dto);
  }

  @Get('campaigns')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List the authenticated advertiser\'s campaigns' })
  getCampaigns(@CurrentUser('sub') advertiserId: string) {
    return this.adsService.getCampaigns(advertiserId);
  }

  @Get('campaigns/:id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get a single campaign by ID' })
  getCampaign(@Param('id', ParseUuidPipe) id: string) {
    return this.adsService.getCampaign(id);
  }

  @Patch('campaigns/:id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update a campaign (owner only)' })
  updateCampaign(
    @Param('id', ParseUuidPipe) id: string,
    @CurrentUser('sub') advertiserId: string,
    @Body() data: any,
  ) {
    return this.adsService.updateCampaign(id, advertiserId, data);
  }

  @Delete('campaigns/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete a campaign (owner only)' })
  deleteCampaign(
    @Param('id', ParseUuidPipe) id: string,
    @CurrentUser('sub') advertiserId: string,
  ) {
    return this.adsService.deleteCampaign(id, advertiserId);
  }

  // ── Event Tracking ─────────────────────────────────────────────────────────

  @Public()
  @Post('campaigns/:id/events')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Track an ad event (impression or click) — public, called by frontend' })
  trackEvent(
    @Param('id', ParseUuidPipe) campaignId: string,
    @Body('eventType') eventType: AdEventType,
    @CurrentUser('sub') userId: string,
  ) {
    return this.adsService.trackEvent(campaignId, eventType, userId);
  }
}
