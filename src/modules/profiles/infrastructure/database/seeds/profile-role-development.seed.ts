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
  farmer: "farmer@sandbox.com",
  cooperative: "cooperative@sandbox.com",
  enterprise: "enterprise@agrilink.vn",
  supplier: "supplier@agrilink.vn",
});

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
  readonly verifiedAt: Date;
  readonly bio: string;
  readonly trustScore: number;
  readonly totalSales: number;
  readonly provinceId: number;
  readonly districtId: null;
}

export interface CooperativeProfileDevWriteData {
  readonly userId: string;
  readonly cooperativeName: string;
  readonly businessLicenseNumber: string;
  readonly taxCode: string;
  readonly cooperativeCertUrl: string;
  readonly businessLicenseUrl: string;
  readonly representativeName: string;
  readonly representativePhone: string;
  readonly representativeCccd: string;
  readonly representativeCccdFrontUrl: string;
  readonly representativeCccdBackUrl: string;
  readonly membersListUrl: string;
  readonly address: string;
  readonly provinceId: number;
  readonly totalMembers: number;
  readonly isVerified: boolean;
  readonly verifiedBy: null;
  readonly verifiedAt: Date;
}

export interface EnterpriseProfileDevWriteData {
  readonly userId: string;
  readonly companyName: string;
  readonly taxCode: string;
  readonly businessLicenseUrl: string;
  readonly representativeName: string;
  readonly representativePhone: string;
  readonly address: string;
  readonly provinceId: number;
  readonly industry: string;
  readonly isVerified: boolean;
}

export interface SupplierProfileDevWriteData {
  readonly userId: string;
  readonly companyName: string;
  readonly taxCode: string;
  readonly address: string;
  readonly provinceId: number;
  readonly supplierType: SupplierType;
  readonly isVerified: boolean;
  readonly businessLicenseUrl: string;
  readonly verifiedBy: null;
}

export interface ProfileRoleDevSeedData {
  readonly farmer: FarmerProfileDevWriteData;
  readonly cooperative: CooperativeProfileDevWriteData;
  readonly enterprise: EnterpriseProfileDevWriteData;
  readonly supplier: SupplierProfileDevWriteData;
}

export interface ProfileRoleDevSeedWriter {
  findFarmerByUserId(userId: string): Promise<ProfileDevRecord | null>;
  findFarmerByCccd(cccdNumber: string): Promise<ProfileDevRecord | null>;
  createFarmer(data: FarmerProfileDevWriteData): Promise<void>;
  updateFarmer(id: string, data: FarmerProfileDevWriteData): Promise<void>;

  findCooperativeByUserId(userId: string): Promise<ProfileDevRecord | null>;
  findCooperativeByBusinessLicense(
    businessLicenseNumber: string,
  ): Promise<ProfileDevRecord | null>;
  findCooperativeByTaxCode(taxCode: string): Promise<ProfileDevRecord | null>;
  createCooperative(data: CooperativeProfileDevWriteData): Promise<void>;
  updateCooperative(
    id: string,
    data: CooperativeProfileDevWriteData,
  ): Promise<void>;

  findEnterpriseByUserId(userId: string): Promise<ProfileDevRecord | null>;
  findEnterpriseByTaxCode(taxCode: string): Promise<ProfileDevRecord | null>;
  createEnterprise(data: EnterpriseProfileDevWriteData): Promise<void>;
  updateEnterprise(
    id: string,
    data: EnterpriseProfileDevWriteData,
  ): Promise<void>;

  findSupplierByUserId(userId: string): Promise<ProfileDevRecord | null>;
  createSupplier(data: SupplierProfileDevWriteData): Promise<void>;
  updateSupplier(id: string, data: SupplierProfileDevWriteData): Promise<void>;
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
    farmer: {
      userId: requireUserId(context, PROFILE_DEV_USER_EMAILS.farmer),
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
    cooperative: {
      userId: requireUserId(context, PROFILE_DEV_USER_EMAILS.cooperative),
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
    enterprise: {
      userId: requireUserId(context, PROFILE_DEV_USER_EMAILS.enterprise),
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
    supplier: {
      userId: requireUserId(context, PROFILE_DEV_USER_EMAILS.supplier),
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
  return existing[0] ?? null;
}

export async function reconcileProfileRoleDevSeeds(
  writer: ProfileRoleDevSeedWriter,
  data: ProfileRoleDevSeedData,
): Promise<void> {
  const [
    farmerByUser,
    farmerByCccd,
    cooperativeByUser,
    cooperativeByLicense,
    cooperativeByTaxCode,
    enterpriseByUser,
    enterpriseByTaxCode,
    supplierByUser,
  ] = await Promise.all([
    writer.findFarmerByUserId(data.farmer.userId),
    writer.findFarmerByCccd(data.farmer.cccdNumber),
    writer.findCooperativeByUserId(data.cooperative.userId),
    writer.findCooperativeByBusinessLicense(
      data.cooperative.businessLicenseNumber,
    ),
    writer.findCooperativeByTaxCode(data.cooperative.taxCode),
    writer.findEnterpriseByUserId(data.enterprise.userId),
    writer.findEnterpriseByTaxCode(data.enterprise.taxCode),
    writer.findSupplierByUserId(data.supplier.userId),
  ]);

  // Preflight all schema-backed identities before the first write so a split
  // unique key cannot leave this group partially reconciled.
  const farmer = resolveOneIdentity("farmer", [farmerByUser, farmerByCccd]);
  const cooperative = resolveOneIdentity("cooperative", [
    cooperativeByUser,
    cooperativeByLicense,
    cooperativeByTaxCode,
  ]);
  const enterprise = resolveOneIdentity("enterprise", [
    enterpriseByUser,
    enterpriseByTaxCode,
  ]);

  if (farmer) await writer.updateFarmer(farmer.id, data.farmer);
  else await writer.createFarmer(data.farmer);
  if (cooperative)
    await writer.updateCooperative(cooperative.id, data.cooperative);
  else await writer.createCooperative(data.cooperative);
  if (enterprise) await writer.updateEnterprise(enterprise.id, data.enterprise);
  else await writer.createEnterprise(data.enterprise);
  if (supplierByUser)
    await writer.updateSupplier(supplierByUser.id, data.supplier);
  else await writer.createSupplier(data.supplier);
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
