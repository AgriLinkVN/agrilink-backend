import { readFileSync } from "fs";
import { join } from "path";
import { getMetadataArgsStorage } from "typeorm";

import { getMigrationNames, V2_MIGRATIONS } from "../migration-registry";
import { CooperativeMemberEntity } from "../../modules/cooperatives/infrastructure/persistence/entities/cooperative-member.entity";

const source = readFileSync(
  join(__dirname, "1800000005000-RestoreCanonicalCooperativeMemberSchema.ts"),
  "utf8",
).replace(/\r\n/g, "\n");
const upSource =
  source.match(/async up[\s\S]*?\{([\s\S]*?)\n  \}\n\n  async down/)?.[1] ?? "";
const downSource =
  source.match(/async down[\s\S]*?\{([\s\S]*?)\n  \}\n\}/)?.[1] ?? "";

describe("P8-09A canonical Cooperative Member schema migration", () => {
  it("registers one ordered forward migration after the reviewed V2 chain", () => {
    expect(getMigrationNames(V2_MIGRATIONS)).toEqual([
      "CreateCanonicalBaselineV21800000000000",
      "CreateCommerceBoundariesV21800000001000",
      "CreateTraceabilityEventModelV21800000002000",
      "ExpandAdPackageReferenceIdentity1800000003000",
      "BackfillAndContractAdPackageReferenceIdentity1800000004000",
      "RestoreCanonicalCooperativeMemberSchema1800000005000",
    ]);
  });

  it("creates only the owner schema proven by current and legacy authority", () => {
    expect(upSource).toContain('CREATE TABLE "public"."cooperative_members"');
    for (const column of [
      "id",
      "cooperative_id",
      "farmer_id",
      "status",
      "role",
      "joined_at",
      "created_at",
      "updated_at",
    ]) {
      expect(upSource).toContain(`"${column}"`);
    }
    expect(upSource).toContain('CONSTRAINT "ck_p3_member_status"');
    expect(upSource).toContain('CONSTRAINT "uq_p3_member_cooperative_farmer"');
    expect(upSource).toContain('CONSTRAINT "fk_p3_member_cooperative"');
    expect(upSource).toContain("ON DELETE CASCADE");
    expect(upSource).toContain('CONSTRAINT "fk_p3_member_farmer"');
    expect(upSource).toContain("ON DELETE RESTRICT");
    expect(upSource).toContain(
      'CREATE INDEX "idx_p3_member_cooperative_status"',
    );
    expect(upSource).not.toMatch(
      /CREATE TABLE.*(?:bulk_listings|harvest_schedules|market_prices)/s,
    );
  });

  it("aligns stable identity and status metadata with the migration", () => {
    const storage = getMetadataArgsStorage();
    expect(
      storage.uniques.find(
        ({ target, name }) =>
          target === CooperativeMemberEntity &&
          name === "uq_p3_member_cooperative_farmer",
      )?.columns,
    ).toEqual(["cooperativeId", "farmerId"]);
    expect(
      storage.indices.find(
        ({ target, name }) =>
          target === CooperativeMemberEntity &&
          name === "idx_p3_member_cooperative_status",
      )?.columns,
    ).toEqual(["cooperativeId", "status"]);
    expect(
      storage.checks.find(
        ({ target, name }) =>
          target === CooperativeMemberEntity && name === "ck_p3_member_status",
      )?.expression,
    ).toContain("'left'");
  });

  it("reverts only the corrective table", () => {
    expect(downSource).toContain('DROP TABLE "public"."cooperative_members"');
    expect(downSource.match(/DROP TABLE/g)).toHaveLength(1);
    expect(downSource).not.toMatch(/users|products|profiles|reviews/);
  });
});
