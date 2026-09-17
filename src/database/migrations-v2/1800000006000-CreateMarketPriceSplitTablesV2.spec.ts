import { readFileSync } from "fs";
import { join } from "path";
import { getMetadataArgsStorage } from "typeorm";

import { getMigrationNames, V2_MIGRATIONS } from "../migration-registry";
import { MarketPrice as ReportedMarketPrice } from "../../modules/market-prices/entities/market-price.entity";
import { MarketPrice as AggregateMarketPrice } from "../entities/market-price.entity";

const source = readFileSync(
  join(__dirname, "1800000006000-CreateMarketPriceSplitTablesV2.ts"),
  "utf8",
).replace(/\r\n/g, "\n");
const upSource =
  source.match(/async up[\s\S]*?\{([\s\S]*?)\n  \}\n\n  async down/)?.[1] ?? "";
const downSource =
  source.match(/async down[\s\S]*?\{([\s\S]*?)\n  \}\n\}/)?.[1] ?? "";

describe("P9-03 Market Price Split Tables V2 Migration", () => {
  it("registers one ordered forward migration after the reviewed V2 chain", () => {
    expect(getMigrationNames(V2_MIGRATIONS)).toEqual([
      "CreateCanonicalBaselineV21800000000000",
      "CreateCommerceBoundariesV21800000001000",
      "CreateTraceabilityEventModelV21800000002000",
      "ExpandAdPackageReferenceIdentity1800000003000",
      "BackfillAndContractAdPackageReferenceIdentity1800000004000",
      "RestoreCanonicalCooperativeMemberSchema1800000005000",
      "CreateMarketPriceSplitTablesV21800000006000",
    ]);
  });

  it("creates the expected schema definitions for market_prices and market_price_aggregates", () => {
    expect(upSource).toContain('CREATE TABLE "public"."market_prices"');
    for (const column of [
      "id",
      "product_name",
      "category_id",
      "province_id",
      "price_per_unit",
      "unit",
      "source",
      "reported_by",
      "price_date",
      "created_at",
      "updated_at",
    ]) {
      expect(upSource).toContain(`"${column}"`);
    }

    expect(upSource).toContain('CREATE TABLE "public"."market_price_aggregates"');
    for (const column of [
      "id",
      "category_id",
      "province_id",
      "price_date",
      "min_price",
      "max_price",
      "avg_price",
      "unit",
      "source",
      "created_at",
    ]) {
      expect(upSource).toContain(`"${column}"`);
    }

    expect(upSource).toContain('CREATE TYPE "public"."market_prices_unit_enum"');
    expect(upSource).toContain('CREATE TYPE "public"."market_price_aggregates_unit_enum"');

    // No data copy or rename
    expect(upSource).not.toMatch(/INSERT\s+INTO.*SELECT/i);
    expect(upSource).not.toMatch(/RENAME\s+TABLE|ALTER\s+TABLE.*RENAME/i);
  });

  it("aligns entity metadata with the migration tables", () => {
    const storage = getMetadataArgsStorage();
    const reportedTable = storage.tables.find(
      ({ target }) => target === ReportedMarketPrice,
    );
    const aggregateTable = storage.tables.find(
      ({ target }) => target === AggregateMarketPrice,
    );
    expect(reportedTable?.name).toBe("market_prices");
    expect(aggregateTable?.name).toBe("market_price_aggregates");
  });

  it("reverts only the two newly created tables and enums", () => {
    expect(downSource).toContain('DROP TABLE IF EXISTS "public"."market_price_aggregates"');
    expect(downSource).toContain('DROP TABLE IF EXISTS "public"."market_prices"');
    expect(downSource).toContain('DROP TYPE IF EXISTS "public"."market_price_aggregates_unit_enum"');
    expect(downSource).toContain('DROP TYPE IF EXISTS "public"."market_prices_unit_enum"');
    expect(downSource).not.toContain("CASCADE");
    expect(downSource.match(/DROP TABLE/g)).toHaveLength(2);
    expect(downSource).not.toMatch(/users|products|profiles|reviews|orders|contracts/);
  });
});
