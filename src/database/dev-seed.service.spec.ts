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

  it("uses one explicit scalar Product ID only for still-central Harvests", () => {
    expect(source).not.toMatch(
      /products\[|productIds\[|\.slice\(0, 8\)|ProductStatus\.ACTIVE/,
    );
    expect(source).toContain("products.XOAI_HOA_LOC");
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

  it("keeps blocked C2D2/C2D3 and C3 persistence sections reachable", () => {
    expect(source).toContain("this.seedBulkListings");
    expect(source).toContain("this.seedHarvestSchedules");
    expect(source).toContain("this.seedForum");
    expect(source).toContain("this.seedAdPackages");
    expect(source).toContain("this.seedAdCampaigns");
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
    const tableBlock = source.match(/const tables = \[([\s\S]*?)\];/)?.[1] ?? "";
    const targets = [...tableBlock.matchAll(/'([^']+)'/g)].map(
      (match) => match[1],
    );

    expect(targets).toEqual([
      "harvest_schedules",
      "bulk_listing_contributions",
      "bulk_listings",
      "forum_likes",
      "forum_comments",
      "forum_posts",
      "ad_campaigns",
      "ad_packages",
      "ad_events",
    ]);
    expect(targets).not.toContain("audit_logs");
    expect(targets).not.toContain("notifications");
  });

  it("retains exactly the five blocked central normal write methods", () => {
    const normalMethods = [
      "seedForum",
      "seedAdPackages",
      "seedAdCampaigns",
      "seedBulkListings",
      "seedHarvestSchedules",
    ];

    for (const method of normalMethods) {
      expect(source).toContain(`private async ${method}(`);
      expect(source).toContain(`this.${method}`);
    }
  });

  it("keeps the temporary legacy continuation and creates no C4 SeedGroup", () => {
    const runtimeSource = readTypeScriptFilesRecursively(join(__dirname, ".."));

    expect(runtimeSource).toContain('"legacy.dev.remaining"');
    expect(runtimeSource).not.toContain('"admin.dev.audit-logs"');
    expect(runtimeSource).not.toContain('"notifications.dev.inbox"');
  });
});
