import { readFileSync } from "fs";
import { join } from "path";

describe("DevSeedService C2C transition", () => {
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

  it("keeps C2D, C3, and C4 persistence sections reachable", () => {
    expect(source).toContain("this.seedCoopMembers");
    expect(source).toContain("this.seedBulkListings");
    expect(source).toContain("this.seedHarvestSchedules");
    expect(source).toContain("this.seedForum");
    expect(source).toContain("this.seedAdPackages");
    expect(source).toContain("this.seedAuditLogs");
    expect(source).toContain("this.seedNotifications");
  });
});
