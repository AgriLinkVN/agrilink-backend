import { MigrationInterface, QueryRunner } from "typeorm";

/** Restores the cooperative table required by the canonical Phase 8 seed DAG. */
export class RestoreCanonicalCooperativeMemberSchema1800000005000 implements MigrationInterface {
  name = "RestoreCanonicalCooperativeMemberSchema1800000005000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "public"."cooperative_members" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "cooperative_id" uuid NOT NULL,
        "farmer_id" uuid NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'pending',
        "role" text,
        "joined_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_21a623647dd89d31e42f4e4fe09" PRIMARY KEY ("id"),
        CONSTRAINT "ck_p3_member_status"
          CHECK ("status" IN ('pending', 'active', 'suspended', 'rejected', 'left')),
        CONSTRAINT "uq_p3_member_cooperative_farmer"
          UNIQUE ("cooperative_id", "farmer_id"),
        CONSTRAINT "fk_p3_member_cooperative"
          FOREIGN KEY ("cooperative_id") REFERENCES "public"."users"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "fk_p3_member_farmer"
          FOREIGN KEY ("farmer_id") REFERENCES "public"."users"("id")
          ON DELETE RESTRICT ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_p3_member_cooperative_status"
      ON "public"."cooperative_members" ("cooperative_id", "status")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "public"."cooperative_members"');
  }
}
