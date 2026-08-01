import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCommerceBoundariesV21800000001000 implements MigrationInterface {
  name = 'CreateCommerceBoundariesV21800000001000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "orders" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "order_code" varchar(32) NOT NULL UNIQUE,
      "buyer_id" uuid NOT NULL, "seller_id" uuid NOT NULL, "status" varchar(32) NOT NULL DEFAULT 'pending',
      "subtotal" numeric(18,0) NOT NULL, "shipping_fee" numeric(18,0) NOT NULL DEFAULT 0,
      "platform_fee" numeric(18,0) NOT NULL DEFAULT 0, "total_amount" numeric(18,0) NOT NULL,
      "payment_method" varchar(32) NOT NULL, "shipping_address_id" uuid, "note" text,
      "cancelled_reason" text, "delivered_at" timestamptz, "version" integer NOT NULL DEFAULT 1,
      "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "CHK_orders_status" CHECK ("status" IN ('pending','confirmed','preparing','handed_to_logistics','shipping','delivered','cancelled')),
      CONSTRAINT "CHK_orders_method" CHECK ("payment_method" IN ('cod','bank_transfer','manual')),
      CONSTRAINT "CHK_orders_money" CHECK ("subtotal" >= 0 AND "shipping_fee" >= 0 AND "platform_fee" >= 0 AND "total_amount" = "subtotal" + "shipping_fee" + "platform_fee"),
      CONSTRAINT "FK_orders_buyer" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE RESTRICT,
      CONSTRAINT "FK_orders_seller" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE RESTRICT
    )`);
    await queryRunner.query(`CREATE TABLE "order_items" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "order_id" uuid NOT NULL, "product_id" uuid NOT NULL,
      "product_name" varchar(255) NOT NULL, "quantity" numeric(15,3) NOT NULL,
      "unit_price" numeric(18,0) NOT NULL, "line_total" numeric(18,0) NOT NULL,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "CHK_order_items_quantity" CHECK ("quantity" > 0),
      CONSTRAINT "CHK_order_items_money" CHECK ("unit_price" >= 0 AND "line_total" = "quantity" * "unit_price"),
      CONSTRAINT "FK_order_items_order" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT,
      CONSTRAINT "FK_order_items_product" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT
    )`);
    await queryRunner.query(`CREATE TABLE "order_status_history" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "order_id" uuid NOT NULL, "from_status" varchar(32),
      "to_status" varchar(32) NOT NULL, "changed_by" uuid, "note" text, "operation_key" varchar(128) NOT NULL,
      "created_at" timestamptz NOT NULL DEFAULT now(), CONSTRAINT "UQ_order_status_history_operation" UNIQUE ("order_id", "operation_key"),
      CONSTRAINT "FK_order_status_history_order" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT,
      CONSTRAINT "FK_order_status_history_actor" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE SET NULL
    )`);
    await queryRunner.query(`CREATE TABLE "payments" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "order_id" uuid NOT NULL UNIQUE, "amount" numeric(18,0) NOT NULL,
      "currency" varchar(3) NOT NULL DEFAULT 'VND', "method" varchar(32) NOT NULL, "status" varchar(32) NOT NULL DEFAULT 'unpaid',
      "refunded_amount" numeric(18,0) NOT NULL DEFAULT 0, "version" integer NOT NULL DEFAULT 1,
      "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "CHK_payments_currency" CHECK ("currency" = 'VND'),
      CONSTRAINT "CHK_payments_method" CHECK ("method" IN ('cod','bank_transfer','manual')),
      CONSTRAINT "CHK_payments_status" CHECK ("status" IN ('unpaid','paid','partially_refunded','refunded')),
      CONSTRAINT "CHK_payments_refund" CHECK ("amount" >= 0 AND "refunded_amount" >= 0 AND "refunded_amount" <= "amount"),
      CONSTRAINT "FK_payments_order" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT
    )`);
    await queryRunner.query(`CREATE TABLE "purchase_requests" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "buyer_id" uuid NOT NULL, "product_category_id" uuid,
      "province_id" uuid, "quantity_needed" numeric(15,3) NOT NULL, "unit" varchar(32) NOT NULL,
      "status" varchar(32) NOT NULL DEFAULT 'open', "version" integer NOT NULL DEFAULT 1,
      "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "CHK_purchase_requests_quantity" CHECK ("quantity_needed" > 0),
      CONSTRAINT "CHK_purchase_requests_status" CHECK ("status" IN ('open','closed','cancelled')),
      CONSTRAINT "FK_purchase_requests_buyer" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE RESTRICT,
      CONSTRAINT "FK_purchase_requests_category" FOREIGN KEY ("product_category_id") REFERENCES "product_categories"("id") ON DELETE RESTRICT,
      CONSTRAINT "FK_purchase_requests_province" FOREIGN KEY ("province_id") REFERENCES "provinces"("id") ON DELETE RESTRICT
    )`);
    await queryRunner.query(`CREATE TABLE "contracts" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "contract_code" varchar(32) NOT NULL UNIQUE,
      "purchase_request_id" uuid, "buyer_id" uuid NOT NULL, "seller_id" uuid NOT NULL, "product_category_id" uuid,
      "quantity" numeric(15,3) NOT NULL, "unit" varchar(32) NOT NULL, "unit_price" numeric(18,0) NOT NULL,
      "total_value" numeric(18,0) NOT NULL, "status" varchar(32) NOT NULL DEFAULT 'draft',
      "buyer_signed_at" timestamptz, "seller_signed_at" timestamptz, "version" integer NOT NULL DEFAULT 1,
      "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "CHK_contracts_quantity" CHECK ("quantity" > 0),
      CONSTRAINT "CHK_contracts_total" CHECK ("unit_price" >= 0 AND "total_value" = "quantity" * "unit_price"),
      CONSTRAINT "CHK_contracts_status" CHECK ("status" IN ('draft','negotiating','pending_signature','active','completed','cancelled')),
      CONSTRAINT "FK_contracts_request" FOREIGN KEY ("purchase_request_id") REFERENCES "purchase_requests"("id") ON DELETE RESTRICT,
      CONSTRAINT "FK_contracts_buyer" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE RESTRICT,
      CONSTRAINT "FK_contracts_seller" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE RESTRICT,
      CONSTRAINT "FK_contracts_category" FOREIGN KEY ("product_category_id") REFERENCES "product_categories"("id") ON DELETE RESTRICT
    )`);
    await queryRunner.query(`CREATE TABLE "commerce_operations" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "actor_id" uuid NOT NULL,
      "operation_type" varchar(64) NOT NULL, "idempotency_key" varchar(128) NOT NULL,
      "request_fingerprint" char(64) NOT NULL, "aggregate_id" uuid, "result_reference" uuid,
      "status" varchar(16) NOT NULL DEFAULT 'started', "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "UQ_commerce_operations_scope" UNIQUE ("actor_id", "operation_type", "idempotency_key"),
      CONSTRAINT "CHK_commerce_operations_status" CHECK ("status" IN ('started','completed')),
      CONSTRAINT "FK_commerce_operations_actor" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT
    )`);
    await queryRunner.query('CREATE INDEX "IDX_orders_buyer_created" ON "orders" ("buyer_id", "created_at")');
    await queryRunner.query('CREATE INDEX "IDX_orders_seller_created" ON "orders" ("seller_id", "created_at")');
    await queryRunner.query('CREATE INDEX "IDX_order_items_order" ON "order_items" ("order_id")');
    await queryRunner.query('CREATE INDEX "IDX_order_history_order_created" ON "order_status_history" ("order_id", "created_at")');
    await queryRunner.query('CREATE INDEX "IDX_contracts_purchase_request" ON "contracts" ("purchase_request_id")');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of ['commerce_operations', 'contracts', 'purchase_requests', 'payments', 'order_status_history', 'order_items', 'orders']) {
      await queryRunner.query(`DROP TABLE IF EXISTS "${table}"`);
    }
  }
}
