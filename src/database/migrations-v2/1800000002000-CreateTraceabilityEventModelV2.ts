import { MigrationInterface, QueryRunner } from 'typeorm';

/** Additive Phase 7B schema. It is never executed by this source-only task. */
export class CreateTraceabilityEventModelV21800000002000 implements MigrationInterface {
  name = 'CreateTraceabilityEventModelV21800000002000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "traceability_batches" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      "product_id" uuid NOT NULL, "producer_id" uuid NOT NULL,
      "batch_code" varchar(100) NOT NULL UNIQUE, "qr_code" varchar(100) NOT NULL UNIQUE,
      "created_at" timestamptz NOT NULL DEFAULT now()
    )`);
    await queryRunner.query(`CREATE TABLE "traceability_events" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "batch_id" uuid NOT NULL,
      "sequence" integer NOT NULL, "event_kind" varchar(64) NOT NULL,
      "occurred_at" timestamptz NOT NULL, "payload" jsonb NOT NULL,
      "evidence_file_ids" uuid[] NOT NULL DEFAULT '{}', "operation_key" varchar(128) NOT NULL UNIQUE,
      "supersedes_event_id" uuid, "created_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "UQ_traceability_events_batch_sequence" UNIQUE ("batch_id", "sequence"),
      CONSTRAINT "FK_traceability_events_batch" FOREIGN KEY ("batch_id") REFERENCES "traceability_batches"("id") ON DELETE RESTRICT,
      CONSTRAINT "FK_traceability_events_supersedes" FOREIGN KEY ("supersedes_event_id") REFERENCES "traceability_events"("id") ON DELETE RESTRICT
    )`);
    await queryRunner.query('CREATE INDEX "IDX_traceability_events_batch_sequence" ON "traceability_events" ("batch_id", "sequence")');
  }

  async down(): Promise<void> {
    throw new Error('Traceability event evidence is append-only; rollback requires an approved staged reconciliation plan.');
  }
}
