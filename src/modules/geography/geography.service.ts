import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Province } from './entities/province.entity';
import { District } from './entities/district.entity';

@Injectable()
export class GeographyService {
  constructor(
    @InjectRepository(Province)
    private readonly provinceRepo: Repository<Province>,
    @InjectRepository(District)
    private readonly districtRepo: Repository<District>,
  ) {}

  async findAllProvinces(): Promise<Province[]> {
    return this.provinceRepo.find({ order: { name: 'ASC' } });
  }

  async findDistrictsByProvince(provinceId: string): Promise<District[]> {
    return this.districtRepo.find({
      where: { provinceId },
      order: { name: 'ASC' },
    });
  }
}
