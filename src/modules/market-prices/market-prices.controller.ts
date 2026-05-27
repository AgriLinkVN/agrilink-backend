import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MarketPricesService } from './market-prices.service';
import { CreateMarketPriceDto } from './dto/create-market-price.dto';
import { MarketPriceFilterDto } from './dto/market-price-filter.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../common/enums';

@ApiTags('Market Prices')
@Controller('market-prices')
export class MarketPricesController {
  constructor(private readonly marketPricesService: MarketPricesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get market price data with filters (public)' })
  @ApiResponse({ status: 200, description: 'Paginated market prices' })
  findAll(@Query() filter: MarketPriceFilterDto) {
    return this.marketPricesService.findAll(filter);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RolesGuard)
  @Roles(UserRole.admin, UserRole.state_agency, UserRole.government)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '(Admin/State Agency) Submit a new market price entry' })
  @ApiResponse({ status: 201, description: 'Market price recorded' })
  create(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateMarketPriceDto,
  ) {
    return this.marketPricesService.create(userId, dto);
  }
}
