import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

interface OwnershipEntry {
  schema: string;
  table: string;
  owner: string;
  status: string;
  currentMappings: string[];
}

interface ExceptionEntry {
  id: string;
  expiresAt: string;
  edges?: string[];
  registrations?: string[];
  files?: string[];
}

interface EntityMapping {
  kind: 'Entity' | 'ViewEntity';
  schema: string;
  table: string;
  entity: string;
  file: string;
}

interface AuditResult {
  summary: {
    writableMappings: number;
    viewMappings: number;
    physicalTables: number;
    duplicateTables: number;
    centralMappings: number;
    moduleMappings: number;
    centralImportEdges: number;
    crossModuleInfrastructureEdges: number;
    foreignForFeatureRegistrations: number;
  };
  violations: string[];
}

const ROOT = process.cwd();
const OWNERSHIP_PATH = path.join(
  ROOT,
  'docs/architecture/persistence/entity-ownership.json',
);
const EXCEPTIONS_PATH = path.join(
  ROOT,
  'docs/architecture/persistence/exceptions.json',
);

function normalize(file: string): string {
  return path.relative(ROOT, file).replace(/\\/g, '/');
}

function walk(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(target);
    return entry.isFile() && target.endsWith('.ts') ? [target] : [];
  });
}

function decorators(node: ts.Node): readonly ts.Decorator[] {
  return ts.canHaveDecorators(node) ? (ts.getDecorators(node) ?? []) : [];
}

function decoratorName(decorator: ts.Decorator): string {
  let expression: ts.Expression = decorator.expression;
  if (ts.isCallExpression(expression)) expression = expression.expression;
  return ts.isIdentifier(expression) ? expression.text : expression.getText();
}

function objectProperty(
  object: ts.ObjectLiteralExpression,
  key: string,
): string | undefined {
  for (const property of object.properties) {
    if (!ts.isPropertyAssignment(property)) continue;
    if (property.name.getText().replace(/['"]/g, '') !== key) continue;
    if (ts.isStringLiteral(property.initializer)) return property.initializer.text;
  }
  return undefined;
}

function scanMappings(files: string[]): EntityMapping[] {
  const mappings: EntityMapping[] = [];
  for (const file of files) {
    const source = ts.createSourceFile(
      file,
      fs.readFileSync(file, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
    );
    const visit = (node: ts.Node): void => {
      if (ts.isClassDeclaration(node) && node.name) {
        for (const decorator of decorators(node)) {
          const kind = decoratorName(decorator);
          if (kind !== 'Entity' && kind !== 'ViewEntity') continue;
          let schema = 'public';
          let table = node.name.text;
          if (ts.isCallExpression(decorator.expression)) {
            const argument = decorator.expression.arguments[0];
            if (argument && ts.isStringLiteral(argument)) table = argument.text;
            if (argument && ts.isObjectLiteralExpression(argument)) {
              schema = objectProperty(argument, 'schema') ?? schema;
              table = objectProperty(argument, 'name') ?? table;
            }
          }
          mappings.push({
            kind,
            schema,
            table,
            entity: node.name.text,
            file: normalize(file),
          });
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return mappings;
}

function scanImports(files: string[]): string[] {
  const edges: string[] = [];
  for (const file of files) {
    const source = ts.createSourceFile(
      file,
      fs.readFileSync(file, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
    );
    for (const statement of source.statements) {
      if (!ts.isImportDeclaration(statement)) continue;
      if (!ts.isStringLiteral(statement.moduleSpecifier)) continue;
      edges.push(`${normalize(file)} -> ${statement.moduleSpecifier.text}`);
    }
  }
  return edges;
}

function resolveImport(sourceFile: string, target: string): string | null {
  let resolved: string;
  if (target.startsWith('.')) {
    resolved = path.resolve(path.dirname(path.join(ROOT, sourceFile)), target);
  } else if (target.startsWith('@database/')) {
    resolved = path.join(ROOT, 'src/database', target.slice('@database/'.length));
  } else if (target.startsWith('@modules/')) {
    resolved = path.join(ROOT, 'src/modules', target.slice('@modules/'.length));
  } else {
    return null;
  }
  for (const candidate of [`${resolved}.ts`, path.join(resolved, 'index.ts')]) {
    if (fs.existsSync(candidate)) return normalize(candidate);
  }
  return null;
}

function scanForFeatureRegistrations(
  files: string[],
  ownerByMappingFile: Map<string, string>,
): string[] {
  const registrations: string[] = [];
  for (const file of files) {
    const sourceFile = normalize(file);
    const moduleMatch = sourceFile.match(/^src\/modules\/([^/]+)\//);
    if (!moduleMatch) continue;
    const moduleOwner = moduleMatch[1];
    const source = ts.createSourceFile(
      file,
      fs.readFileSync(file, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
    );
    const imports = new Map<string, string>();
    for (const statement of source.statements) {
      if (!ts.isImportDeclaration(statement)) continue;
      if (!ts.isStringLiteral(statement.moduleSpecifier)) continue;
      const bindings = statement.importClause?.namedBindings;
      if (!bindings || !ts.isNamedImports(bindings)) continue;
      for (const element of bindings.elements) {
        imports.set(element.name.text, statement.moduleSpecifier.text);
      }
    }
    const visit = (node: ts.Node): void => {
      if (
        ts.isCallExpression(node) &&
        node.expression.getText(source) === 'TypeOrmModule.forFeature'
      ) {
        const list = node.arguments[0];
        if (list && ts.isArrayLiteralExpression(list)) {
          for (const element of list.elements) {
            if (!ts.isIdentifier(element)) continue;
            const target = imports.get(element.text);
            const resolved = target
              ? resolveImport(sourceFile, target)
              : undefined;
            const owner = resolved
              ? ownerByMappingFile.get(resolved)
              : undefined;
            if (owner && owner !== moduleOwner) {
              registrations.push(`${sourceFile}:${element.text}`);
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return registrations.sort();
}

function exactSetDifference(actual: string[], expected: string[]): string[] {
  const expectedSet = new Set(expected);
  const actualSet = new Set(actual);
  return [
    ...actual.filter((value) => !expectedSet.has(value)).map(
      (value) => `unexpected: ${value}`,
    ),
    ...expected.filter((value) => !actualSet.has(value)).map(
      (value) => `missing baseline: ${value}`,
    ),
  ];
}

export function auditPersistenceArchitecture(now = new Date()): AuditResult {
  const ownership = JSON.parse(
    fs.readFileSync(OWNERSHIP_PATH, 'utf8'),
  ) as { tables: OwnershipEntry[] };
  const exceptionDocument = JSON.parse(
    fs.readFileSync(EXCEPTIONS_PATH, 'utf8'),
  ) as { exceptions: ExceptionEntry[] };
  const sourceFiles = walk(path.join(ROOT, 'src'));
  const productionFiles = sourceFiles.filter(
    (file) => !file.endsWith('.spec.ts'),
  );
  const mappings = scanMappings(productionFiles);
  const writable = mappings.filter((mapping) => mapping.kind === 'Entity');
  const views = mappings.filter((mapping) => mapping.kind === 'ViewEntity');
  const imports = scanImports(productionFiles);
  const violations: string[] = [];

  const registryByKey = new Map(
    ownership.tables.map((entry) => [
      `${entry.schema}.${entry.table}`,
      entry,
    ]),
  );
  if (registryByKey.size !== ownership.tables.length) {
    violations.push('Ownership registry contains duplicate schema.table keys');
  }

  const actualMappingsByKey = new Map<string, string[]>();
  for (const mapping of writable) {
    const key = `${mapping.schema}.${mapping.table}`;
    const files = actualMappingsByKey.get(key) ?? [];
    files.push(mapping.file);
    actualMappingsByKey.set(key, files);
    if (!registryByKey.has(key)) {
      violations.push(`Unregistered writable mapping: ${key} (${mapping.file})`);
    }
  }

  for (const entry of ownership.tables) {
    const key = `${entry.schema}.${entry.table}`;
    const actual = (actualMappingsByKey.get(key) ?? []).sort();
    const expected = [...entry.currentMappings].sort();
    violations.push(
      ...exactSetDifference(actual, expected).map(
        (difference) => `${key} ${difference}`,
      ),
    );
    if (actual.length > 1 && entry.status === 'canonical') {
      violations.push(`${key} is canonical but has ${actual.length} mappings`);
    }
  }

  if (views.length > 0) {
    violations.push(
      ...views.map(
        (view) =>
          `View mapping requires an explicit exception: ${view.schema}.${view.table}`,
      ),
    );
  }

  for (const exception of exceptionDocument.exceptions) {
    if (new Date(`${exception.expiresAt}T23:59:59Z`) < now) {
      violations.push(`Expired exception: ${exception.id}`);
    }
  }

  const centralEdges = imports
    .filter((edge) => edge.startsWith('src/modules/'))
    .filter((edge) => edge.includes('database/entities'));
  const expectedCentralEdges =
    exceptionDocument.exceptions.find(
      (entry) => entry.id === 'legacy-central-entity-imports',
    )?.edges ?? [];
  violations.push(
    ...exactSetDifference(centralEdges.sort(), [...expectedCentralEdges].sort()),
  );

  const crossInfrastructureEdges = imports
    .filter((edge) => edge.startsWith('src/modules/'))
    .filter((edge) => edge.includes('@modules/'))
    .filter((edge) => edge.includes('/infrastructure/'));
  const expectedCrossInfrastructure =
    exceptionDocument.exceptions.find(
      (entry) => entry.id === 'reviews-product-infrastructure-import',
    )?.edges ?? [];
  violations.push(
    ...exactSetDifference(
      crossInfrastructureEdges.sort(),
      [...expectedCrossInfrastructure].sort(),
    ),
  );

  for (const edge of imports) {
    const [source, target] = edge.split(' -> ');
    if (
      /^src\/modules\/[^/]+\/(application|domain)\//.test(source) &&
      (target === 'typeorm' || target === '@nestjs/typeorm')
    ) {
      violations.push(`Application/domain imports TypeORM: ${edge}`);
    }
  }

  const ownerByMappingFile = new Map<string, string>();
  for (const entry of ownership.tables) {
    for (const file of entry.currentMappings) {
      ownerByMappingFile.set(file, entry.owner);
    }
  }
  const forFeatureRegistrations = scanForFeatureRegistrations(
    productionFiles,
    ownerByMappingFile,
  );
  const expectedRegistrations =
    exceptionDocument.exceptions.find(
      (entry) => entry.id === 'foreign-for-feature-registration',
    )?.registrations ?? [];
  violations.push(
    ...exactSetDifference(
      forFeatureRegistrations,
      [...expectedRegistrations].sort(),
    ),
  );

  const repositoryExportFiles = productionFiles
    .filter((file) => /\.module\.ts$/.test(file) || /\.route\.ts$/.test(file))
    .filter((file) =>
      /exports\s*:\s*\[[^\]]*TypeOrmModule/s.test(
        fs.readFileSync(file, 'utf8'),
      ),
    )
    .map(normalize)
    .sort();
  const expectedRepositoryExports =
    exceptionDocument.exceptions.find(
      (entry) => entry.id === 'users-exports-typeorm-module',
    )?.files ?? [];
  violations.push(
    ...exactSetDifference(
      repositoryExportFiles,
      [...expectedRepositoryExports].sort(),
    ),
  );

  const duplicateTables = [...actualMappingsByKey.values()].filter(
    (files) => files.length > 1,
  ).length;
  return {
    summary: {
      writableMappings: writable.length,
      viewMappings: views.length,
      physicalTables: actualMappingsByKey.size,
      duplicateTables,
      centralMappings: writable.filter((mapping) =>
        mapping.file.startsWith('src/database/entities/'),
      ).length,
      moduleMappings: writable.filter((mapping) =>
        mapping.file.startsWith('src/modules/'),
      ).length,
      centralImportEdges: centralEdges.length,
      crossModuleInfrastructureEdges: crossInfrastructureEdges.length,
      foreignForFeatureRegistrations: forFeatureRegistrations.length,
    },
    violations,
  };
}

if (require.main === module) {
  const result = auditPersistenceArchitecture();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.violations.length > 0) process.exitCode = 1;
}
