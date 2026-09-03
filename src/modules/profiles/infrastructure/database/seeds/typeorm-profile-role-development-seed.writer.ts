import { DataSource, Repository } from "typeorm";
import { CooperativeProfile } from "../../persistence/entities/cooperative-profile.entity";
import { EnterpriseProfile } from "../../persistence/entities/enterprise-profile.entity";
import { FarmerProfile } from "../../persistence/entities/farmer-profile.entity";
import { SupplierProfile } from "../../persistence/entities/supplier-profile.entity";
import {
  CooperativeProfileDevWriteData,
  CooperativeProfileDevMutableData,
  EnterpriseProfileDevWriteData,
  EnterpriseProfileDevMutableData,
  FarmerProfileDevWriteData,
  FarmerProfileDevMutableData,
  ProfileDevRecord,
  ProfileRoleDevSeedWriter,
  ProfilesRoleProfilesDevSeedGroup,
  SupplierProfileDevWriteData,
  SupplierProfileDevMutableData,
} from "./profile-role-development.seed";

export class TypeOrmProfileRoleDevSeedWriter implements ProfileRoleDevSeedWriter {
  private readonly farmers: Repository<FarmerProfile>;
  private readonly cooperatives: Repository<CooperativeProfile>;
  private readonly enterprises: Repository<EnterpriseProfile>;
  private readonly suppliers: Repository<SupplierProfile>;

  constructor(dataSource: DataSource) {
    this.farmers = dataSource.getRepository(FarmerProfile);
    this.cooperatives = dataSource.getRepository(CooperativeProfile);
    this.enterprises = dataSource.getRepository(EnterpriseProfile);
    this.suppliers = dataSource.getRepository(SupplierProfile);
  }

  findFarmerByUserId(userId: string): Promise<ProfileDevRecord | null> {
    return this.farmers.findOne({ select: { id: true }, where: { userId } });
  }

  findFarmerByCccd(cccdNumber: string): Promise<ProfileDevRecord | null> {
    return this.farmers.findOne({
      select: { id: true },
      where: { cccdNumber },
    });
  }

  async createFarmer(data: FarmerProfileDevWriteData): Promise<void> {
    await this.farmers.save(this.farmers.create(data));
  }

  async updateFarmer(
    id: string,
    data: FarmerProfileDevMutableData,
  ): Promise<void> {
    await this.farmers.update(id, data);
  }

  findCooperativeByUserId(userId: string): Promise<ProfileDevRecord | null> {
    return this.cooperatives.findOne({
      select: { id: true },
      where: { userId },
    });
  }

  findCooperativeByBusinessLicense(
    businessLicenseNumber: string,
  ): Promise<ProfileDevRecord | null> {
    return this.cooperatives.findOne({
      select: { id: true },
      where: { businessLicenseNumber },
    });
  }

  findCooperativeByTaxCode(taxCode: string): Promise<ProfileDevRecord | null> {
    return this.cooperatives.findOne({
      select: { id: true },
      where: { taxCode },
    });
  }

  async createCooperative(data: CooperativeProfileDevWriteData): Promise<void> {
    await this.cooperatives.save(this.cooperatives.create(data));
  }

  async updateCooperative(
    id: string,
    data: CooperativeProfileDevMutableData,
  ): Promise<void> {
    await this.cooperatives.update(id, data);
  }

  findEnterpriseByUserId(userId: string): Promise<ProfileDevRecord | null> {
    return this.enterprises.findOne({
      select: { id: true },
      where: { userId },
    });
  }

  findEnterpriseByTaxCode(taxCode: string): Promise<ProfileDevRecord | null> {
    return this.enterprises.findOne({
      select: { id: true },
      where: { taxCode },
    });
  }

  async createEnterprise(data: EnterpriseProfileDevWriteData): Promise<void> {
    await this.enterprises.save(this.enterprises.create(data));
  }

  async updateEnterprise(
    id: string,
    data: EnterpriseProfileDevMutableData,
  ): Promise<void> {
    await this.enterprises.update(id, data);
  }

  findSupplierByUserId(userId: string): Promise<ProfileDevRecord | null> {
    return this.suppliers.findOne({
      select: { id: true },
      where: { userId },
    });
  }

  async createSupplier(data: SupplierProfileDevWriteData): Promise<void> {
    await this.suppliers.save(this.suppliers.create(data));
  }

  async updateSupplier(
    id: string,
    data: SupplierProfileDevMutableData,
  ): Promise<void> {
    await this.suppliers.update(id, data);
  }
}

export function createProfilesRoleProfilesDevSeedGroup(
  dataSource: DataSource,
): ProfilesRoleProfilesDevSeedGroup {
  return new ProfilesRoleProfilesDevSeedGroup(
    new TypeOrmProfileRoleDevSeedWriter(dataSource),
  );
}
