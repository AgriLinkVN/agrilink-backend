export const TRACEABILITY_EVENT_KINDS = [
  'BATCH_CREATED',
  'PLANTED',
  'HARVESTED',
  'QUALITY_TESTED',
  'SHIPPED',
  'CORRECTED',
] as const;

export type TraceabilityEventKind = (typeof TRACEABILITY_EVENT_KINDS)[number];

export interface TraceabilityEventFact {
  id: string;
  batchId: string;
  sequence: number;
  kind: TraceabilityEventKind;
  occurredAt: string;
  payload: Readonly<Record<string, unknown>>;
  supersedesEventId?: string | null;
}

export interface TraceabilityProjection {
  batchId: string;
  timeline: ReadonlyArray<TraceabilityEventFact>;
}

/** Pure reducer: supplied event facts completely determine its output. */
export function projectTraceability(
  batchId: string,
  events: readonly TraceabilityEventFact[],
): TraceabilityProjection {
  return {
    batchId,
    timeline: events
      .filter((event) => event.batchId === batchId)
      .slice()
      .sort((left, right) => left.sequence - right.sequence || left.id.localeCompare(right.id)),
  };
}
