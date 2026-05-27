import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TraceabilityRecord } from './entities/traceability-record.entity';
import { CreateTraceabilityDto } from './dto/create-traceability.dto';

@Injectable()
export class TraceabilityService {
  constructor(
    @InjectRepository(TraceabilityRecord)
    private readonly traceRepo: Repository<TraceabilityRecord>,
  ) {}

  async findByQrCode(qrCode: string): Promise<TraceabilityRecord | null> {
    throw new Error('TODO: implement TraceabilityService.findByQrCode()');
  }

  async findByProduct(productId: string): Promise<TraceabilityRecord[]> {
    throw new Error('TODO: implement TraceabilityService.findByProduct()');
  }

  async create(producerId: string, dto: CreateTraceabilityDto): Promise<TraceabilityRecord> {
    throw new Error('TODO: implement TraceabilityService.create()');
  }
}
