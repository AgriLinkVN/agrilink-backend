import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { ProfilesService } from './profiles.service';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Farm')
@Controller('farm')
export class FarmPublicController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Public()
  @Get(':userId')
  @ApiOperation({ summary: 'Get public farm profile by userId' })
  @ApiResponse({ status: 200, description: 'Farm profile' })
  @ApiResponse({ status: 404, description: 'Farm not found' })
  async getFarmPublic(@Param('userId', ParseUuidPipe) userId: string) {
    const profile = await this.profilesService.getFarmerProfile(userId);
    if (!profile) throw new NotFoundException('Farm profile not found');
    return profile;
  }
}
