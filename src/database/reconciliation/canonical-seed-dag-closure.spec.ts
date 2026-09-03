import { existsSync, readFileSync, readdirSync } from "fs";
import { join, relative } from "path";
import {
  ADMIN_SYSTEM_CONFIG_TEST_SEED_METADATA,
  SYSTEM_CONFIG_ID_BY_KEY_OUTPUT_KIND,
} from "../../modules/admin/infrastructure/database/seeds/system-config-test.seed";
import { ADS_PACKAGE_REFERENCE_SEED_METADATA } from "../../modules/ads/infrastructure/persistence/seeds/ad-package-reference.seed";
import { COOPERATIVES_DEV_MEMBERS_SEED_METADATA } from "../../modules/cooperatives/infrastructure/database/seeds/cooperative-member-development-seed.service";
import {
  GEOGRAPHY_PROVINCE_REFERENCE_SEED_METADATA,
  PROVINCE_ID_BY_CODE_OUTPUT_KIND,
} from "../../modules/geography/infrastructure/seeds/province-reference.seed";
import {
  CATEGORY_ID_BY_SLUG_OUTPUT_KIND,
  PRODUCT_ID_BY_SKU_OUTPUT_KIND,
} from "../../modules/products/application/contracts/product-seed-output.contract";
import { PRODUCTS_CATEGORY_REFERENCE_SEED_METADATA } from "../../modules/products/infrastructure/database/seeds/product-category.seed";
import { PRODUCTS_DEV_SEED_METADATA } from "../../modules/products/infrastructure/database/seeds/product-development-seed.service";
import { PRODUCTS_TEST_SEED_METADATA } from "../../modules/products/infrastructure/database/seeds/product-test.seed";
import { PROFILES_ROLE_PROFILES_DEV_SEED_METADATA } from "../../modules/profiles/infrastructure/database/seeds/profile-role-development.seed";
import { REVIEWS_DEV_PRODUCT_FEEDBACK_SEED_METADATA } from "../../modules/reviews/infrastructure/database/seeds/review-development-seed.service";
import { USERS_TEST_SEED_METADATA } from "../../modules/users/infrastructure/database/seeds/user-test.seed";
import { USERS_DEV_SEED_METADATA } from "../../modules/users/infrastructure/database/seeds/user.seed";
import { USER_ID_BY_EMAIL_OUTPUT_KIND } from "../../modules/users/application/contracts/user-seed-output.contract";
import {
  SeedClassification,
  SeedGroupMetadata,
} from "../seeds/framework/seed-contract";
import { orderSeedMetadata } from "../seeds/framework/seed-metadata";

type RegistrationMode = "NORMAL_STARTUP" | "NORMAL_CLI" | "TEST_REGISTRY";

interface CanonicalGroupAudit {
  readonly metadata: SeedGroupMetadata;
  readonly source: string;
  readonly writerSources: readonly string[];
  readonly outputKinds: readonly string[];
  readonly writesTables: readonly string[];
  readonly registrationModes: readonly RegistrationMode[];
  readonly normalStartupReachable: boolean;
  readonly testOnly: boolean;
}

interface CanonicalEdgeAudit {
  readonly consumer: string;
  readonly provider: string;
  readonly outputKind: string;
  readonly consumerOutputToken: string;
}

const ROOT = process.cwd();

const GROUPS: readonly CanonicalGroupAudit[] = Object.freeze([
  group(
    ADS_PACKAGE_REFERENCE_SEED_METADATA,
    "src/modules/ads/infrastructure/persistence/seeds/ad-package-reference.seed.ts",
    [],
    ["ad_packages"],
    ["NORMAL_STARTUP", "NORMAL_CLI"],
    true,
  ),
  group(
    GEOGRAPHY_PROVINCE_REFERENCE_SEED_METADATA,
    "src/modules/geography/infrastructure/seeds/province-reference.seed.ts",
    [PROVINCE_ID_BY_CODE_OUTPUT_KIND],
    ["provinces"],
    ["NORMAL_CLI"],
    false,
  ),
  group(
    PRODUCTS_CATEGORY_REFERENCE_SEED_METADATA,
    "src/modules/products/infrastructure/database/seeds/product-category.seed.ts",
    [CATEGORY_ID_BY_SLUG_OUTPUT_KIND],
    ["product_categories"],
    ["NORMAL_STARTUP", "NORMAL_CLI"],
    true,
  ),
  group(
    USERS_DEV_SEED_METADATA,
    "src/modules/users/infrastructure/database/seeds/user.seed.ts",
    [USER_ID_BY_EMAIL_OUTPUT_KIND],
    ["users"],
    ["NORMAL_STARTUP", "NORMAL_CLI"],
    true,
  ),
  group(
    COOPERATIVES_DEV_MEMBERS_SEED_METADATA,
    "src/modules/cooperatives/infrastructure/database/seeds/cooperative-member-development-seed.service.ts",
    [],
    ["cooperative_members"],
    ["NORMAL_STARTUP"],
    true,
    [
      "src/modules/cooperatives/infrastructure/database/seeds/typeorm-cooperative-member-dev-seed.writer.ts",
    ],
  ),
  group(
    PRODUCTS_DEV_SEED_METADATA,
    "src/modules/products/infrastructure/database/seeds/product-development-seed.service.ts",
    [PRODUCT_ID_BY_SKU_OUTPUT_KIND],
    ["products", "product_images", "product_certifications"],
    ["NORMAL_STARTUP"],
    true,
    [
      "src/modules/products/infrastructure/database/seeds/typeorm-product-dev-seed.writer.ts",
    ],
  ),
  group(
    PROFILES_ROLE_PROFILES_DEV_SEED_METADATA,
    "src/modules/profiles/infrastructure/database/seeds/profile-role-development.seed.ts",
    [],
    [
      "farmer_profiles",
      "cooperative_profiles",
      "enterprise_profiles",
      "supplier_profiles",
    ],
    ["NORMAL_STARTUP"],
    true,
    [
      "src/modules/profiles/infrastructure/database/seeds/typeorm-profile-role-development-seed.writer.ts",
    ],
  ),
  group(
    REVIEWS_DEV_PRODUCT_FEEDBACK_SEED_METADATA,
    "src/modules/reviews/infrastructure/database/seeds/review-development-seed.service.ts",
    [],
    ["product_reviews"],
    ["NORMAL_STARTUP"],
    true,
    [
      "src/modules/reviews/infrastructure/database/seeds/typeorm-review-dev-seed.writer.ts",
    ],
  ),
  group(
    USERS_TEST_SEED_METADATA,
    "src/modules/users/infrastructure/database/seeds/user-test.seed.ts",
    [USER_ID_BY_EMAIL_OUTPUT_KIND],
    ["users"],
    ["TEST_REGISTRY"],
    false,
  ),
  group(
    PRODUCTS_TEST_SEED_METADATA,
    "src/modules/products/infrastructure/database/seeds/product-test.seed.ts",
    [PRODUCT_ID_BY_SKU_OUTPUT_KIND],
    ["products"],
    ["TEST_REGISTRY"],
    false,
  ),
  group(
    ADMIN_SYSTEM_CONFIG_TEST_SEED_METADATA,
    "src/modules/admin/infrastructure/database/seeds/system-config-test.seed.ts",
    [SYSTEM_CONFIG_ID_BY_KEY_OUTPUT_KIND],
    ["system_configs"],
    ["TEST_REGISTRY"],
    false,
  ),
]);

const EDGES: readonly CanonicalEdgeAudit[] = Object.freeze([
  edge(
    "cooperatives.dev.members",
    "users.dev.users",
    USER_ID_BY_EMAIL_OUTPUT_KIND,
    "USER_ID_BY_EMAIL_OUTPUT_KIND",
  ),
  edge(
    "products.dev.products",
    "products.reference.categories",
    CATEGORY_ID_BY_SLUG_OUTPUT_KIND,
    "CATEGORY_ID_BY_SLUG_OUTPUT_KIND",
  ),
  edge(
    "products.dev.products",
    "users.dev.users",
    USER_ID_BY_EMAIL_OUTPUT_KIND,
    "USER_ID_BY_EMAIL_OUTPUT_KIND",
  ),
  edge(
    "profiles.dev.role-profiles",
    "users.dev.users",
    USER_ID_BY_EMAIL_OUTPUT_KIND,
    "USER_ID_BY_EMAIL_OUTPUT_KIND",
  ),
  edge(
    "reviews.dev.product-feedback",
    "users.dev.users",
    USER_ID_BY_EMAIL_OUTPUT_KIND,
    "USER_ID_BY_EMAIL_OUTPUT_KIND",
  ),
  edge(
    "reviews.dev.product-feedback",
    "products.dev.products",
    PRODUCT_ID_BY_SKU_OUTPUT_KIND,
    "PRODUCT_ID_BY_SKU_OUTPUT_KIND",
  ),
  edge(
    "products.test.catalog",
    "users.test.identities",
    USER_ID_BY_EMAIL_OUTPUT_KIND,
    "USER_ID_BY_EMAIL_OUTPUT_KIND",
  ),
]);

function group(
  metadata: SeedGroupMetadata,
  source: string,
  outputKinds: readonly string[],
  writesTables: readonly string[],
  registrationModes: readonly RegistrationMode[],
  normalStartupReachable: boolean,
  writerSources: readonly string[] = [],
): Readonly<CanonicalGroupAudit> {
  return Object.freeze({
    metadata,
    source,
    writerSources: Object.freeze([...writerSources]),
    outputKinds: Object.freeze([...outputKinds]),
    writesTables: Object.freeze([...writesTables]),
    registrationModes: Object.freeze([...registrationModes]),
    normalStartupReachable,
    testOnly: metadata.classification === SeedClassification.TEST,
  });
}

function edge(
  consumer: string,
  provider: string,
  outputKind: string,
  consumerOutputToken: string,
): Readonly<CanonicalEdgeAudit> {
  return Object.freeze({ consumer, provider, outputKind, consumerOutputToken });
}

function read(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

function collectTypeScriptSources(directory: string): readonly string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectTypeScriptSources(path);
    return entry.isFile() && entry.name.endsWith(".ts") ? [path] : [];
  });
}

function occurrences(source: string, marker: RegExp): number {
  return source.match(marker)?.length ?? 0;
}

describe("P8-07 canonical SeedGroup DAG and orchestration closure", () => {
  const byId = new Map(GROUPS.map((entry) => [entry.metadata.id, entry]));
  const main = read("src/main.ts");
  const cli = read("src/database/seeds/seed.ts");
  const testRegistry = read("src/database/seeds/test-seed-groups.registry.ts");
  const orchestrator = read(
    "src/database/seeds/framework/seed-orchestrator.ts",
  );

  it("inventories every executable canonical SeedGroup exactly once", () => {
    const discovered = collectTypeScriptSources(join(ROOT, "src"))
      .filter((path) => !path.endsWith(".spec.ts"))
      .filter((path) =>
        readFileSync(path, "utf8").includes("implements SeedGroup"),
      )
      .map((path) => relative(ROOT, path).replace(/\\/g, "/"))
      .sort();

    expect(GROUPS).toHaveLength(11);
    expect(new Set(GROUPS.map(({ metadata }) => metadata.id)).size).toBe(11);
    expect(discovered).toEqual(GROUPS.map(({ source }) => source).sort());
    expect(
      GROUPS.filter(
        ({ metadata }) =>
          metadata.classification === SeedClassification.REFERENCE,
      ),
    ).toHaveLength(3);
    expect(
      GROUPS.filter(
        ({ metadata }) => metadata.classification === SeedClassification.DEV,
      ),
    ).toHaveLength(5);
    expect(
      GROUPS.filter(
        ({ metadata }) => metadata.classification === SeedClassification.TEST,
      ),
    ).toHaveLength(3);
  });

  it("keeps exact metadata classifications stable and the full graph acyclic", () => {
    for (const entry of GROUPS) {
      expect(read(entry.source)).toContain(
        `classification: SeedClassification.${entry.metadata.classification}`,
      );
    }
    expect(
      orderSeedMetadata(GROUPS.map(({ metadata }) => metadata)),
    ).toHaveLength(11);
  });

  it("accounts for all seven declared dependencies and their scalar outputs", () => {
    const actualEdges = GROUPS.flatMap(({ metadata }) =>
      metadata.dependencies.map((provider) => `${metadata.id}->${provider}`),
    ).sort();
    const auditedEdges = EDGES.map(
      ({ consumer, provider }) => `${consumer}->${provider}`,
    ).sort();

    expect(actualEdges).toEqual(auditedEdges);
    expect(EDGES).toHaveLength(7);
    for (const audited of EDGES) {
      const consumer = byId.get(audited.consumer) as CanonicalGroupAudit;
      const provider = byId.get(audited.provider) as CanonicalGroupAudit;
      expect(consumer.metadata.dependencies).toContain(audited.provider);
      expect(provider.outputKinds).toContain(audited.outputKind);
      expect(read(consumer.source)).toContain(audited.consumerOutputToken);
      expect(read(consumer.source)).toContain(
        "context.dependencies.requireString(",
      );
    }
  });

  it("enforces the REFERENCE, DEV, and TEST dependency policy", () => {
    const allowedProviders = new Map<
      SeedClassification,
      readonly SeedClassification[]
    >([
      [SeedClassification.REFERENCE, [SeedClassification.REFERENCE]],
      [
        SeedClassification.DEV,
        [SeedClassification.REFERENCE, SeedClassification.DEV],
      ],
      [
        SeedClassification.TEST,
        [SeedClassification.REFERENCE, SeedClassification.TEST],
      ],
    ]);

    for (const { consumer, provider } of EDGES) {
      const consumerClass = (byId.get(consumer) as CanonicalGroupAudit).metadata
        .classification;
      const providerClass = (byId.get(provider) as CanonicalGroupAudit).metadata
        .classification;
      expect(allowedProviders.get(consumerClass)).toContain(providerClass);
    }
  });

  it("keeps cross-owner dependencies on contracts instead of foreign persistence", () => {
    const moduleOwners = [
      "admin",
      "ads",
      "cooperatives",
      "geography",
      "products",
      "profiles",
      "reviews",
      "users",
    ];

    for (const entry of GROUPS) {
      const source = [entry.source, ...entry.writerSources]
        .map(read)
        .join("\n");
      for (const foreignOwner of moduleOwners.filter(
        (owner) => owner !== entry.metadata.owner,
      )) {
        expect(source).not.toMatch(
          new RegExp(
            `${foreignOwner}/(?:infrastructure|entities|repositories)`,
          ),
        );
      }
    }
  });

  it("keeps one owner for every canonically seeded table", () => {
    const ownersByTable = new Map<string, Set<string>>();
    const groupsByClassificationAndTable = new Map<string, string[]>();
    for (const entry of GROUPS) {
      for (const table of entry.writesTables) {
        const owners = ownersByTable.get(table) ?? new Set<string>();
        owners.add(entry.metadata.owner);
        ownersByTable.set(table, owners);
        const key = `${entry.metadata.classification}:${table}`;
        groupsByClassificationAndTable.set(key, [
          ...(groupsByClassificationAndTable.get(key) ?? []),
          entry.metadata.id,
        ]);
      }
    }

    expect(
      [...ownersByTable.values()].filter((owners) => owners.size > 1),
    ).toEqual([]);
    expect(
      [...groupsByClassificationAndTable.values()].filter(
        (groups) => groups.length > 1,
      ),
    ).toEqual([]);
  });

  it("has one registration per group in each applicable execution mode", () => {
    const registrations = [
      [main, /createAdsPackageReferenceSeedGroup\(dataSource\)/g],
      [main, /createProductsCategoryReferenceSeedGroup\(dataSource\)/g],
      [main, /createUsersDevSeedGroup\(dataSource\)/g],
      [main, /createProfilesRoleProfilesDevSeedGroup\(dataSource\)/g],
      [main, /app\.get\(ProductDevelopmentSeedService\)/g],
      [main, /app\.get\(ReviewDevelopmentSeedService\)/g],
      [main, /app\.get\(CooperativeMemberDevelopmentSeedService\)/g],
      [cli, /createAdsPackageReferenceSeedGroup\(AppDataSource\)/g],
      [cli, /createGeographyProvinceReferenceSeedGroup\(AppDataSource\)/g],
      [cli, /createProductsCategoryReferenceSeedGroup\(AppDataSource\)/g],
      [cli, /createUsersDevSeedGroup\(AppDataSource\)/g],
      [testRegistry, /createUsersTestIdentitySeedGroup\(dataSource\)/g],
      [testRegistry, /createProductsTestCatalogSeedGroup\(dataSource\)/g],
      [testRegistry, /createAdminSystemConfigTestSeedGroup\(persistence\)/g],
    ] as const;

    for (const [source, marker] of registrations)
      expect(occurrences(source, marker)).toBe(1);
    expect(
      GROUPS.flatMap(({ registrationModes }) => registrationModes),
    ).toHaveLength(14);
  });

  it("keeps TEST registration isolated from normal startup and the normal CLI", () => {
    expect(GROUPS.filter(({ testOnly }) => testOnly)).toHaveLength(3);
    expect(
      GROUPS.filter(
        ({ testOnly, normalStartupReachable }) =>
          testOnly && normalStartupReachable,
      ),
    ).toEqual([]);
    for (const marker of [
      "createUsersTestIdentitySeedGroup(dataSource)",
      "createProductsTestCatalogSeedGroup(dataSource)",
      "createAdminSystemConfigTestSeedGroup(persistence)",
    ]) {
      expect(testRegistry).toContain(marker);
    }
    expect(testRegistry).not.toContain("SeedClassification.DEV");
    for (const source of [main, cli]) {
      expect(source).not.toMatch(
        /createPhaseEightTestSeedGroups|createSharedTestIdentitySeedGroups|SeedClassification\.TEST/,
      );
    }
  });

  it("keeps the central orchestrator persistence-neutral and reset-free", () => {
    expect(orchestrator).not.toMatch(
      /getRepository|Repository|EntityManager|QueryRunner/,
    );
    expect(orchestrator).not.toMatch(
      /\.query\(|\.save\(|\.insert\(|\.update\(|\.delete\(/,
    );
    expect(orchestrator).not.toMatch(/modules\/|resetAll|reset\s*\(/);
  });

  it("keeps synchronize out of every canonical seed execution path", () => {
    const executionSources = [
      "src/main.ts",
      "src/database/seeds/seed.ts",
      "src/database/seeds/test-seed-groups.registry.ts",
      "src/database/seeds/test-seed-output-executor.ts",
      "src/database/seeds/framework/seed-orchestrator.ts",
      ...GROUPS.flatMap(({ source, writerSources }) => [
        source,
        ...writerSources,
      ]),
    ];
    const source = [...new Set(executionSources)].map(read).join("\n");
    expect(source).not.toMatch(/synchronize\s*:\s*true|\.synchronize\s*\(/);
  });

  it("keeps retired central and legacy seed authorities absent", () => {
    expect(existsSync(join(ROOT, "src/database/dev-seed.service.ts"))).toBe(
      false,
    );
    expect(
      existsSync(
        join(ROOT, "src/database/seeds/legacy-remaining-dev-seed.group.ts"),
      ),
    ).toBe(false);
    const runtime = collectTypeScriptSources(join(ROOT, "src"))
      .filter((path) => !path.endsWith(".spec.ts"))
      .map((path) => readFileSync(path, "utf8"))
      .join("\n");
    expect(runtime).not.toMatch(
      /class DevSeedService|legacy\.dev\.remaining|resetAll\s*\(/,
    );
  });

  it("records merged P8-06/P8-07 authority and the current P8-08 overlay", () => {
    const documents = [
      "docs/architecture/persistence/phases/phase-08/README.md",
      "docs/architecture/persistence/phases/phase-08/seed-inventory.md",
      "docs/architecture/persistence/phases/phase-08/test-fixture-ownership-audit.md",
    ].map(read);
    for (const document of documents) {
      expect(document).toContain(
        "P8_06E_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_150",
      );
      expect(document).toContain(
        "P8_06_CLOSURE_STATUS=IMPLEMENTED_BY_MERGED_PR_150",
      );
      expect(document).toContain(
        "P8_06_TEST_FIXTURE_OWNERSHIP_STATUS=COMPLETE_BY_MERGED_PR_150",
      );
      expect(document).toContain(
        "P8_07_IMPLEMENTATION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW",
      );
      expect(document).toContain(
        "P8_07_CANONICAL_DAG_STATUS=COMPLETE_PENDING_HUMAN_REVIEW",
      );
      expect(document).toContain("P8_07_BLOCKERS=NONE");
      expect(document).toContain(
        "P8_08_IMPLEMENTATION_AUTHORIZED=NO_WAITING_FOR_P8_07_MERGE_AND_REVIEW",
      );
      expect(document).toContain(
        "P8_07_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_151",
      );
      expect(document).toContain(
        "P8_07_CANONICAL_DAG_STATUS=COMPLETE_BY_MERGED_PR_151",
      );
      expect(document).toContain(
        "DEPENDENCY_DAG_REQUIRED=SATISFIED_BY_MERGED_PR_151",
      );
      expect(document).toContain(
        "CENTRAL_SEEDER_ORCHESTRATION_ONLY=SATISFIED_BY_MERGED_PR_151",
      );
      expect(document).toContain(
        "P8_08_IMPLEMENTATION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW",
      );
      expect(document).toContain("PHASE_08_COMPLETE=NO");
    }
  });
});
