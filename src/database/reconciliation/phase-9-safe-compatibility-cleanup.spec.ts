import { existsSync, readFileSync, readdirSync } from "fs";
import { dirname, join, relative, resolve } from "path";
import * as ts from "typescript";

import { auditPersistenceArchitecture } from "../../scripts/persistence-architecture-audit";

interface ResolvedConsumer {
  readonly source: string;
  readonly specifier: string;
  readonly kind: "relative" | "alias";
}

interface ExceptionEntry {
  readonly id: string;
}

interface OwnershipEntry {
  readonly table: string;
  readonly replacementTarget: string | null;
  readonly expiresAt: string | null;
}

const ROOT = process.cwd();
const CENTRAL_DIRECTORY = resolve(ROOT, "src/database/entities");
const KICKOFF_PATH =
  "docs/architecture/persistence/phases/phase-09/kickoff-inventory.md";

function read(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

function normalized(path: string): string {
  return relative(ROOT, path).replace(/\\/g, "/");
}

function walk(directory: string): readonly string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return walk(path);
    return entry.isFile() && entry.name.endsWith(".ts") ? [path] : [];
  });
}

function sourceFile(path: string): ts.SourceFile {
  return ts.createSourceFile(
    path,
    readFileSync(path, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
}

function candidate(path: string): string | null {
  for (const value of [`${path}.ts`, join(path, "index.ts")]) {
    if (existsSync(value)) return resolve(value);
  }
  return null;
}

function configuredAliases(): ReadonlyMap<string, string> {
  const configuration = JSON.parse(read("tsconfig.json")) as {
    compilerOptions: { paths: Record<string, readonly string[]> };
  };
  return new Map(
    Object.entries(configuration.compilerOptions.paths).map(
      ([alias, targets]) => [alias, targets[0]],
    ),
  );
}

function resolveSpecifier(
  source: string,
  specifier: string,
  aliases: ReadonlyMap<string, string>,
): { path: string; kind: "relative" | "alias" } | null {
  if (specifier.startsWith(".")) {
    const path = candidate(resolve(dirname(source), specifier));
    return path ? { path, kind: "relative" } : null;
  }
  for (const [pattern, target] of aliases) {
    const prefix = pattern.replace(/\*$/, "");
    if (!specifier.startsWith(prefix)) continue;
    const suffix = specifier.slice(prefix.length);
    const path = candidate(resolve(ROOT, target.replace(/\*$/, suffix)));
    return path ? { path, kind: "alias" } : null;
  }
  return null;
}

function exportedSpecifiers(path: string): readonly string[] {
  return sourceFile(path).statements.flatMap((statement) => {
    if (
      ts.isExportDeclaration(statement) &&
      statement.moduleSpecifier &&
      ts.isStringLiteral(statement.moduleSpecifier)
    ) {
      return [statement.moduleSpecifier.text];
    }
    return [];
  });
}

function reachesCentralDirectory(
  path: string,
  aliases: ReadonlyMap<string, string>,
  visited = new Set<string>(),
): boolean {
  if (path.startsWith(`${CENTRAL_DIRECTORY}\\`) || path.startsWith(`${CENTRAL_DIRECTORY}/`)) {
    return true;
  }
  if (visited.has(path)) return false;
  visited.add(path);
  return exportedSpecifiers(path).some((specifier) => {
    const target = resolveSpecifier(path, specifier, aliases);
    return target
      ? reachesCentralDirectory(target.path, aliases, visited)
      : false;
  });
}

function centralConsumers(
  sourceDirectories: readonly string[] = ["src"],
): readonly ResolvedConsumer[] {
  const aliases = configuredAliases();
  const consumers: ResolvedConsumer[] = [];
  const sources = sourceDirectories
    .flatMap((directory) => walk(join(ROOT, directory)))
    .filter((path) => !path.endsWith(".spec.ts"));
  for (const source of sources) {
    for (const statement of sourceFile(source).statements) {
      if (!ts.isImportDeclaration(statement)) continue;
      if (!ts.isStringLiteral(statement.moduleSpecifier)) continue;
      const specifier = statement.moduleSpecifier.text;
      const target = resolveSpecifier(source, specifier, aliases);
      if (target && reachesCentralDirectory(target.path, aliases)) {
        consumers.push({
          source: normalized(source),
          specifier,
          kind: target.kind,
        });
      }
    }
  }
  return consumers.sort((left, right) =>
    `${left.source}:${left.specifier}`.localeCompare(
      `${right.source}:${right.specifier}`,
    ),
  );
}

describe("P9-01 safe compatibility and authority cleanup", () => {
  it("resolves relative, alias, and barrel central consumers completely", () => {
    const aliases = configuredAliases();
    expect(aliases.get("@database/*")).toBe("src/database/*");
    const consumers = centralConsumers();
    expect(consumers.filter(({ kind }) => kind === "relative")).toHaveLength(3);
    expect(consumers.filter(({ kind }) => kind === "alias")).toHaveLength(0);
    expect(consumers.map(({ source }) => source)).toEqual([
      "src/database/entity-registry.ts",
      "src/modules/admin/admin.route.ts",
      "src/modules/admin/admin.service.ts",
    ]);
    expect(
      consumers.every(({ specifier }) => specifier.includes("incident-report")),
    ).toBe(true);
    expect(centralConsumers(["src", "scripts"])).toEqual(consumers);
  });

  it("retires every reviewed re-export and preserves all decorated central mappings", () => {
    const kickoff = read(KICKOFF_PATH);
    const reviewedRows = [...kickoff.matchAll(
      /^\| `public\.[^`]+` \| [^|]+ \| `(src\/database\/entities\/[^`]+)` \| `(src\/modules\/[^`]+)` \| 1 \| 0 \| YES \| YES \|/gm,
    )];
    expect(reviewedRows).toHaveLength(27);
    for (const [, centralPath, ownerPath] of reviewedRows) {
      expect(existsSync(join(ROOT, centralPath))).toBe(false);
      expect(existsSync(join(ROOT, ownerPath))).toBe(true);
    }

    const centralFiles = readdirSync(CENTRAL_DIRECTORY).sort();
    expect(centralFiles).toEqual([
      "conversation.entity.ts",
      "dispute.entity.ts",
      "incident-report.entity.ts",
      "logistics-profile.entity.ts",
      "market-price.entity.ts",
      "message.entity.ts",
      "shipment-tracking-event.entity.ts",
      "shipment.entity.ts",
    ]);
    for (const file of centralFiles) {
      expect(read(`src/database/entities/${file}`)).toContain("@Entity(");
    }
  });

  it("prevents the generator from recreating retired compatibility paths", () => {
    const generator = read("generate-entities.js");
    expect(generator).toContain("retiredCentralCompatibilityFiles");
    expect(generator).toContain("delete entities[filename]");
    const kickoff = read(KICKOFF_PATH);
    const retiredNames = [...kickoff.matchAll(
      /^\| `src\/database\/entities\/([^`]+)` \| zero-consumer/gm,
    )].map((match) => match[1]);
    expect(retiredNames).toHaveLength(27);
    for (const filename of retiredNames) {
      expect(generator).toContain(`'${filename}',`);
    }
  });

  it("closes only the source-proven obsolete architecture exception", () => {
    const document = JSON.parse(
      read("docs/architecture/persistence/exceptions.json"),
    ) as { exceptions: ExceptionEntry[] };
    expect(document.exceptions.map(({ id }) => id).sort()).toEqual([
      "foreign-for-feature-registration",
      "legacy-central-entity-imports",
    ]);
    expect(read("src/database/data-source-options.ts")).toContain(
      "synchronize: false",
    );
    expect(read("src/config/database-environment.ts")).toContain(
      "DB_SYNCHRONIZE must be false in production.",
    );
  });

  it("clears only retired Phase 6 compatibility-target metadata", () => {
    const ownership = JSON.parse(
      read("docs/architecture/persistence/entity-ownership.json"),
    ) as { tables: OwnershipEntry[] };
    for (const table of [
      "contracts",
      "order_items",
      "order_status_history",
      "orders",
      "payments",
      "purchase_requests",
    ]) {
      expect(ownership.tables.find((entry) => entry.table === table)).toEqual(
        expect.objectContaining({
          replacementTarget: null,
          expiresAt: null,
        }),
      );
    }
    expect(
      ownership.tables.find(({ table }) => table === "product_wishlist"),
    ).toEqual(
      expect.objectContaining({
        replacementTarget: "public.wishlists",
      }),
    );
  });

  it("preserves mapping, compatibility, and human-decision gates", () => {
    const audit = auditPersistenceArchitecture();
    expect(audit.summary).toEqual(
      expect.objectContaining({
        writableMappings: 49,
        physicalTables: 48,
        duplicateTables: 1,
        centralMappings: 8,
      }),
    );
    expect(audit.violations).toEqual([]);
    expect(existsSync(join(ROOT, "src/database/entities/market-price.entity.ts"))).toBe(
      true,
    );
    expect(
      existsSync(
        join(
          ROOT,
          "src/modules/market-prices/entities/market-price.entity.ts",
        ),
      ),
    ).toBe(true);
    const manifest = JSON.parse(
      read("docs/architecture/persistence/typeorm-compatibility-manifest.json"),
    ) as { entries: unknown[] };
    expect(manifest.entries).toHaveLength(3);
  });

  it("preserves every Phase 8 exit invariant", () => {
    const closure = read(
      "docs/architecture/persistence/phases/phase-08/final-closure.md",
    );
    for (const criterion of [
      "ALL_EXECUTABLE_SEEDERS_CLASSIFIED",
      "ALL_SEEDED_TABLES_HAVE_ONE_OWNER",
      "NO_CROSS_OWNER_SEED_REPOSITORY_ACCESS",
      "REFERENCE_DEV_TEST_SEEDS_SEPARATED",
      "DEPENDENCY_DAG_EXPLICIT",
      "IDEMPOTENCY_VERIFIED",
      "NO_PRODUCTION_DB_ACCESS",
      "NO_PROTECTED_LOCAL_DB_MUTATION",
      "CENTRAL_SEEDER_ORCHESTRATION_ONLY",
    ]) {
      expect(closure).toContain(`${criterion}=YES`);
    }
    expect(read("src/database/data-source-options.ts")).not.toMatch(
      /synchronize\s*:\s*true/,
    );
  });

  it("records the bounded P9-01 status and successor gate", () => {
    const kickoff = read(KICKOFF_PATH);
    expect(kickoff).toContain(
      "P9_00_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_156",
    );
    expect(kickoff).toContain(
      "P9_01_IMPLEMENTATION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW",
    );
    expect(kickoff).toContain("P9_01_BLOCKERS=NONE");
    expect(kickoff).toContain(
      "P9_02_IMPLEMENTATION_AUTHORIZED=YES_REQUIRES_HUMAN_DECISION",
    );
    expect(kickoff).toContain("OUT_OF_SLICE_CHANGE_COUNT=0");
    expect(kickoff).toContain("MARKET_PRICES_AUTOMATIC_DECISION_MADE=NO");
    expect(kickoff).toContain("PHASE_09_COMPLETE=NO");
  });
});
