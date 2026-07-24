import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { FarmerProfile } from '../../database/entities/farmer-profile.entity';
import { CooperativeProfile } from '../../database/entities/cooperative-profile.entity';
import { EnterpriseProfile } from '../../database/entities/enterprise-profile.entity';
import { SupplierProfile } from '../../database/entities/supplier-profile.entity';
import { UpsertFarmerProfileDto } from './dto/upsert-farmer-profile.dto';
import { UpsertB2bProfileDto } from './dto/upsert-b2b-profile.dto';
import {
  KYC_VISION,
  KycVisionPort,
} from './application/ports/outbound/kyc-vision.port';
import { UserRole } from '../../common/enums';
import {
  STORED_FILE_ACCESS,
  StoredFileAccessPort,
} from '../storage/application/ports/inbound/stored-file-access.port';
import {
  InvalidStoredFileTransitionError,
  StoredFileNotFoundError,
} from '../storage/application/storage-file.errors';

type PrivateAssetType = 'KYC_IDENTITY' | 'BUSINESS_LICENSE' | 'CERTIFICATION';

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
export class ProfilesService {
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
      where: { user: { id: userId } },
    });
    if (!profile) return null;
    return {
      id: profile.id,
      userId,
      farmName: null,
      farmAreaHectares: null,
      farmingType: null,
      region: null,
      provinceId: profile.provinceId,
      districtId: profile.districtId,
      address: profile.residenceAddress,
      bio: profile.bio,
      experienceYears: null,
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
      this.readOwnedPrivateFile(dto.cccdFrontFileId, userId, 'KYC_IDENTITY'),
      this.readOwnedPrivateFile(dto.cccdBackFileId, userId, 'KYC_IDENTITY'),
    ]);
    const isVisionValid =
      await this.fptVisionService.verifyCccdImage(frontBytes);
    if (!isVisionValid) {
      throw new BadRequestException('CCCD image verification failed.');
    }

    let profile = await this.farmerRepo.findOne({
      where: { user: { id: userId } },
    });

    if (!profile) {
      profile = this.farmerRepo.create({ user: { id: userId } });
      profile.id = randomUUID();
    }

    const fileChanges = [
      this.toFileChange(
        dto.cccdFrontFileId,
        profile.cccdFrontFileId,
        'KYC_IDENTITY',
      ),
      this.toFileChange(
        dto.cccdBackFileId,
        profile.cccdBackFileId,
        'KYC_IDENTITY',
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
      'FARMER_PROFILE',
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
        where: { user: { id: userId } },
      });
      if (!profile) {
        profile = this.cooperativeRepo.create({ user: { id: userId } });
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
          'BUSINESS_LICENSE',
        ),
        this.toFileChange(
          cooperativeCertFileId,
          profile.cooperativeCertFileId,
          'BUSINESS_LICENSE',
        ),
        this.toFileChange(
          representativeCccdFrontFileId,
          profile.representativeCccdFrontFileId,
          'KYC_IDENTITY',
        ),
        this.toFileChange(
          representativeCccdBackFileId,
          profile.representativeCccdBackFileId,
          'KYC_IDENTITY',
        ),
        this.toFileChange(
          membersListFileId,
          profile.membersListFileId,
          'BUSINESS_LICENSE',
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
        'COOPERATIVE_PROFILE',
        profile.id,
        fileChanges,
        () => this.cooperativeRepo.save(profile),
      );
    }

    if (role === UserRole.ENTERPRISE) {
      let profile = await this.enterpriseRepo.findOne({
        where: { user: { id: userId } },
      });
      if (!profile) {
        profile = this.enterpriseRepo.create({ user: { id: userId } });
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
          'BUSINESS_LICENSE',
        ),
      ].filter((change): change is ProfileFileChange => change !== null);
      if (businessLicenseFileId) {
        profile.businessLicenseFileId = businessLicenseFileId;
        profile.businessLicenseUrl = null;
      }
      return this.persistProfileWithFiles(
        userId,
        'ENTERPRISE_PROFILE',
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
          'BUSINESS_LICENSE',
        ),
      ].filter((change): change is ProfileFileChange => change !== null);
      if (businessLicenseFileId) {
        profile.businessLicenseFileId = businessLicenseFileId;
        profile.businessLicenseUrl = null;
      }
      return this.persistProfileWithFiles(
        userId,
        'SUPPLIER_PROFILE',
        profile.id,
        fileChanges,
        () => this.supplierRepo.save(profile),
      );
    }

    throw new BadRequestException('Invalid B2B role');
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
          'Tài liệu riêng tư không hợp lệ hoặc không thuộc tài khoản',
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
      if (compensation.some((result) => result.status === 'rejected')) {
        throw new PrivateDocumentConsistencyError(
          'Profile file compensation failed and requires reconciliation',
        );
      }
      if (isInvalidPrivateDocument(error)) {
        throw new BadRequestException(
          'Không thể gắn tài liệu riêng tư vào hồ sơ',
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
          'Replaced profile file requires lifecycle reconciliation',
        );
      }
    }
  }
}
