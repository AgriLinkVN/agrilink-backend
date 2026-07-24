import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
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

type PrivateAssetType = 'KYC_IDENTITY' | 'BUSINESS_LICENSE' | 'CERTIFICATION';

interface ProfileFileAttachment {
  fileId?: string;
  assetType: PrivateAssetType;
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
    }

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
    profile = await this.farmerRepo.save(profile);

    await this.attachProfileFiles(userId, 'FARMER_PROFILE', profile.id, [
      { fileId: dto.cccdFrontFileId, assetType: 'KYC_IDENTITY' },
      { fileId: dto.cccdBackFileId, assetType: 'KYC_IDENTITY' },
    ]);
    profile.cccdFrontFileId = dto.cccdFrontFileId;
    profile.cccdBackFileId = dto.cccdBackFileId;
    profile.cccdFrontUrl = null;
    profile.cccdBackUrl = null;
    return this.farmerRepo.save(profile);
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
      if (!profile)
        profile = this.cooperativeRepo.create({ user: { id: userId } });

      Object.assign(profile, profileData);
      profile.isVerified = false;
      profile.verifiedBy = null;
      profile.verifiedAt = null;
      profile.rejectionReason = null;
      profile = await this.cooperativeRepo.save(profile);
      await this.attachProfileFiles(userId, 'COOPERATIVE_PROFILE', profile.id, [
        { fileId: businessLicenseFileId, assetType: 'BUSINESS_LICENSE' },
        { fileId: cooperativeCertFileId, assetType: 'BUSINESS_LICENSE' },
        { fileId: representativeCccdFrontFileId, assetType: 'KYC_IDENTITY' },
        { fileId: representativeCccdBackFileId, assetType: 'KYC_IDENTITY' },
        { fileId: membersListFileId, assetType: 'BUSINESS_LICENSE' },
      ]);
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
      return this.cooperativeRepo.save(profile);
    }

    if (role === UserRole.ENTERPRISE) {
      let profile = await this.enterpriseRepo.findOne({
        where: { user: { id: userId } },
      });
      if (!profile)
        profile = this.enterpriseRepo.create({ user: { id: userId } });

      Object.assign(profile, profileData);
      profile.isVerified = false;
      profile.verifiedBy = null;
      profile.rejectionReason = null;
      profile = await this.enterpriseRepo.save(profile);
      await this.attachProfileFiles(userId, 'ENTERPRISE_PROFILE', profile.id, [
        { fileId: businessLicenseFileId, assetType: 'BUSINESS_LICENSE' },
      ]);
      if (businessLicenseFileId) {
        profile.businessLicenseFileId = businessLicenseFileId;
        profile.businessLicenseUrl = null;
      }
      return this.enterpriseRepo.save(profile);
    }

    if (role === UserRole.SUPPLIER) {
      let profile = await this.supplierRepo.findOne({ where: { userId } });
      if (!profile) profile = this.supplierRepo.create({ userId });

      Object.assign(profile, profileData);
      profile.isVerified = false;
      profile.verifiedBy = null;
      profile.rejectionReason = null;
      profile = await this.supplierRepo.save(profile);
      await this.attachProfileFiles(userId, 'SUPPLIER_PROFILE', profile.id, [
        { fileId: businessLicenseFileId, assetType: 'BUSINESS_LICENSE' },
      ]);
      if (businessLicenseFileId) {
        profile.businessLicenseFileId = businessLicenseFileId;
        profile.businessLicenseUrl = null;
      }
      return this.supplierRepo.save(profile);
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
    } catch {
      throw new BadRequestException(
        'Tài liệu riêng tư không hợp lệ hoặc không thuộc tài khoản',
      );
    }
  }

  private async attachProfileFiles(
    ownerId: string,
    resourceType: string,
    resourceId: string,
    attachments: ProfileFileAttachment[],
  ): Promise<void> {
    try {
      await Promise.all(
        attachments
          .filter(
            (
              attachment,
            ): attachment is ProfileFileAttachment & {
              fileId: string;
            } => !!attachment.fileId,
          )
          .map((attachment) =>
            this.storedFileAccess.attachOwnedFile({
              fileId: attachment.fileId,
              ownerId,
              assetType: attachment.assetType,
              resourceType,
              resourceId,
            }),
          ),
      );
    } catch {
      throw new BadRequestException(
        'Không thể gắn tài liệu riêng tư vào hồ sơ',
      );
    }
  }
}
