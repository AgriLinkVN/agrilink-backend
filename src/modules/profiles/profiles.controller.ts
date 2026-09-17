import { Body, Controller, Put, BadRequestException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ProfilesService } from './profiles.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { UpsertFarmerProfileDto } from './dto/upsert-farmer-profile.dto';
import { UpsertB2bProfileDto } from './dto/upsert-b2b-profile.dto';

@ApiTags('Profiles')
@ApiBearerAuth('access-token')
@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Put('farmer')
  @Roles(UserRole.FARMER)
  @ApiOperation({ summary: 'Create or update the authenticated farmer\'s profile' })
  @ApiResponse({ status: 200, description: 'Farmer profile saved' })
  async upsertFarmerProfile(
    @CurrentUser('sub') userId: string,
    @Body() dto: UpsertFarmerProfileDto,
  ) {
    return this.profilesService.upsertFarmerProfile(userId, dto);
  }

  @Put('b2b')
  @Roles(UserRole.COOPERATIVE, UserRole.ENTERPRISE, UserRole.SUPPLIER)
  @ApiOperation({ summary: 'Create or update the authenticated B2B (Coop/Enterprise/Supplier) profile' })
  async upsertB2bProfile(
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: UserRole,
    @Body() dto: UpsertB2bProfileDto,
  ) {
    return this.profilesService.upsertB2bProfile(userId, role, dto);
  }
}
