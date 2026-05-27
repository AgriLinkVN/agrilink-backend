import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketPricesController } from './market-prices.controller';
import { MarketPricesService } from './market-prices.service';
import { MarketPrice } from './entities/market-price.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MarketPrice])],
  controllers: [MarketPricesController],
  providers: [MarketPricesService],
  exports: [MarketPricesService],
})
export class MarketPricesModule {}
