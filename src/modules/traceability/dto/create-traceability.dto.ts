import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsDateString,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from "class-validator";
import {
  TRACEABILITY_EVENT_KINDS,
  TraceabilityEventKind,
} from "../application/traceability-projection";

export class CreateTraceabilityDto {
  @ApiProperty({ description: "Products-owned product identifier" })
  @IsUUID()
  productId: string;

  @ApiProperty({ description: "Stable lot/batch identifier" })
  @IsString()
  batchCode: string;

  @ApiProperty({ description: "Stable public QR identifier" })
  @IsString()
  qrCode: string;

  @ApiProperty({
    description: "Durable idempotency key for canonical batch creation",
  })
  @IsString()
  operationKey: string;
}

export class AppendTraceabilityEventDto {
  @ApiProperty({ enum: TRACEABILITY_EVENT_KINDS })
  @IsIn(TRACEABILITY_EVENT_KINDS)
  kind: TraceabilityEventKind;

  @ApiProperty({ description: "Business occurrence time carried by the event" })
  @IsDateString()
  occurredAt: string;

  @ApiProperty({ description: "Discriminated event facts" })
  @IsObject()
  payload: Record<string, unknown>;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsUUID("4", { each: true })
  evidenceFileIds?: string[];

  @ApiProperty({
    description: "Durable idempotency key for this append operation",
  })
  @IsString()
  operationKey: string;
}
