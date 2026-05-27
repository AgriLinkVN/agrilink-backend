import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TraceabilityController } from './traceability.controller';
import { TraceabilityService } from './traceability.service';
import { TraceabilityRecord } from './entities/traceability-record.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TraceabilityRecord])],
  controllers: [TraceabilityController],
  providers: [TraceabilityService],
  exports: [TraceabilityService],
})
export class TraceabilityModule {}
