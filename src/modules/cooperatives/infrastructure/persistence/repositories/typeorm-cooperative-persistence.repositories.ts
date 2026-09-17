import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  BulkListingRepositoryPort,
  CooperativeMemberRepositoryPort,
  CooperativeProvinceReferenceRepositoryPort,
  HarvestScheduleRepositoryPort,
} from '../../../application/ports/outbound/cooperative-persistence.port';
import {
  BulkListingContributionModel,
  BulkListingModel,
  CooperativeMemberModel,
  CooperativeProvinceReferenceModel,
  HarvestScheduleModel,
} from '../../../domain/models/cooperative-persistence.models';
import { BulkListingContributionEntity } from '../entities/bulk-listing-contribution.entity';
import { BulkListingEntity } from '../entities/bulk-listing.entity';
import { CooperativeMemberEntity } from '../entities/cooperative-member.entity';
import { CooperativeProvinceReferenceEntity } from '../entities/cooperative-province-reference.entity';
import { HarvestScheduleEntity } from '../entities/harvest-schedule.entity';
import { CooperativePersistenceMapper } from '../mappers/cooperative-persistence.mapper';

@Injectable()
export class TypeOrmCooperativeMemberRepository
  implements CooperativeMemberRepositoryPort
{
  constructor(
    @InjectRepository(CooperativeMemberEntity)
    private readonly repository: Repository<CooperativeMemberEntity>,
  ) {}

  async findByCooperativeAndFarmer(
    cooperativeId: string,
    farmerId: string,
  ): Promise<CooperativeMemberModel | null> {
    const member = await this.repository.findOne({
      where: { cooperativeId, farmerId },
    });
    return member ? CooperativePersistenceMapper.toMemberModel(member) : null;
  }

  async save(member: CooperativeMemberModel): Promise<CooperativeMemberModel> {
    const saved = await this.repository.save(
      CooperativePersistenceMapper.toMemberEntity(member),
    );
    return CooperativePersistenceMapper.toMemberModel(saved);
  }
}

@Injectable()
export class TypeOrmBulkListingRepository implements BulkListingRepositoryPort {
  constructor(
    @InjectRepository(BulkListingEntity)
    private readonly listingRepository: Repository<BulkListingEntity>,
    @InjectRepository(BulkListingContributionEntity)
    private readonly contributionRepository: Repository<BulkListingContributionEntity>,
  ) {}

  async findByIdForCooperative(
    id: string,
    cooperativeId: string,
  ): Promise<BulkListingModel | null> {
    const listing = await this.listingRepository.findOne({
      where: { id, cooperativeId },
    });
    return listing ? CooperativePersistenceMapper.toListingModel(listing) : null;
  }

  async save(listing: BulkListingModel): Promise<BulkListingModel> {
    const saved = await this.listingRepository.save(
      CooperativePersistenceMapper.toListingEntity(listing),
    );
    return CooperativePersistenceMapper.toListingModel(saved);
  }

  async saveContribution(
    contribution: BulkListingContributionModel,
  ): Promise<BulkListingContributionModel> {
    const saved = await this.contributionRepository.save(
      CooperativePersistenceMapper.toContributionEntity(contribution),
    );
    return CooperativePersistenceMapper.toContributionModel(saved);
  }
}

@Injectable()
export class TypeOrmHarvestScheduleRepository
  implements HarvestScheduleRepositoryPort
{
  constructor(
    @InjectRepository(HarvestScheduleEntity)
    private readonly repository: Repository<HarvestScheduleEntity>,
  ) {}

  async findByIdForUser(
    id: string,
    userId: string,
  ): Promise<HarvestScheduleModel | null> {
    const schedule = await this.repository.findOne({ where: { id, userId } });
    return schedule ? CooperativePersistenceMapper.toScheduleModel(schedule) : null;
  }

  async save(schedule: HarvestScheduleModel): Promise<HarvestScheduleModel> {
    const saved = await this.repository.save(
      CooperativePersistenceMapper.toScheduleEntity(schedule),
    );
    return CooperativePersistenceMapper.toScheduleModel(saved);
  }
}

@Injectable()
export class TypeOrmCooperativeProvinceReferenceRepository
  implements CooperativeProvinceReferenceRepositoryPort
{
  constructor(
    @InjectRepository(CooperativeProvinceReferenceEntity)
    private readonly repository: Repository<CooperativeProvinceReferenceEntity>,
  ) {}

  async findByCooperativeId(
    cooperativeId: string,
  ): Promise<CooperativeProvinceReferenceModel | null> {
    const reference = await this.repository.findOne({ where: { cooperativeId } });
    return reference
      ? CooperativePersistenceMapper.toProvinceReferenceModel(reference)
      : null;
  }

  async save(
    reference: CooperativeProvinceReferenceModel,
  ): Promise<CooperativeProvinceReferenceModel> {
    const saved = await this.repository.save(
      CooperativePersistenceMapper.toProvinceReferenceEntity(reference),
    );
    return CooperativePersistenceMapper.toProvinceReferenceModel(saved);
  }
}
