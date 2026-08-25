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

  it("retires C2D3, Forum, and all central Ads fixture writers", () => {
    expect(source).not.toContain("seedBulkListings");
    expect(source).not.toContain("seedHarvestSchedules");
    expect(source).not.toContain("seedForum");
    expect(source).not.toContain("seedAdPackages");
    expect(source).not.toContain("seedAdCampaigns");
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

  it("retires Forum, Package, and Campaign reset ownership while preserving Event debt", () => {
    const tableBlock =
      source.match(/const tables = \[([\s\S]*?)\];/)?.[1] ?? "";
    const targets = [...tableBlock.matchAll(/["']([^"']+)["']/g)].map(
      (match) => match[1],
    );

    expect(targets).toEqual(["ad_events"]);
    expect(targets).not.toContain("ad_packages");
    expect(targets).not.toContain("ad_campaigns");
    expect(targets).not.toContain("forum_likes");
    expect(targets).not.toContain("forum_comments");
    expect(targets).not.toContain("forum_posts");
    expect(targets).not.toContain("audit_logs");
    expect(targets).not.toContain("notifications");
    expect(targets).not.toContain("harvest_schedules");
  });

  it("retains no central normal business fixture write method", () => {
    const normalMethods = [
      ...source.matchAll(/private async (seed[A-Za-z0-9]+)\(/g),
    ].map((match) => match[1]);

    expect(normalMethods).toEqual([]);

    for (const method of normalMethods) {
      expect(source).toContain(`this.${method}`);
    }

    expect(source).not.toContain("seedBulkListings");
    expect(source).not.toContain("seedHarvestSchedules");
  });

  it("retains no ordinary central business-table writer", () => {
    const repositoryEntities = new Set(
      [...source.matchAll(/getRepository\((AdPackage|AdCampaign)\)/g)].map(
        (match) => match[1],
      ),
    );

    expect([...repositoryEntities]).toEqual([]);
  });

  it("retires every central Package and Campaign fixture", () => {
    expect(source).not.toContain("Banner chính (Carousel)");
    expect(source).not.toContain("Sản phẩm nổi bật");
    expect(source).not.toContain("Spotlight tuần");
    expect(source).not.toContain("Nông sản sạch Đà Lạt");
    expect(source).not.toContain("Đặc sản vùng miền — Khuyến mãi tháng 7");
    expect(source).not.toContain("Sầu riêng Ri6 chính vụ");
    expect(source).not.toContain("Phân bón hữu cơ — Giảm 15%");
    expect(source).not.toMatch(/private async seedAdPackages\(/);
    expect(source).not.toMatch(/private async seedAdCampaigns\(/);
    expect(source).not.toMatch(/getRepository\(AdCampaign\)|packages\[[012]\]\.id/);
  });

  it("keeps the transitional continuation without a Package bridge", () => {
    expect(source).toContain("class DevSeedService");
    expect(source).toContain("seedRemainingLegacySections(");
    expect(source).toContain("_users: LegacyDevActorIds");
    expect(source).not.toMatch(/AdPackage|AdType|packageCode|ad packages seeded/);
  });

  it("does not create a replacement Campaign group or output", () => {
    const runtimeSource = readTypeScriptFilesRecursively(join(__dirname, ".."));

    expect(runtimeSource).not.toMatch(/ads\.(?:dev|reference)\.campaigns/);
    expect(runtimeSource).not.toMatch(/campaign\.id\.by-/);
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
