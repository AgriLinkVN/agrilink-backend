import { auditPersistenceArchitecture } from './persistence-architecture-audit';

describe('Persistence architecture Phase 0 baseline', () => {
  it('matches the reviewed ownership and exception registries', () => {
    const result = auditPersistenceArchitecture(
      new Date('2026-07-24T00:00:00Z'),
    );

    expect(result.violations).toEqual([]);
    expect(result.summary).toEqual({
        writableMappings: 54,
      viewMappings: 0,
      physicalTables: 48,
        duplicateTables: 6,
        centralMappings: 21,
      moduleMappings: 33,
        centralImportEdges: 3,
      crossModuleInfrastructureEdges: 3,
        foreignForFeatureRegistrations: 3,
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
