import { SupplierType } from "../../../../../common/enums";

export const PROFILE_VERIFICATION_READER = Symbol(
  "PROFILE_VERIFICATION_READER",
);
export const PROFILE_VERIFICATION_MANAGER = Symbol(
  "PROFILE_VERIFICATION_MANAGER",
);

export type ProfileType = "farmer" | "cooperative" | "enterprise" | "supplier";
export type ProfileVerificationStatus = "pending" | "approved" | "rejected";
export type PrivateProfileAssetType = "KYC_IDENTITY" | "BUSINESS_LICENSE";

export interface ProfileDocumentReference {
  fileId: string;
  assetType: PrivateProfileAssetType;
}

export interface FarmerVerificationProfile {
  id: string;
  userId: string | null;
  cccdNumber: string;
  cccdFrontFileId: string | null;
  cccdBackFileId: string | null;
  residenceAddress: string | null;
  ward: string | null;
  isKycVerified: boolean;
  verifiedBy: string | null;
  rejectionReason: string | null;
  provinceId: number | null;
  districtId: number | null;
  bio: string | null;
  farmName: string | null;
  experienceYears: number | null;
  trustScore: number;
  totalSales: number;
  verifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CooperativeVerificationProfile {
  id: string;
  userId: string | null;
  cooperativeName: string;
  businessLicenseNumber: string;
  taxCode: string;
  representativeName: string;
  representativePhone: string;
  representativeCccd: string;
  cooperativeCertFileId: string | null;
  businessLicenseFileId: string | null;
  representativeCccdFrontFileId: string | null;
  representativeCccdBackFileId: string | null;
  membersListFileId: string | null;
  address: string;
  provinceId: number | null;
  totalMembers: number;
  memberCount: number | null;
  isVerified: boolean;
  verifiedBy: string | null;
  verifiedAt: Date | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EnterpriseVerificationProfile {
  id: string;
  userId: string | null;
  companyName: string;
  taxCode: string;
  businessLicenseFileId: string | null;
  representativeName: string;
  representativePhone: string;
  address: string;
  provinceId: number | null;
  industry: string | null;
  isVerified: boolean;
  verifiedBy: string | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SupplierVerificationProfile {
  id: string;
  userId: string;
  companyName: string;
  taxCode: string | null;
  address: string | null;
  provinceId: number | null;
  supplierType: SupplierType;
  isVerified: boolean;
  businessLicenseFileId: string | null;
  verifiedBy: string | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PendingProfileQueue {
  farmer: FarmerVerificationProfile[];
  cooperative: CooperativeVerificationProfile[];
  enterprise: EnterpriseVerificationProfile[];
  supplier: SupplierVerificationProfile[];
}

export interface ProfileVerificationStats {
  farmer: number;
  cooperative: number;
  enterprise: number;
  supplier: number;
  total: number;
  certificationsThisMonth: number;
}

export interface ProfileOrganizationQueue {
  cooperatives: CooperativeVerificationProfile[];
  enterprises: EnterpriseVerificationProfile[];
}

export type VerificationProfile =
  | FarmerVerificationProfile
  | CooperativeVerificationProfile
  | EnterpriseVerificationProfile
  | SupplierVerificationProfile;

export interface ProfileVerificationTransitionInput {
  profileType: ProfileType;
  profileId: string;
  reviewerId: string;
  approve: boolean;
  rejectionReason?: string;
}

export interface ProfileVerificationTransition {
  profileType: ProfileType;
  profileId: string;
  reviewerId: string;
  beforeStatus: "pending";
  afterStatus: Exclude<ProfileVerificationStatus, "pending">;
  rejectionReason: string | null;
  transitionedAt: Date;
  documentReferences: ProfileDocumentReference[];
  profile: VerificationProfile;
}

export interface ProfileVerificationReader {
  getVerificationStats(monthStart: Date): Promise<ProfileVerificationStats>;
  listPendingVerificationProfiles(): Promise<PendingProfileQueue>;
  listOrganizations(): Promise<ProfileOrganizationQueue>;
}

export interface ProfileVerificationManager {
  transitionVerification(
    input: ProfileVerificationTransitionInput,
  ): Promise<ProfileVerificationTransition>;
  restorePendingVerification(
    transition: ProfileVerificationTransition,
  ): Promise<boolean>;
}
