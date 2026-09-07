import {
  CatalogColumn,
  CatalogConstraint,
  CatalogIndex,
  CatalogSnapshot,
} from "./catalog-inspector";

export type CompatibilityObjectType =
  | "foreign-key"
  | "index"
  | "check-constraint"
  | "unique-constraint"
  | "column";

export interface TypeOrmCompatibilityEntry {
  schema: string;
  table: string;
  objectType: CompatibilityObjectType;
  objectName: string;
  expectedDefinition: string;
  reason: string;
  owner: string;
  deferredPhase: string;
  expiresAt: string;
  source: string;
}

export interface TypeOrmCompatibilityManifest {
  version: number;
  entries: TypeOrmCompatibilityEntry[];
}

export interface ParsedTypeOrmDrop {
  schema: string;
  table: string | null;
  kind: "constraint" | "index" | "column";
  objectName: string;
  sql: string;
}

export interface TypeOrmCompatibilityResult {
  rawDiffCount: number;
  reviewedCompatibilityCount: number;
  unexpected: Array<{ sql: string; reason: string }>;
  staleManifestEntries: TypeOrmCompatibilityEntry[];
  catalogMismatches: Array<{
    entry: TypeOrmCompatibilityEntry;
    reason: string;
    actualDefinition: string | null;
  }>;
}

interface SqlToken {
  type: "word" | "identifier" | "dot";
  value: string;
}

function tokenizeSql(sql: string): SqlToken[] {
  const tokens: SqlToken[] = [];
  let index = 0;
  while (index < sql.length) {
    const character = sql[index];
    if (/\s/.test(character) || character === ";") {
      index += 1;
      continue;
    }
    if (character === ".") {
      tokens.push({ type: "dot", value: "." });
      index += 1;
      continue;
    }
    if (character === '"') {
      let value = "";
      index += 1;
      while (index < sql.length) {
        if (sql[index] === '"' && sql[index + 1] === '"') {
          value += '"';
          index += 2;
          continue;
        }
        if (sql[index] === '"') {
          index += 1;
          break;
        }
        value += sql[index];
        index += 1;
      }
      tokens.push({ type: "identifier", value });
      continue;
    }
    let value = "";
    while (
      index < sql.length &&
      !/\s/.test(sql[index]) &&
      !['"', ".", ";"].includes(sql[index])
    ) {
      value += sql[index];
      index += 1;
    }
    if (!value) throw new Error(`Unsupported SQL token at position ${index}`);
    tokens.push({ type: "word", value: value.toUpperCase() });
  }
  return tokens;
}

function readQualifiedName(
  tokens: SqlToken[],
  start: number,
  defaultSchema: string,
): { schema: string; name: string; next: number } {
  const first = tokens[start];
  if (!first || first.type !== "identifier") {
    throw new Error("Expected a quoted SQL identifier");
  }
  if (tokens[start + 1]?.type === "dot") {
    const second = tokens[start + 2];
    if (!second || second.type !== "identifier") {
      throw new Error("Expected a quoted identifier after schema");
    }
    return { schema: first.value, name: second.value, next: start + 3 };
  }
  return { schema: defaultSchema, name: first.value, next: start + 1 };
}

const isWord = (token: SqlToken | undefined, value: string): boolean =>
  token?.type === "word" && token.value === value;

export function parseTypeOrmDropOperation(
  sql: string,
  defaultSchema = "public",
): ParsedTypeOrmDrop {
  const tokens = tokenizeSql(sql);
  if (isWord(tokens[0], "DROP") && isWord(tokens[1], "INDEX")) {
    const indexName = readQualifiedName(tokens, 2, defaultSchema);
    if (indexName.next !== tokens.length) {
      throw new Error("Unexpected tokens after DROP INDEX");
    }
    return {
      schema: indexName.schema,
      table: null,
      kind: "index",
      objectName: indexName.name,
      sql,
    };
  }
  if (isWord(tokens[0], "ALTER") && isWord(tokens[1], "TABLE")) {
    const tableName = readQualifiedName(tokens, 2, defaultSchema);
    if (!isWord(tokens[tableName.next], "DROP")) {
      throw new Error("Only ALTER TABLE drop-object operations are reviewable");
    }
    if (isWord(tokens[tableName.next + 1], "COLUMN")) {
      const columnName = tokens[tableName.next + 2];
      if (
        columnName?.type !== "identifier" ||
        tableName.next + 3 !== tokens.length
      ) {
        throw new Error("Invalid ALTER TABLE DROP COLUMN shape");
      }
      return {
        schema: tableName.schema,
        table: tableName.name,
        kind: "column",
        objectName: columnName.value,
        sql,
      };
    }
    if (!isWord(tokens[tableName.next + 1], "CONSTRAINT")) {
      throw new Error(
        "Only ALTER TABLE DROP CONSTRAINT or DROP COLUMN is reviewable",
      );
    }
    const constraintName = tokens[tableName.next + 2];
    if (
      constraintName?.type !== "identifier" ||
      tableName.next + 3 !== tokens.length
    ) {
      throw new Error("Invalid ALTER TABLE DROP CONSTRAINT shape");
    }
    return {
      schema: tableName.schema,
      table: tableName.name,
      kind: "constraint",
      objectName: constraintName.value,
      sql,
    };
  }
  throw new Error("TypeORM operation is not an exact drop-object operation");
}

function columnDefinition(column: CatalogColumn): string {
  return JSON.stringify({
    dataType: column.dataType,
    udtSchema: column.udtSchema,
    udtName: column.udtName,
    nullable: column.nullable,
    default: column.default,
    characterMaximumLength: column.characterMaximumLength,
    numericPrecision: column.numericPrecision,
    numericScale: column.numericScale,
    identity: column.identity,
    generated: column.generated,
  });
}

function constraintDefinition(constraint: CatalogConstraint): string {
  return JSON.stringify({
    columns: constraint.columns,
    definition: constraint.definition,
    referencedSchema: constraint.referencedSchema,
    referencedTable: constraint.referencedTable,
    referencedColumns: constraint.referencedColumns,
    onUpdate: constraint.onUpdate,
    onDelete: constraint.onDelete,
    deferrable: constraint.deferrable,
    initiallyDeferred: constraint.initiallyDeferred,
  });
}

function indexDefinition(index: CatalogIndex): string {
  return JSON.stringify({
    unique: index.unique,
    primary: index.primary,
    method: index.method,
    definition: index.definition,
    predicate: index.predicate,
  });
}

export function getCompatibilityObjectDefinition(
  snapshot: CatalogSnapshot,
  entry: Pick<
    TypeOrmCompatibilityEntry,
    "schema" | "table" | "objectType" | "objectName"
  >,
): string | null {
  if (entry.schema !== snapshot.schema) return null;
  const table = snapshot.tables.find(({ name }) => name === entry.table);
  if (!table) return null;
  if (entry.objectType === "column") {
    const column = table.columns.find(({ name }) => name === entry.objectName);
    return column ? columnDefinition(column) : null;
  }
  if (entry.objectType === "index") {
    const index = table.indexes.find(({ name }) => name === entry.objectName);
    return index ? indexDefinition(index) : null;
  }
  const constraint = table.constraints.find(
    ({ name, type }) => name === entry.objectName && type === entry.objectType,
  );
  return constraint ? constraintDefinition(constraint) : null;
}

const manifestKey = (entry: TypeOrmCompatibilityEntry): string =>
  `${entry.schema}:${entry.table}:${entry.objectType}:${entry.objectName}`;

export function verifyTypeOrmCompatibilityParity(
  rawSql: string[],
  snapshot: CatalogSnapshot,
  manifest: TypeOrmCompatibilityManifest,
  today = new Date(),
): TypeOrmCompatibilityResult {
  const unexpected: TypeOrmCompatibilityResult["unexpected"] = [];
  const catalogMismatches: TypeOrmCompatibilityResult["catalogMismatches"] = [];
  const seenManifestKeys = new Set<string>();
  const manifestByObjectName = new Map<string, TypeOrmCompatibilityEntry[]>();

  for (const entry of manifest.entries) {
    const key = manifestKey(entry);
    if (seenManifestKeys.has(key)) {
      catalogMismatches.push({
        entry,
        reason: "duplicate manifest key",
        actualDefinition: null,
      });
    }
    seenManifestKeys.add(key);
    const candidates = manifestByObjectName.get(entry.objectName) ?? [];
    manifestByObjectName.set(entry.objectName, [...candidates, entry]);
    if (new Date(`${entry.expiresAt}T23:59:59.999Z`) < today) {
      catalogMismatches.push({
        entry,
        reason: "manifest entry expired",
        actualDefinition: null,
      });
    }
    const actualDefinition = getCompatibilityObjectDefinition(snapshot, entry);
    if (actualDefinition !== entry.expectedDefinition) {
      catalogMismatches.push({
        entry,
        reason:
          actualDefinition === null
            ? "manifest object is missing from catalog"
            : "catalog definition differs from manifest",
        actualDefinition,
      });
    }
  }

  const matched = new Set<string>();
  for (const sql of rawSql) {
    let operation: ParsedTypeOrmDrop;
    try {
      operation = parseTypeOrmDropOperation(sql, snapshot.schema);
    } catch (error) {
      unexpected.push({
        sql,
        reason:
          error instanceof Error ? error.message : "unparseable operation",
      });
      continue;
    }
    const candidates = manifestByObjectName.get(operation.objectName) ?? [];
    const exact = candidates.filter((entry) => {
      if (entry.schema !== operation.schema) return false;
      if (operation.kind === "index") return entry.objectType === "index";
      if (operation.kind === "column") {
        return entry.table === operation.table && entry.objectType === "column";
      }
      return (
        entry.table === operation.table &&
        entry.objectType !== "index" &&
        entry.objectType !== "column"
      );
    });
    if (exact.length !== 1) {
      unexpected.push({
        sql,
        reason:
          exact.length === 0
            ? "no exact manifest object"
            : "ambiguous manifest objects",
      });
      continue;
    }
    const key = manifestKey(exact[0]);
    if (matched.has(key)) {
      unexpected.push({
        sql,
        reason: "manifest object matched more than once",
      });
      continue;
    }
    matched.add(key);
  }

  return {
    rawDiffCount: rawSql.length,
    reviewedCompatibilityCount: matched.size,
    unexpected,
    staleManifestEntries: manifest.entries.filter(
      (entry) => !matched.has(manifestKey(entry)),
    ),
    catalogMismatches,
  };
}
