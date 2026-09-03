import { DataSource, Repository } from "typeorm";
import {
  SeedClassification,
  SeedExecutionContext,
  SeedGroup,
  SeedGroupMetadata,
  SeedGroupResult,
  SeedOutputBinding,
} from "../../../../../database/seeds/framework/seed-contract";
import { ProductCategory } from "../../persistence/entities/product-category.entity";
import {
  CATEGORY_ID_BY_SLUG_OUTPUT_KIND,
  PRODUCTS_CATEGORY_REFERENCE_SEED_GROUP_ID,
} from "../../../application/contracts/product-seed-output.contract";

export {
  CATEGORY_ID_BY_SLUG_OUTPUT_KIND,
  PRODUCTS_CATEGORY_REFERENCE_SEED_GROUP_ID,
} from "../../../application/contracts/product-seed-output.contract";

export interface ProductCategoryReferenceSeedData {
  readonly name: string;
  readonly slug: string;
  readonly sortOrder: number;
  readonly parentSlug?: string;
}

export const productCategoryReferenceSeedData: readonly ProductCategoryReferenceSeedData[] =
  [
    { name: "Rau củ quả", slug: "rau-cu-qua", sortOrder: 1 },
    { name: "Trái cây", slug: "trai-cay", sortOrder: 2 },
    { name: "Lúa gạo & Ngũ cốc", slug: "lua-gao-ngu-coc", sortOrder: 3 },
    { name: "Thủy sản", slug: "thuy-san", sortOrder: 4 },
    { name: "Gia súc & Gia cầm", slug: "gia-suc-gia-cam", sortOrder: 5 },
    { name: "Cà phê & Chè", slug: "ca-phe-che", sortOrder: 6 },
    { name: "Gia vị & Thảo mộc", slug: "gia-vi-thao-moc", sortOrder: 7 },
    { name: "Hạt & Đậu", slug: "hat-dau", sortOrder: 8 },
    { name: "Mật ong & Đặc sản", slug: "mat-ong-dac-san", sortOrder: 9 },
    { name: "Hoa & Cây cảnh", slug: "hoa-cay-canh", sortOrder: 10 },
    {
      name: "Rau ăn lá",
      slug: "rau-an-la",
      parentSlug: "rau-cu-qua",
      sortOrder: 1,
    },
    { name: "Củ & Rễ", slug: "cu-re", parentSlug: "rau-cu-qua", sortOrder: 2 },
    {
      name: "Bầu bí & Dưa leo",
      slug: "bau-bi-dua-leo",
      parentSlug: "rau-cu-qua",
      sortOrder: 3,
    },
    {
      name: "Nấm các loại",
      slug: "nam-cac-loai",
      parentSlug: "rau-cu-qua",
      sortOrder: 4,
    },
    {
      name: "Trái cây nhiệt đới",
      slug: "trai-cay-nhiet-doi",
      parentSlug: "trai-cay",
      sortOrder: 1,
    },
    {
      name: "Trái cây có múi",
      slug: "trai-cay-co-mui",
      parentSlug: "trai-cay",
      sortOrder: 2,
    },
    {
      name: "Nho & Dâu",
      slug: "nho-dau",
      parentSlug: "trai-cay",
      sortOrder: 3,
    },
    {
      name: "Bơ & Sầu riêng",
      slug: "bo-sau-rieng",
      parentSlug: "trai-cay",
      sortOrder: 4,
    },
    {
      name: "Gạo các loại",
      slug: "gao-cac-loai",
      parentSlug: "lua-gao-ngu-coc",
      sortOrder: 1,
    },
    {
      name: "Ngô & Khoai",
      slug: "ngo-khoai",
      parentSlug: "lua-gao-ngu-coc",
      sortOrder: 2,
    },
    {
      name: "Đậu các loại",
      slug: "dau-cac-loai",
      parentSlug: "lua-gao-ngu-coc",
      sortOrder: 3,
    },
    {
      name: "Cá các loại",
      slug: "ca-cac-loai",
      parentSlug: "thuy-san",
      sortOrder: 1,
    },
    {
      name: "Tôm & Cua",
      slug: "tom-cua",
      parentSlug: "thuy-san",
      sortOrder: 2,
    },
    {
      name: "Hải sản khác",
      slug: "hai-san-khac",
      parentSlug: "thuy-san",
      sortOrder: 3,
    },
    {
      name: "Thịt heo & Bò",
      slug: "thit-heo-bo",
      parentSlug: "gia-suc-gia-cam",
      sortOrder: 1,
    },
    {
      name: "Thịt gà & Vịt",
      slug: "thit-ga-vit",
      parentSlug: "gia-suc-gia-cam",
      sortOrder: 2,
    },
    {
      name: "Trứng & Sữa",
      slug: "trung-sua",
      parentSlug: "gia-suc-gia-cam",
      sortOrder: 3,
    },
    {
      name: "Cà phê nhân & rang",
      slug: "ca-phe-nhan-rang",
      parentSlug: "ca-phe-che",
      sortOrder: 1,
    },
    {
      name: "Chè & Trà",
      slug: "che-tra",
      parentSlug: "ca-phe-che",
      sortOrder: 2,
    },
    {
      name: "Tiêu & Ớt",
      slug: "tieu-ot",
      parentSlug: "gia-vi-thao-moc",
      sortOrder: 1,
    },
    {
      name: "Gừng & Nghệ & Tỏi",
      slug: "gung-nghe-toi",
      parentSlug: "gia-vi-thao-moc",
      sortOrder: 2,
    },
    {
      name: "Hạt điều & Mắc ca",
      slug: "hat-dieu-mac-ca",
      parentSlug: "hat-dau",
      sortOrder: 1,
    },
    {
      name: "Đậu phộng & Mè",
      slug: "dau-phong-me",
      parentSlug: "hat-dau",
      sortOrder: 2,
    },
    {
      name: "Mật ong",
      slug: "mat-ong",
      parentSlug: "mat-ong-dac-san",
      sortOrder: 1,
    },
    {
      name: "Đặc sản vùng miền",
      slug: "dac-san-vung-mien",
      parentSlug: "mat-ong-dac-san",
      sortOrder: 2,
    },
    {
      name: "Hoa cắt cành",
      slug: "hoa-cat-canh",
      parentSlug: "hoa-cay-canh",
      sortOrder: 1,
    },
    {
      name: "Cây cảnh",
      slug: "cay-canh",
      parentSlug: "hoa-cay-canh",
      sortOrder: 2,
    },
  ];

export const PRODUCTS_CATEGORY_REFERENCE_SEED_METADATA: SeedGroupMetadata = {
  id: PRODUCTS_CATEGORY_REFERENCE_SEED_GROUP_ID,
  owner: "products",
  classification: SeedClassification.REFERENCE,
  dependencies: [],
  description: "Canonical product category hierarchy",
};

export interface ProductCategoryReferenceRecord {
  readonly id: string;
}

export interface ProductCategoryReferenceWriteData {
  readonly name: string;
  readonly slug: string;
  readonly sortOrder: number;
  readonly parentId: string | null;
  readonly isActive: boolean;
}

export type ProductCategoryReferenceMutableData = Omit<
  ProductCategoryReferenceWriteData,
  "slug"
>;

export interface ProductCategoryReferenceSeedWriter {
  findBySlug(slug: string): Promise<ProductCategoryReferenceRecord | null>;
  create(
    data: ProductCategoryReferenceWriteData,
  ): Promise<ProductCategoryReferenceRecord>;
  update(id: string, data: ProductCategoryReferenceMutableData): Promise<void>;
}

export async function reconcileProductCategoryReferences(
  writer: ProductCategoryReferenceSeedWriter,
  records: readonly ProductCategoryReferenceSeedData[] = productCategoryReferenceSeedData,
): Promise<readonly SeedOutputBinding[]> {
  const resolvedIds = new Map<string, string>();
  const outputs: SeedOutputBinding[] = [];

  for (const record of records) {
    const parentId = record.parentSlug
      ? resolvedIds.get(record.parentSlug)
      : null;
    if (record.parentSlug && !parentId) {
      throw new Error(
        `Product category ${record.slug} requires parent ${record.parentSlug} to be reconciled first`,
      );
    }

    const writeData: ProductCategoryReferenceWriteData = {
      name: record.name,
      slug: record.slug,
      sortOrder: record.sortOrder,
      parentId,
      isActive: true,
    };
    const existing = await writer.findBySlug(record.slug);
    let categoryId: string;
    if (existing) {
      const { slug: _immutableSlug, ...mutableData } = writeData;
      await writer.update(existing.id, mutableData);
      categoryId = existing.id;
    } else {
      categoryId = (await writer.create(writeData)).id;
    }
    resolvedIds.set(record.slug, categoryId);
    outputs.push({
      kind: CATEGORY_ID_BY_SLUG_OUTPUT_KIND,
      key: record.slug,
      value: categoryId,
    });
  }
  return outputs;
}

export class ProductsCategoryReferenceSeedGroup implements SeedGroup {
  readonly metadata = PRODUCTS_CATEGORY_REFERENCE_SEED_METADATA;

  constructor(private readonly writer: ProductCategoryReferenceSeedWriter) {}

  async execute(context: SeedExecutionContext): Promise<SeedGroupResult> {
    if (!context.classifications.includes(SeedClassification.REFERENCE)) {
      throw new Error(
        `${this.metadata.id} requires explicit REFERENCE selection`,
      );
    }

    const outputs = await reconcileProductCategoryReferences(this.writer);
    return { outputs };
  }
}

class TypeOrmProductCategoryReferenceSeedWriter implements ProductCategoryReferenceSeedWriter {
  constructor(private readonly repository: Repository<ProductCategory>) {}

  async findBySlug(
    slug: string,
  ): Promise<ProductCategoryReferenceRecord | null> {
    return this.repository.findOne({
      select: { id: true },
      where: { slug },
    });
  }

  async create(
    data: ProductCategoryReferenceWriteData,
  ): Promise<ProductCategoryReferenceRecord> {
    return this.repository.save(this.repository.create(data));
  }

  async update(
    id: string,
    data: ProductCategoryReferenceMutableData,
  ): Promise<void> {
    await this.repository.update(id, data);
  }
}

function createWriter(
  dataSource: DataSource,
): ProductCategoryReferenceSeedWriter {
  return new TypeOrmProductCategoryReferenceSeedWriter(
    dataSource.getRepository(ProductCategory),
  );
}

export function createProductsCategoryReferenceSeedGroup(
  dataSource: DataSource,
): SeedGroup {
  return new ProductsCategoryReferenceSeedGroup(createWriter(dataSource));
}

/**
 * Transitional P8-04 bridge for the existing Products DEV seed path.
 * Its orchestration moves to explicit SeedGroup selection in P8-07.
 */
export async function seedProductCategories(
  dataSource: DataSource,
): Promise<void> {
  await reconcileProductCategoryReferences(createWriter(dataSource));
}
