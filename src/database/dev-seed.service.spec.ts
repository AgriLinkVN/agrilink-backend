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
  const source = readFileSync(
    join(__dirname, "dev-seed.service.ts"),
    "utf8",
  ).replace(/\r\n/g, "\n");

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

  it("retires C2D3 and Forum while keeping the blocked Ads sections reachable", () => {
    expect(source).not.toContain("seedBulkListings");
    expect(source).not.toContain("seedHarvestSchedules");
    expect(source).not.toContain("seedForum");
    expect(source).toContain("this.seedAdPackages");
    expect(source).toContain("this.seedAdCampaigns");
  });

  it("retires all central Forum repositories, fixtures, and random Like generation", () => {
    expect(source).not.toMatch(
      /ForumPost|ForumComment|ForumLike|ForumCategory|getRepository\((?:ForumPost|ForumComment|ForumLike)\)/,
    );
    expect(source).not.toMatch(
      /Kỹ thuật trồng lúa ST25|Thị trường trái cây nhập khẩu cuối năm 2026|Kinh nghiệm mua nông sản online uy tín|Tình hình sâu bệnh trên cây ăn trái mùa mưa|HTX Xanh Tiền Giang tuyển thành viên mới/,
    );
    expect(source).not.toMatch(
      /Bài viết rất hữu ích|hiệu quả kinh tế cao hơn giống thường|viết thêm phần 2|nhu cầu Trung Quốc lớn|cải tạo vườn để tăng sản lượng|tăng trưởng tốt ít nhất 2-3 năm|chợ đầu mối Thủ Đức/,
    );
    expect(source).not.toMatch(/Math\.random|postRepo|commentRepo|likeRepo/);
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

  it("retires Forum reset ownership while preserving Ads reset targets", () => {
    const tableBlock =
      source.match(/const tables = \[([\s\S]*?)\];/)?.[1] ?? "";
    const targets = [...tableBlock.matchAll(/["']([^"']+)["']/g)].map(
      (match) => match[1],
    );

    expect(targets).toEqual(["ad_campaigns", "ad_packages", "ad_events"]);
    expect(targets).not.toContain("forum_likes");
    expect(targets).not.toContain("forum_comments");
    expect(targets).not.toContain("forum_posts");
    expect(targets).not.toContain("audit_logs");
    expect(targets).not.toContain("notifications");
    expect(targets).not.toContain("harvest_schedules");
  });

  it("retains exactly the two blocked Ads normal write methods", () => {
    const normalMethods = [
      ...source.matchAll(/private async (seed[A-Za-z0-9]+)\(/g),
    ].map((match) => match[1]);

    expect(normalMethods).toEqual(["seedAdPackages", "seedAdCampaigns"]);

    for (const method of normalMethods) {
      expect(source).toContain(`this.${method}`);
    }

    expect(source).not.toContain("seedBulkListings");
    expect(source).not.toContain("seedHarvestSchedules");
  });

  it("retains exactly two ordinary central business-table writers", () => {
    const repositoryEntities = new Set(
      [...source.matchAll(/getRepository\((AdPackage|AdCampaign)\)/g)].map(
        (match) => match[1],
      ),
    );

    expect([...repositoryEntities].sort()).toEqual(
      ["AdPackage", "AdCampaign"].sort(),
    );
  });

  it("preserves the authorized Ads fixture bodies", () => {
    expect(source).toContain("Banner chính (Carousel)");
    expect(source).toContain("Sản phẩm nổi bật");
    expect(source).toContain("Spotlight tuần");
    expect(source).toContain("Nông sản sạch Đà Lạt");
    expect(source).toContain("Đặc sản vùng miền — Khuyến mãi tháng 7");
    expect(source).toContain("Sầu riêng Ri6 chính vụ");
    expect(source).toContain("Phân bón hữu cơ — Giảm 15%");
    expect(source.match(/private async seedAdPackages\(/g)).toHaveLength(1);
    expect(source.match(/private async seedAdCampaigns\(/g)).toHaveLength(1);
  });

  it("keeps exactly three canonical Package codes on the transitional writer", () => {
    const packageBody =
      source.match(
        /private async seedAdPackages\(\) \{([\s\S]*?)\n  \}\n\n  private async seedAdCampaigns/,
      )?.[1] ?? "";

    expect(packageBody.match(/\{ name:/g)).toHaveLength(3);
    expect(packageBody.match(/packageCode:/g)).toHaveLength(3);
    expect(packageBody).toContain("const existing = await repo.count()");
    expect(packageBody).toContain("if (existing > 0) return");
    expect(packageBody).toContain(
      "{ name: 'Banner chính (Carousel)', packageCode: 'HOMEPAGE_CAROUSEL', adType: AdType.BANNER, price: 500000, durationDays: 30, maxImpressions: 10000, description: 'Hiển thị trên carousel trang chủ', isActive: true }",
    );
    expect(packageBody).toContain(
      "{ name: 'Sản phẩm nổi bật', packageCode: 'FEATURED_PRODUCT', adType: AdType.FEATURED, price: 300000, durationDays: 14, maxImpressions: 5000, description: 'Sản phẩm được gắn nhãn nổi bật', isActive: true }",
    );
    expect(packageBody).toContain(
      "{ name: 'Spotlight tuần', packageCode: 'SPOTLIGHT_PLACEMENT', adType: AdType.SPOTLIGHT, price: 700000, durationDays: 7, maxImpressions: 20000, description: 'Hiển thị spotlight nổi bật 7 ngày', isActive: true }",
    );
  });

  it("does not alter Campaign fixtures for the Package compatibility bridge", () => {
    const campaignBody =
      source.match(
        /private async seedAdCampaigns\([\s\S]*?\{([\s\S]*?)\n  \}\n\}/,
      )?.[1] ?? "";

    expect(campaignBody.match(/\{ supplierId, packageId:/g)).toHaveLength(4);
    expect(campaignBody).not.toContain("packageCode");
    expect(campaignBody).toContain("Nông sản sạch Đà Lạt");
    expect(campaignBody).toContain("Đặc sản vùng miền — Khuyến mãi tháng 7");
    expect(campaignBody).toContain("Sầu riêng Ri6 chính vụ");
    expect(campaignBody).toContain("Phân bón hữu cơ — Giảm 15%");
  });

  it("keeps the legacy continuation without a replacement Forum or deferred SeedGroup", () => {
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
    expect(runtimeSource).not.toMatch(
      /forum\.dev\.(?:posts|comments|likes|content|discussions)/,
    );
    expect(runtimeSource).not.toContain("forum-post.id.by-");
    expect(runtimeSource).not.toContain("forum-comment.id.by-");
  });

  it("preserves Forum domain entities and the User/Post Like constraint", () => {
    const forumRoot = join(__dirname, "..", "modules", "forum");
    const moduleSource = readFileSync(
      join(forumRoot, "forum.module.ts"),
      "utf8",
    );
    const postSource = readFileSync(
      join(forumRoot, "entities", "forum-post.entity.ts"),
      "utf8",
    );
    const commentSource = readFileSync(
      join(forumRoot, "entities", "forum-comment.entity.ts"),
      "utf8",
    );
    const likeSource = readFileSync(
      join(forumRoot, "entities", "forum-like.entity.ts"),
      "utf8",
    );

    expect(moduleSource).toContain(
      "TypeOrmModule.forFeature([ForumPost, ForumComment, ForumLike])",
    );
    expect(postSource).toContain("@Entity('forum_posts')");
    expect(commentSource).toContain("@Entity('forum_comments')");
    expect(likeSource).toContain("@Entity('forum_likes')");
    expect(likeSource).toContain("@Unique(['postId', 'userId'])");
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
