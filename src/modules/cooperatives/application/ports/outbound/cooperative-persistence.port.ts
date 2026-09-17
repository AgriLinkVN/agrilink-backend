import {
  BulkListingContributionModel,
  BulkListingModel,
  CooperativeMemberModel,
  CooperativeProvinceReferenceModel,
  HarvestScheduleModel,
} from '../../../domain/models/cooperative-persistence.models';

export const COOPERATIVE_MEMBER_REPOSITORY = Symbol(
  'COOPERATIVE_MEMBER_REPOSITORY',
);
export const BULK_LISTING_REPOSITORY = Symbol('BULK_LISTING_REPOSITORY');
export const HARVEST_SCHEDULE_REPOSITORY = Symbol(
  'HARVEST_SCHEDULE_REPOSITORY',
);
export const COOPERATIVE_PROVINCE_REFERENCE_REPOSITORY = Symbol(
  'COOPERATIVE_PROVINCE_REFERENCE_REPOSITORY',
);

export interface CooperativeMemberRepositoryPort {
  findByCooperativeAndFarmer(
    cooperativeId: string,
    farmerId: string,
  ): Promise<CooperativeMemberModel | null>;
  save(member: CooperativeMemberModel): Promise<CooperativeMemberModel>;
}

export interface BulkListingRepositoryPort {
  findByIdForCooperative(
    id: string,
    cooperativeId: string,
  ): Promise<BulkListingModel | null>;
  save(listing: BulkListingModel): Promise<BulkListingModel>;
  saveContribution(
    contribution: BulkListingContributionModel,
  ): Promise<BulkListingContributionModel>;
}

export interface HarvestScheduleRepositoryPort {
  findByIdForUser(
    id: string,
    userId: string,
  ): Promise<HarvestScheduleModel | null>;
  save(schedule: HarvestScheduleModel): Promise<HarvestScheduleModel>;
}

/**
 * Geography owns the mapping from legacy numeric IDs to canonical UUIDs.
 * P3 stores only the UUID and deliberately has no numeric fallback.
 */
export interface CooperativeProvinceReferenceRepositoryPort {
  findByCooperativeId(
    cooperativeId: string,
  ): Promise<CooperativeProvinceReferenceModel | null>;
  save(
    reference: CooperativeProvinceReferenceModel,
  ): Promise<CooperativeProvinceReferenceModel>;
}
