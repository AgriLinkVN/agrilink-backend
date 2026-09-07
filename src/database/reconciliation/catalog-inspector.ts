import { createHash } from "crypto";
import { DataSource } from "typeorm";

export interface CatalogColumn {
  name: string;
  dataType: string;
  udtSchema: string;
  udtName: string;
  nullable: boolean;
  default: string | null;
  characterMaximumLength: number | null;
  numericPrecision: number | null;
  numericScale: number | null;
  identity: string | null;
  generated: string | null;
}

export interface CatalogConstraint {
  table: string;
  name: string;
  type:
    | "primary-key"
    | "unique-constraint"
    | "check-constraint"
    | "foreign-key";
  columns: string[];
  definition: string;
  referencedSchema: string | null;
  referencedTable: string | null;
  referencedColumns: string[];
  onUpdate: string | null;
  onDelete: string | null;
  deferrable: boolean;
  initiallyDeferred: boolean;
}

export interface CatalogIndex {
  table: string;
  name: string;
  unique: boolean;
  primary: boolean;
  method: string;
  definition: string;
  predicate: string | null;
}

export interface CatalogTable {
  name: string;
  columns: CatalogColumn[];
  constraints: CatalogConstraint[];
  indexes: CatalogIndex[];
}

export interface CatalogSnapshot {
  schema: string;
  schemas: string[];
  extensions: Array<{ name: string; schema: string }>;
  enums: Array<{ name: string; values: string[] }>;
  tables: CatalogTable[];
  sequences: Array<{
    name: string;
    dataType: string;
    start: string;
    increment: string;
    minimum: string;
    maximum: string;
    cycle: boolean;
    ownedByTable: string | null;
    ownedByColumn: string | null;
  }>;
  triggers: Array<{ table: string; name: string; definition: string }>;
}

export interface CatalogDifference {
  kind: "missing" | "unexpected" | "changed";
  key: string;
  expected: unknown;
  actual: unknown;
}

type QueryRow = Record<string, unknown>;
type CatalogQueryExecutor = Pick<DataSource, "query">;

const normalizeDefinition = (value: unknown): string =>
  String(value).replace(/\s+/g, " ").trim();

const asString = (value: unknown): string => String(value);
const asNullableString = (value: unknown): string | null =>
  value === null || value === undefined ? null : String(value);
const asNumberOrNull = (value: unknown): number | null =>
  value === null || value === undefined ? null : Number(value);

export async function captureCatalogSnapshot(
  dataSource: CatalogQueryExecutor,
  schema = "public",
): Promise<CatalogSnapshot> {
  const schemas = (await dataSource.query(
    `SELECT nspname AS name FROM pg_namespace WHERE nspname = $1 ORDER BY nspname`,
    [schema],
  )) as QueryRow[];
  const extensions = (await dataSource.query(
    `
      SELECT extension_record.extname AS name, namespace_record.nspname AS schema
      FROM pg_extension extension_record
      INNER JOIN pg_namespace namespace_record
        ON namespace_record.oid = extension_record.extnamespace
      WHERE namespace_record.nspname = $1
      ORDER BY extension_record.extname
    `,
    [schema],
  )) as QueryRow[];
  const enumRows = (await dataSource.query(
    `
      SELECT type_record.typname AS name, enum_record.enumlabel AS value,
             enum_record.enumsortorder AS sort_order
      FROM pg_type type_record
      INNER JOIN pg_enum enum_record ON enum_record.enumtypid = type_record.oid
      INNER JOIN pg_namespace namespace_record
        ON namespace_record.oid = type_record.typnamespace
      WHERE namespace_record.nspname = $1
      ORDER BY type_record.typname, enum_record.enumsortorder
    `,
    [schema],
  )) as QueryRow[];
  const tableRows = (await dataSource.query(
    `
      SELECT table_name AS name
      FROM information_schema.tables
      WHERE table_schema = $1
        AND table_type = 'BASE TABLE'
        AND table_name NOT IN ('migrations', 'migrations_v2')
      ORDER BY table_name
    `,
    [schema],
  )) as QueryRow[];
  const columnRows = (await dataSource.query(
    `
      SELECT table_name, column_name AS name,
             data_type, udt_schema, udt_name,
             is_nullable = 'YES' AS nullable,
             column_default AS default,
             character_maximum_length,
             numeric_precision, numeric_scale,
             CASE WHEN is_identity = 'YES' THEN identity_generation END AS identity,
             CASE WHEN is_generated <> 'NEVER' THEN generation_expression END AS generated
      FROM information_schema.columns
      WHERE table_schema = $1
        AND table_name NOT IN ('migrations', 'migrations_v2')
      ORDER BY table_name, column_name
    `,
    [schema],
  )) as QueryRow[];
  const constraintRows = (await dataSource.query(
    `
      SELECT table_record.relname AS table_name,
             constraint_record.conname AS name,
             constraint_record.contype AS constraint_type,
             pg_get_constraintdef(constraint_record.oid, true) AS definition,
             referenced_namespace.nspname AS referenced_schema,
             referenced_table.relname AS referenced_table,
             constraint_record.confupdtype AS update_action,
             constraint_record.confdeltype AS delete_action,
             constraint_record.condeferrable AS deferrable,
             constraint_record.condeferred AS initially_deferred,
             COALESCE((
               SELECT array_agg(attribute_record.attname ORDER BY key_record.ordinality)
               FROM unnest(constraint_record.conkey)
                 WITH ORDINALITY AS key_record(attribute_number, ordinality)
               INNER JOIN pg_attribute attribute_record
                 ON attribute_record.attrelid = constraint_record.conrelid
                AND attribute_record.attnum = key_record.attribute_number
             ), ARRAY[]::name[]) AS columns,
             COALESCE((
               SELECT array_agg(attribute_record.attname ORDER BY key_record.ordinality)
               FROM unnest(constraint_record.confkey)
                 WITH ORDINALITY AS key_record(attribute_number, ordinality)
               INNER JOIN pg_attribute attribute_record
                 ON attribute_record.attrelid = constraint_record.confrelid
                AND attribute_record.attnum = key_record.attribute_number
             ), ARRAY[]::name[]) AS referenced_columns
      FROM pg_constraint constraint_record
      INNER JOIN pg_class table_record
        ON table_record.oid = constraint_record.conrelid
      INNER JOIN pg_namespace table_namespace
        ON table_namespace.oid = table_record.relnamespace
      LEFT JOIN pg_class referenced_table
        ON referenced_table.oid = constraint_record.confrelid
      LEFT JOIN pg_namespace referenced_namespace
        ON referenced_namespace.oid = referenced_table.relnamespace
      WHERE table_namespace.nspname = $1
        AND table_record.relname NOT IN ('migrations', 'migrations_v2')
        AND constraint_record.contype IN ('p', 'u', 'c', 'f')
      ORDER BY table_record.relname, constraint_record.contype,
               constraint_record.conname
    `,
    [schema],
  )) as QueryRow[];
  const indexRows = (await dataSource.query(
    `
      SELECT table_record.relname AS table_name,
             index_record.relname AS name,
             index_metadata.indisunique AS unique,
             index_metadata.indisprimary AS primary,
             access_method.amname AS method,
             pg_get_indexdef(index_record.oid, 0, true) AS definition,
             pg_get_expr(index_metadata.indpred, index_metadata.indrelid, true)
               AS predicate
      FROM pg_index index_metadata
      INNER JOIN pg_class table_record
        ON table_record.oid = index_metadata.indrelid
      INNER JOIN pg_namespace table_namespace
        ON table_namespace.oid = table_record.relnamespace
      INNER JOIN pg_class index_record
        ON index_record.oid = index_metadata.indexrelid
      INNER JOIN pg_am access_method
        ON access_method.oid = index_record.relam
      WHERE table_namespace.nspname = $1
        AND table_record.relname NOT IN ('migrations', 'migrations_v2')
      ORDER BY table_record.relname, index_record.relname
    `,
    [schema],
  )) as QueryRow[];
  const sequenceRows = (await dataSource.query(
    `
      SELECT sequence_record.relname AS name,
             format_type(sequence_metadata.seqtypid, NULL) AS data_type,
             sequence_metadata.seqstart::text AS start,
             sequence_metadata.seqincrement::text AS increment,
             sequence_metadata.seqmin::text AS minimum,
             sequence_metadata.seqmax::text AS maximum,
             sequence_metadata.seqcycle AS cycle,
             owned_table.relname AS owned_by_table,
             owned_column.attname AS owned_by_column
      FROM pg_sequence sequence_metadata
      INNER JOIN pg_class sequence_record
        ON sequence_record.oid = sequence_metadata.seqrelid
      INNER JOIN pg_namespace sequence_namespace
        ON sequence_namespace.oid = sequence_record.relnamespace
      LEFT JOIN pg_depend ownership
        ON ownership.objid = sequence_record.oid
       AND ownership.deptype = 'a'
      LEFT JOIN pg_class owned_table
        ON owned_table.oid = ownership.refobjid
      LEFT JOIN pg_attribute owned_column
        ON owned_column.attrelid = ownership.refobjid
       AND owned_column.attnum = ownership.refobjsubid
      WHERE sequence_namespace.nspname = $1
        AND COALESCE(owned_table.relname, '') NOT IN ('migrations', 'migrations_v2')
      ORDER BY sequence_record.relname
    `,
    [schema],
  )) as QueryRow[];
  const triggerRows = (await dataSource.query(
    `
      SELECT table_record.relname AS table_name,
             trigger_record.tgname AS name,
             pg_get_triggerdef(trigger_record.oid, true) AS definition
      FROM pg_trigger trigger_record
      INNER JOIN pg_class table_record
        ON table_record.oid = trigger_record.tgrelid
      INNER JOIN pg_namespace table_namespace
        ON table_namespace.oid = table_record.relnamespace
      WHERE table_namespace.nspname = $1
        AND NOT trigger_record.tgisinternal
      ORDER BY table_record.relname, trigger_record.tgname
    `,
    [schema],
  )) as QueryRow[];

  const enumMap = new Map<string, string[]>();
  for (const row of enumRows) {
    const name = asString(row.name);
    enumMap.set(name, [...(enumMap.get(name) ?? []), asString(row.value)]);
  }
  const constraints = constraintRows.map(mapConstraint);
  const indexes = indexRows.map(mapIndex);
  const tables = tableRows.map(({ name: rawName }) => {
    const name = asString(rawName);
    return {
      name,
      columns: columnRows
        .filter((row) => row.table_name === name)
        .map(mapColumn),
      constraints: constraints.filter(
        (constraint) => constraint.table === name,
      ),
      indexes: indexes.filter((index) => index.table === name),
    };
  });

  return {
    schema,
    schemas: schemas.map(({ name }) => asString(name)),
    extensions: extensions.map(({ name, schema: extensionSchema }) => ({
      name: asString(name),
      schema: asString(extensionSchema),
    })),
    enums: [...enumMap.entries()].map(([name, values]) => ({ name, values })),
    tables,
    sequences: sequenceRows.map((row) => ({
      name: asString(row.name),
      dataType: asString(row.data_type),
      start: asString(row.start),
      increment: asString(row.increment),
      minimum: asString(row.minimum),
      maximum: asString(row.maximum),
      cycle: Boolean(row.cycle),
      ownedByTable: asNullableString(row.owned_by_table),
      ownedByColumn: asNullableString(row.owned_by_column),
    })),
    triggers: triggerRows.map((row) => ({
      table: asString(row.table_name),
      name: asString(row.name),
      definition: normalizeDefinition(row.definition),
    })),
  };
}

function mapColumn(row: QueryRow): CatalogColumn {
  return {
    name: asString(row.name),
    dataType: asString(row.data_type),
    udtSchema: asString(row.udt_schema),
    udtName: asString(row.udt_name),
    nullable: Boolean(row.nullable),
    default: asNullableString(row.default),
    characterMaximumLength: asNumberOrNull(row.character_maximum_length),
    numericPrecision: asNumberOrNull(row.numeric_precision),
    numericScale: asNumberOrNull(row.numeric_scale),
    identity: asNullableString(row.identity),
    generated: asNullableString(row.generated),
  };
}

const CONSTRAINT_TYPES: Record<string, CatalogConstraint["type"]> = {
  p: "primary-key",
  u: "unique-constraint",
  c: "check-constraint",
  f: "foreign-key",
};
const ACTIONS: Record<string, string> = {
  a: "NO ACTION",
  r: "RESTRICT",
  c: "CASCADE",
  n: "SET NULL",
  d: "SET DEFAULT",
};

function mapConstraint(row: QueryRow): CatalogConstraint {
  const type = CONSTRAINT_TYPES[asString(row.constraint_type)];
  return {
    table: asString(row.table_name),
    name: asString(row.name),
    type,
    columns: asStringArray(row.columns),
    definition: normalizeDefinition(row.definition),
    referencedSchema: asNullableString(row.referenced_schema),
    referencedTable: asNullableString(row.referenced_table),
    referencedColumns: asStringArray(row.referenced_columns),
    onUpdate:
      type === "foreign-key" ? ACTIONS[asString(row.update_action)] : null,
    onDelete:
      type === "foreign-key" ? ACTIONS[asString(row.delete_action)] : null,
    deferrable: Boolean(row.deferrable),
    initiallyDeferred: Boolean(row.initially_deferred),
  };
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(asString);
  if (value === null || value === undefined || value === "{}") return [];
  const input = String(value);
  if (!input.startsWith("{") || !input.endsWith("}")) {
    throw new Error(`Unsupported PostgreSQL array value: ${input}`);
  }
  return input
    .slice(1, -1)
    .split(",")
    .filter(Boolean)
    .map((item) => item.replace(/^"(.*)"$/, "$1").replace(/\\"/g, '"'));
}

function mapIndex(row: QueryRow): CatalogIndex {
  return {
    table: asString(row.table_name),
    name: asString(row.name),
    unique: Boolean(row.unique),
    primary: Boolean(row.primary),
    method: asString(row.method),
    definition: normalizeDefinition(row.definition),
    predicate: asNullableString(row.predicate),
  };
}

export function catalogFingerprint(snapshot: CatalogSnapshot): string {
  return createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
}

function flattenCatalog(snapshot: CatalogSnapshot): Map<string, unknown> {
  const entries = new Map<string, unknown>();
  for (const schema of snapshot.schemas)
    entries.set(`schema:${schema}`, schema);
  for (const extension of snapshot.extensions) {
    entries.set(`extension:${extension.schema}.${extension.name}`, extension);
  }
  for (const enumRecord of snapshot.enums) {
    entries.set(`enum:${snapshot.schema}.${enumRecord.name}`, enumRecord);
  }
  for (const table of snapshot.tables) {
    entries.set(`table:${snapshot.schema}.${table.name}`, { name: table.name });
    for (const column of table.columns) {
      entries.set(`column:${table.name}.${column.name}`, column);
    }
    for (const constraint of table.constraints) {
      entries.set(
        `${constraint.type}:${table.name}.${constraint.name}`,
        constraint,
      );
    }
    for (const index of table.indexes) {
      entries.set(`index:${table.name}.${index.name}`, index);
    }
  }
  for (const sequence of snapshot.sequences) {
    entries.set(`sequence:${snapshot.schema}.${sequence.name}`, sequence);
  }
  for (const trigger of snapshot.triggers) {
    entries.set(`trigger:${trigger.table}.${trigger.name}`, trigger);
  }
  return entries;
}

export function catalogObjectCount(snapshot: CatalogSnapshot): number {
  return flattenCatalog(snapshot).size;
}

export function diffCatalogSnapshots(
  expected: CatalogSnapshot,
  actual: CatalogSnapshot,
): CatalogDifference[] {
  const expectedEntries = flattenCatalog(expected);
  const actualEntries = flattenCatalog(actual);
  const keys = [
    ...new Set([...expectedEntries.keys(), ...actualEntries.keys()]),
  ].sort();
  return keys.flatMap((key): CatalogDifference[] => {
    const expectedValue = expectedEntries.get(key);
    const actualValue = actualEntries.get(key);
    if (expectedValue === undefined) {
      return [{ kind: "unexpected", key, expected: null, actual: actualValue }];
    }
    if (actualValue === undefined) {
      return [{ kind: "missing", key, expected: expectedValue, actual: null }];
    }
    if (JSON.stringify(expectedValue) !== JSON.stringify(actualValue)) {
      return [
        {
          kind: "changed",
          key,
          expected: expectedValue,
          actual: actualValue,
        },
      ];
    }
    return [];
  });
}
