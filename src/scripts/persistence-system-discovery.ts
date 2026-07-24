import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

interface ImportBinding {
  imported: string;
  target: string | null;
}

interface ParsedFile {
  absolute: string;
  relative: string;
  source: ts.SourceFile;
  imports: Map<string, ImportBinding>;
}

interface EntityMapping {
  entity: string;
  schema: string;
  table: string;
  file: string;
  columns: Array<{
    property: string;
    column: string;
    decorator: string;
    type: string | null;
    enum: string | null;
    nullable: boolean | null;
    unique: boolean | null;
    default: string | null;
  }>;
  relations: Array<{
    property: string;
    decorator: string;
    target: string | null;
    targetFile: string | null;
    onDelete: string | null;
    cascade: string | null;
  }>;
  classConstraints: string[];
}

interface ModuleRecord {
  module: string;
  file: string;
  imports: string[];
  importedModuleFiles: string[];
  controllers: string[];
  providers: string[];
  exports: string[];
  forFeature: Array<{ entity: string; file: string | null }>;
  rootMounted: boolean;
}

interface RepositoryUsage {
  consumer: string;
  file: string;
  module: string;
  entity: string;
  entityFile: string | null;
  table: string | null;
  operations: string[];
  crossModule: boolean | null;
  transactionParticipation: string;
  rawQuery: boolean;
  returnedModel: string;
  evidence: string;
}

interface OwnershipTable {
  schema: string;
  table: string;
  owner: string;
  file: string;
  currentMappings: string[];
  risk: string;
}

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src");
const OUTPUT = path.join(ROOT, "docs/architecture/persistence/discovery");
const SOURCE_COMMIT =
  process.env.DISCOVERY_SOURCE_COMMIT ?? "unrecorded-source-commit";

function normalize(target: string): string {
  return path.relative(ROOT, target).replace(/\\/g, "/");
}

function walk(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(target);
    return entry.isFile() && target.endsWith(".ts") ? [target] : [];
  });
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

function decoratorCall(node: ts.Node, name: string): ts.CallExpression | null {
  const decorator = decorators(node).find(
    (candidate) => decoratorName(candidate) === name,
  );
  return decorator && ts.isCallExpression(decorator.expression)
    ? decorator.expression
    : null;
}

function literalText(node: ts.Node | undefined): string | null {
  if (!node) return null;
  if (
    ts.isStringLiteral(node) ||
    ts.isNoSubstitutionTemplateLiteral(node) ||
    ts.isNumericLiteral(node)
  ) {
    return node.text;
  }
  if (node.kind === ts.SyntaxKind.TrueKeyword) return "true";
  if (node.kind === ts.SyntaxKind.FalseKeyword) return "false";
  return node.getText();
}

function property(
  object: ts.ObjectLiteralExpression | undefined,
  name: string,
): ts.Expression | undefined {
  if (!object) return undefined;
  const assignment = object.properties.find(
    (candidate): candidate is ts.PropertyAssignment =>
      ts.isPropertyAssignment(candidate) &&
      candidate.name.getText().replace(/['"]/g, "") === name,
  );
  return assignment?.initializer;
}

function resolveImport(sourceFile: string, specifier: string): string | null {
  let unresolved: string;
  if (specifier.startsWith(".")) {
    unresolved = path.resolve(path.dirname(sourceFile), specifier);
  } else if (specifier.startsWith("@database/")) {
    unresolved = path.join(
      ROOT,
      "src/database",
      specifier.slice("@database/".length),
    );
  } else if (specifier.startsWith("@modules/")) {
    unresolved = path.join(
      ROOT,
      "src/modules",
      specifier.slice("@modules/".length),
    );
  } else if (specifier.startsWith("@config/")) {
    unresolved = path.join(
      ROOT,
      "src/config",
      specifier.slice("@config/".length),
    );
  } else if (specifier.startsWith("@common/")) {
    unresolved = path.join(
      ROOT,
      "src/common",
      specifier.slice("@common/".length),
    );
  } else {
    return null;
  }
  for (const candidate of [
    `${unresolved}.ts`,
    path.join(unresolved, "index.ts"),
  ]) {
    if (fs.existsSync(candidate)) return normalize(candidate);
  }
  return null;
}

function parseFiles(files: string[]): Map<string, ParsedFile> {
  const parsed = new Map<string, ParsedFile>();
  for (const absolute of files) {
    const relative = normalize(absolute);
    const source = ts.createSourceFile(
      absolute,
      fs.readFileSync(absolute, "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
    const imports = new Map<string, ImportBinding>();
    for (const statement of source.statements) {
      if (
        !ts.isImportDeclaration(statement) ||
        !ts.isStringLiteral(statement.moduleSpecifier)
      ) {
        continue;
      }
      const specifier = statement.moduleSpecifier.text;
      const target = resolveImport(absolute, specifier);
      const clause = statement.importClause;
      if (clause?.name) {
        imports.set(clause.name.text, {
          imported: "default",
          target,
        });
      }
      const bindings = clause?.namedBindings;
      if (bindings && ts.isNamedImports(bindings)) {
        for (const element of bindings.elements) {
          imports.set(element.name.text, {
            imported: element.propertyName?.text ?? element.name.text,
            target,
          });
        }
      }
    }
    parsed.set(relative, { absolute, relative, source, imports });
  }
  return parsed;
}

function ownerFromFile(file: string): string {
  const moduleMatch = file.match(/^src\/modules\/([^/]+)\//);
  if (moduleMatch) return moduleMatch[1];
  if (file.startsWith("src/database/")) return "database-central";
  if (file.startsWith("src/shared/")) return "shared";
  return "application-root";
}

function scanEntities(parsed: Map<string, ParsedFile>): EntityMapping[] {
  const mappings: EntityMapping[] = [];
  for (const file of parsed.values()) {
    const visit = (node: ts.Node): void => {
      if (!ts.isClassDeclaration(node) || !node.name) {
        ts.forEachChild(node, visit);
        return;
      }
      const entityCall = decoratorCall(node, "Entity");
      if (!entityCall) {
        ts.forEachChild(node, visit);
        return;
      }
      const entityArgument = entityCall.arguments[0];
      let schema = "public";
      let table = node.name.text;
      if (entityArgument && ts.isStringLiteral(entityArgument)) {
        table = entityArgument.text;
      } else if (
        entityArgument &&
        ts.isObjectLiteralExpression(entityArgument)
      ) {
        schema = literalText(property(entityArgument, "schema")) ?? schema;
        table = literalText(property(entityArgument, "name")) ?? table;
      }
      const columns: EntityMapping["columns"] = [];
      const relations: EntityMapping["relations"] = [];
      for (const member of node.members) {
        if (!ts.isPropertyDeclaration(member) || !member.name) continue;
        const propertyName = member.name.getText().replace(/['"]/g, "");
        for (const decorator of decorators(member)) {
          const name = decoratorName(decorator);
          const call = ts.isCallExpression(decorator.expression)
            ? decorator.expression
            : null;
          const options = call?.arguments.find(ts.isObjectLiteralExpression);
          if (
            [
              "Column",
              "PrimaryColumn",
              "PrimaryGeneratedColumn",
              "CreateDateColumn",
              "UpdateDateColumn",
              "DeleteDateColumn",
              "VersionColumn",
            ].includes(name)
          ) {
            columns.push({
              property: propertyName,
              column: literalText(property(options, "name")) ?? propertyName,
              decorator: name,
              type: literalText(property(options, "type")),
              enum: literalText(property(options, "enum")),
              nullable:
                literalText(property(options, "nullable")) === null
                  ? null
                  : literalText(property(options, "nullable")) === "true",
              unique:
                literalText(property(options, "unique")) === null
                  ? null
                  : literalText(property(options, "unique")) === "true",
              default: literalText(property(options, "default")),
            });
          }
          if (
            ["OneToOne", "OneToMany", "ManyToOne", "ManyToMany"].includes(name)
          ) {
            const targetText = call?.arguments[0]?.getText() ?? "";
            const target =
              targetText.match(/=>\s*([A-Za-z0-9_]+)/)?.[1] ?? null;
            const binding = target ? file.imports.get(target) : undefined;
            relations.push({
              property: propertyName,
              decorator: name,
              target,
              targetFile: binding?.target ?? null,
              onDelete: literalText(property(options, "onDelete")),
              cascade: literalText(property(options, "cascade")),
            });
          }
        }
      }
      const classConstraints = decorators(node)
        .filter((candidate) =>
          ["Index", "Unique", "Check"].includes(decoratorName(candidate)),
        )
        .map((candidate) => candidate.expression.getText());
      mappings.push({
        entity: node.name.text,
        schema,
        table,
        file: file.relative,
        columns,
        relations,
        classConstraints,
      });
      ts.forEachChild(node, visit);
    };
    visit(file.source);
  }
  return mappings.sort((a, b) => a.file.localeCompare(b.file));
}

function arrayProperty(
  object: ts.ObjectLiteralExpression,
  name: string,
): string[] {
  const value = property(object, name);
  if (!value || !ts.isArrayLiteralExpression(value)) return [];
  return value.elements.map((element) => element.getText());
}

function scanModules(parsed: Map<string, ParsedFile>): ModuleRecord[] {
  const modules: ModuleRecord[] = [];
  for (const file of parsed.values()) {
    const visit = (node: ts.Node): void => {
      if (!ts.isClassDeclaration(node) || !node.name) {
        ts.forEachChild(node, visit);
        return;
      }
      const call = decoratorCall(node, "Module");
      const metadata = call?.arguments[0];
      if (!call || !metadata || !ts.isObjectLiteralExpression(metadata)) {
        ts.forEachChild(node, visit);
        return;
      }
      const imports = arrayProperty(metadata, "imports");
      const importedModuleFiles = imports
        .map((expression) => expression.match(/^[A-Za-z0-9_]+/)?.[0])
        .map((identifier) =>
          identifier ? file.imports.get(identifier)?.target : null,
        )
        .filter((target): target is string => Boolean(target));
      const forFeature: ModuleRecord["forFeature"] = [];
      const sourceText = file.source.getFullText();
      const visitCall = (candidate: ts.Node): void => {
        if (
          ts.isCallExpression(candidate) &&
          candidate.expression.getText(file.source) ===
            "TypeOrmModule.forFeature"
        ) {
          const list = candidate.arguments[0];
          if (list && ts.isArrayLiteralExpression(list)) {
            for (const element of list.elements) {
              const entity = element.getText();
              forFeature.push({
                entity,
                file: file.imports.get(entity)?.target ?? null,
              });
            }
          }
        }
        ts.forEachChild(candidate, visitCall);
      };
      if (sourceText.includes("TypeOrmModule.forFeature")) visitCall(node);
      modules.push({
        module: node.name.text,
        file: file.relative,
        imports,
        importedModuleFiles: [...new Set(importedModuleFiles)].sort(),
        controllers: arrayProperty(metadata, "controllers"),
        providers: arrayProperty(metadata, "providers"),
        exports: arrayProperty(metadata, "exports"),
        forFeature,
        rootMounted: false,
      });
      ts.forEachChild(node, visit);
    };
    visit(file.source);
  }
  const byFile = new Map(modules.map((entry) => [entry.file, entry]));
  const root = modules.find((entry) => entry.module === "AppModule");
  const visitMounted = (module: ModuleRecord | undefined): void => {
    if (!module || module.rootMounted) return;
    module.rootMounted = true;
    for (const imported of module.importedModuleFiles) {
      visitMounted(byFile.get(imported));
    }
  };
  visitMounted(root);
  return modules.sort((a, b) => a.file.localeCompare(b.file));
}

function classNames(source: ts.SourceFile): string[] {
  return source.statements
    .filter(ts.isClassDeclaration)
    .map((node) => node.name?.text)
    .filter((name): name is string => Boolean(name));
}

function scanRepositoryUsage(
  parsed: Map<string, ParsedFile>,
  entities: EntityMapping[],
): RepositoryUsage[] {
  const entityByFile = new Map(entities.map((entry) => [entry.file, entry]));
  const usages: RepositoryUsage[] = [];
  for (const file of parsed.values()) {
    const fileText = file.source.getFullText();
    const visit = (node: ts.Node): void => {
      if (!ts.isClassDeclaration(node) || !node.name) {
        ts.forEachChild(node, visit);
        return;
      }
      const classText = node.getFullText(file.source);
      for (const member of node.members) {
        if (!ts.isConstructorDeclaration(member)) continue;
        for (const parameter of member.parameters) {
          const injectCall = decoratorCall(parameter, "InjectRepository");
          let entity = injectCall?.arguments[0]?.getText() ?? null;
          if (
            !entity &&
            parameter.type &&
            ts.isTypeReferenceNode(parameter.type) &&
            parameter.type.typeName.getText() === "Repository"
          ) {
            entity = parameter.type.typeArguments?.[0]?.getText() ?? null;
          }
          if (!entity) continue;
          const binding = file.imports.get(entity);
          const entityFile = binding?.target ?? null;
          const mapping = entityFile ? entityByFile.get(entityFile) : undefined;
          const operations = new Set<string>();
          if (
            /\.(find|findOne|findOneBy|findBy|findAndCount|count|exist|getOne|getMany|getCount|query)\s*\(/.test(
              classText,
            )
          ) {
            operations.add("read");
          }
          if (
            /\.(save|insert|update|upsert|increment|decrement)\s*\(/.test(
              classText,
            )
          ) {
            operations.add("write");
          }
          if (
            /\.(delete|remove|softDelete|softRemove|restore)\s*\(/.test(
              classText,
            )
          ) {
            operations.add("delete");
          }
          if (/createQueryBuilder\s*\(/.test(classText)) {
            operations.add("query-builder");
          }
          const consumerOwner = ownerFromFile(file.relative);
          const entityOwner = entityFile ? ownerFromFile(entityFile) : null;
          usages.push({
            consumer: node.name.text,
            file: file.relative,
            module: consumerOwner,
            entity,
            entityFile,
            table: mapping ? `${mapping.schema}.${mapping.table}` : null,
            operations: [...operations].sort(),
            crossModule:
              entityOwner === null ||
              entityOwner === "database-central" ||
              consumerOwner === "application-root"
                ? null
                : consumerOwner !== entityOwner,
            transactionParticipation: /\.(transaction|queryRunner)\s*\(/.test(
              classText,
            )
              ? "observed"
              : "not-observed",
            rawQuery: /\.query\s*\(|createQueryBuilder\s*\(/.test(classText),
            returnedModel: parameter.type?.getText() ?? `Repository<${entity}>`,
            evidence: `${file.relative}:${parameter.getStart(file.source)}`,
          });
        }
      }
      ts.forEachChild(node, visit);
    };
    if (
      fileText.includes("InjectRepository") ||
      fileText.includes("Repository<")
    ) {
      visit(file.source);
    }
  }
  return usages.sort((a, b) =>
    `${a.file}:${a.entity}`.localeCompare(`${b.file}:${b.entity}`),
  );
}

function controllerModule(
  controller: string,
  modules: ModuleRecord[],
): ModuleRecord | undefined {
  return modules.find((module) => module.controllers.includes(controller));
}

function moduleTestEvidence(
  controllerFile: string,
  parsed: Map<string, ParsedFile>,
): string[] {
  const moduleMatch = controllerFile.match(/^src\/modules\/([^/]+)\//);
  if (!moduleMatch) {
    return [...parsed.values()]
      .filter(
        (entry) =>
          entry.relative.endsWith(".spec.ts") &&
          entry.relative.includes("app.controller"),
      )
      .map((entry) => entry.relative);
  }
  const moduleSlug = moduleMatch[1];
  return [...parsed.values()]
    .filter(
      (entry) =>
        (entry.relative.endsWith(".spec.ts") ||
          entry.relative.endsWith(".e2e-spec.ts")) &&
        (entry.relative.includes(`/modules/${moduleSlug}/`) ||
          entry.relative.includes(`/${moduleSlug}.`) ||
          entry.relative.includes(`/${moduleSlug}-`)),
    )
    .map((entry) => entry.relative)
    .sort();
}

function externalSideEffectsForController(controller: string): string[] {
  const effects: Record<string, string[]> = {
    AuthController: [
      "JWT signing",
      "Firebase Admin token verification",
      "SMTP/Nodemailer OTP delivery",
    ],
    ProfilesController: [
      "Storage file lifecycle through StorageService",
      "FPT Vision adapter (currently mock behavior)",
    ],
    FarmPublicController: [],
    ProductsController: [
      "Storage file lifecycle for certifications",
      "notification publication for status changes",
    ],
    WishlistController: [],
    ReviewsController: [],
    NotificationsController: ["Socket.IO notification publication"],
    AdsController: ["notification publication for moderation changes"],
    AdminController: [
      "Storage file review/lifecycle transitions",
      "PDFKit report generation",
      "notification publication",
    ],
    StorageController: ["Cloudinary image storage", "Supabase private storage"],
  };
  return effects[controller] ?? [];
}

function additionalTablesForController(controller: string): string[] {
  const tables: Record<string, string[]> = {
    AuthController: ["public.users"],
    ProfilesController: ["public.stored_files"],
    FarmPublicController: ["public.farmer_profiles"],
    ProductsController: [
      "public.users",
      "public.farmer_profiles",
      "public.cooperative_profiles",
      "public.enterprise_profiles",
      "public.supplier_profiles",
      "public.provinces",
      "public.districts",
      "public.notifications",
      "public.stored_files",
    ],
    WishlistController: ["public.products", "public.wishlists"],
    NotificationsController: ["public.notifications"],
    AdsController: ["public.notifications"],
    AdminController: ["public.notifications", "public.stored_files"],
  };
  return tables[controller] ?? [];
}

function transactionExpectation(controller: string, handler: string): string {
  if (controller === "ProductsController" && handler === "create") {
    return "observed atomic database transaction for product and images";
  }
  if (
    controller === "ProfilesController" ||
    (controller === "ProductsController" &&
      /(certification|status|verify|remove)/i.test(handler)) ||
    (controller === "AdminController" && /profile/i.test(handler))
  ) {
    return "observed manual compensation across database and external storage";
  }
  if (controller === "StorageController") {
    return "eventually consistent database/provider workflow";
  }
  if (
    controller === "AuthController" &&
    /(refresh|sync|loginOtp|logout)/i.test(handler)
  ) {
    return "multiple persistence operations; no enclosing transaction observed";
  }
  if (
    controller === "NotificationsController" ||
    controller === "AdsController"
  ) {
    return "database write and notification side effect are not atomically coupled";
  }
  if (
    controller === "MarketPricesController" ||
    controller === "TraceabilityController"
  ) {
    return "not applicable until TODO service implementation exists";
  }
  return "single-operation or requires use-case-level review";
}

function scanApi(
  parsed: Map<string, ParsedFile>,
  parsedAll: Map<string, ParsedFile>,
  modules: ModuleRecord[],
  entities: EntityMapping[],
  repositoryUsage: RepositoryUsage[],
): Json[] {
  const entityByFile = new Map(entities.map((entry) => [entry.file, entry]));
  const endpoints: Json[] = [];
  for (const file of parsed.values()) {
    const visit = (node: ts.Node): void => {
      if (!ts.isClassDeclaration(node) || !node.name) {
        ts.forEachChild(node, visit);
        return;
      }
      const controller = decoratorCall(node, "Controller");
      if (!controller) {
        ts.forEachChild(node, visit);
        return;
      }
      const prefix = literalText(controller.arguments[0]) ?? "";
      const module = controllerModule(node.name.text, modules);
      const controllerOwner = ownerFromFile(file.relative);
      const moduleRepositoryUsage = repositoryUsage.filter(
        (usage) => usage.module === controllerOwner,
      );
      const candidateTables = (module?.forFeature ?? [])
        .map((entry) => (entry.file ? entityByFile.get(entry.file) : undefined))
        .filter((entry): entry is EntityMapping => Boolean(entry))
        .map((entry) => `${entry.schema}.${entry.table}`)
        .concat(additionalTablesForController(node.name.text));
      const persistenceCandidates = [...new Set(candidateTables)].sort();
      const dependencies = node.members
        .filter(ts.isConstructorDeclaration)
        .flatMap((constructor) =>
          constructor.parameters.map((parameter) => ({
            name: parameter.name.getText(),
            type: parameter.type?.getText() ?? "untyped",
          })),
        );
      const classPublic = decorators(node).some(
        (entry) => decoratorName(entry) === "Public",
      );
      const classRoles = decorators(node)
        .filter((entry) => decoratorName(entry) === "Roles")
        .flatMap((entry) =>
          ts.isCallExpression(entry.expression)
            ? entry.expression.arguments.map((argument) => argument.getText())
            : [],
        );
      for (const member of node.members) {
        if (!ts.isMethodDeclaration(member) || !member.name) continue;
        const routeDecorator = decorators(member).find((entry) =>
          ["Get", "Post", "Put", "Patch", "Delete", "Sse"].includes(
            decoratorName(entry),
          ),
        );
        if (!routeDecorator) continue;
        const method = decoratorName(routeDecorator).toUpperCase();
        const call = ts.isCallExpression(routeDecorator.expression)
          ? routeDecorator.expression
          : null;
        const route = literalText(call?.arguments[0]) ?? "";
        const publicRoute =
          classPublic ||
          decorators(member).some((entry) => decoratorName(entry) === "Public");
        const roles = [
          ...classRoles,
          ...decorators(member)
            .filter((entry) => decoratorName(entry) === "Roles")
            .flatMap((entry) =>
              ts.isCallExpression(entry.expression)
                ? entry.expression.arguments.map((argument) =>
                    argument.getText(),
                  )
                : [],
            ),
        ];
        const guards = decorators(member)
          .filter((entry) => decoratorName(entry) === "UseGuards")
          .flatMap((entry) =>
            ts.isCallExpression(entry.expression)
              ? entry.expression.arguments.map((argument) => argument.getText())
              : [],
          );
        const dtoTypes = member.parameters
          .map((parameter) => parameter.type?.getText())
          .filter((type): type is string => Boolean(type));
        const handler = member.name.getText();
        endpoints.push({
          entryPoint: `${method} /api/v1/${[prefix, route]
            .filter(Boolean)
            .join("/")
            .replace(/\/+/g, "/")}`,
          controller: node.name.text,
          handler,
          module: module?.module ?? "unmounted-controller",
          moduleMounted: module?.rootMounted ?? false,
          serviceDependencies: dependencies,
          repositoriesUsed: [
            ...new Set(
              moduleRepositoryUsage.map(
                (usage) => `${usage.consumer}:${usage.entity}`,
              ),
            ),
          ].sort(),
          tablesRead: method === "GET" ? persistenceCandidates : [],
          tablesWritten: ["POST", "PUT", "PATCH", "DELETE"].includes(method)
            ? persistenceCandidates
            : [],
          externalSideEffects: externalSideEffectsForController(node.name.text),
          transactionExpectation: transactionExpectation(
            node.name.text,
            handler,
          ),
          authentication: publicRoute ? "public-decorator" : "global-jwt-guard",
          authorization: roles.length > 0 ? roles : ["authenticated-default"],
          explicitGuards: guards,
          dtoTypes,
          responseModel: member.type?.getText() ?? "inferred",
          currentTests: moduleTestEvidence(file.relative, parsedAll),
          persistenceEvidence:
            "candidate tables are module-level forFeature registrations; flow documents refine per-handler usage",
        });
      }
      ts.forEachChild(node, visit);
    };
    visit(file.source);
  }
  return endpoints.sort((a, b) =>
    String((a as { entryPoint: string }).entryPoint).localeCompare(
      String((b as { entryPoint: string }).entryPoint),
    ),
  );
}

function scanBackgroundEntries(
  parsed: Map<string, ParsedFile>,
  modules: ModuleRecord[],
): Json[] {
  const entries: Json[] = [];
  const providerModule = (
    className: string,
    implementationFile: string,
  ): ModuleRecord | undefined =>
    modules.find((entry) => {
      if (!entry.providers.includes(className)) return false;
      const moduleFile = parsed.get(entry.file);
      const importedProvider = moduleFile?.imports.get(className)?.target;
      return importedProvider
        ? importedProvider === implementationFile
        : entry.file === implementationFile;
    });
  for (const file of parsed.values()) {
    const visit = (node: ts.Node): void => {
      if (ts.isClassDeclaration(node) && node.name) {
        const gateway = decoratorCall(node, "WebSocketGateway");
        if (gateway) {
          const module = providerModule(node.name.text, file.relative);
          entries.push({
            type: "websocket-gateway",
            class: node.name.text,
            file: file.relative,
            runtimeRegistered: module?.rootMounted ?? false,
            module: module?.module ?? null,
            repositoriesUsed:
              node.name.text === "NotificationsGateway"
                ? ["NOTIFICATION_REALTIME_PORT"]
                : [],
            tablesRead:
              node.name.text === "NotificationsGateway"
                ? ["public.notifications"]
                : [],
            tablesWritten: [],
            externalSideEffects: ["Socket.IO delivery"],
            transactionExpectation:
              "delivery occurs after persistence and is not atomically coupled",
          });
        }
      }
      if (ts.isMethodDeclaration(node) && node.name) {
        for (const decorator of decorators(node)) {
          const name = decoratorName(decorator);
          if (
            ![
              "Cron",
              "Interval",
              "Timeout",
              "OnEvent",
              "SubscribeMessage",
              "Process",
              "EventPattern",
              "MessagePattern",
            ].includes(name)
          ) {
            continue;
          }
          const classNode = node.parent;
          const className =
            ts.isClassDeclaration(classNode) && classNode.name
              ? classNode.name.text
              : "unknown";
          const module = providerModule(className, file.relative);
          entries.push({
            type: name,
            class: className,
            method: node.name.getText(),
            decorator: decorator.expression.getText(),
            file: file.relative,
            runtimeRegistered: module?.rootMounted ?? false,
            module: module?.module ?? null,
            repositoriesUsed:
              className === "StorageCleanupService"
                ? ["STORED_FILE_REPOSITORY"]
                : [],
            tablesRead:
              className === "StorageCleanupService"
                ? ["public.stored_files"]
                : [],
            tablesWritten:
              className === "StorageCleanupService"
                ? ["public.stored_files"]
                : [],
            externalSideEffects:
              className === "StorageCleanupService"
                ? ["Cloudinary/Supabase object deletion"]
                : [],
            transactionExpectation:
              className === "StorageCleanupService"
                ? "eventually consistent provider cleanup with retry state"
                : "requires-flow-review",
          });
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(file.source);
  }
  return entries.sort((a, b) =>
    JSON.stringify(a).localeCompare(JSON.stringify(b)),
  );
}

function scanTests(allFiles: ParsedFile[]): Map<string, string[]> {
  const tests = new Map<string, string[]>();
  for (const file of allFiles.filter(
    (entry) =>
      entry.relative.endsWith(".spec.ts") ||
      entry.relative.includes(".e2e-spec.ts"),
  )) {
    for (const binding of file.imports.values()) {
      if (!binding.target) continue;
      const consumers = tests.get(binding.target) ?? [];
      consumers.push(file.relative);
      tests.set(binding.target, consumers);
    }
  }
  return tests;
}

function scanEntityUsage(
  entities: EntityMapping[],
  modules: ModuleRecord[],
  repositoryUsage: RepositoryUsage[],
  parsedAll: ParsedFile[],
): Json[] {
  const runtimeFiles = new Set(
    modules
      .filter((module) => module.rootMounted)
      .flatMap((module) => module.forFeature)
      .map((entry) => entry.file)
      .filter((file): file is string => Boolean(file)),
  );
  const tests = scanTests(parsedAll);
  const duplicateCounts = new Map<string, number>();
  for (const entity of entities) {
    const key = `${entity.schema}.${entity.table}`;
    duplicateCounts.set(key, (duplicateCounts.get(key) ?? 0) + 1);
  }
  return entities.map((entity) => {
    const repositoryConsumers = repositoryUsage
      .filter((usage) => usage.entityFile === entity.file)
      .map((usage) => `${usage.consumer} (${usage.file})`);
    const relationConsumers = entities
      .filter((candidate) =>
        candidate.relations.some(
          (relation) => relation.targetFile === entity.file,
        ),
      )
      .map((candidate) => `${candidate.entity} (${candidate.file})`);
    const runtimeRegistered = runtimeFiles.has(entity.file);
    const cliRegistered = entity.file.startsWith("src/database/entities/");
    const testConsumers = tests.get(entity.file) ?? [];
    const importConsumers = parsedAll
      .filter((candidate) =>
        [...candidate.imports.values()].some(
          (binding) => binding.target === entity.file,
        ),
      )
      .map((candidate) => candidate.relative)
      .sort();
    const directServiceConsumers = importConsumers.filter(
      (consumer) =>
        !consumer.endsWith(".spec.ts") &&
        !consumer.includes(".e2e-spec.ts") &&
        (consumer.endsWith(".service.ts") ||
          consumer.includes("/application/use-cases/")),
    );
    const apiFlows = modules
      .filter(
        (module) =>
          module.rootMounted &&
          module.forFeature.some((entry) => entry.file === entity.file),
      )
      .flatMap((module) => module.controllers);
    let status: "active" | "legacy" | "unused" | "duplicate" | "unverified";
    if (
      runtimeRegistered &&
      repositoryConsumers.length > 0 &&
      apiFlows.length > 0
    )
      status = "active";
    else if ((duplicateCounts.get(`${entity.schema}.${entity.table}`) ?? 0) > 1)
      status = "duplicate";
    else if (cliRegistered && !runtimeRegistered) status = "legacy";
    else if (
      !runtimeRegistered &&
      repositoryConsumers.length === 0 &&
      relationConsumers.length === 0 &&
      testConsumers.length === 0
    )
      status = "unused";
    else status = "unverified";
    const owner = ownerFromFile(entity.file);
    return {
      entity: entity.entity,
      schema: entity.schema,
      table: entity.table,
      file: entity.file,
      sourceOwner: owner,
      runtimeRegistered,
      cliRegistered,
      testRegistered: testConsumers.length > 0,
      testOnlyRegistered:
        testConsumers.length > 0 && !runtimeRegistered && !cliRegistered,
      testConsumers,
      importConsumers,
      importedButNotRuntimeRegistered:
        importConsumers.length > 0 && !runtimeRegistered,
      directServiceConsumers,
      repositoryConsumers,
      relationConsumers,
      apiFlows,
      status,
      duplicatePhysicalMapping:
        (duplicateCounts.get(`${entity.schema}.${entity.table}`) ?? 0) > 1,
      evidenceClassification: "Observed",
    };
  });
}

function scanStateAndConstraints(entities: EntityMapping[]): Json {
  return {
    sourceCommit: SOURCE_COMMIT,
    evidenceClassification: "Observed from TypeORM decorators",
    entities: entities.map((entity) => ({
      entity: entity.entity,
      table: `${entity.schema}.${entity.table}`,
      file: entity.file,
      enumColumns: entity.columns
        .filter(
          (column) =>
            column.type?.replace(/['"]/g, "") === "enum" || column.enum,
        )
        .map((column) => ({
          column: column.column,
          enum: column.enum,
          nullable: column.nullable,
          default: column.default,
        })),
      stateColumns: entity.columns
        .filter((column) =>
          /(status|state|type|verified|active|hidden|read|revoked|deleted)/i.test(
            column.column,
          ),
        )
        .map((column) => ({
          column: column.column,
          type: column.type,
          nullable: column.nullable,
          default: column.default,
        })),
      uniqueColumns: entity.columns
        .filter((column) => column.unique)
        .map((column) => column.column),
      classConstraints: entity.classConstraints,
      relationDeleteBehavior: entity.relations.map((relation) => ({
        property: relation.property,
        target: relation.target,
        onDelete: relation.onDelete,
        cascade: relation.cascade,
      })),
      softDeleteColumns: entity.columns
        .filter((column) => column.decorator === "DeleteDateColumn")
        .map((column) => column.column),
      versionColumns: entity.columns
        .filter((column) => column.decorator === "VersionColumn")
        .map((column) => column.column),
    })),
  };
}

const COMPATIBILITY_TABLES = new Set([
  "public.users",
  "public.farmer_profiles",
  "public.cooperative_profiles",
  "public.enterprise_profiles",
  "public.supplier_profiles",
  "public.products",
  "public.product_certifications",
  "public.reviews",
]);

const DEFERRED_TABLES = new Set([
  "public.bulk_listing_contributions",
  "public.bulk_listings",
  "public.contracts",
  "public.conversations",
  "public.cooperative_members",
  "public.cooperative_province_references",
  "public.disputes",
  "public.harvest_schedules",
  "public.logistics_profiles",
  "public.market_prices",
  "public.messages",
  "public.order_items",
  "public.order_status_history",
  "public.orders",
  "public.payments",
  "public.purchase_requests",
  "public.quality_certificates",
  "public.shipment_tracking_events",
  "public.shipments",
  "public.traceability_records",
  "public.user_addresses",
]);

function baselineGroup(key: string): "A" | "B" | "C" | "D" {
  if (key === "public.product_wishlist" || key === "public.product_wishlists")
    return "D";
  if (DEFERRED_TABLES.has(key)) return "C";
  if (COMPATIBILITY_TABLES.has(key)) return "B";
  return "A";
}

function baselineReason(key: string, group: string): string {
  const compatibility: Record<string, string> = {
    "public.users":
      "Authentication is active, but source-required email and local nullable email need identity reconciliation.",
    "public.farmer_profiles":
      "Profile onboarding is active; legacy document URLs and Storage file IDs must coexist.",
    "public.cooperative_profiles":
      "Profile onboarding is active; duplicate mappings, member-count drift and Storage columns need compatibility.",
    "public.enterprise_profiles":
      "Profile onboarding is active; duplicate mappings and Storage file-ID columns need compatibility.",
    "public.supplier_profiles":
      "Profile onboarding is active; duplicate mappings and Storage file-ID columns need compatibility.",
    "public.products":
      "Product APIs are active, but raw seller/profile queries depend on columns absent from local schema evidence.",
    "public.product_certifications":
      "Certification flows are active and need both legacy URL and Storage file ID during rollout.",
    "public.reviews":
      "Review APIs are active, but local evidence lacks the required reviewer/product partial unique index.",
  };
  if (group === "A") {
    return "A mounted production flow has an observed persistence consumer and a stable runtime mapping candidate.";
  }
  if (group === "B") return compatibility[key];
  if (group === "C") {
    if (
      key === "public.market_prices" ||
      key === "public.traceability_records"
    ) {
      return "The controller is mounted, but application methods throw TODO and no working persistence flow is proven.";
    }
    if (
      key.startsWith("public.cooperative_") ||
      key === "public.bulk_listings" ||
      key === "public.bulk_listing_contributions" ||
      key === "public.harvest_schedules"
    ) {
      return "Persistence adapters and tests exist, but no production controller/use-case consumer proves the capability.";
    }
    return "Only a central entity, relation target, or development-seed reference exists; the owner capability is not implemented.";
  }
  return "Wishlist naming and data lineage conflict must be reconciled before inclusion.";
}

function compatibilityRequirements(key: string): {
  columns: string[];
  constraints: string[];
  legacy: string;
} {
  const profileFileIds: Record<string, string[]> = {
    "public.farmer_profiles": ["cccd_front_file_id", "cccd_back_file_id"],
    "public.cooperative_profiles": [
      "cooperative_cert_file_id",
      "business_license_file_id",
      "representative_cccd_front_file_id",
      "representative_cccd_back_file_id",
      "members_list_file_id",
    ],
    "public.enterprise_profiles": ["business_license_file_id"],
    "public.supplier_profiles": ["business_license_file_id"],
  };
  if (profileFileIds[key]) {
    return {
      columns: ["legacy URL columns", ...profileFileIds[key]],
      constraints: [
        "unique user_id",
        "reviewed stored_files foreign keys without destructive cascade",
      ],
      legacy: "dual-column compatibility for legacy URLs and file IDs",
    };
  }
  const overrides: Record<
    string,
    { columns: string[]; constraints: string[]; legacy: string }
  > = {
    "public.users": {
      columns: ["identity, credential, role, verification and audit columns"],
      constraints: [
        "unique email/phone/firebase identity",
        "email NOT NULL only after existing-row reconciliation",
      ],
      legacy: "preserve nullable email until backfill safety is proven",
    },
    "public.products": {
      columns: ["runtime mapping plus seller-detail query dependencies"],
      constraints: [
        "category and seller references",
        "unique SKU if populated",
      ],
      legacy: "preserve current seller/profile read contract",
    },
    "public.product_certifications": {
      columns: ["legacy certificate URL", "certificate_file_id"],
      constraints: ["product FK", "stored_files FK and index"],
      legacy: "keep URL and file ID in parallel",
    },
    "public.reviews": {
      columns: ["runtime review mapping columns"],
      constraints: [
        "reviewer/product FKs",
        "partial unique reviewer/product index for non-deleted rows",
        "rating range check",
      ],
      legacy: "deduplicate existing rows before enforcing uniqueness",
    },
  };
  return (
    overrides[key] ?? {
      columns: ["all columns from reviewed canonical mapping candidate"],
      constraints: ["primary key, declared unique indexes and proven FKs"],
      legacy: "none beyond deployed-schema verification",
    }
  );
}

function writeArchitectureDecisions(
  entities: EntityMapping[],
  modules: ModuleRecord[],
  repositoryUsage: RepositoryUsage[],
): void {
  const registry = JSON.parse(
    fs.readFileSync(
      path.join(ROOT, "docs/architecture/persistence/entity-ownership.json"),
      "utf8",
    ),
  ) as { tables: OwnershipTable[] };
  const runtimeFiles = new Set(
    modules
      .filter((module) => module.rootMounted)
      .flatMap((module) => module.forFeature)
      .map((entry) => entry.file)
      .filter((file): file is string => Boolean(file)),
  );
  const decisions = registry.tables.map((table) => {
    const key = `${table.schema}.${table.table}`;
    const mappings = entities.filter(
      (entity) => `${entity.schema}.${entity.table}` === key,
    );
    const runtimeMapping = mappings.find((entity) =>
      runtimeFiles.has(entity.file),
    );
    const usages = repositoryUsage.filter((usage) => usage.table === key);
    const group = baselineGroup(key);
    const activeFlows = modules
      .filter(
        (module) =>
          module.rootMounted &&
          module.forFeature.some((entry) =>
            mappings.some((mapping) => mapping.file === entry.file),
          ),
      )
      .flatMap((module) => module.controllers);
    return {
      schema: table.schema,
      table: table.table,
      capabilityOwner: table.owner,
      runtimeOwner: runtimeMapping ? ownerFromFile(runtimeMapping.file) : null,
      writePaths: usages
        .filter((usage) =>
          usage.operations.some((operation) =>
            ["write", "delete"].includes(operation),
          ),
        )
        .map((usage) => `${usage.consumer} (${usage.file})`),
      readPaths: usages
        .filter((usage) =>
          usage.operations.some((operation) =>
            ["read", "query-builder"].includes(operation),
          ),
        )
        .map((usage) => `${usage.consumer} (${usage.file})`),
      activeFlows,
      currentMapping: table.currentMappings,
      canonicalMappingCandidate: runtimeMapping?.file ?? table.file,
      baselineRecommendation:
        group === "A"
          ? "include"
          : group === "B"
            ? "include-with-compatibility"
            : group === "C"
              ? "exclude-until-owner-phase"
              : "rename-or-reconcile",
      confidence: group === "A" || group === "B" ? "high" : "medium",
      evidence: [
        "runtime-module-graph.json",
        "repository-usage-map.json",
        "entity-runtime-usage.json",
      ],
      evidenceClassification:
        group === "A" || group === "B"
          ? ["Observed", "Proposed"]
          : ["Observed", "Inferred", "Proposed"],
      blockedDecision:
        group === "C"
          ? "Owner must prove API/write path, constraints and deployed data requirements."
          : group === "D"
            ? "Deployed row counts, FKs and consumer contract are required."
            : null,
    };
  });
  decisions.push({
    schema: "public",
    table: "product_wishlists",
    capabilityOwner: "products",
    runtimeOwner: null,
    writePaths: [],
    readPaths: [],
    activeFlows: [],
    currentMapping: [],
    canonicalMappingCandidate:
      "src/modules/products/infrastructure/persistence/entities/wishlist.entity.ts",
    baselineRecommendation: "rename-or-reconcile",
    confidence: "medium",
    evidence: ["../postgresql-schema-verification.md"],
    evidenceClassification: ["Observed", "Proposed"],
    blockedDecision:
      "Local-only table needs deployed evidence and row reconciliation against public.wishlists.",
  });
  const matrix = decisions.map((decision) => {
    const key = `${decision.schema}.${decision.table}`;
    const group = baselineGroup(key);
    const requirements = compatibilityRequirements(key);
    return {
      schema: decision.schema,
      table: decision.table,
      includeInBaselineV2: group === "A" || group === "B",
      group,
      reason: baselineReason(key, group),
      canonicalMappingCandidate: decision.canonicalMappingCandidate,
      requiredColumns: requirements.columns,
      requiredConstraints: requirements.constraints,
      legacyCompatibility: requirements.legacy,
      reconciliationOwner: decision.capabilityOwner,
      risk:
        registry.tables.find(
          (table) => `${table.schema}.${table.table}` === key,
        )?.risk ?? "high",
      evidenceLevel:
        group === "A" || group === "B"
          ? "source-observed plus local-schema comparison"
          : "source-observed; deployed-schema unverified",
    };
  });
  writeJson("phase-1-ownership-decisions.json", {
    sourceCommit: SOURCE_COMMIT,
    status: "proposed override; Phase 0 registry is unchanged",
    decisions,
  });
  writeJson("baseline-inclusion-matrix.json", {
    sourceCommit: SOURCE_COMMIT,
    policy:
      "Hybrid v2 baseline for new databases plus fingerprint-gated onboarding for existing databases",
    groupDefinitions: {
      A: "confirmed baseline",
      B: "include with compatibility",
      C: "exclude pending owner phase",
      D: "naming/reconciliation blocker",
      E: "retire candidate",
    },
    note: "No physical source table is Group E: the dead-looking wishlist mapping stays Group D until deployed evidence exists.",
    entries: matrix,
  });
}

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(OUTPUT, { recursive: true });
  fs.writeFileSync(
    path.join(OUTPUT, name),
    `${JSON.stringify(value, null, 2)}\n`,
    "utf8",
  );
}

export function generatePersistenceSystemDiscovery(): void {
  const allFiles = walk(SRC);
  const parsedAll = parseFiles(allFiles);
  const production = new Map(
    [...parsedAll.entries()].filter(
      ([file]) =>
        !file.endsWith(".spec.ts") && !file.includes("/database/migrations/"),
    ),
  );
  const entities = scanEntities(production);
  const modules = scanModules(production);
  const repositoryUsage = scanRepositoryUsage(production, entities);
  const apiEntries = scanApi(
    production,
    parsedAll,
    modules,
    entities,
    repositoryUsage,
  );
  const backgroundEntries = scanBackgroundEntries(production, modules);
  const entityUsage = scanEntityUsage(entities, modules, repositoryUsage, [
    ...parsedAll.values(),
  ]);
  const root = modules.find((module) => module.module === "AppModule");
  const unmountedControllers = apiEntries.filter(
    (entry) => !(entry as { moduleMounted: boolean }).moduleMounted,
  );

  writeJson("runtime-module-graph.json", {
    sourceCommit: SOURCE_COMMIT,
    evidenceClassification: "Observed from Nest module metadata",
    applicationRoot: root?.file ?? null,
    globalPrefix: "api/v1",
    modules,
    backgroundEntries,
    unmountedControllers,
    knownLimitation:
      "Dynamic providers and runtime-conditional behavior require flow review",
  });
  writeJson("api-persistence-map.json", {
    sourceCommit: SOURCE_COMMIT,
    evidenceClassification:
      "Observed decorators plus module-level persistence candidates",
    globalAuthentication:
      "JwtAuthGuard and RolesGuard are APP_GUARD providers; @Public bypass is analyzed per endpoint",
    endpoints: apiEntries,
    backgroundEntries,
    knownLimitation:
      "Candidate tables are not claims of per-handler SQL; business-flow-map.md provides curated operations",
  });
  writeJson("repository-usage-map.json", {
    sourceCommit: SOURCE_COMMIT,
    evidenceClassification:
      "Observed constructor repository injection and static operation calls",
    usages: repositoryUsage,
    technicalDataSourceConsumers: [...production.values()]
      .filter((file) =>
        /\b(DataSource|EntityManager|QueryRunner)\b/.test(
          file.source.getFullText(),
        ),
      )
      .map((file) => ({
        file: file.relative,
        classes: classNames(file.source),
        owner: ownerFromFile(file.relative),
      })),
    knownLimitation:
      "Port-based repositories are linked in module metadata and curated flow documentation",
  });
  writeJson("entity-runtime-usage.json", {
    sourceCommit: SOURCE_COMMIT,
    evidenceClassification:
      "Observed mapping, mounted forFeature registration, imports and repository injection",
    mappings: entityUsage,
  });
  writeJson("state-and-constraint-map.json", scanStateAndConstraints(entities));
  writeArchitectureDecisions(entities, modules, repositoryUsage);
}

if (require.main === module) {
  generatePersistenceSystemDiscovery();
}
