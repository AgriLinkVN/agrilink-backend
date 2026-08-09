import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';
import { TRACEABILITY_EVENT_KINDS, TraceabilityEventKind } from '../application/traceability-projection';

export class CreateTraceabilityDto {
  @ApiProperty()
  @IsUUID()
  productId: string;

  @ApiProperty({ description: 'Stable lot/batch identifier' })
  @IsString()
  batchCode: string;

  @ApiProperty({ description: 'Stable public QR identifier' })
  @IsString()
  qrCode: string;

  @ApiProperty()
  @IsString()
  operationKey: string;
}

export class AppendTraceabilityEventDto {
  @ApiProperty({ enum: TRACEABILITY_EVENT_KINDS })
  @IsIn(TRACEABILITY_EVENT_KINDS)
  kind: TraceabilityEventKind;

  @ApiProperty()
  @IsDateString()
  occurredAt: string;

  @ApiProperty({ description: 'Discriminated event facts' })
  @IsObject()
  payload: Record<string, unknown>;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsUUID('4', { each: true })
  evidenceFileIds?: string[];

  @ApiProperty()
  @IsString()
  operationKey: string;
}
