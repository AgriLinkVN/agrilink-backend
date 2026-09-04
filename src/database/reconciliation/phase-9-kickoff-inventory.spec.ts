import { existsSync, readFileSync, readdirSync } from "fs";
import { dirname, join, relative, resolve } from "path";
import * as ts from "typescript";

import { LEGACY_MIGRATIONS, V2_MIGRATIONS } from "../migration-registry";

interface EntityMapping {
  readonly kind: "Entity" | "ViewEntity";
  readonly schema: string;
  readonly table: string;
  readonly file: string;
}

interface CompatibilityEntry {
  readonly schema: string;
  readonly table: string;
  readonly objectType: string;
  readonly objectName: string;
  readonly source: string;
}

interface ExceptionEntry {
  readonly id: string;
  readonly edges?: readonly string[];
  readonly registrations?: readonly string[];
  readonly files?: readonly string[];
}

interface OwnershipEntry {
  readonly schema: string;
  readonly table: string;
  readonly status: string;
  readonly replacementTarget: string | null;
}

const ROOT = process.cwd();
const CENTRAL_DIRECTORY = join(ROOT, "src/database/entities");
const KICKOFF_PATH =
  "docs/architecture/persistence/phases/phase-09/kickoff-inventory.md";

function read(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

function walk(directory: string): readonly string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return walk(path);
    return entry.isFile() && entry.name.endsWith(".ts") ? [path] : [];
  });
}

function normalized(path: string): string {
  return relative(ROOT, path).replace(/\\/g, "/");
}

function decorators(node: ts.Node): readonly ts.Decorator[] {
  return ts.canHaveDecorators(node) ? (ts.getDecorators(node) ?? []) : [];
}

function decoratorName(decorator: ts.Decorator): string {
  const expression = ts.isCallExpression(decorator.expression)
    ? decorator.expression.expression
    : decorator.expression;
  return ts.isIdentifier(expression) ? expression.text : expression.getText();
}

function objectProperty(
  object: ts.ObjectLiteralExpression,
  key: string,
): string | undefined {
  for (const property of object.properties) {
    if (!ts.isPropertyAssignment(property)) continue;
    if (property.name.getText().replace(/["']/g, "") !== key) continue;
    if (ts.isStringLiteral(property.initializer)) {
      return property.initializer.text;
    }
  }
  return undefined;
}

function scanMappings(files: readonly string[]): readonly EntityMapping[] {
  const mappings: EntityMapping[] = [];
  for (const file of files) {
    const source = ts.createSourceFile(
      file,
      readFileSync(file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
    const visit = (node: ts.Node): void => {
      if (ts.isClassDeclaration(node) && node.name) {
        for (const decorator of decorators(node)) {
          const kind = decoratorName(decorator);
          if (kind !== "Entity" && kind !== "ViewEntity") continue;
          let schema = "public";
          let table = node.name.text;
          if (ts.isCallExpression(decorator.expression)) {
            const argument = decorator.expression.arguments[0];
            if (argument && ts.isStringLiteral(argument)) {
              table = argument.text;
            }
            if (argument && ts.isObjectLiteralExpression(argument)) {
              schema = objectProperty(argument, "schema") ?? schema;
              table = objectProperty(argument, "name") ?? table;
            }
          }
          mappings.push({
            kind: kind as EntityMapping["kind"],
            schema,
            table,
            file: normalized(file),
          });
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return mappings.sort((left, right) =>
    `${left.schema}.${left.table}:${left.file}`.localeCompare(
      `${right.schema}.${right.table}:${right.file}`,
    ),
  );
}

function resolveImport(sourceFile: string, target: string): string | null {
  if (!target.startsWith(".")) return null;
  const base = resolve(dirname(sourceFile), target);
  for (const candidate of [`${base}.ts`, join(base, "index.ts")]) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

function centralImportConsumers(files: readonly string[]): readonly string[] {
  const consumers: string[] = [];
  for (const file of files) {
    const source = ts.createSourceFile(
      file,
      readFileSync(file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
    for (const statement of source.statements) {
      if (!ts.isImportDeclaration(statement)) continue;
      if (!ts.isStringLiteral(statement.moduleSpecifier)) continue;
      const resolved = resolveImport(file, statement.moduleSpecifier.text);
      if (resolved?.startsWith(CENTRAL_DIRECTORY)) {
        consumers.push(normalized(file));
      }
    }
  }
  return consumers.sort();
}

function expectAcyclic(edges: readonly (readonly [string, string])[]): void {
  const vertices = new Set(edges.flatMap(([from, to]) => [from, to]));
  const outgoing = new Map<string, string[]>();
  const indegree = new Map([...vertices].map((vertex) => [vertex, 0]));
  for (const [from, to] of edges) {
    outgoing.set(from, [...(outgoing.get(from) ?? []), to]);
    indegree.set(to, (indegree.get(to) ?? 0) + 1);
  }
  const queue = [...vertices].filter((vertex) => indegree.get(vertex) === 0);
  let visited = 0;
  while (queue.length > 0) {
    const vertex = queue.shift() as string;
    visited += 1;
    for (const target of outgoing.get(vertex) ?? []) {
      const next = (indegree.get(target) as number) - 1;
      indegree.set(target, next);
      if (next === 0) queue.push(target);
    }
  }
  expect(visited).toBe(vertices.size);
}

describe("P9-00 Phase 9 kickoff inventory", () => {
  const productionSources = walk(join(ROOT, "src")).filter(
    (file) => !file.endsWith(".spec.ts"),
  );
  const mappings = scanMappings(productionSources);

  it("records merged Phase 8 authority without rewriting history", () => {
    const phaseEight = read(
      "docs/architecture/persistence/phases/phase-08/README.md",
    );
    expect(phaseEight).toContain(
      "P8_10_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_155",
    );
    expect(phaseEight).toContain(
      "PHASE_08_EXIT_CRITERIA_STATUS=ALL_SATISFIED_BY_MERGED_PR_155",
    );
    expect(phaseEight).toContain("PHASE_08_COMPLETE=YES");
    expect(phaseEight).toContain("IDEMPOTENCY_VERIFIED=YES");
    expect(phaseEight).toContain("SECOND_SEED_RUN_NO_DUPLICATES=YES");
    expect(phaseEight).toContain("DISPOSABLE_DB_SEED_RUN_PASS=YES");
  });

  it("derives the complete central compatibility inventory", () => {
    const centralFiles = readdirSync(CENTRAL_DIRECTORY, {
      withFileTypes: true,
    }).filter((entry) => entry.isFile() && entry.name.endsWith(".ts"));
    const centralMappings = mappings.filter((mapping) =>
      mapping.file.startsWith("src/database/entities/"),
    );
    const reexports = centralFiles.filter((entry) => {
      const source = ts.createSourceFile(
        entry.name,
        readFileSync(join(CENTRAL_DIRECTORY, entry.name), "utf8"),
        ts.ScriptTarget.Latest,
        true,
      );
      return source.statements.some(
        (statement) =>
          ts.isExportDeclaration(statement) && !!statement.moduleSpecifier,
      );
    });

    expect(centralFiles).toHaveLength(8);
    expect(centralMappings).toHaveLength(8);
    expect(reexports).toHaveLength(0);
    expect(centralImportConsumers(productionSources)).toEqual([
      "src/database/entity-registry.ts",
      "src/modules/admin/admin.route.ts",
      "src/modules/admin/admin.service.ts",
    ]);
  });

  it("derives one deterministic duplicate from all decorated mappings", () => {
    const writable = mappings.filter(({ kind }) => kind === "Entity");
    const byTable = new Map<string, string[]>();
    for (const mapping of writable) {
      const key = `${mapping.schema}.${mapping.table}`;
      byTable.set(key, [...(byTable.get(key) ?? []), mapping.file].sort());
    }
    const duplicates = [...byTable.entries()].filter(
      ([, paths]) => paths.length > 1,
    );

    expect(writable).toHaveLength(49);
    expect(byTable.size).toBe(48);
    expect(duplicates).toEqual([
      [
        "public.market_prices",
        [
          "src/database/entities/market-price.entity.ts",
          "src/modules/market-prices/entities/market-price.entity.ts",
        ],
      ],
    ]);
  });

  it("ties every deferred item to current source evidence", () => {
    const manifest = JSON.parse(
      read("docs/architecture/persistence/typeorm-compatibility-manifest.json"),
    ) as { entries: CompatibilityEntry[] };
    const exceptions = JSON.parse(
      read("docs/architecture/persistence/exceptions.json"),
    ) as { exceptions: ExceptionEntry[] };
    const ownership = JSON.parse(
      read("docs/architecture/persistence/entity-ownership.json"),
    ) as { tables: OwnershipEntry[] };
    const kickoff = read(KICKOFF_PATH);

    expect(readdirSync(CENTRAL_DIRECTORY)).not.toHaveLength(0);
    expect(
      mappings.filter(
        ({ schema, table }) =>
          schema === "public" && table === "market_prices",
      ),
    ).toHaveLength(2);
    expect(manifest.entries).not.toHaveLength(0);
    expect(exceptions.exceptions).not.toHaveLength(0);
    expect(
      ownership.tables.find(({ table }) => table === "product_wishlist"),
    ).toEqual(
      expect.objectContaining({
        status: "retired-compatibility",
        replacementTarget: "public.wishlists",
      }),
    );
    expect(ownership.tables.some(({ table }) => table === "wishlists")).toBe(
      true,
    );
    expect(kickoff).toContain("PRODUCTION_PARITY_UNKNOWN_COUNT=7");
    expect(kickoff).toContain("PHASE_9_DEFERRED_ITEM_COUNT=6");
  });

  it("matches compatibility and exception manifests to their sources", () => {
    const manifest = JSON.parse(
      read("docs/architecture/persistence/typeorm-compatibility-manifest.json"),
    ) as { entries: CompatibilityEntry[] };
    const exceptions = JSON.parse(
      read("docs/architecture/persistence/exceptions.json"),
    ) as { exceptions: ExceptionEntry[] };

    expect(manifest.entries).toHaveLength(3);
    for (const entry of manifest.entries) {
      expect(existsSync(join(ROOT, entry.source))).toBe(true);
      expect(read(entry.source)).toContain(entry.objectName);
    }
    expect(exceptions.exceptions).toHaveLength(2);
    expect(exceptions.exceptions.map(({ id }) => id).sort()).toEqual([
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

  it("derives wishlist identities from entities, registries, and migrations", () => {
    const wishlistMappings = mappings.filter(({ table }) =>
      table.includes("wishlist"),
    );
    expect(wishlistMappings.map(({ table }) => table)).toEqual(["wishlists"]);
    expect(read("src/database/entity-registry.ts")).toContain(
      'entry("wishlists", Wishlist, true)',
    );
    const baseline = read(
      "src/database/migrations-v2/1800000000000-CreateCanonicalBaselineV2.ts",
    );
    expect(baseline).toContain('"public"."wishlists"');
    expect(baseline).not.toContain("product_wishlist");
    expect(read(KICKOFF_PATH)).toContain("WISHLIST_NAME_MISMATCH_EXISTS=YES");
  });

  it("derives migration lineage reachability without constructing a DataSource", () => {
    expect(LEGACY_MIGRATIONS).toHaveLength(11);
    expect(V2_MIGRATIONS).toHaveLength(6);
    expect(read("src/database/data-source.ts")).toContain("V2_MIGRATIONS");
    expect(read("src/database/data-source.ts")).not.toContain(
      "LEGACY_MIGRATIONS",
    );
    expect(read("src/database/legacy-data-source.ts")).toContain(
      "LEGACY_MIGRATIONS",
    );
    const packageDocument = JSON.parse(read("package.json")) as {
      scripts: Record<string, string>;
    };
    expect(packageDocument.scripts["migration:legacy:show"]).toContain(
      "legacy-data-source.ts",
    );
    expect(packageDocument.scripts["migration:legacy:run"]).toBeUndefined();
  });

  it("keeps the documented implementation graph acyclic", () => {
    const kickoff = read(KICKOFF_PATH);
    const marker = kickoff.match(/^PHASE_9_IMPLEMENTATION_DAG=(.+)$/m)?.[1];
    expect(marker).toBeDefined();
    const edges = (marker as string).split(";").flatMap((expression) => {
      const [dependencies, target] = expression.split(">");
      return dependencies
        .split("+")
        .map((dependency) => [dependency, target] as const);
    });
    const targets = new Set(edges.map(([, target]) => target));
    expect([...targets].sort()).toEqual([
      "P9-01",
      "P9-02",
      "P9-03",
      "P9-04",
      "P9-05",
      "P9-06",
      "P9-07",
      "P9-08",
      "P9-09",
    ]);
    expectAcyclic(edges);
    expect(kickoff).toContain("PHASE_9_DAG_CYCLE_COUNT=0");
  });

  it("records a database-free, non-production P9-00 status", () => {
    const kickoff = read(KICKOFF_PATH);
    expect(kickoff).toContain("PRODUCTION_ACCESS_ATTEMPTED=NO");
    expect(kickoff).toContain(
      "P9_00_IMPLEMENTATION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW",
    );
    expect(kickoff).toContain("P9_00_BLOCKERS=NONE_FOR_INVENTORY");
    expect(kickoff).toContain("PHASE_09_IMPLEMENTATION_STATUS=IN_PROGRESS");
    expect(kickoff).toContain("PHASE_09_COMPLETE=NO");
    const specification = read(normalized(__filename));
    const parsed = ts.createSourceFile(
      __filename,
      specification,
      ts.ScriptTarget.Latest,
      true,
    );
    const imports = parsed.statements
      .filter(ts.isImportDeclaration)
      .map((statement) =>
        ts.isStringLiteral(statement.moduleSpecifier)
          ? statement.moduleSpecifier.text
          : "",
      );
    expect(imports).not.toContain("typeorm");
    expect(imports).not.toContain("../data-source");
    expect(imports).not.toContain("../legacy-data-source");
  });
});
