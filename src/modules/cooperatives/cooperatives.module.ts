import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  BULK_LISTING_REPOSITORY,
  COOPERATIVE_MEMBER_REPOSITORY,
  COOPERATIVE_PROVINCE_REFERENCE_REPOSITORY,
  HARVEST_SCHEDULE_REPOSITORY,
} from './application/ports/outbound/cooperative-persistence.port';
import { COOPERATIVE_UNIT_OF_WORK } from './application/ports/outbound/cooperative-unit-of-work.port';
import { BulkListingContributionEntity } from './infrastructure/persistence/entities/bulk-listing-contribution.entity';
import { BulkListingEntity } from './infrastructure/persistence/entities/bulk-listing.entity';
import { CooperativeMemberEntity } from './infrastructure/persistence/entities/cooperative-member.entity';
import { CooperativeProvinceReferenceEntity } from './infrastructure/persistence/entities/cooperative-province-reference.entity';
import { HarvestScheduleEntity } from './infrastructure/persistence/entities/harvest-schedule.entity';
import {
  TypeOrmBulkListingRepository,
  TypeOrmCooperativeMemberRepository,
  TypeOrmCooperativeProvinceReferenceRepository,
  TypeOrmHarvestScheduleRepository,
} from './infrastructure/persistence/repositories/typeorm-cooperative-persistence.repositories';
import { TypeOrmCooperativeUnitOfWork } from './infrastructure/persistence/typeorm-cooperative-unit-of-work';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CooperativeMemberEntity,
      BulkListingEntity,
      BulkListingContributionEntity,
      HarvestScheduleEntity,
      CooperativeProvinceReferenceEntity,
    ]),
  ],
  providers: [
    TypeOrmCooperativeMemberRepository,
    TypeOrmBulkListingRepository,
    TypeOrmHarvestScheduleRepository,
    TypeOrmCooperativeProvinceReferenceRepository,
    TypeOrmCooperativeUnitOfWork,
    {
      provide: COOPERATIVE_MEMBER_REPOSITORY,
      useExisting: TypeOrmCooperativeMemberRepository,
    },
    {
      provide: BULK_LISTING_REPOSITORY,
      useExisting: TypeOrmBulkListingRepository,
    },
    {
      provide: HARVEST_SCHEDULE_REPOSITORY,
      useExisting: TypeOrmHarvestScheduleRepository,
    },
    {
      provide: COOPERATIVE_PROVINCE_REFERENCE_REPOSITORY,
      useExisting: TypeOrmCooperativeProvinceReferenceRepository,
    },
    {
      provide: COOPERATIVE_UNIT_OF_WORK,
      useExisting: TypeOrmCooperativeUnitOfWork,
    },
  ],
})
export class CooperativesModule {}
