import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GeographyService } from './geography.service';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Geography')
@Controller('geography')
export class GeographyController {
  constructor(private readonly geographyService: GeographyService) {}

  @Public()
  @Get('provinces')
  @ApiOperation({ summary: 'List all Vietnamese provinces' })
  @ApiResponse({ status: 200, description: 'Array of provinces' })
  findAllProvinces() {
    return this.geographyService.findAllProvinces();
  }

  @Public()
  @Get('provinces/:id/districts')
  @ApiOperation({ summary: 'List all districts in a province' })
  @ApiResponse({ status: 200, description: 'Array of districts' })
  findDistricts(@Param('id', ParseUuidPipe) provinceId: string) {
    return this.geographyService.findDistrictsByProvince(provinceId);
  }
}
