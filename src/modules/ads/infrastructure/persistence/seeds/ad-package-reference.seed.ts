import { DataSource, Repository } from "typeorm";
import { AdType } from "../../../../../common/enums";
import {
  EMPTY_SEED_GROUP_RESULT,
  SeedClassification,
  SeedExecutionContext,
  SeedGroup,
  SeedGroupMetadata,
  SeedGroupResult,
} from "../../../../../database/seeds/framework/seed-contract";
import { AdPackage } from "../entities/ad-package.entity";

export const ADS_PACKAGE_REFERENCE_SEED_GROUP_ID =
  "ads.reference.packages";

export interface AdPackageReferenceSeedData {
  readonly packageCode: string;
  readonly name: string;
  readonly adType: AdType;
  readonly price: number;
  readonly durationDays: number;
  readonly maxImpressions: number;
  readonly description: string;
  readonly isActive: boolean;
}

export const adPackageReferenceSeedData: readonly AdPackageReferenceSeedData[] =
  [
    {
      packageCode: "HOMEPAGE_CAROUSEL",
      name: "Banner chính (Carousel)",
      adType: AdType.BANNER,
      price: 500000,
      durationDays: 30,
      maxImpressions: 10000,
      description: "Hiển thị trên carousel trang chủ",
      isActive: true,
    },
    {
      packageCode: "FEATURED_PRODUCT",
      name: "Sản phẩm nổi bật",
      adType: AdType.FEATURED,
      price: 300000,
      durationDays: 14,
      maxImpressions: 5000,
      description: "Sản phẩm được gắn nhãn nổi bật",
      isActive: true,
    },
    {
      packageCode: "SPOTLIGHT_PLACEMENT",
      name: "Spotlight tuần",
      adType: AdType.SPOTLIGHT,
      price: 700000,
      durationDays: 7,
      maxImpressions: 20000,
      description: "Hiển thị spotlight nổi bật 7 ngày",
      isActive: true,
    },
  ];

export const ADS_PACKAGE_REFERENCE_SEED_METADATA: SeedGroupMetadata = {
  id: ADS_PACKAGE_REFERENCE_SEED_GROUP_ID,
  owner: "ads",
  classification: SeedClassification.REFERENCE,
  dependencies: [],
  description: "Canonical advertising Package reference catalog",
};

export interface AdPackageReferenceRecord {
  readonly id: number;
  readonly packageCode: string;
}

export type AdPackageReferenceMutableData = Omit<
  AdPackageReferenceSeedData,
  "packageCode"
>;

export interface AdPackageReferenceSeedWriter {
  findByPackageCode(
    packageCode: string,
  ): Promise<readonly AdPackageReferenceRecord[]>;
  create(data: AdPackageReferenceSeedData): Promise<AdPackageReferenceRecord>;
  update(id: number, data: AdPackageReferenceMutableData): Promise<void>;
}

export async function reconcileAdPackageReferences(
  writer: AdPackageReferenceSeedWriter,
  records: readonly AdPackageReferenceSeedData[] = adPackageReferenceSeedData,
): Promise<void> {
  for (const record of records) {
    const matches = await writer.findByPackageCode(record.packageCode);
    if (matches.length > 1) {
      throw new Error(
        `AMBIGUOUS_AD_PACKAGE_REFERENCE_IDENTITY:${record.packageCode}`,
      );
    }

    const { packageCode, ...mutableData } = record;
    if (matches.length === 0) {
      await writer.create({ packageCode, ...mutableData });
    } else {
      await writer.update(matches[0].id, mutableData);
    }
  }
}

export class AdsPackageReferenceSeedGroup implements SeedGroup {
  readonly metadata = ADS_PACKAGE_REFERENCE_SEED_METADATA;

  constructor(private readonly writer: AdPackageReferenceSeedWriter) {}

  async execute(context: SeedExecutionContext): Promise<SeedGroupResult> {
    if (!context.classifications.includes(SeedClassification.REFERENCE)) {
      throw new Error(
        `${this.metadata.id} requires explicit REFERENCE selection`,
      );
    }

    await reconcileAdPackageReferences(this.writer);
    return EMPTY_SEED_GROUP_RESULT;
  }
}

class TypeOrmAdPackageReferenceSeedWriter implements AdPackageReferenceSeedWriter {
  constructor(private readonly repository: Repository<AdPackage>) {}

  async findByPackageCode(
    packageCode: string,
  ): Promise<readonly AdPackageReferenceRecord[]> {
    return this.repository.find({
      select: { id: true, packageCode: true },
      where: { packageCode },
      take: 2,
    });
  }

  async create(
    data: AdPackageReferenceSeedData,
  ): Promise<AdPackageReferenceRecord> {
    return this.repository.save(this.repository.create(data));
  }

  async update(
    id: number,
    data: AdPackageReferenceMutableData,
  ): Promise<void> {
    await this.repository.update(id, data);
  }
}

export function createAdsPackageReferenceSeedGroup(
  dataSource: DataSource,
): SeedGroup {
  return new AdsPackageReferenceSeedGroup(
    new TypeOrmAdPackageReferenceSeedWriter(
      dataSource.getRepository(AdPackage),
    ),
  );
}
