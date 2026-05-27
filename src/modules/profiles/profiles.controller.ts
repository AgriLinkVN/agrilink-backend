import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ProfilesService } from './profiles.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UpdateFarmerProfileDto } from './dto/update-farmer-profile.dto';
import { UpdateCooperativeProfileDto } from './dto/update-cooperative-profile.dto';
import { UpdateEnterpriseProfileDto } from './dto/update-enterprise-profile.dto';
import { UpdateSupplierProfileDto } from './dto/update-supplier-profile.dto';

@ApiTags('Profiles')
@ApiBearerAuth('access-token')
@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  // ── Farmer ──────────────────────────────────────────────────────────────────

  @Get('farmer')
  @ApiOperation({ summary: 'Get the authenticated farmer\'s profile' })
  @ApiResponse({ status: 200, description: 'Farmer profile' })
  getFarmerProfile(@CurrentUser('sub') userId: string) {
    return this.profilesService.getFarmerProfile(userId);
  }

  @Patch('farmer')
  @ApiOperation({ summary: 'Create or update the authenticated farmer\'s profile' })
  @ApiResponse({ status: 200, description: 'Farmer profile saved' })
  upsertFarmerProfile(
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateFarmerProfileDto,
  ) {
    return this.profilesService.upsertFarmerProfile(userId, dto);
  }

  // ── Cooperative ──────────────────────────────────────────────────────────────

  @Get('cooperative')
  @ApiOperation({ summary: 'Get the authenticated cooperative\'s profile' })
  getCooperativeProfile(@CurrentUser('sub') userId: string) {
    return this.profilesService.getCooperativeProfile(userId);
  }

  @Patch('cooperative')
  @ApiOperation({ summary: 'Create or update the authenticated cooperative\'s profile' })
  upsertCooperativeProfile(
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateCooperativeProfileDto,
  ) {
    return this.profilesService.upsertCooperativeProfile(userId, dto);
  }

  // ── Enterprise ───────────────────────────────────────────────────────────────

  @Get('enterprise')
  @ApiOperation({ summary: 'Get the authenticated enterprise\'s profile' })
  getEnterpriseProfile(@CurrentUser('sub') userId: string) {
    return this.profilesService.getEnterpriseProfile(userId);
  }

  @Patch('enterprise')
  @ApiOperation({ summary: 'Create or update the authenticated enterprise\'s profile' })
  upsertEnterpriseProfile(
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateEnterpriseProfileDto,
  ) {
    return this.profilesService.upsertEnterpriseProfile(userId, dto);
  }

  // ── Supplier ─────────────────────────────────────────────────────────────────

  @Get('supplier')
  @ApiOperation({ summary: 'Get the authenticated supplier\'s profile' })
  getSupplierProfile(@CurrentUser('sub') userId: string) {
    return this.profilesService.getSupplierProfile(userId);
  }

  @Patch('supplier')
  @ApiOperation({ summary: 'Create or update the authenticated supplier\'s profile' })
  upsertSupplierProfile(
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateSupplierProfileDto,
  ) {
    return this.profilesService.upsertSupplierProfile(userId, dto);
  }
}
