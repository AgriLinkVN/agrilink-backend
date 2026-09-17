import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TraceabilityController } from './traceability.controller';
import { TraceabilityService } from './traceability.service';
import { TraceabilityBatch } from './entities/traceability-batch.entity';
import { TraceabilityEvent } from './entities/traceability-event.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TraceabilityBatch, TraceabilityEvent])],
  controllers: [TraceabilityController],
  providers: [TraceabilityService],
  exports: [TraceabilityService],
})
export class TraceabilityModule {}
