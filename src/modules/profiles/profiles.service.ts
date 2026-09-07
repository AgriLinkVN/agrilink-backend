import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { randomUUID } from "crypto";
import { IsNull, MoreThanOrEqual, Repository } from "typeorm";
import { FarmerProfile } from "./infrastructure/persistence/entities/farmer-profile.entity";
import { CooperativeProfile } from "./infrastructure/persistence/entities/cooperative-profile.entity";
import { EnterpriseProfile } from "./infrastructure/persistence/entities/enterprise-profile.entity";
import { SupplierProfile } from "./infrastructure/persistence/entities/supplier-profile.entity";
import { UpsertFarmerProfileDto } from "./dto/upsert-farmer-profile.dto";
import { UpsertB2bProfileDto } from "./dto/upsert-b2b-profile.dto";
import {
  KYC_VISION,
  KycVisionPort,
} from "./application/ports/outbound/kyc-vision.port";
import { UserRole } from "../../common/enums";
import {
  STORED_FILE_ACCESS,
  StoredFileAccessPort,
} from "../storage/application/ports/inbound/stored-file-access.port";
import {
  InvalidStoredFileTransitionError,
  StoredFileNotFoundError,
} from "../storage/application/storage-file.errors";
import {
  InvalidProfileTypeError,
  ProfileNotFoundError,
  ProfileRejectionReasonRequiredError,
  ProfileVerificationConflictError,
} from "./application/errors/profile-verification.errors";
import {
  CooperativeVerificationProfile,
  EnterpriseVerificationProfile,
  FarmerVerificationProfile,
  PendingProfileQueue,
  ProfileDocumentReference,
  ProfileOrganizationQueue,
  ProfileVerificationManager,
  ProfileVerificationReader,
  ProfileVerificationStats,
  ProfileVerificationTransition,
  ProfileVerificationTransitionInput,
  SupplierVerificationProfile,
} from "./application/ports/inbound/profile-verification.port";

type PrivateAssetType = "KYC_IDENTITY" | "BUSINESS_LICENSE" | "CERTIFICATION";

interface ProfileFileChange {
  fileId: string;
  previousFileId: string | null;
  assetType: PrivateAssetType;
}

class PrivateDocumentConsistencyError extends Error {}

function isInvalidPrivateDocument(error: unknown): boolean {
  return (
    error instanceof StoredFileNotFoundError ||
    error instanceof InvalidStoredFileTransitionError
  );
}

@Injectable()
export class ProfilesService
  implements ProfileVerificationReader, ProfileVerificationManager
{
  constructor(
    @InjectRepository(FarmerProfile)
    private readonly farmerRepo: Repository<FarmerProfile>,
    @InjectRepository(CooperativeProfile)
    private readonly cooperativeRepo: Repository<CooperativeProfile>,
    @InjectRepository(EnterpriseProfile)
    private readonly enterpriseRepo: Repository<EnterpriseProfile>,
    @InjectRepository(SupplierProfile)
    private readonly supplierRepo: Repository<SupplierProfile>,
    @Inject(KYC_VISION) private readonly fptVisionService: KycVisionPort,
    @Inject(STORED_FILE_ACCESS)
    private readonly storedFileAccess: StoredFileAccessPort,
  ) {}

  async getPublicFarmerProfile(userId: string) {
    const profile = await this.farmerRepo.findOne({
      where: { userId },
    });
    if (!profile) return null;
    return {
      id: profile.id,
      userId,
      farmName: profile.farmName,
      farmAreaHectares: null,
      farmingType: null,
      region: null,
      provinceId: profile.provinceId,
      districtId: profile.districtId,
      address: profile.residenceAddress,
      bio: profile.bio,
      experienceYears: profile.experienceYears,
      isKycVerified: profile.isKycVerified,
      trustScore: Number(profile.trustScore),
      totalSales: profile.totalSales,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }

  async upsertFarmerProfile(
    userId: string,
    dto: UpsertFarmerProfileDto,
  ): Promise<FarmerProfile> {
    const [frontBytes] = await Promise.all([
      this.readOwnedPrivateFile(dto.cccdFrontFileId, userId, "KYC_IDENTITY"),
      this.readOwnedPrivateFile(dto.cccdBackFileId, userId, "KYC_IDENTITY"),
    ]);
    const isVisionValid =
      await this.fptVisionService.verifyCccdImage(frontBytes);
    if (!isVisionValid) {
      throw new BadRequestException("CCCD image verification failed.");
    }

    let profile = await this.farmerRepo.findOne({
      where: { userId },
    });

    if (!profile) {
      profile = this.farmerRepo.create({ userId });
      profile.id = randomUUID();
    }

    const fileChanges = [
      this.toFileChange(
        dto.cccdFrontFileId,
        profile.cccdFrontFileId,
        "KYC_IDENTITY",
      ),
      this.toFileChange(
        dto.cccdBackFileId,
        profile.cccdBackFileId,
        "KYC_IDENTITY",
      ),
    ].filter((change): change is ProfileFileChange => change !== null);

    Object.assign(profile, {
      cccdNumber: dto.cccdNumber,
      residenceAddress: dto.residenceAddress,
      provinceId: dto.provinceId,
      districtId: dto.districtId,
      ward: dto.ward,
      bio: dto.bio,
    });
    profile.isKycVerified = false;
    profile.verifiedBy = null;
    profile.verifiedAt = null;
    profile.rejectionReason = null;
    profile.cccdFrontFileId = dto.cccdFrontFileId;
    profile.cccdBackFileId = dto.cccdBackFileId;
    profile.cccdFrontUrl = null;
    profile.cccdBackUrl = null;
    return this.persistProfileWithFiles(
      userId,
      "FARMER_PROFILE",
      profile.id,
      fileChanges,
      () => this.farmerRepo.save(profile),
    );
  }

  async upsertB2bProfile(
    userId: string,
    role: UserRole,
    dto: UpsertB2bProfileDto,
  ) {
    const {
      businessLicenseFileId,
      cooperativeCertFileId,
      representativeCccdFrontFileId,
      representativeCccdBackFileId,
      membersListFileId,
      ...profileData
    } = dto;

    if (role === UserRole.COOPERATIVE) {
      let profile = await this.cooperativeRepo.findOne({
        where: { userId },
      });
      if (!profile) {
        profile = this.cooperativeRepo.create({ userId });
        profile.id = randomUUID();
      }

      Object.assign(profile, profileData);
      profile.isVerified = false;
      profile.verifiedBy = null;
      profile.verifiedAt = null;
      profile.rejectionReason = null;
      const fileChanges = [
        this.toFileChange(
          businessLicenseFileId,
          profile.businessLicenseFileId,
          "BUSINESS_LICENSE",
        ),
        this.toFileChange(
          cooperativeCertFileId,
          profile.cooperativeCertFileId,
          "BUSINESS_LICENSE",
        ),
        this.toFileChange(
          representativeCccdFrontFileId,
          profile.representativeCccdFrontFileId,
          "KYC_IDENTITY",
        ),
        this.toFileChange(
          representativeCccdBackFileId,
          profile.representativeCccdBackFileId,
          "KYC_IDENTITY",
        ),
        this.toFileChange(
          membersListFileId,
          profile.membersListFileId,
          "BUSINESS_LICENSE",
        ),
      ].filter((change): change is ProfileFileChange => change !== null);
      if (businessLicenseFileId) {
        profile.businessLicenseFileId = businessLicenseFileId;
        profile.businessLicenseUrl = null;
      }
      if (cooperativeCertFileId) {
        profile.cooperativeCertFileId = cooperativeCertFileId;
        profile.cooperativeCertUrl = null;
      }
      if (representativeCccdFrontFileId) {
        profile.representativeCccdFrontFileId = representativeCccdFrontFileId;
        profile.representativeCccdFrontUrl = null;
      }
      if (representativeCccdBackFileId) {
        profile.representativeCccdBackFileId = representativeCccdBackFileId;
        profile.representativeCccdBackUrl = null;
      }
      if (membersListFileId) {
        profile.membersListFileId = membersListFileId;
        profile.membersListUrl = null;
      }
      return this.persistProfileWithFiles(
        userId,
        "COOPERATIVE_PROFILE",
        profile.id,
        fileChanges,
        () => this.cooperativeRepo.save(profile),
      );
    }

    if (role === UserRole.ENTERPRISE) {
      let profile = await this.enterpriseRepo.findOne({
        where: { userId },
      });
      if (!profile) {
        profile = this.enterpriseRepo.create({ userId });
        profile.id = randomUUID();
      }

      Object.assign(profile, profileData);
      profile.isVerified = false;
      profile.verifiedBy = null;
      profile.rejectionReason = null;
      const fileChanges = [
        this.toFileChange(
          businessLicenseFileId,
          profile.businessLicenseFileId,
          "BUSINESS_LICENSE",
        ),
      ].filter((change): change is ProfileFileChange => change !== null);
      if (businessLicenseFileId) {
        profile.businessLicenseFileId = businessLicenseFileId;
        profile.businessLicenseUrl = null;
      }
      return this.persistProfileWithFiles(
        userId,
        "ENTERPRISE_PROFILE",
        profile.id,
        fileChanges,
        () => this.enterpriseRepo.save(profile),
      );
    }

    if (role === UserRole.SUPPLIER) {
      let profile = await this.supplierRepo.findOne({ where: { userId } });
      if (!profile) {
        profile = this.supplierRepo.create({ userId });
        profile.id = randomUUID();
      }

      Object.assign(profile, profileData);
      profile.isVerified = false;
      profile.verifiedBy = null;
      profile.rejectionReason = null;
      const fileChanges = [
        this.toFileChange(
          businessLicenseFileId,
          profile.businessLicenseFileId,
          "BUSINESS_LICENSE",
        ),
      ].filter((change): change is ProfileFileChange => change !== null);
      if (businessLicenseFileId) {
        profile.businessLicenseFileId = businessLicenseFileId;
        profile.businessLicenseUrl = null;
      }
      return this.persistProfileWithFiles(
        userId,
        "SUPPLIER_PROFILE",
        profile.id,
        fileChanges,
        () => this.supplierRepo.save(profile),
      );
    }

    throw new BadRequestException("Invalid B2B role");
  }

  async getVerificationStats(
    monthStart: Date,
  ): Promise<ProfileVerificationStats> {
    const [farmer, cooperative, enterprise, supplier, certificationsThisMonth] =
      await Promise.all([
        this.farmerRepo.count({
          where: { isKycVerified: false, rejectionReason: IsNull() },
        }),
        this.cooperativeRepo.count({
          where: { isVerified: false, rejectionReason: IsNull() },
        }),
        this.enterpriseRepo.count({
          where: { isVerified: false, rejectionReason: IsNull() },
        }),
        this.supplierRepo.count({
          where: { isVerified: false, rejectionReason: IsNull() },
        }),
        this.cooperativeRepo.count({
          where: {
            isVerified: true,
            verifiedAt: MoreThanOrEqual(monthStart),
          },
        }),
      ]);

    return {
      farmer,
      cooperative,
      enterprise,
      supplier,
      total: farmer + cooperative + enterprise + supplier,
      certificationsThisMonth,
    };
  }

  async listPendingVerificationProfiles(): Promise<PendingProfileQueue> {
    const [farmers, cooperatives, enterprises, suppliers] = await Promise.all([
      this.farmerRepo.find({
        where: { isKycVerified: false, rejectionReason: IsNull() },
        order: { createdAt: "DESC" },
      }),
      this.cooperativeRepo.find({
        where: { isVerified: false, rejectionReason: IsNull() },
        order: { createdAt: "DESC" },
      }),
      this.enterpriseRepo.find({
        where: { isVerified: false, rejectionReason: IsNull() },
        order: { createdAt: "DESC" },
      }),
      this.supplierRepo.find({
        where: { isVerified: false, rejectionReason: IsNull() },
        order: { createdAt: "DESC" },
      }),
    ]);

    return {
      farmer: farmers.map((profile) => this.toFarmerProjection(profile)),
      cooperative: cooperatives.map((profile) =>
        this.toCooperativeProjection(profile),
      ),
      enterprise: enterprises.map((profile) =>
        this.toEnterpriseProjection(profile),
      ),
      supplier: suppliers.map((profile) => this.toSupplierProjection(profile)),
    };
  }

  async listOrganizations(): Promise<ProfileOrganizationQueue> {
    const [cooperatives, enterprises] = await Promise.all([
      this.cooperativeRepo.find({ order: { createdAt: "DESC" } }),
      this.enterpriseRepo.find({ order: { createdAt: "DESC" } }),
    ]);
    return {
      cooperatives: cooperatives.map((profile) =>
        this.toCooperativeProjection(profile),
      ),
      enterprises: enterprises.map((profile) =>
        this.toEnterpriseProjection(profile),
      ),
    };
  }

  async transitionVerification(
    input: ProfileVerificationTransitionInput,
  ): Promise<ProfileVerificationTransition> {
    const reason = input.rejectionReason?.trim();
    if (!input.approve && !reason) {
      throw new ProfileRejectionReasonRequiredError(
        "A rejection reason is required",
      );
    }

    switch (input.profileType) {
      case "farmer":
        return this.transitionFarmer(input, reason ?? null);
      case "cooperative":
        return this.transitionCooperative(input, reason ?? null);
      case "enterprise":
        return this.transitionEnterprise(input, reason ?? null);
      case "supplier":
        return this.transitionSupplier(input, reason ?? null);
      default:
        throw new InvalidProfileTypeError("Invalid profile type");
    }
  }

  async restorePendingVerification(
    transition: ProfileVerificationTransition,
  ): Promise<boolean> {
    const rejected = transition.afterStatus === "rejected";
    switch (transition.profileType) {
      case "farmer": {
        const result = await this.farmerRepo.update(
          {
            id: transition.profileId,
            isKycVerified: !rejected,
            verifiedBy: transition.reviewerId,
            rejectionReason: rejected ? transition.rejectionReason : IsNull(),
          },
          {
            isKycVerified: false,
            verifiedBy: null,
            verifiedAt: null,
            rejectionReason: null,
          },
        );
        return result.affected === 1;
      }
      case "cooperative": {
        const result = await this.cooperativeRepo.update(
          {
            id: transition.profileId,
            isVerified: !rejected,
            verifiedBy: transition.reviewerId,
            rejectionReason: rejected ? transition.rejectionReason : IsNull(),
          },
          {
            isVerified: false,
            verifiedBy: null,
            verifiedAt: null,
            rejectionReason: null,
          },
        );
        return result.affected === 1;
      }
      case "enterprise": {
        const result = await this.enterpriseRepo.update(
          {
            id: transition.profileId,
            isVerified: !rejected,
            verifiedBy: transition.reviewerId,
            rejectionReason: rejected ? transition.rejectionReason : IsNull(),
          },
          {
            isVerified: false,
            verifiedBy: null,
            rejectionReason: null,
          },
        );
        return result.affected === 1;
      }
      case "supplier": {
        const result = await this.supplierRepo.update(
          {
            id: transition.profileId,
            isVerified: !rejected,
            verifiedBy: transition.reviewerId,
            rejectionReason: rejected ? transition.rejectionReason : IsNull(),
          },
          {
            isVerified: false,
            verifiedBy: null,
            rejectionReason: null,
          },
        );
        return result.affected === 1;
      }
    }
  }

  private async transitionFarmer(
    input: ProfileVerificationTransitionInput,
    rejectionReason: string | null,
  ): Promise<ProfileVerificationTransition> {
    const before = await this.farmerRepo.findOneBy({ id: input.profileId });
    if (!before) throw new ProfileNotFoundError("Profile not found");

    const transitionedAt = new Date();
    const result = await this.farmerRepo.update(
      {
        id: input.profileId,
        isKycVerified: false,
        rejectionReason: IsNull(),
      },
      {
        isKycVerified: input.approve,
        verifiedBy: input.reviewerId,
        verifiedAt: input.approve ? transitionedAt : null,
        rejectionReason: input.approve ? null : rejectionReason,
      },
    );
    this.assertTransitionWon(result.affected);
    const after = await this.farmerRepo.findOneByOrFail({
      id: input.profileId,
    });
    return this.toTransition(
      input,
      rejectionReason,
      after.updatedAt ?? transitionedAt,
      this.toFarmerProjection(after),
      this.farmerDocumentReferences(before),
    );
  }

  private async transitionCooperative(
    input: ProfileVerificationTransitionInput,
    rejectionReason: string | null,
  ): Promise<ProfileVerificationTransition> {
    const before = await this.cooperativeRepo.findOneBy({
      id: input.profileId,
    });
    if (!before) throw new ProfileNotFoundError("Profile not found");

    const transitionedAt = new Date();
    const result = await this.cooperativeRepo.update(
      {
        id: input.profileId,
        isVerified: false,
        rejectionReason: IsNull(),
      },
      {
        isVerified: input.approve,
        verifiedBy: input.reviewerId,
        verifiedAt: input.approve ? transitionedAt : null,
        rejectionReason: input.approve ? null : rejectionReason,
      },
    );
    this.assertTransitionWon(result.affected);
    const after = await this.cooperativeRepo.findOneByOrFail({
      id: input.profileId,
    });
    return this.toTransition(
      input,
      rejectionReason,
      after.updatedAt ?? transitionedAt,
      this.toCooperativeProjection(after),
      this.cooperativeDocumentReferences(before),
    );
  }

  private async transitionEnterprise(
    input: ProfileVerificationTransitionInput,
    rejectionReason: string | null,
  ): Promise<ProfileVerificationTransition> {
    const before = await this.enterpriseRepo.findOneBy({
      id: input.profileId,
    });
    if (!before) throw new ProfileNotFoundError("Profile not found");

    const transitionedAt = new Date();
    const result = await this.enterpriseRepo.update(
      {
        id: input.profileId,
        isVerified: false,
        rejectionReason: IsNull(),
      },
      {
        isVerified: input.approve,
        verifiedBy: input.reviewerId,
        rejectionReason: input.approve ? null : rejectionReason,
      },
    );
    this.assertTransitionWon(result.affected);
    const after = await this.enterpriseRepo.findOneByOrFail({
      id: input.profileId,
    });
    return this.toTransition(
      input,
      rejectionReason,
      after.updatedAt ?? transitionedAt,
      this.toEnterpriseProjection(after),
      this.businessLicenseDocumentReferences(before.businessLicenseFileId),
    );
  }

  private async transitionSupplier(
    input: ProfileVerificationTransitionInput,
    rejectionReason: string | null,
  ): Promise<ProfileVerificationTransition> {
    const before = await this.supplierRepo.findOneBy({ id: input.profileId });
    if (!before) throw new ProfileNotFoundError("Profile not found");

    const transitionedAt = new Date();
    const result = await this.supplierRepo.update(
      {
        id: input.profileId,
        isVerified: false,
        rejectionReason: IsNull(),
      },
      {
        isVerified: input.approve,
        verifiedBy: input.reviewerId,
        rejectionReason: input.approve ? null : rejectionReason,
      },
    );
    this.assertTransitionWon(result.affected);
    const after = await this.supplierRepo.findOneByOrFail({
      id: input.profileId,
    });
    return this.toTransition(
      input,
      rejectionReason,
      after.updatedAt ?? transitionedAt,
      this.toSupplierProjection(after),
      this.businessLicenseDocumentReferences(before.businessLicenseFileId),
    );
  }

  private assertTransitionWon(affected: number | null | undefined): void {
    if (affected !== 1) {
      throw new ProfileVerificationConflictError(
        "Profile is no longer pending verification",
      );
    }
  }

  private toTransition(
    input: ProfileVerificationTransitionInput,
    rejectionReason: string | null,
    transitionedAt: Date,
    profile: ProfileVerificationTransition["profile"],
    documentReferences: ProfileDocumentReference[],
  ): ProfileVerificationTransition {
    return {
      profileType: input.profileType,
      profileId: input.profileId,
      reviewerId: input.reviewerId,
      beforeStatus: "pending",
      afterStatus: input.approve ? "approved" : "rejected",
      rejectionReason: input.approve ? null : rejectionReason,
      transitionedAt,
      documentReferences,
      profile,
    };
  }

  private farmerDocumentReferences(
    profile: FarmerProfile,
  ): ProfileDocumentReference[] {
    return [profile.cccdFrontFileId, profile.cccdBackFileId]
      .filter((fileId): fileId is string => !!fileId)
      .map((fileId) => ({ fileId, assetType: "KYC_IDENTITY" }));
  }

  private cooperativeDocumentReferences(
    profile: CooperativeProfile,
  ): ProfileDocumentReference[] {
    return [
      {
        fileId: profile.cooperativeCertFileId,
        assetType: "BUSINESS_LICENSE" as const,
      },
      {
        fileId: profile.businessLicenseFileId,
        assetType: "BUSINESS_LICENSE" as const,
      },
      {
        fileId: profile.representativeCccdFrontFileId,
        assetType: "KYC_IDENTITY" as const,
      },
      {
        fileId: profile.representativeCccdBackFileId,
        assetType: "KYC_IDENTITY" as const,
      },
      {
        fileId: profile.membersListFileId,
        assetType: "BUSINESS_LICENSE" as const,
      },
    ]
      .filter(
        (
          reference,
        ): reference is {
          fileId: string;
          assetType: "KYC_IDENTITY" | "BUSINESS_LICENSE";
        } => !!reference.fileId,
      )
      .map(({ fileId, assetType }) => ({ fileId, assetType }));
  }

  private businessLicenseDocumentReferences(
    fileId: string | null,
  ): ProfileDocumentReference[] {
    return fileId ? [{ fileId, assetType: "BUSINESS_LICENSE" }] : [];
  }

  private toFarmerProjection(
    profile: FarmerProfile,
  ): FarmerVerificationProfile {
    return {
      id: profile.id,
      userId: profile.userId,
      cccdNumber: profile.cccdNumber,
      cccdFrontFileId: profile.cccdFrontFileId,
      cccdBackFileId: profile.cccdBackFileId,
      residenceAddress: profile.residenceAddress,
      ward: profile.ward,
      isKycVerified: profile.isKycVerified,
      verifiedBy: profile.verifiedBy,
      rejectionReason: profile.rejectionReason,
      provinceId: profile.provinceId,
      districtId: profile.districtId,
      bio: profile.bio,
      farmName: profile.farmName,
      experienceYears: profile.experienceYears,
      trustScore: Number(profile.trustScore),
      totalSales: profile.totalSales,
      verifiedAt: profile.verifiedAt,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }

  private toCooperativeProjection(
    profile: CooperativeProfile,
  ): CooperativeVerificationProfile {
    return {
      id: profile.id,
      userId: profile.userId,
      cooperativeName: profile.cooperativeName,
      businessLicenseNumber: profile.businessLicenseNumber,
      taxCode: profile.taxCode,
      representativeName: profile.representativeName,
      representativePhone: profile.representativePhone,
      representativeCccd: profile.representativeCccd,
      cooperativeCertFileId: profile.cooperativeCertFileId,
      businessLicenseFileId: profile.businessLicenseFileId,
      representativeCccdFrontFileId: profile.representativeCccdFrontFileId,
      representativeCccdBackFileId: profile.representativeCccdBackFileId,
      membersListFileId: profile.membersListFileId,
      address: profile.address,
      provinceId: profile.provinceId,
      totalMembers: profile.totalMembers,
      memberCount: profile.memberCount,
      isVerified: profile.isVerified,
      verifiedBy: profile.verifiedBy,
      verifiedAt: profile.verifiedAt,
      rejectionReason: profile.rejectionReason,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }

  private toEnterpriseProjection(
    profile: EnterpriseProfile,
  ): EnterpriseVerificationProfile {
    return {
      id: profile.id,
      userId: profile.userId,
      companyName: profile.companyName,
      taxCode: profile.taxCode,
      businessLicenseFileId: profile.businessLicenseFileId,
      representativeName: profile.representativeName,
      representativePhone: profile.representativePhone,
      address: profile.address,
      provinceId: profile.provinceId,
      industry: profile.industry,
      isVerified: profile.isVerified,
      verifiedBy: profile.verifiedBy,
      rejectionReason: profile.rejectionReason,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }

  private toSupplierProjection(
    profile: SupplierProfile,
  ): SupplierVerificationProfile {
    return {
      id: profile.id,
      userId: profile.userId,
      companyName: profile.companyName,
      taxCode: profile.taxCode,
      address: profile.address,
      provinceId: profile.provinceId,
      supplierType: profile.supplierType,
      isVerified: profile.isVerified,
      businessLicenseFileId: profile.businessLicenseFileId,
      verifiedBy: profile.verifiedBy,
      rejectionReason: profile.rejectionReason,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }

  private async readOwnedPrivateFile(
    fileId: string,
    ownerId: string,
    assetType: PrivateAssetType,
  ): Promise<Buffer> {
    try {
      return await this.storedFileAccess.readOwnedFile({
        fileId,
        ownerId,
        assetType,
      });
    } catch (error) {
      if (isInvalidPrivateDocument(error)) {
        throw new BadRequestException(
          "Tài liệu riêng tư không hợp lệ hoặc không thuộc tài khoản",
        );
      }
      throw error;
    }
  }

  private toFileChange(
    fileId: string | undefined,
    previousFileId: string | null | undefined,
    assetType: PrivateAssetType,
  ): ProfileFileChange | null {
    if (!fileId || fileId === previousFileId) return null;
    return {
      fileId,
      previousFileId: previousFileId ?? null,
      assetType,
    };
  }

  private async persistProfileWithFiles<T>(
    ownerId: string,
    resourceType: string,
    resourceId: string,
    changes: ProfileFileChange[],
    persist: () => Promise<T>,
  ): Promise<T> {
    const attached: ProfileFileChange[] = [];
    let saved: T;
    try {
      for (const change of changes) {
        await this.storedFileAccess.attachOwnedFile({
          fileId: change.fileId,
          ownerId,
          assetType: change.assetType,
          resourceType,
          resourceId,
        });
        attached.push(change);
      }
      saved = await persist();
    } catch (error) {
      const compensation = await Promise.allSettled(
        attached.map((change) =>
          this.storedFileAccess.detachOwnedFile({
            fileId: change.fileId,
            ownerId,
            resourceType,
            resourceId,
          }),
        ),
      );
      if (compensation.some((result) => result.status === "rejected")) {
        throw new PrivateDocumentConsistencyError(
          "Profile file compensation failed and requires reconciliation",
        );
      }
      if (isInvalidPrivateDocument(error)) {
        throw new BadRequestException(
          "Không thể gắn tài liệu riêng tư vào hồ sơ",
        );
      }
      throw error;
    }
    await this.retireReplacedFiles(ownerId, changes);
    return saved;
  }

  private async retireReplacedFiles(
    ownerId: string,
    changes: ProfileFileChange[],
  ): Promise<void> {
    for (const fileId of new Set(
      changes
        .map((change) => change.previousFileId)
        .filter((fileId): fileId is string => !!fileId),
    )) {
      try {
        await this.storedFileAccess.retireOwnedFile({
          fileId,
          ownerId,
          correlationId: randomUUID(),
        });
      } catch {
        throw new PrivateDocumentConsistencyError(
          "Replaced profile file requires lifecycle reconciliation",
        );
      }
    }
  }
}
