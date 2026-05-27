import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarketPrice } from './entities/market-price.entity';
import { CreateMarketPriceDto } from './dto/create-market-price.dto';
import { MarketPriceFilterDto } from './dto/market-price-filter.dto';

@Injectable()
export class MarketPricesService {
  constructor(
    @InjectRepository(MarketPrice)
    private readonly marketPriceRepo: Repository<MarketPrice>,
  ) {}

  async findAll(filter: MarketPriceFilterDto): Promise<{ data: MarketPrice[]; total: number }> {
    throw new Error('TODO: implement MarketPricesService.findAll()');
  }

  async create(reportedBy: string, dto: CreateMarketPriceDto): Promise<MarketPrice> {
    throw new Error('TODO: implement MarketPricesService.create()');
  }
}
