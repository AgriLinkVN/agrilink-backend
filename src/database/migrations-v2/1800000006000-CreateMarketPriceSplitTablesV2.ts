import { MigrationInterface, QueryRunner } from "typeorm";

/** Creates canonical separated market_prices and market_price_aggregates tables. */
export class CreateMarketPriceSplitTablesV21800000006000 implements MigrationInterface {
  name = "CreateMarketPriceSplitTablesV21800000006000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."market_prices_unit_enum" AS ENUM('kg', 'ton', 'box', 'bunch', 'liter', 'piece')`,
    );
    await queryRunner.query(`
      CREATE TABLE "public"."market_prices" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "product_name" character varying NOT NULL,
        "category_id" character varying,
        "province_id" character varying,
        "price_per_unit" numeric(12,2) NOT NULL,
        "unit" "public"."market_prices_unit_enum" NOT NULL,
        "source" character varying,
        "reported_by" character varying,
        "price_date" date NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_market_prices_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE TYPE "public"."market_price_aggregates_unit_enum" AS ENUM('kg', 'ton', 'box', 'bunch', 'liter', 'piece')`,
    );
    await queryRunner.query(`
      CREATE TABLE "public"."market_price_aggregates" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "category_id" integer NOT NULL,
        "province_id" integer NOT NULL,
        "price_date" date NOT NULL,
        "min_price" numeric(15,2),
        "max_price" numeric(15,2),
        "avg_price" numeric(15,2) NOT NULL,
        "unit" "public"."market_price_aggregates_unit_enum" NOT NULL,
        "source" character varying(100),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_market_price_aggregates_id" PRIMARY KEY ("id")
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "public"."market_price_aggregates"');
    await queryRunner.query('DROP TABLE IF EXISTS "public"."market_prices"');
    await queryRunner.query('DROP TYPE IF EXISTS "public"."market_price_aggregates_unit_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "public"."market_prices_unit_enum"');
  }
}
