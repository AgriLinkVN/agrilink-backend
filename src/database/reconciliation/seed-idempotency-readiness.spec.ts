import { readFileSync, readdirSync } from "fs";
import { join, relative } from "path";
import { SeedClassification } from "../seeds/framework/seed-contract";

type AmbiguityGuard = "EXPLICIT_CARDINALITY" | "SCHEMA_UNIQUE_FIND_ONE";

interface ReadinessAudit {
  readonly groupId: string;
  readonly classification: SeedClassification;
  readonly owner: string;
  readonly source: string;
  readonly stableIdentity: string;
  readonly lookupMarkers: readonly string[];
  readonly ambiguityGuard: AmbiguityGuard;
  readonly outputProducer: boolean;
  readonly compositeIdentity: boolean;
  readonly identityExclusionMarkers: readonly string[];
}

const ROOT = process.cwd();

const AUDIT: readonly ReadinessAudit[] = Object.freeze([
  audit(
    "ads.reference.packages",
    SeedClassification.REFERENCE,
    "ads",
    "src/modules/ads/infrastructure/persistence/seeds/ad-package-reference.seed.ts",
    "packageCode",
    ["findByPackageCode(record.packageCode)"],
    "EXPLICIT_CARDINALITY",
    false,
    false,
    ['"packageCode"'],
  ),
  audit(
    "geography.reference.provinces",
    SeedClassification.REFERENCE,
    "geography",
    "src/modules/geography/infrastructure/seeds/province-reference.seed.ts",
    "code",
    ["findByCode(record.code)"],
    "SCHEMA_UNIQUE_FIND_ONE",
    true,
    false,
    ['"code"'],
  ),
  audit(
    "products.reference.categories",
    SeedClassification.REFERENCE,
    "products",
    "src/modules/products/infrastructure/database/seeds/product-category.seed.ts",
    "slug",
    ["findBySlug(record.slug)"],
    "SCHEMA_UNIQUE_FIND_ONE",
    true,
    false,
    ['"slug"'],
  ),
  audit(
    "users.dev.users",
    SeedClassification.DEV,
    "users",
    "src/modules/users/infrastructure/database/seeds/user.seed.ts",
    "phone + email",
    ["findByPhone(record.phone)", "findByEmail(record.email)"],
    "SCHEMA_UNIQUE_FIND_ONE",
    true,
    true,
    ['"phone" | "email"'],
  ),
  audit(
    "cooperatives.dev.members",
    SeedClassification.DEV,
    "cooperatives",
    "src/modules/cooperatives/infrastructure/database/seeds/cooperative-member-development-seed.service.ts",
    "cooperativeId + farmerId",
    ["findMembersByCooperativeAndFarmer("],
    "EXPLICIT_CARDINALITY",
    false,
    true,
    ["CooperativeMemberDevSeedUpdateData"],
  ),
  audit(
    "products.dev.products",
    SeedClassification.DEV,
    "products",
    "src/modules/products/infrastructure/database/seeds/product-development-seed.service.ts",
    "sku; productId + primary slot; productId + certNumber",
    [
      "findProductsBySku(record.sku)",
      "findPrimaryImages(productId)",
      "findCertifications(",
    ],
    "EXPLICIT_CARDINALITY",
    true,
    true,
    [
      "ProductDevSeedMutableData",
      "ProductDevPrimaryImageMutableData",
      "ProductDevCertificationMutableData",
    ],
  ),
  audit(
    "profiles.dev.role-profiles",
    SeedClassification.DEV,
    "profiles",
    "src/modules/profiles/infrastructure/database/seeds/profile-role-development.seed.ts",
    "userId + subtype schema-backed unique identities",
    [
      "findFarmerByUserId(profile.userId)",
      "findFarmerByCccd(profile.cccdNumber)",
      "findCooperativeByUserId(profile.userId)",
      "findEnterpriseByUserId(profile.userId)",
      "findSupplierByUserId(profile.userId)",
    ],
    "SCHEMA_UNIQUE_FIND_ONE",
    false,
    true,
    [
      "FarmerProfileDevMutableData",
      "CooperativeProfileDevMutableData",
      "EnterpriseProfileDevMutableData",
      "SupplierProfileDevMutableData",
    ],
  ),
  audit(
    "reviews.dev.product-feedback",
    SeedClassification.DEV,
    "reviews",
    "src/modules/reviews/infrastructure/database/seeds/review-development-seed.service.ts",
    "reviewerId + productId",
    ["findReviewsByReviewerAndProduct("],
    "EXPLICIT_CARDINALITY",
    false,
    true,
    ["ReviewDevSeedMutableData"],
  ),
  audit(
    "users.test.identities",
    SeedClassification.TEST,
    "users",
    "src/modules/users/infrastructure/database/seeds/user-test.seed.ts",
    "email",
    ["findByEmail(record.email)"],
    "EXPLICIT_CARDINALITY",
    true,
    false,
    ['"email" | "passwordHash"'],
  ),
  audit(
    "products.test.catalog",
    SeedClassification.TEST,
    "products",
    "src/modules/products/infrastructure/database/seeds/product-test.seed.ts",
    "sku",
    ["findBySku(record.sku)"],
    "EXPLICIT_CARDINALITY",
    true,
    false,
    ['"sku"'],
  ),
  audit(
    "admin.test.system-configs",
    SeedClassification.TEST,
    "admin",
    "src/modules/admin/infrastructure/database/seeds/system-config-test.seed.ts",
    "key",
    ["findByKey(record.key)"],
    "EXPLICIT_CARDINALITY",
    true,
    false,
    ["SystemConfigTestMutableData"],
  ),
]);

function audit(
  groupId: string,
  classification: SeedClassification,
  owner: string,
  source: string,
  stableIdentity: string,
  lookupMarkers: readonly string[],
  ambiguityGuard: AmbiguityGuard,
  outputProducer: boolean,
  compositeIdentity: boolean,
  identityExclusionMarkers: readonly string[],
): Readonly<ReadinessAudit> {
  return Object.freeze({
    groupId,
    classification,
    owner,
    source,
    stableIdentity,
    lookupMarkers: Object.freeze([...lookupMarkers]),
    ambiguityGuard,
    outputProducer,
    compositeIdentity,
    identityExclusionMarkers: Object.freeze([...identityExclusionMarkers]),
  });
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

describe("P8-08 canonical seed idempotency and retry readiness", () => {
  it("audits all eleven canonical groups and their classifications", () => {
    const discovered = collectTypeScriptSources(join(ROOT, "src"))
      .filter((path) => !path.endsWith(".spec.ts"))
      .filter((path) =>
        readFileSync(path, "utf8").includes("implements SeedGroup"),
      )
      .map((path) => relative(ROOT, path).replace(/\\/g, "/"))
      .sort();

    expect(AUDIT).toHaveLength(11);
    expect(new Set(AUDIT.map(({ groupId }) => groupId)).size).toBe(11);
    expect(AUDIT.map(({ source }) => source).sort()).toEqual(discovered);
    expect(
      AUDIT.filter(
        ({ classification }) => classification === SeedClassification.REFERENCE,
      ),
    ).toHaveLength(3);
    expect(
      AUDIT.filter(
        ({ classification }) => classification === SeedClassification.DEV,
      ),
    ).toHaveLength(5);
    expect(
      AUDIT.filter(
        ({ classification }) => classification === SeedClassification.TEST,
      ),
    ).toHaveLength(3);
    for (const entry of AUDIT) {
      const source = read(entry.source);
      expect(source).toContain(
        `classification: SeedClassification.${entry.classification}`,
      );
      expect(source).toMatch(new RegExp(`owner: ["']${entry.owner}["']`));
    }
  });

  it("uses per-record stable-key reconciliation without global seed gates", () => {
    for (const entry of AUDIT) {
      const source = read(entry.source);
      for (const marker of entry.lookupMarkers)
        expect(source).toContain(marker);
      expect(source).toMatch(/create[A-Z]|writer\.create\(/);
      expect(source).toMatch(/update[A-Z]|writer\.update\(/);
      expect(source).not.toMatch(
        /repository\.count\s*\(|manager\.count\s*\(|SELECT\s+COUNT|seed once if table empty/i,
      );
      expect(source).not.toMatch(/randomUUID\s*\(|Math\.random\s*\(/);
    }
  });

  it("excludes stable and create-only fields from mutable update contracts", () => {
    for (const entry of AUDIT) {
      const source = read(entry.source);
      for (const marker of entry.identityExclusionMarkers)
        expect(source).toContain(marker);
    }

    expect(read(AUDIT[3].source)).toContain(
      "partial identity conflict for ${record.email}",
    );
    expect(read(AUDIT[6].source)).toContain(
      "all unique keys must resolve together",
    );
  });

  it("fails closed on ambiguous identities", () => {
    expect(AUDIT).toHaveLength(11);
    for (const entry of AUDIT) {
      const source = read(entry.source);
      if (entry.ambiguityGuard === "EXPLICIT_CARDINALITY") {
        expect(source).toMatch(/\.length > 1/);
      } else {
        expect(source).toContain("| null>");
      }
    }
  });

  it("contains no unresolved runtime nondeterminism", () => {
    const sources = AUDIT.map(({ source }) => read(source)).join("\n");
    expect(sources).not.toMatch(
      /randomUUID\s*\(|Math\.random\s*\(|Date\.now\s*\(/,
    );

    const runtimeNowCount = sources.match(/new Date\(\)/g)?.length ?? 0;
    expect(runtimeNowCount).toBe(2);
    expect(read(AUDIT[4].source)).toContain(
      "createMember({ ...data, joinedAt: now() })",
    );
    expect(read(AUDIT[6].source)).toContain(
      "verifiedAt: _createOnlyVerifiedAt",
    );
    expect(read(AUDIT[3].source)).toContain(
      "createPasswordHash ??= await passwordHasher.hash(",
    );
    expect(read(AUDIT[3].source)).not.toMatch(
      /update\(existing\.id,\s*\{[^}]*passwordHash/s,
    );
    expect(read(AUDIT[8].source)).toContain(
      "passwordHash: _createOnlyPasswordHash",
    );
  });

  it("gives Products child rows stable reconciliation identities", () => {
    const source = read(AUDIT[5].source);
    expect(source).toContain("findPrimaryImages(productId)");
    expect(source).toContain("primaryImages.length > 1");
    expect(source).toContain("findCertifications(");
    expect(source).toContain("matches.length > 1");
    expect(source).toContain("updatePrimaryImage(primaryImages[0].id");
    expect(source).toContain("updateCertification(matches[0].id");
    expect(source).not.toMatch(/delete.*product|reset.*product/i);
  });

  it("uses persisted composite identities for all tuple fixtures", () => {
    const composite = AUDIT.filter(
      ({ compositeIdentity }) => compositeIdentity,
    );
    expect(composite.map(({ groupId }) => groupId)).toEqual([
      "users.dev.users",
      "cooperatives.dev.members",
      "products.dev.products",
      "profiles.dev.role-profiles",
      "reviews.dev.product-feedback",
    ]);
    for (const entry of composite) {
      expect(entry.stableIdentity).not.toMatch(/generated|position|index/i);
    }
  });

  it("returns actual persisted IDs from every output-producing group", () => {
    const producers = AUDIT.filter(({ outputProducer }) => outputProducer);
    expect(producers).toHaveLength(7);
    for (const entry of producers) {
      const source = read(entry.source);
      expect(source).toMatch(/\.id|productIds/);
      expect(source).not.toMatch(/value:\s*(?:index|count|records\.length)/);
    }
  });

  it("is structurally retryable without delete-all or reset behavior", () => {
    for (const entry of AUDIT) {
      const source = read(entry.source);
      expect(source).not.toMatch(/deleteAll|truncate|clear\s*\(|resetAll/);
      expect(source).toMatch(/find[A-Z]/);
      expect(source).toMatch(/create[A-Z]|writer\.create\(/);
      expect(source).toMatch(/update[A-Z]|writer\.update\(/);
    }
  });

  it("keeps idempotency logic owner-local and the TEST catalog fixed", () => {
    const orchestrator = read(
      "src/database/seeds/framework/seed-orchestrator.ts",
    );
    expect(orchestrator).not.toMatch(
      /getRepository|Repository|EntityManager|QueryRunner/,
    );
    expect(orchestrator).not.toMatch(
      /\.query\(|\.save\(|\.insert\(|\.update\(|\.delete\(/,
    );
    expect(
      AUDIT.filter(
        ({ classification }) => classification === SeedClassification.TEST,
      ),
    ).toHaveLength(3);
    expect(AUDIT.every(({ source }) => !source.includes("migrations"))).toBe(
      true,
    );
  });

  it("records readiness without claiming P8-09 runtime proof", () => {
    const document = read(
      "docs/architecture/persistence/phases/phase-08/seed-idempotency-readiness.md",
    );
    expect(document).toContain(
      "P8_08_IMPLEMENTATION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW",
    );
    expect(document).toContain(
      "P8_08_READINESS_STATUS=READY_FOR_DISPOSABLE_DB_VERIFICATION_PENDING_HUMAN_REVIEW",
    );
    expect(document).toContain("P8_08_BLOCKERS=NONE");
    expect(document).toContain("IDEMPOTENCY_VERIFIED=NOT_YET_VERIFIED");
    expect(document).toContain(
      "SECOND_SEED_RUN_NO_DUPLICATES=NOT_YET_VERIFIED",
    );
    expect(document).toContain("DISPOSABLE_DB_SEED_RUN_PASS=NOT_YET_VERIFIED");
  });
});
