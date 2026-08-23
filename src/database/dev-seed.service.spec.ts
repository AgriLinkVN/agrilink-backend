import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

function readTypeScriptFilesRecursively(root: string): string {
  return readdirSync(root)
    .flatMap((entry) => {
      const path = join(root, entry);
      if (statSync(path).isDirectory()) {
        return readTypeScriptFilesRecursively(path);
      }
      return entry.endsWith(".ts") && !entry.endsWith(".spec.ts")
        ? readFileSync(path, "utf8")
        : "";
    })
    .join("\n");
}

describe("DevSeedService Phase 8 transitions", () => {
  const source = readFileSync(join(__dirname, "dev-seed.service.ts"), "utf8");

  it("retires every central Product-owned write and repository query", () => {
    expect(source).not.toMatch(
      /getRepository\(Product\)|getRepository\(ProductImage\)|getRepository\(ProductCategory\)|getRepository\(ProductCertification\)/,
    );
    expect(source).not.toMatch(
      /seedProducts|seedCategories|seedViolations|product-image\.entity|product-category\.entity|product-certification\.entity/,
    );
    expect(source).not.toMatch(
      /product_certifications|product_images|\n\s+'products',/,
    );
  });

  it("removes the dead Harvest Product scalar plumbing", () => {
    expect(source).not.toMatch(
      /products\[|productIds\[|\.slice\(0, 8\)|ProductStatus\.ACTIVE/,
    );
    expect(source).not.toMatch(
      /products: LegacyDevProductIds|products\.XOAI_HOA_LOC|XOAI_HOA_LOC|LegacyDevProductIds|ProductUnit/,
    );
  });

  it("retires central Reviews persistence and its destructive reset target", () => {
    expect(source).not.toMatch(
      /seedReviews|getRepository\(Review\)|review\.entity|['"]review['"],/,
    );
  });

  it("retires central Cooperative Member persistence and reset targeting", () => {
    expect(source).not.toMatch(
      /seedCoopMembers|CooperativeMemberEntity|cooperative-member\.entity|['"]cooperative_members['"],/,
    );
  });

  it("retires C2D3 while keeping the blocked C3 sections reachable", () => {
    expect(source).not.toContain("seedBulkListings");
    expect(source).not.toContain("seedHarvestSchedules");
    expect(source).toContain("this.seedForum");
    expect(source).toContain("this.seedAdPackages");
    expect(source).toContain("this.seedAdCampaigns");
  });

  it("retires every executable Harvest Schedule fixture and repository write", () => {
    expect(source).not.toMatch(
      /HarvestScheduleEntity|harvest-schedule\.entity|getRepository\(HarvestScheduleEntity\)/,
    );
    expect(source).not.toMatch(
      /2026-07-15|2026-07-20|2026-08-01|vụ chính|vụ muộn|vụ rải/,
    );
    expect(source).not.toMatch(/cropName: 'Xoài cát Hòa Lộc'/);
  });

  it("retires every executable Bulk Listing and Contribution fixture", () => {
    expect(source).not.toMatch(
      /BulkListingEntity|BulkListingContributionEntity|getRepository\(BulkListing|getRepository\(BulkListingContribution/,
    );
    expect(source).not.toMatch(
      /Xoài cát Hòa Lộc — Thu gom vụ hè|Thanh long ruột đỏ — Đơn hàng xuất khẩu/,
    );
    expect(source).not.toMatch(
      /bulkListingId: listing\.id|quantity: 1500|quantity: 2000/,
    );
  });

  it("retires Audit Log and Notification DEV fixture persistence", () => {
    expect(source).not.toMatch(/seedAuditLogs|seedNotifications/);
    expect(source).not.toMatch(
      /getRepository\(AuditLog\)|getRepository\(NotificationOrmEntity\)/,
    );
    expect(source).not.toMatch(
      /audit-log\.entity|notification\.orm-entity|\bNotifType\b/,
    );
  });

  it("removes only Audit Log and Notification from central reset ownership", () => {
    const tableBlock =
      source.match(/const tables = \[([\s\S]*?)\];/)?.[1] ?? "";
    const targets = [...tableBlock.matchAll(/["']([^"']+)["']/g)].map(
      (match) => match[1],
    );

    expect(targets).toEqual([
      "forum_likes",
      "forum_comments",
      "forum_posts",
      "ad_campaigns",
      "ad_packages",
      "ad_events",
    ]);
    expect(targets).not.toContain("audit_logs");
    expect(targets).not.toContain("notifications");
    expect(targets).not.toContain("harvest_schedules");
  });

  it("retains exactly the three blocked C3 normal write methods", () => {
    const normalMethods = [
      ...source.matchAll(/private async (seed[A-Za-z0-9]+)\(/g),
    ].map((match) => match[1]);

    expect(normalMethods).toEqual([
      "seedForum",
      "seedAdPackages",
      "seedAdCampaigns",
    ]);

    for (const method of normalMethods) {
      expect(source).toContain(`this.${method}`);
    }

    expect(source).not.toContain("seedBulkListings");
    expect(source).not.toContain("seedHarvestSchedules");
  });

  it("retains exactly five ordinary central business-table writers", () => {
    const repositoryEntities = new Set(
      [
        ...source.matchAll(
          /getRepository\((ForumPost|ForumComment|ForumLike|AdPackage|AdCampaign)\)/g,
        ),
      ].map((match) => match[1]),
    );

    expect([...repositoryEntities].sort()).toEqual(
      [
        "ForumPost",
        "ForumComment",
        "ForumLike",
        "AdPackage",
        "AdCampaign",
      ].sort(),
    );
  });

  it("keeps the legacy continuation without a replacement C2D2 or C4 SeedGroup", () => {
    const runtimeSource = readTypeScriptFilesRecursively(join(__dirname, ".."));

    expect(runtimeSource).toContain('"legacy.dev.remaining"');
    expect(runtimeSource).not.toMatch(
      /cooperatives\.dev\.(?:bulk-listings|bulk-operations|contributions)/,
    );
    expect(runtimeSource).not.toContain("bulk-listing.id.by-");
    expect(runtimeSource).not.toContain('"admin.dev.audit-logs"');
    expect(runtimeSource).not.toContain('"notifications.dev.inbox"');
    expect(runtimeSource).not.toMatch(
      /cooperatives\.dev\.(?:harvest|harvest-schedules)/,
    );
    expect(runtimeSource).not.toContain("harvest-schedule.id.by-");
  });

  it("preserves Harvest domain persistence and migration definitions", () => {
    const entitySource = readFileSync(
      join(
        __dirname,
        "..",
        "modules",
        "cooperatives",
        "infrastructure",
        "persistence",
        "entities",
        "harvest-schedule.entity.ts",
      ),
      "utf8",
    );
    const migrationSource = readFileSync(
      join(
        __dirname,
        "migrations",
        "1783731600000-EstablishCooperativePersistenceBoundaries.ts",
      ),
      "utf8",
    );

    expect(entitySource).toContain("@Entity('harvest_schedules')");
    expect(migrationSource).toContain(
      'CREATE TABLE IF NOT EXISTS "harvest_schedules"',
    );
  });
});
