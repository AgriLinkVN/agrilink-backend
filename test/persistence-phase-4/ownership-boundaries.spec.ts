import * as fs from "fs";
import * as path from "path";
import { getMetadataArgsStorage } from "typeorm";

import { RUNTIME_ENTITY_ENTRIES } from "../../src/database/entity-registry";
import { CooperativeProfile } from "../../src/modules/profiles/infrastructure/persistence/entities/cooperative-profile.entity";
import { EnterpriseProfile } from "../../src/modules/profiles/infrastructure/persistence/entities/enterprise-profile.entity";
import { FarmerProfile } from "../../src/modules/profiles/infrastructure/persistence/entities/farmer-profile.entity";
import { SupplierProfile } from "../../src/modules/profiles/infrastructure/persistence/entities/supplier-profile.entity";

const root = path.resolve(__dirname, "../..");
const entities = [
  FarmerProfile,
  CooperativeProfile,
  EnterpriseProfile,
  SupplierProfile,
];
const tables = [
  "farmer_profiles",
  "cooperative_profiles",
  "enterprise_profiles",
  "supplier_profiles",
];

describe("Persistence Phase 4 ownership boundaries", () => {
  it("has one Profiles-owned writable mapping per profile table", () => {
    const mappings = getMetadataArgsStorage().tables.filter(({ target }) =>
      entities.includes(target as typeof FarmerProfile),
    );
    const counts = new Map<string, number>();
    for (const mapping of mappings) {
      const table = String(mapping.name);
      if (tables.includes(table)) {
        counts.set(table, (counts.get(table) ?? 0) + 1);
      }
    }
    expect(Object.fromEntries(counts)).toEqual({
      farmer_profiles: 1,
      cooperative_profiles: 1,
      enterprise_profiles: 1,
      supplier_profiles: 1,
    });
  });

  it("registers only canonical Profiles entity classes", () => {
    const entries = new Map(
      RUNTIME_ENTITY_ENTRIES.map(({ key, entity }) => [key, entity]),
    );
    expect(entries.get("public.farmer_profiles")).toBe(FarmerProfile);
    expect(entries.get("public.cooperative_profiles")).toBe(CooperativeProfile);
    expect(entries.get("public.enterprise_profiles")).toBe(EnterpriseProfile);
    expect(entries.get("public.supplier_profiles")).toBe(SupplierProfile);
  });

  it.each([
    "farmer-profile.entity.ts",
    "cooperative-profile.entity.ts",
    "enterprise-profile.entity.ts",
    "supplier-profile.entity.ts",
  ])("keeps central and legacy Profiles path %s decorator-free", (file) => {
    for (const directory of [
      "src/database/entities",
      "src/modules/profiles/entities",
    ]) {
      const source = read(`${directory}/${file}`);
      expect(source).toMatch(/^export \{ \w+ \} from /);
      expect(source).not.toMatch(
        /@(Entity|Column|PrimaryGeneratedColumn|ManyToOne|OneToOne|JoinColumn|Index)\b/,
      );
    }
  });

  it("prevents the generator from recreating profile decorators", () => {
    const generator = read("generate-entities.js");
    for (const file of [
      "farmer-profile.entity.ts",
      "cooperative-profile.entity.ts",
      "enterprise-profile.entity.ts",
      "supplier-profile.entity.ts",
    ]) {
      const marker = `'${file}':`;
      const start = generator.indexOf(marker);
      const end = generator.indexOf("`,", start);
      expect(generator.slice(start, end)).toContain("export {");
      expect(generator.slice(start, end)).not.toContain("@Entity");
    }
  });

  it("keeps Admin behind typed Profiles capabilities", () => {
    const route = read("src/modules/admin/admin.route.ts");
    const service = read("src/modules/admin/admin.service.ts");
    const combined = `${route}\n${service}`;

    expect(route).toContain("ProfilesRoute");
    expect(combined).not.toMatch(
      /@InjectRepository\((FarmerProfile|CooperativeProfile|EnterpriseProfile|SupplierProfile)\)/,
    );
    expect(combined).not.toMatch(
      /Repository<(FarmerProfile|CooperativeProfile|EnterpriseProfile|SupplierProfile)>/,
    );
    expect(combined).not.toMatch(
      /infrastructure\/persistence\/entities\/(farmer|cooperative|enterprise|supplier)-profile/,
    );
    expect(route).not.toMatch(
      /forFeature\(\[[\s\S]*\b(FarmerProfile|CooperativeProfile|EnterpriseProfile|SupplierProfile)\b/,
    );
  });

  it("keeps Profiles ports and cross-module references free of TypeORM", () => {
    const ports = allTypeScriptFiles(
      path.join(root, "src/modules/profiles/application/ports"),
    );
    for (const file of ports) {
      expect(fs.readFileSync(file, "utf8")).not.toMatch(
        /from ['"]typeorm['"]|Repository<|EntityManager|QueryRunner|SelectQueryBuilder|FindOptions/,
      );
    }
    for (const file of [
      "farmer-profile.entity.ts",
      "cooperative-profile.entity.ts",
      "enterprise-profile.entity.ts",
      "supplier-profile.entity.ts",
    ].map((name) =>
      read(`src/modules/profiles/infrastructure/persistence/entities/${name}`),
    )) {
      expect(file).not.toMatch(
        /users\/infrastructure|database\/entities\/user\.entity/,
      );
    }
  });

  it("removes profile exceptions without changing Phase 5 ownership", () => {
    const exceptions = read("docs/architecture/persistence/exceptions.json");
    const ownership = read(
      "docs/architecture/persistence/entity-ownership.json",
    );
    expect(exceptions).not.toMatch(
      /admin\/admin\.(route|service)\.ts[^"\n]*(FarmerProfile|CooperativeProfile|EnterpriseProfile|SupplierProfile)/,
    );
    expect(ownership).toContain('"table":"products","owner":"products"');
    expect(ownership).toContain('"table":"reviews","owner":"reviews"');
    expect(read("src/modules/reviews/reviews.module.ts")).toContain("Product");
  });
});

function read(relative: string): string {
  return fs.readFileSync(path.join(root, relative), "utf8");
}

function allTypeScriptFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory()
      ? allTypeScriptFiles(target)
      : entry.isFile() && entry.name.endsWith(".ts")
        ? [target]
        : [];
  });
}
