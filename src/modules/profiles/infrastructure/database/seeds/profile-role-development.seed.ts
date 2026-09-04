import { SupplierType } from "../../../../../common/enums";
import {
  EMPTY_SEED_GROUP_RESULT,
  SeedClassification,
  SeedExecutionContext,
  SeedGroup,
  SeedGroupMetadata,
  SeedGroupResult,
} from "../../../../../database/seeds/framework/seed-contract";
import {
  USER_ID_BY_EMAIL_OUTPUT_KIND,
  USERS_DEV_SEED_GROUP_ID,
} from "../../../../users/application/contracts/user-seed-output.contract";

export const PROFILES_ROLE_PROFILES_DEV_SEED_GROUP_ID =
  "profiles.dev.role-profiles";

export const PROFILE_DEV_USER_EMAILS = Object.freeze({
  farmer: Object.freeze([
    "farmer@sandbox.com",
    "hung.nv@farm.vn",
    "mai.lt@farm.vn",
    "tuan.pq@farm.vn",
  ]),
  cooperative: Object.freeze([
    "cooperative@sandbox.com",
    "htx.dalat@coop.vn",
    "htx.tiengiang@coop.vn",
  ]),
  enterprise: Object.freeze([
    "enterprise@agrilink.vn",
    "xnk.mekong@ent.vn",
    "agri.tech@ent.vn",
  ]),
  supplier: Object.freeze(["supplier@agrilink.vn", "phanbon.xanh@sup.vn"]),
});

export const ADMIN_DEV_PROFILE_USER_EMAILS = Object.freeze([
  "hung.nv@farm.vn",
  "mai.lt@farm.vn",
  "tuan.pq@farm.vn",
  "htx.dalat@coop.vn",
  "htx.tiengiang@coop.vn",
  "xnk.mekong@ent.vn",
  "agri.tech@ent.vn",
  "phanbon.xanh@sup.vn",
]);

export const PROFILES_ROLE_PROFILES_DEV_SEED_METADATA: SeedGroupMetadata = {
  id: PROFILES_ROLE_PROFILES_DEV_SEED_GROUP_ID,
  owner: "profiles",
  classification: SeedClassification.DEV,
  dependencies: [USERS_DEV_SEED_GROUP_ID],
  description: "Canonical development role profiles",
};

export interface ProfileDevRecord {
  readonly id: string;
}

export interface FarmerProfileDevWriteData {
  readonly userId: string;
  readonly cccdNumber: string;
  readonly cccdFrontUrl: string;
  readonly cccdBackUrl: string;
  readonly residenceAddress: string;
  readonly ward: string;
  readonly isKycVerified: boolean;
  readonly verifiedAt?: Date | null;
  readonly bio?: string | null;
  readonly trustScore?: number;
  readonly totalSales?: number;
  readonly provinceId: number;
  readonly districtId: number | null;
}

export type FarmerProfileDevMutableData = Omit<
  FarmerProfileDevWriteData,
  "userId" | "cccdNumber" | "verifiedAt"
>;

export interface CooperativeProfileDevWriteData {
  readonly userId: string;
  readonly cooperativeName: string;
  readonly businessLicenseNumber: string;
  readonly taxCode: string;
  readonly cooperativeCertUrl: string;
  readonly businessLicenseUrl?: string | null;
  readonly representativeName: string;
  readonly representativePhone: string;
  readonly representativeCccd: string;
  readonly representativeCccdFrontUrl?: string | null;
  readonly representativeCccdBackUrl?: string | null;
  readonly membersListUrl?: string | null;
  readonly address: string;
  readonly provinceId: number;
  readonly totalMembers?: number;
  readonly isVerified: boolean;
  readonly verifiedBy?: null;
  readonly verifiedAt?: Date | null;
}

export type CooperativeProfileDevMutableData = Omit<
  CooperativeProfileDevWriteData,
  "userId" | "businessLicenseNumber" | "taxCode" | "verifiedAt"
>;

export interface EnterpriseProfileDevWriteData {
  readonly userId: string;
  readonly companyName: string;
  readonly taxCode: string;
  readonly businessLicenseUrl: string;
  readonly representativeName: string;
  readonly representativePhone: string;
  readonly address: string;
  readonly provinceId: number;
  readonly industry?: string | null;
  readonly isVerified: boolean;
}

export type EnterpriseProfileDevMutableData = Omit<
  EnterpriseProfileDevWriteData,
  "userId" | "taxCode"
>;

export interface SupplierProfileDevWriteData {
  readonly userId: string;
  readonly companyName: string;
  readonly taxCode: string;
  readonly address: string;
  readonly provinceId: number;
  readonly supplierType: SupplierType;
  readonly isVerified: boolean;
  readonly businessLicenseUrl: string;
  readonly verifiedBy?: null;
}

export type SupplierProfileDevMutableData = Omit<
  SupplierProfileDevWriteData,
  "userId"
>;

export interface ProfileRoleDevSeedData {
  readonly farmer: readonly FarmerProfileDevWriteData[];
  readonly cooperative: readonly CooperativeProfileDevWriteData[];
  readonly enterprise: readonly EnterpriseProfileDevWriteData[];
  readonly supplier: readonly SupplierProfileDevWriteData[];
}

export interface ProfileRoleDevSeedWriter {
  findFarmerByUserId(userId: string): Promise<ProfileDevRecord | null>;
  findFarmerByCccd(cccdNumber: string): Promise<ProfileDevRecord | null>;
  createFarmer(data: FarmerProfileDevWriteData): Promise<void>;
  updateFarmer(id: string, data: FarmerProfileDevMutableData): Promise<void>;

  findCooperativeByUserId(userId: string): Promise<ProfileDevRecord | null>;
  findCooperativeByBusinessLicense(
    businessLicenseNumber: string,
  ): Promise<ProfileDevRecord | null>;
  findCooperativeByTaxCode(taxCode: string): Promise<ProfileDevRecord | null>;
  createCooperative(data: CooperativeProfileDevWriteData): Promise<void>;
  updateCooperative(
    id: string,
    data: CooperativeProfileDevMutableData,
  ): Promise<void>;

  findEnterpriseByUserId(userId: string): Promise<ProfileDevRecord | null>;
  findEnterpriseByTaxCode(taxCode: string): Promise<ProfileDevRecord | null>;
  createEnterprise(data: EnterpriseProfileDevWriteData): Promise<void>;
  updateEnterprise(
    id: string,
    data: EnterpriseProfileDevMutableData,
  ): Promise<void>;

  findSupplierByUserId(userId: string): Promise<ProfileDevRecord | null>;
  createSupplier(data: SupplierProfileDevWriteData): Promise<void>;
  updateSupplier(
    id: string,
    data: SupplierProfileDevMutableData,
  ): Promise<void>;
}

function requireUserId(context: SeedExecutionContext, email: string): string {
  return context.dependencies.requireString(
    USERS_DEV_SEED_GROUP_ID,
    USER_ID_BY_EMAIL_OUTPUT_KIND,
    email,
  );
}

export function buildProfileRoleDevSeedData(
  context: SeedExecutionContext,
  verifiedAt: Date = new Date(),
): ProfileRoleDevSeedData {
  return {
    farmer: [
      {
        userId: requireUserId(context, PROFILE_DEV_USER_EMAILS.farmer[0]),
        cccdNumber: "079201012345",
        cccdFrontUrl:
          "https://placehold.co/600x400/E8F5E9/2E7D32?text=CCCD+Mat+truoc",
        cccdBackUrl:
          "https://placehold.co/600x400/E8F5E9/2E7D32?text=CCCD+Mat+sau",
        residenceAddress: "Thôn 3, xã Lạc Dương, Lâm Đồng",
        ward: "Lạc Dương",
        isKycVerified: true,
        verifiedAt,
        bio: "Nông dân sản xuất rau củ hữu cơ tại Lâm Đồng với hơn 10 năm kinh nghiệm. Diện tích canh tác 5ha.",
        trustScore: 4.8,
        totalSales: 156,
        provinceId: 2,
        districtId: null,
      },
      {
        userId: requireUserId(context, PROFILE_DEV_USER_EMAILS.farmer[1]),
        cccdNumber: "079202012345",
        cccdFrontUrl:
          "https://res.cloudinary.com/personal-media/image/upload/agrilink/profiles/cccd-front-hung.jpg",
        cccdBackUrl:
          "https://res.cloudinary.com/personal-media/image/upload/agrilink/profiles/cccd-back-hung.jpg",
        residenceAddress: "Ấp Bắc, xã Hòa Hưng, huyện Cái Bè",
        ward: "Xã Hòa Hưng",
        provinceId: 1,
        districtId: 101,
        isKycVerified: false,
      },
      {
        userId: requireUserId(context, PROFILE_DEV_USER_EMAILS.farmer[2]),
        cccdNumber: "079202154321",
        cccdFrontUrl:
          "https://res.cloudinary.com/personal-media/image/upload/agrilink/profiles/cccd-front-mai.jpg",
        cccdBackUrl:
          "https://res.cloudinary.com/personal-media/image/upload/agrilink/profiles/cccd-back-mai.jpg",
        residenceAddress: "Thôn 3, xã Lộc An, TP Bảo Lộc",
        ward: "Xã Lộc An",
        provinceId: 2,
        districtId: 201,
        isKycVerified: false,
      },
      {
        userId: requireUserId(context, PROFILE_DEV_USER_EMAILS.farmer[3]),
        cccdNumber: "079202198765",
        cccdFrontUrl:
          "https://res.cloudinary.com/personal-media/image/upload/agrilink/profiles/cccd-front-tuan.jpg",
        cccdBackUrl:
          "https://res.cloudinary.com/personal-media/image/upload/agrilink/profiles/cccd-back-tuan.jpg",
        residenceAddress: "Xóm 5, xã Hải Hậu, huyện Hải Hậu",
        ward: "Xã Hải Hậu",
        provinceId: 3,
        districtId: 301,
        isKycVerified: false,
      },
    ],
    cooperative: [
      {
        userId: requireUserId(context, PROFILE_DEV_USER_EMAILS.cooperative[0]),
        cooperativeName: "HTX Nông nghiệp Xanh Tiền Giang",
        businessLicenseNumber: "1801234567",
        taxCode: "1801234567",
        cooperativeCertUrl:
          "https://placehold.co/600x400/FFF3E0/E65100?text=Giay+phep+HTX",
        businessLicenseUrl:
          "https://placehold.co/600x400/FFF3E0/E65100?text=DKKD+HTX",
        representativeName: "Nguyễn Văn Xanh",
        representativePhone: "+84902372975",
        representativeCccd: "079201098765",
        representativeCccdFrontUrl:
          "https://placehold.co/600x400/E3F2FD/1565C0?text=CCCD+Mat+truoc",
        representativeCccdBackUrl:
          "https://placehold.co/600x400/E3F2FD/1565C0?text=CCCD+Mat+sau",
        membersListUrl:
          "https://placehold.co/800x600/F5F5F5/424242?text=Danh+sach+thanh+vien",
        address: "Ấp Mỹ Hòa, xã Mỹ Phong, Tiền Giang",
        provinceId: 22,
        totalMembers: 45,
        isVerified: true,
        verifiedBy: null,
        verifiedAt,
      },
      {
        userId: requireUserId(context, PROFILE_DEV_USER_EMAILS.cooperative[1]),
        cooperativeName: "HTX Rau Sạch Đà Lạt",
        businessLicenseNumber: "GPKD-68H8-001",
        taxCode: "5800123456",
        cooperativeCertUrl:
          "https://res.cloudinary.com/personal-media/image/upload/agrilink/profiles/gpkd-dalat.jpg",
        representativeName: "Trần Văn Minh",
        representativePhone: "0988123456",
        representativeCccd: "068202012345",
        address: "45 Nguyễn Văn Cừ, Phường 1, TP Đà Lạt, Lâm Đồng",
        provinceId: 2,
        isVerified: false,
      },
      {
        userId: requireUserId(context, PROFILE_DEV_USER_EMAILS.cooperative[2]),
        cooperativeName: "HTX Trái Cây Tiền Giang",
        businessLicenseNumber: "GPKD-82T5-002",
        taxCode: "1200987654",
        cooperativeCertUrl:
          "https://res.cloudinary.com/personal-media/image/upload/agrilink/profiles/gpkd-tiengiang.jpg",
        representativeName: "Phạm Thị Lan",
        representativePhone: "0988123457",
        representativeCccd: "082202065432",
        address: "12 Lê Lợi, Phường 4, TP Mỹ Tho, Tiền Giang",
        provinceId: 1,
        isVerified: false,
      },
    ],
    enterprise: [
      {
        userId: requireUserId(context, PROFILE_DEV_USER_EMAILS.enterprise[0]),
        companyName: "Doanh nghiệp Nông sản Việt",
        taxCode: "0101234568",
        businessLicenseUrl:
          "https://placehold.co/600x400/E8F5E9/2E7D32?text=DKKD+Doanh+nghiep",
        representativeName: "Trần Văn Doanh",
        representativePhone: "+84902136212",
        address: "Lô B4, Khu CN Thăng Long, Hà Nội",
        provinceId: 1,
        industry: "Chế biến nông sản",
        isVerified: true,
      },
      {
        userId: requireUserId(context, PROFILE_DEV_USER_EMAILS.enterprise[1]),
        companyName: "Công ty TNHH XNK Nông Sản Mekong",
        taxCode: "0312345678",
        businessLicenseUrl:
          "https://res.cloudinary.com/personal-media/image/upload/agrilink/profiles/gpkd-mekong.jpg",
        representativeName: "Nguyễn Hoàng Nam",
        representativePhone: "0977123456",
        address: "88 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP Hồ Chí Minh",
        provinceId: 3,
        isVerified: false,
      },
      {
        userId: requireUserId(context, PROFILE_DEV_USER_EMAILS.enterprise[2]),
        companyName: "Công ty CP Công Nghệ Nông Nghiệp Xanh",
        taxCode: "0102765432",
        businessLicenseUrl:
          "https://res.cloudinary.com/personal-media/image/upload/agrilink/profiles/gpkd-agritech.jpg",
        representativeName: "Đỗ Thanh Hà",
        representativePhone: "0977123457",
        address: "Tầng 5, Tòa nhà TechnoPark, Cầu Giấy, Hà Nội",
        provinceId: 3,
        isVerified: false,
      },
    ],
    supplier: [
      {
        userId: requireUserId(context, PROFILE_DEV_USER_EMAILS.supplier[0]),
        companyName: "Nhà cung cấp Vật tư An Dân",
        taxCode: "4701234569",
        address: "KM5, Quốc lộ 14, Buôn Ma Thuột",
        provinceId: 10,
        supplierType: SupplierType.MIXED,
        isVerified: true,
        businessLicenseUrl:
          "https://placehold.co/600x400/FFF3E0/E65100?text=DKKD+NCC",
        verifiedBy: null,
      },
      {
        userId: requireUserId(context, PROFILE_DEV_USER_EMAILS.supplier[1]),
        companyName: "Công ty TNHH Phân Bón Xanh Việt",
        supplierType: SupplierType.FERTILIZER,
        taxCode: "0302123456",
        businessLicenseUrl:
          "https://res.cloudinary.com/personal-media/image/upload/agrilink/profiles/gpkd-phanbon.jpg",
        address: "KCN Tân Tạo, Bình Tân, TP Hồ Chí Minh",
        provinceId: 3,
        isVerified: false,
      },
    ],
  };
}

function resolveOneIdentity(
  profile: string,
  matches: readonly (ProfileDevRecord | null)[],
): ProfileDevRecord | null {
  const existing = matches.filter(
    (match): match is ProfileDevRecord => match !== null,
  );
  const ids = new Set(existing.map(({ id }) => id));
  if (ids.size > 1) {
    throw new Error(
      `profiles.dev.role-profiles identity conflict for ${profile}: unique keys resolve to different rows`,
    );
  }
  if (existing.length > 0 && existing.length !== matches.length) {
    throw new Error(
      `profiles.dev.role-profiles partial identity conflict for ${profile}: all unique keys must resolve together`,
    );
  }
  return existing[0] ?? null;
}

interface ProfileReconciliation<T> {
  readonly data: T;
  readonly existing: ProfileDevRecord | null;
}

function assertUniqueDeclaredValues(
  identity: string,
  values: readonly string[],
): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      throw new Error(
        `profiles.dev.role-profiles duplicate declared ${identity} ${value}`,
      );
    }
    seen.add(value);
  }
}

function assertDistinctExistingRows<T>(
  profile: string,
  plans: readonly ProfileReconciliation<T>[],
): void {
  const claimed = new Set<string>();
  for (const { existing } of plans) {
    if (!existing) continue;
    if (claimed.has(existing.id)) {
      throw new Error(
        `profiles.dev.role-profiles identity conflict for ${profile}: multiple fixtures resolve to row ${existing.id}`,
      );
    }
    claimed.add(existing.id);
  }
}

export async function reconcileProfileRoleDevSeeds(
  writer: ProfileRoleDevSeedWriter,
  data: ProfileRoleDevSeedData,
): Promise<void> {
  assertUniqueDeclaredValues("User ID", [
    ...data.farmer.map(({ userId }) => userId),
    ...data.cooperative.map(({ userId }) => userId),
    ...data.enterprise.map(({ userId }) => userId),
    ...data.supplier.map(({ userId }) => userId),
  ]);
  assertUniqueDeclaredValues(
    "Farmer CCCD",
    data.farmer.map(({ cccdNumber }) => cccdNumber),
  );
  assertUniqueDeclaredValues(
    "Cooperative business license",
    data.cooperative.map(({ businessLicenseNumber }) => businessLicenseNumber),
  );
  assertUniqueDeclaredValues(
    "Cooperative tax code",
    data.cooperative.map(({ taxCode }) => taxCode),
  );
  assertUniqueDeclaredValues(
    "Enterprise tax code",
    data.enterprise.map(({ taxCode }) => taxCode),
  );

  const [
    farmerMatches,
    cooperativeMatches,
    enterpriseMatches,
    supplierMatches,
  ] = await Promise.all([
    Promise.all(
      data.farmer.map(async (profile) => {
        const [byUser, byCccd] = await Promise.all([
          writer.findFarmerByUserId(profile.userId),
          writer.findFarmerByCccd(profile.cccdNumber),
        ]);
        return { profile, matches: [byUser, byCccd] as const };
      }),
    ),
    Promise.all(
      data.cooperative.map(async (profile) => {
        const [byUser, byLicense, byTaxCode] = await Promise.all([
          writer.findCooperativeByUserId(profile.userId),
          writer.findCooperativeByBusinessLicense(
            profile.businessLicenseNumber,
          ),
          writer.findCooperativeByTaxCode(profile.taxCode),
        ]);
        return {
          profile,
          matches: [byUser, byLicense, byTaxCode] as const,
        };
      }),
    ),
    Promise.all(
      data.enterprise.map(async (profile) => {
        const [byUser, byTaxCode] = await Promise.all([
          writer.findEnterpriseByUserId(profile.userId),
          writer.findEnterpriseByTaxCode(profile.taxCode),
        ]);
        return { profile, matches: [byUser, byTaxCode] as const };
      }),
    ),
    Promise.all(
      data.supplier.map(async (profile) => ({
        profile,
        existing: await writer.findSupplierByUserId(profile.userId),
      })),
    ),
  ]);

  // Resolve every schema-backed identity before the first write so a split
  // identity in any of the twelve fixtures cannot leave partial D2 state.
  const farmers = farmerMatches.map(({ profile, matches }) => ({
    data: profile,
    existing: resolveOneIdentity(`farmer:${profile.cccdNumber}`, matches),
  }));
  const cooperatives = cooperativeMatches.map(({ profile, matches }) => ({
    data: profile,
    existing: resolveOneIdentity(
      `cooperative:${profile.businessLicenseNumber}`,
      matches,
    ),
  }));
  const enterprises = enterpriseMatches.map(({ profile, matches }) => ({
    data: profile,
    existing: resolveOneIdentity(`enterprise:${profile.taxCode}`, matches),
  }));
  const suppliers = supplierMatches.map(({ profile, existing }) => ({
    data: profile,
    existing,
  }));

  assertDistinctExistingRows("farmer", farmers);
  assertDistinctExistingRows("cooperative", cooperatives);
  assertDistinctExistingRows("enterprise", enterprises);
  assertDistinctExistingRows("supplier", suppliers);

  for (const { data: profile, existing } of farmers) {
    if (existing) {
      const {
        userId: _immutableUserId,
        cccdNumber: _immutableCccd,
        verifiedAt: _createOnlyVerifiedAt,
        ...mutableData
      } = profile;
      await writer.updateFarmer(existing.id, mutableData);
    } else await writer.createFarmer(profile);
  }
  for (const { data: profile, existing } of cooperatives) {
    if (existing) {
      const {
        userId: _immutableUserId,
        businessLicenseNumber: _immutableLicense,
        taxCode: _immutableTaxCode,
        verifiedAt: _createOnlyVerifiedAt,
        ...mutableData
      } = profile;
      await writer.updateCooperative(existing.id, mutableData);
    } else await writer.createCooperative(profile);
  }
  for (const { data: profile, existing } of enterprises) {
    if (existing) {
      const {
        userId: _immutableUserId,
        taxCode: _immutableTaxCode,
        ...mutableData
      } = profile;
      await writer.updateEnterprise(existing.id, mutableData);
    } else await writer.createEnterprise(profile);
  }
  for (const { data: profile, existing } of suppliers) {
    if (existing) {
      const { userId: _immutableUserId, ...mutableData } = profile;
      await writer.updateSupplier(existing.id, mutableData);
    } else await writer.createSupplier(profile);
  }
}
export class ProfilesRoleProfilesDevSeedGroup implements SeedGroup {
  readonly metadata = PROFILES_ROLE_PROFILES_DEV_SEED_METADATA;

  constructor(private readonly writer: ProfileRoleDevSeedWriter) {}

  async execute(context: SeedExecutionContext): Promise<SeedGroupResult> {
    if (!context.classifications.includes(SeedClassification.DEV)) {
      throw new Error(`${this.metadata.id} requires explicit DEV selection`);
    }
    await reconcileProfileRoleDevSeeds(
      this.writer,
      buildProfileRoleDevSeedData(context),
    );
    return EMPTY_SEED_GROUP_RESULT;
  }
}
