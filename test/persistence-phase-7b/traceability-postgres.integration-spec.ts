import "reflect-metadata";
import { DataSource } from "typeorm";

import { createDataSourceOptions } from "../../src/database/data-source-options";
import {
  assertSafePersistenceTestEnvironment,
  PersistenceTestOperation,
  PersistenceTestPurpose,
} from "../../src/database/reconciliation/database-target.guard";
import { SeedClassification } from "../../src/database/seeds/framework/seed-contract";
import { CreateTraceabilityEventModelV21800000002000 } from "../../src/database/migrations-v2/1800000002000-CreateTraceabilityEventModelV2";
import { TraceabilityEventFact } from "../../src/modules/traceability/application/traceability-projection";
import { TraceabilityBatch } from "../../src/modules/traceability/entities/traceability-batch.entity";
import { TraceabilityEvent } from "../../src/modules/traceability/entities/traceability-event.entity";
import { TraceabilityService } from "../../src/modules/traceability/traceability.service";

const PRODUCER_ID = "11111111-1111-4111-8111-111111111111";
const PRODUCT_ID = "22222222-2222-4222-8222-222222222222";

describe("Phase 7B traceability on disposable PostgreSQL", () => {
  let dataSource: DataSource;
  let service: TraceabilityService;

  beforeAll(async () => {
    const database = process.env.DB_NAME ?? "";
    assertSafePersistenceTestEnvironment({
      environment: process.env,
      classification: SeedClassification.TEST,
      purpose: PersistenceTestPurpose.BUSINESS_FIXTURE,
      operation: PersistenceTestOperation.DESTRUCTIVE_CLEANUP,
      acknowledgement: process.env.PHASE7B_DISPOSABLE_DB_ACK,
    });
    if (!database.startsWith("agrilink_persistence_test_phase7b_")) {
      throw new Error(
        "Phase 7B integration tests require their dedicated disposable database prefix",
      );
    }
    dataSource = new DataSource(
      createDataSourceOptions(process.env, {
        entities: [TraceabilityBatch, TraceabilityEvent],
        logging: false,
      }),
    );
    await dataSource.initialize();
    service = new TraceabilityService(
      dataSource.getRepository(TraceabilityBatch),
      dataSource.getRepository(TraceabilityEvent),
      dataSource,
    );
  });

  beforeEach(async () => {
    await dataSource.query('DELETE FROM traceability_events');
    await dataSource.query('DELETE FROM traceability_batches');
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) await dataSource.destroy();
  });

  it("creates a batch plus first event and reads deterministic projections", async () => {
    const created = await service.create(PRODUCER_ID, {
      productId: PRODUCT_ID,
      batchCode: "phase7b-basic-batch",
      qrCode: "phase7b-basic-qr",
      operationKey: "phase7b-basic-create",
    });
    await service.appendEvent(created.batch.id, {
      kind: "PLANTED",
      occurredAt: "2026-01-01T00:00:00.000Z",
      payload: { plot: "A1" },
      evidenceFileIds: [],
      operationKey: "phase7b-basic-planted",
    });
    const harvested = await service.appendEvent(created.batch.id, {
      kind: "HARVESTED",
      occurredAt: "2026-02-01T00:00:00.000Z",
      payload: { grade: "A" },
      evidenceFileIds: [],
      operationKey: "phase7b-basic-harvested",
    });

    const byQr = await service.findByQrCode("phase7b-basic-qr");
    const byProduct = await service.findByProduct(PRODUCT_ID);
    expect(byQr).toEqual(harvested);
    expect(byProduct).toEqual([harvested]);
    expect(
      harvested.timeline.map((event: TraceabilityEventFact) => event.sequence),
    ).toEqual([1, 2, 3]);
    expect(await service.findByQrCode("phase7b-basic-qr")).toEqual(byQr);
  });

  it("rolls back the batch when BATCH_CREATED persistence fails", async () => {
    await expect(
      service.create(PRODUCER_ID, {
        productId: PRODUCT_ID,
        batchCode: "phase7b-rollback-batch",
        qrCode: "phase7b-rollback-qr",
        operationKey: "x".repeat(129),
      }),
    ).rejects.toBeDefined();
    expect(
      await dataSource.getRepository(TraceabilityBatch).countBy({
        batchCode: "phase7b-rollback-batch",
      }),
    ).toBe(0);
  });

  it("makes concurrent create replay resolve to one canonical batch and event", async () => {
    const dto = {
      productId: PRODUCT_ID,
      batchCode: "phase7b-create-race-batch",
      qrCode: "phase7b-create-race-qr",
      operationKey: "phase7b-create-race-operation",
    };
    const results = await Promise.all(
      Array.from({ length: 8 }, () => service.create(PRODUCER_ID, dto)),
    );

    expect(new Set(results.map((result) => result.batch.id)).size).toBe(1);
    expect(await dataSource.getRepository(TraceabilityBatch).count()).toBe(1);
    expect(
      await dataSource.getRepository(TraceabilityEvent).countBy({
        operationKey: dto.operationKey,
        eventKind: "BATCH_CREATED",
      }),
    ).toBe(1);
  });

  it("serializes concurrent appends on one batch without duplicate sequence values", async () => {
    const created = await service.create(PRODUCER_ID, {
      productId: PRODUCT_ID,
      batchCode: "phase7b-append-race-batch",
      qrCode: "phase7b-append-race-qr",
      operationKey: "phase7b-append-race-create",
    });
    await Promise.all(
      Array.from({ length: 8 }, (_, index) =>
        service.appendEvent(created.batch.id, {
          kind: "QUALITY_TESTED",
          occurredAt: `2026-03-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`,
          payload: { sample: index },
          evidenceFileIds: [],
          operationKey: `phase7b-append-race-${index}`,
        }),
      ),
    );

    const events = await dataSource.getRepository(TraceabilityEvent).find({
      where: { batchId: created.batch.id },
      order: { sequence: "ASC" },
    });
    const sequences = events.map(({ sequence }) => sequence);
    expect(events).toHaveLength(9);
    expect(new Set(sequences).size).toBe(sequences.length);
    expect(sequences).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("makes concurrent append replay resolve to one canonical event", async () => {
    const created = await service.create(PRODUCER_ID, {
      productId: PRODUCT_ID,
      batchCode: "phase7b-append-replay-batch",
      qrCode: "phase7b-append-replay-qr",
      operationKey: "phase7b-append-replay-create",
    });
    const dto = {
      kind: "SHIPPED" as const,
      occurredAt: "2026-04-01T00:00:00.000Z",
      payload: { shipmentId: "shipment-scalar-id" },
      evidenceFileIds: [],
      operationKey: "phase7b-append-replay-operation",
    };
    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        service.appendEvent(created.batch.id, dto),
      ),
    );

    expect(results.every((result) => result.timeline.length === 2)).toBe(true);
    expect(
      await dataSource.getRepository(TraceabilityEvent).countBy({
        operationKey: dto.operationKey,
      }),
    ).toBe(1);
  });

  it("enforces the closed event taxonomy in PostgreSQL", async () => {
    const created = await service.create(PRODUCER_ID, {
      productId: PRODUCT_ID,
      batchCode: "phase7b-taxonomy-batch",
      qrCode: "phase7b-taxonomy-qr",
      operationKey: "phase7b-taxonomy-create",
    });
    await expect(
      dataSource.query(
        `INSERT INTO traceability_events
          (batch_id, sequence, event_kind, occurred_at, payload, evidence_file_ids, operation_key)
         VALUES ($1, 2, 'UNAPPROVED_KIND', now(), '{}'::jsonb, '{}'::uuid[], 'phase7b-bad-kind')`,
        [created.batch.id],
      ),
    ).rejects.toMatchObject({ code: "23514" });
  });

  it("fails closed on down without deleting either evidence table", async () => {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      await expect(
        new CreateTraceabilityEventModelV21800000002000().down(),
      ).rejects.toThrow("append-only");
      const rows = (await queryRunner.query(
        `SELECT table_name FROM information_schema.tables
         WHERE table_schema = 'public'
           AND table_name IN ('traceability_batches', 'traceability_events')
         ORDER BY table_name`,
      )) as Array<{ table_name: string }>;
      expect(rows.map(({ table_name }) => table_name)).toEqual([
        "traceability_batches",
        "traceability_events",
      ]);
    } finally {
      await queryRunner.release();
    }
  });
});
