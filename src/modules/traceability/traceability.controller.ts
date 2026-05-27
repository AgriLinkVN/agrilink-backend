import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TraceabilityService } from './traceability.service';
import { CreateTraceabilityDto } from './dto/create-traceability.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';
import { UserRole } from '../../common/enums';

@ApiTags('Traceability')
@Controller('trace')
export class TraceabilityController {
  constructor(private readonly traceabilityService: TraceabilityService) {}

  @Public()
  @Get(':qrCode')
  @ApiOperation({ summary: 'Scan a QR code and retrieve the traceability record (public)' })
  @ApiParam({ name: 'qrCode', description: 'The QR code string printed on the product label' })
  @ApiResponse({ status: 200, description: 'Traceability record' })
  @ApiResponse({ status: 404, description: 'QR code not found' })
  findByQrCode(@Param('qrCode') qrCode: string) {
    return this.traceabilityService.findByQrCode(qrCode);
  }

  @Public()
  @Get('product/:productId')
  @ApiOperation({ summary: 'Get all traceability records for a product (public)' })
  findByProduct(@Param('productId', ParseUuidPipe) productId: string) {
    return this.traceabilityService.findByProduct(productId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RolesGuard)
  @Roles(UserRole.farmer, UserRole.cooperative, UserRole.admin)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create a traceability record for a product batch' })
  @ApiResponse({ status: 201, description: 'Traceability record created' })
  create(
    @CurrentUser('sub') producerId: string,
    @Body() dto: CreateTraceabilityDto,
  ) {
    return this.traceabilityService.create(producerId, dto);
  }
}
