import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { getMetadataArgsStorage } from "typeorm";

import { MarketPrice as AggregateMarketPrice } from "../entities/market-price.entity";
import { RUNTIME_ENTITY_ENTRIES } from "../entity-registry";
import { V2_MIGRATIONS } from "../migration-registry";
import { MarketPrice as ReportedMarketPrice } from "../../modules/market-prices/entities/market-price.entity";

const ROOT = resolve(__dirname, "../../..");
const DECISION_PATH =
  "docs/architecture/persistence/phases/phase-09/market-prices-split-decision.md";
const KICKOFF_PATH =
  "docs/architecture/persistence/phases/phase-09/kickoff-inventory.md";

const read = (path: string): string =>
  readFileSync(join(ROOT, path), "utf8");

const normalize = (path: string): string => path.replace(/\\/g, "/");

const walkTypeScript = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) {
      return walkTypeScript(absolute);
    }
    return entry.isFile() && entry.name.endsWith(".ts") ? [absolute] : [];
  });

const currentValue = (source: string, key: string): string | undefined => {
  const matches = [
    ...source.matchAll(new RegExp(`^${key}=(.+)$`, "gm")),
  ];
  return matches.at(-1)?.[1];
};

const columnNames = (target: Function): string[] =>
  getMetadataArgsStorage()
    .columns.filter((column) => column.target === target)
    .map((column) => column.propertyName)
    .sort();

describe("Persistence Phase 9 P9-02 Market Prices split decision", () => {
  it("discovers exactly two decorated mappings for public.market_prices", () => {
    const mappings = walkTypeScript(join(ROOT, "src"))
      .filter((path) =>
        /@Entity\(\s*["']market_prices["']\s*\)/.test(
          readFileSync(path, "utf8"),
        ),
      )
      .map((path) => normalize(relative(ROOT, path)))
      .sort();

    expect(mappings).toEqual([
      "src/database/entities/market-price.entity.ts",
      "src/modules/market-prices/entities/market-price.entity.ts",
    ]);

    const tables = getMetadataArgsStorage().tables.filter(
      ({ target }) =>
        target === AggregateMarketPrice || target === ReportedMarketPrice,
    );
    expect(tables).toHaveLength(2);
    expect(tables.map(({ name }) => name)).toEqual([
      "market_prices",
      "market_prices",
    ]);
  });

  it("derives two different semantic field contracts from entity metadata", () => {
    const aggregateFields = columnNames(AggregateMarketPrice);
    const reportedFields = columnNames(ReportedMarketPrice);

    expect(aggregateFields).toEqual(
      [
        "id",
        "categoryId",
        "provinceId",
        "priceDate",
        "minPrice",
        "maxPrice",
        "avgPrice",
        "unit",
        "source",
        "createdAt",
      ].sort(),
    );
    expect(reportedFields).toEqual(
      [
        "id",
        "productName",
        "categoryId",
        "provinceId",
        "pricePerUnit",
        "unit",
        "source",
        "reportedBy",
        "priceDate",
        "createdAt",
        "updatedAt",
      ].sort(),
    );
    expect(aggregateFields).not.toEqual(reportedFields);
    expect(aggregateFields).toEqual(
      expect.arrayContaining(["minPrice", "maxPrice", "avgPrice"]),
    );
    expect(reportedFields).toEqual(
      expect.arrayContaining(["productName", "pricePerUnit", "reportedBy"]),
    );
  });

  it("keeps the reported model as the only current runtime registration", () => {
    const entries = RUNTIME_ENTITY_ENTRIES.filter(
      ({ key }) => key === "public.market_prices",
    );
    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual(
      expect.objectContaining({ entity: ReportedMarketPrice, baselineV2: false }),
    );
    expect(entries[0]?.entity).not.toBe(AggregateMarketPrice);

    const moduleSource = read(
      "src/modules/market-prices/market-prices.module.ts",
    );
    const serviceSource = read(
      "src/modules/market-prices/market-prices.service.ts",
    );
    const controllerSource = read(
      "src/modules/market-prices/market-prices.controller.ts",
    );
    expect(moduleSource).toContain("TypeOrmModule.forFeature([MarketPrice])");
    expect(serviceSource).toContain("@InjectRepository(MarketPrice)");
    expect(serviceSource).toContain(
      "TODO: implement MarketPricesService.findAll()",
    );
    expect(serviceSource).toContain(
      "TODO: implement MarketPricesService.create()",
    );
    expect(controllerSource).toContain("@Controller('market-prices')");
    expect(controllerSource).toMatch(/@Get\(\)[\s\S]*findAll/);
    expect(controllerSource).toMatch(/@Post\(\)[\s\S]*create/);
  });

  it("records the approved split without deleting either mapping", () => {
    const decision = read(DECISION_PATH);
    expect(
      existsSync(join(ROOT, "src/database/entities/market-price.entity.ts")),
    ).toBe(true);
    expect(
      existsSync(
        join(
          ROOT,
          "src/modules/market-prices/entities/market-price.entity.ts",
        ),
      ),
    ).toBe(true);
    expect(currentValue(decision, "MARKET_PRICES_CANONICAL_MODEL")).toBe(
      "SPLIT_MODELS_INTO_SEPARATE_TABLES",
    );
    expect(currentValue(decision, "HUMAN_DECISION_STATUS")).toBe("APPROVED");
    expect(currentValue(decision, "CURRENT_WRITABLE_MAPPING_COUNT")).toBe(
      "2",
    );
    expect(
      currentValue(decision, "MULTI_WRITABLE_MAPPING_TABLE_COUNT"),
    ).toBe("1");
    expect(currentValue(decision, "ONE_WRITABLE_MAPPING_PER_TABLE")).toBe(
      "NO",
    );
  });

  it("does not invent a table rename or migration in the decision slice", () => {
    const migrationDirectory = join(ROOT, "src/database/migrations-v2");
    const migrationSources = readdirSync(migrationDirectory)
      .filter((name) => name.endsWith(".ts") && !name.endsWith(".spec.ts"))
      .map((name) => readFileSync(join(migrationDirectory, name), "utf8"));

    expect(V2_MIGRATIONS).toHaveLength(6);
    for (const source of migrationSources) {
      expect(source).not.toMatch(
        /market_price_aggregates|aggregated_market_prices|reported_market_prices|product_market_prices/,
      );
      expect(source).not.toMatch(
        /(?:CREATE|ALTER|DROP|RENAME)\s+(?:TABLE\s+)?["']?market_prices/i,
      );
    }

    const decision = read(DECISION_PATH);
    expect(currentValue(decision, "TABLE_NAME_HUMAN_DECISION_REQUIRED")).toBe(
      "YES",
    );
    expect(currentValue(decision, "MIGRATION_IMPLEMENTED")).toBe("NO");
    expect(currentValue(decision, "SCHEMA_CHANGED")).toBe("NO");
  });

  it("preserves the other human gates and keeps P9-03 unimplemented", () => {
    const decision = read(DECISION_PATH);
    const kickoff = read(KICKOFF_PATH);

    expect(currentValue(decision, "COOPERATIVE_FK_DECISION_INVENTED")).toBe(
      "NO",
    );
    expect(currentValue(decision, "WISHLIST_DECISION_INVENTED")).toBe("NO");
    expect(
      currentValue(decision, "LEGACY_MIGRATION_DECISION_INVENTED"),
    ).toBe("NO");
    expect(currentValue(decision, "PRODUCTION_ACCESS_ATTEMPTED")).toBe("NO");
    expect(currentValue(kickoff, "P9_02_IMPLEMENTATION_STATUS")).toBe(
      "IMPLEMENTED_PENDING_HUMAN_REVIEW",
    );
    expect(currentValue(kickoff, "P9_03_IMPLEMENTATION_AUTHORIZED")).toBe(
      "NO_WAITING_FOR_P9_02_MERGE_AND_REVIEW",
    );
    expect(kickoff).not.toContain(
      "P9_03_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR",
    );
  });

});
