import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CooperativesController } from './cooperatives.controller';
import { CooperativesService } from './cooperatives.service';
import { CooperativeMember } from './entities/cooperative-member.entity';
import { BulkListing } from './entities/bulk-listing.entity';
import { BulkListingContribution } from './entities/bulk-listing-contribution.entity';
import { HarvestSchedule } from './entities/harvest-schedule.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CooperativeMember,
      BulkListing,
      BulkListingContribution,
      HarvestSchedule,
    ]),
  ],
  controllers: [CooperativesController],
  providers: [CooperativesService],
  exports: [CooperativesService],
})
export class CooperativesModule {}
