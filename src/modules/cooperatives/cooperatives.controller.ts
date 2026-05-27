import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CooperativesService } from './cooperatives.service';
import { CreateBulkListingDto } from './dto/create-bulk-listing.dto';
import { CreateHarvestScheduleDto } from './dto/create-harvest-schedule.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Cooperatives')
@ApiBearerAuth('access-token')
@Controller('cooperatives')
export class CooperativesController {
  constructor(private readonly cooperativesService: CooperativesService) {}

  // ── Members ────────────────────────────────────────────────────────────────

  @Get('members')
  @ApiOperation({ summary: 'List members of the authenticated cooperative' })
  @ApiResponse({ status: 200, description: 'Array of members' })
  getMembers(@CurrentUser('sub') cooperativeId: string) {
    return this.cooperativesService.getMembers(cooperativeId);
  }

  @Post('members/:farmerId/invite')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Invite a farmer to join the cooperative' })
  inviteMember(
    @CurrentUser('sub') cooperativeId: string,
    @Param('farmerId', ParseUuidPipe) farmerId: string,
  ) {
    return this.cooperativesService.inviteMember(cooperativeId, farmerId);
  }

  @Patch('members/:memberId/status')
  @ApiOperation({ summary: 'Update member status (approve/suspend/remove)' })
  updateMemberStatus(
    @Param('memberId', ParseUuidPipe) memberId: string,
    @Body('status') status: string,
  ) {
    return this.cooperativesService.updateMemberStatus(memberId, status);
  }

  // ── Bulk Listings ──────────────────────────────────────────────────────────

  @Post('bulk-listings')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a bulk buy/sell listing for the cooperative' })
  createBulkListing(
    @CurrentUser('sub') cooperativeId: string,
    @Body() dto: CreateBulkListingDto,
  ) {
    return this.cooperativesService.createBulkListing(cooperativeId, dto);
  }

  @Get('bulk-listings')
  @ApiOperation({ summary: 'List all bulk listings for the authenticated cooperative' })
  getBulkListings(@CurrentUser('sub') cooperativeId: string) {
    return this.cooperativesService.getBulkListings(cooperativeId);
  }

  // ── Harvest Schedules ──────────────────────────────────────────────────────

  @Post('harvest-schedules')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a harvest schedule entry' })
  createHarvestSchedule(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateHarvestScheduleDto,
  ) {
    return this.cooperativesService.createHarvestSchedule(userId, dto);
  }

  @Get('harvest-schedules')
  @ApiOperation({ summary: 'List harvest schedules for the authenticated user/cooperative' })
  getHarvestSchedules(@CurrentUser('sub') userId: string) {
    return this.cooperativesService.getHarvestSchedules(userId);
  }
}
