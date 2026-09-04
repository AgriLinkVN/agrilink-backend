import { Injectable } from "@nestjs/common";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import { DataSource, EntityManager, Repository } from "typeorm";
import { isDeepStrictEqual } from "util";
import { TraceabilityBatch } from "./entities/traceability-batch.entity";
import { TraceabilityEvent } from "./entities/traceability-event.entity";
import {
  AppendTraceabilityEventDto,
  CreateTraceabilityDto,
} from "./dto/create-traceability.dto";
import {
  projectTraceability,
  TraceabilityEventFact,
} from "./application/traceability-projection";

const OPERATION_KEY_CONSTRAINT = "UQ_traceability_events_operation_key";

@Injectable()
export class TraceabilityService {
  constructor(
    @InjectRepository(TraceabilityBatch)
    private readonly batchRepo: Repository<TraceabilityBatch>,
    @InjectRepository(TraceabilityEvent)
    private readonly eventRepo: Repository<TraceabilityEvent>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
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
    try {
      const batchId = await this.dataSource.transaction(async (manager) => {
        await this.lockOperationKey(manager, dto.operationKey);
        const replay = await manager.findOneBy(TraceabilityEvent, {
          operationKey: dto.operationKey,
        });
        if (replay) {
          await this.assertCreateReplay(manager, replay, producerId, dto);
          return replay.batchId;
        }

        const batch = await manager.save(
          TraceabilityBatch,
          manager.create(TraceabilityBatch, {
            productId: dto.productId,
            producerId,
            batchCode: dto.batchCode,
            qrCode: dto.qrCode,
          }),
        );
        await manager.save(
          TraceabilityEvent,
          manager.create(TraceabilityEvent, {
            batchId: batch.id,
            sequence: 1,
            eventKind: "BATCH_CREATED",
            occurredAt: batch.createdAt,
            payload: {
              productId: dto.productId,
              batchCode: dto.batchCode,
            },
            evidenceFileIds: [],
            operationKey: dto.operationKey,
            supersedesEventId: null,
          }),
        );
        return batch.id;
      });
      return this.projectById(batchId);
    } catch (error) {
      return this.resolveCreateOperationConflict(error, producerId, dto);
    }
  }

  async appendEvent(batchId: string, dto: AppendTraceabilityEventDto) {
    try {
      const canonicalBatchId = await this.dataSource.transaction(
        async (manager) => {
          await manager
            .getRepository(TraceabilityBatch)
            .createQueryBuilder("batch")
            .setLock("pessimistic_write")
            .where("batch.id = :batchId", { batchId })
            .getOneOrFail();

          const replay = await manager.findOneBy(TraceabilityEvent, {
            operationKey: dto.operationKey,
          });
          if (replay) {
            this.assertAppendReplay(replay, batchId, dto);
            return replay.batchId;
          }

          const latest = await manager.findOne(TraceabilityEvent, {
            where: { batchId },
            order: { sequence: "DESC" },
          });
          await manager.save(
            TraceabilityEvent,
            manager.create(TraceabilityEvent, {
              batchId,
              sequence: (latest?.sequence ?? 0) + 1,
              eventKind: dto.kind,
              occurredAt: new Date(dto.occurredAt),
              payload: dto.payload,
              evidenceFileIds: dto.evidenceFileIds ?? [],
              operationKey: dto.operationKey,
              supersedesEventId: null,
            }),
          );
          return batchId;
        },
      );
      return this.projectById(canonicalBatchId);
    } catch (error) {
      return this.resolveAppendOperationConflict(error, batchId, dto);
    }
  }

  private async lockOperationKey(
    manager: EntityManager,
    operationKey: string,
  ): Promise<void> {
    await manager.query(
      "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
      [operationKey],
    );
  }

  private async assertCreateReplay(
    manager: EntityManager,
    event: TraceabilityEvent,
    producerId: string,
    dto: CreateTraceabilityDto,
  ): Promise<void> {
    const batch = await manager.findOneByOrFail(TraceabilityBatch, {
      id: event.batchId,
    });
    const matches =
      event.eventKind === "BATCH_CREATED" &&
      batch.productId === dto.productId &&
      batch.producerId === producerId &&
      batch.batchCode === dto.batchCode &&
      batch.qrCode === dto.qrCode;
    if (!matches) {
      throw new Error("Traceability create operation key payload conflict");
    }
  }

  private assertAppendReplay(
    event: TraceabilityEvent,
    batchId: string,
    dto: AppendTraceabilityEventDto,
  ): void {
    const matches =
      event.batchId === batchId &&
      event.eventKind === dto.kind &&
      event.occurredAt.toISOString() ===
        new Date(dto.occurredAt).toISOString() &&
      isDeepStrictEqual(event.payload, dto.payload) &&
      isDeepStrictEqual(event.evidenceFileIds, dto.evidenceFileIds ?? []);
    if (!matches) {
      throw new Error("Traceability append operation key payload conflict");
    }
  }

  private async resolveCreateOperationConflict(
    error: unknown,
    producerId: string,
    dto: CreateTraceabilityDto,
  ) {
    if (!isExpectedUniqueViolation(error, OPERATION_KEY_CONSTRAINT))
      throw error;
    const event = await this.eventRepo.findOneByOrFail({
      operationKey: dto.operationKey,
    });
    await this.assertCreateReplay(
      this.dataSource.manager,
      event,
      producerId,
      dto,
    );
    return this.projectById(event.batchId);
  }

  private async resolveAppendOperationConflict(
    error: unknown,
    batchId: string,
    dto: AppendTraceabilityEventDto,
  ) {
    if (!isExpectedUniqueViolation(error, OPERATION_KEY_CONSTRAINT))
      throw error;
    const event = await this.eventRepo.findOneByOrFail({
      operationKey: dto.operationKey,
    });
    this.assertAppendReplay(event, batchId, dto);
    return this.projectById(event.batchId);
  }

  private async projectById(batchId: string) {
    const batch = await this.batchRepo.findOneByOrFail({ id: batchId });
    return this.project(batch);
  }

  private async project(batch: TraceabilityBatch) {
    const events = await this.eventRepo.find({
      where: { batchId: batch.id },
      order: { sequence: "ASC", id: "ASC" },
    });
    const facts: TraceabilityEventFact[] = events.map((event) => ({
      id: event.id,
      batchId: event.batchId,
      sequence: event.sequence,
      kind: event.eventKind,
      occurredAt: event.occurredAt.toISOString(),
      payload: event.payload,
      supersedesEventId: event.supersedesEventId,
    }));
    return {
      batch: {
        id: batch.id,
        productId: batch.productId,
        producerId: batch.producerId,
        batchCode: batch.batchCode,
        qrCode: batch.qrCode,
      },
      ...projectTraceability(batch.id, facts),
    };
  }
}

function isExpectedUniqueViolation(
  error: unknown,
  expectedConstraint: string,
): boolean {
  if (typeof error !== "object" || error === null) return false;
  const candidate = error as {
    code?: string;
    constraint?: string;
    driverError?: { code?: string; constraint?: string };
  };
  return (
    (candidate.code ?? candidate.driverError?.code) === "23505" &&
    (candidate.constraint ?? candidate.driverError?.constraint) ===
      expectedConstraint
  );
}
