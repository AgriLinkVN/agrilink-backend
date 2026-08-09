import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TraceabilityBatch } from './entities/traceability-batch.entity';
import { TraceabilityEvent } from './entities/traceability-event.entity';
import { AppendTraceabilityEventDto, CreateTraceabilityDto } from './dto/create-traceability.dto';
import { projectTraceability, TraceabilityEventFact } from './application/traceability-projection';

@Injectable()
export class TraceabilityService {
  constructor(
    @InjectRepository(TraceabilityBatch)
    private readonly batchRepo: Repository<TraceabilityBatch>,
    @InjectRepository(TraceabilityEvent)
    private readonly eventRepo: Repository<TraceabilityEvent>,
  ) {}

  async findByQrCode(qrCode: string) {
    const batch = await this.batchRepo.findOneBy({ qrCode });
    return batch ? this.project(batch) : null;
  }

  async findByProduct(productId: string) {
    const batches = await this.batchRepo.findBy({ productId });
    return Promise.all(batches.map((batch) => this.project(batch)));
  }

  async create(producerId: string, dto: CreateTraceabilityDto) {
    const existing = await this.eventRepo.findOneBy({ operationKey: dto.operationKey });
    if (existing) return this.projectById(existing.batchId);
    const batch = await this.batchRepo.save(this.batchRepo.create({
      productId: dto.productId, producerId, batchCode: dto.batchCode, qrCode: dto.qrCode,
    }));
    await this.eventRepo.save(this.eventRepo.create({
      batchId: batch.id, sequence: 1, eventKind: 'BATCH_CREATED', occurredAt: batch.createdAt,
      payload: { productId: dto.productId, batchCode: dto.batchCode }, evidenceFileIds: [],
      operationKey: dto.operationKey, supersedesEventId: null,
    }));
    return this.project(batch);
  }

  async appendEvent(batchId: string, dto: AppendTraceabilityEventDto) {
    const existing = await this.eventRepo.findOneBy({ operationKey: dto.operationKey });
    if (existing) return this.projectById(existing.batchId);
    const count = await this.eventRepo.countBy({ batchId });
    await this.eventRepo.save(this.eventRepo.create({
      batchId, sequence: count + 1, eventKind: dto.kind, occurredAt: new Date(dto.occurredAt),
      payload: dto.payload, evidenceFileIds: dto.evidenceFileIds ?? [], operationKey: dto.operationKey,
      supersedesEventId: null,
    }));
    return this.projectById(batchId);
  }

  private async projectById(batchId: string) {
    const batch = await this.batchRepo.findOneByOrFail({ id: batchId });
    return this.project(batch);
  }

  private async project(batch: TraceabilityBatch) {
    const events = await this.eventRepo.find({ where: { batchId: batch.id }, order: { sequence: 'ASC', id: 'ASC' } });
    const facts: TraceabilityEventFact[] = events.map((event) => ({
      id: event.id, batchId: event.batchId, sequence: event.sequence,
      kind: event.eventKind as TraceabilityEventFact['kind'], occurredAt: event.occurredAt.toISOString(),
      payload: event.payload, supersedesEventId: event.supersedesEventId,
    }));
    return { batch: { id: batch.id, productId: batch.productId, producerId: batch.producerId, batchCode: batch.batchCode, qrCode: batch.qrCode }, ...projectTraceability(batch.id, facts) };
  }
}
