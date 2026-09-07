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

export class CooperativePersistenceMapper {
  static toMemberModel(entity: CooperativeMemberEntity): CooperativeMemberModel {
    return { ...entity };
  }

  static toMemberEntity(model: CooperativeMemberModel): CooperativeMemberEntity {
    return { ...model };
  }

  static toListingModel(entity: BulkListingEntity): BulkListingModel {
    return { ...entity };
  }

  static toListingEntity(model: BulkListingModel): BulkListingEntity {
    return { ...model };
  }

  static toContributionModel(
    entity: BulkListingContributionEntity,
  ): BulkListingContributionModel {
    return { ...entity };
  }

  static toContributionEntity(
    model: BulkListingContributionModel,
  ): BulkListingContributionEntity {
    return { ...model };
  }

  static toScheduleModel(entity: HarvestScheduleEntity): HarvestScheduleModel {
    return { ...entity };
  }

  static toScheduleEntity(model: HarvestScheduleModel): HarvestScheduleEntity {
    return { ...model };
  }

  static toProvinceReferenceModel(
    entity: CooperativeProvinceReferenceEntity,
  ): CooperativeProvinceReferenceModel {
    return { ...entity };
  }

  static toProvinceReferenceEntity(
    model: CooperativeProvinceReferenceModel,
  ): CooperativeProvinceReferenceEntity {
    return { ...model };
  }
}
