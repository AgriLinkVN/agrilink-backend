import { auditPersistenceArchitecture } from './persistence-architecture-audit';

describe('Persistence architecture Phase 0 baseline', () => {
  it('matches the reviewed ownership and exception registries', () => {
    const result = auditPersistenceArchitecture(
      new Date('2026-07-24T00:00:00Z'),
    );

    expect(result.violations).toEqual([]);
    expect(result.summary).toEqual({
      writableMappings: 49,
      viewMappings: 0,
      physicalTables: 47,
      duplicateTables: 2,
      centralMappings: 16,
      moduleMappings: 33,
      centralImportEdges: 2,
      crossModuleInfrastructureEdges: 0,
      foreignForFeatureRegistrations: 1,
    });
  });

  it('rejects expired exceptions', () => {
    const result = auditPersistenceArchitecture(
      new Date('2028-01-01T00:00:00Z'),
    );

    expect(result.violations).toEqual(
      expect.arrayContaining([expect.stringMatching(/^Expired exception:/)]),
    );
  });
});
