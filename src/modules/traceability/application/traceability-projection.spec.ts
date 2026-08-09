import { projectTraceability, TraceabilityEventFact } from './traceability-projection';

describe('traceability projection', () => {
  const events: TraceabilityEventFact[] = [
    { id: 'b', batchId: 'batch-1', sequence: 2, kind: 'HARVESTED', occurredAt: '2026-01-02T00:00:00.000Z', payload: {} },
    { id: 'a', batchId: 'batch-1', sequence: 1, kind: 'PLANTED', occurredAt: '2026-01-01T00:00:00.000Z', payload: {} },
  ];

  it('orders the same facts deterministically without clock or random input', () => {
    expect(projectTraceability('batch-1', events)).toEqual(projectTraceability('batch-1', [...events].reverse()));
    expect(projectTraceability('batch-1', events).timeline.map((event) => event.kind)).toEqual(['PLANTED', 'HARVESTED']);
  });

  it('does not project another batch', () => {
    expect(projectTraceability('other', events).timeline).toEqual([]);
  });
});
