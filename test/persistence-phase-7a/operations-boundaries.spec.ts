import * as fs from 'fs';
import * as path from 'path';

interface EvidenceEntry {
  table: string;
  runtimeRegistration: boolean;
  canonicalBaselineV2: boolean;
  crossModuleInfrastructureImports: string[];
  decision: string;
}

const root = path.resolve(__dirname, '../..');

describe('Persistence Phase 7A operations boundaries', () => {
  const evidence = JSON.parse(
    fs.readFileSync(
      path.join(
        root,
        'docs/architecture/persistence/phases/phase-07a/evidence/operations-evidence.json',
      ),
      'utf8',
    ),
  ) as {
    inventory: EvidenceEntry[];
    protectedDatabase: { unchanged: boolean };
  };

  it('defers unimplemented Logistics and Messaging tables', () => {
    const dormantTables = [
      'logistics_profiles',
      'shipments',
      'shipment_tracking_events',
      'conversations',
      'messages',
    ];

    for (const table of dormantTables) {
      expect(
        evidence.inventory.find((entry) => entry.table === table),
      ).toMatchObject({
        runtimeRegistration: false,
        canonicalBaselineV2: false,
        decision: 'DORMANT_DEFER',
      });
    }
  });

  it('keeps Notifications as the only active Phase 7A persistence boundary', () => {
    expect(
      evidence.inventory.find(({ table }) => table === 'notifications'),
    ).toMatchObject({
      runtimeRegistration: true,
      canonicalBaselineV2: true,
      decision: 'ACTIVE_BOUNDARY_ONLY',
    });
  });

  it('has no scoped cross-module infrastructure imports', () => {
    expect(
      evidence.inventory.flatMap(
        ({ crossModuleInfrastructureImports }) =>
          crossModuleInfrastructureImports,
      ),
    ).toEqual([]);
  });

  it('exports only the typed notification publisher capability', () => {
    const moduleSource = fs.readFileSync(
      path.join(root, 'src/modules/notifications/notifications.module.ts'),
      'utf8',
    );

    expect(moduleSource).toMatch(/exports:\s*\[NOTIFICATION_PUBLISHER\]/);
    expect(moduleSource).not.toMatch(/exports:\s*\[[^\]]*TypeOrmModule/s);
    expect(moduleSource).not.toMatch(
      /exports:\s*\[[^\]]*NotificationOrmEntity/s,
    );
  });

  it('keeps the legacy gateway path as a decorator-free compatibility export', () => {
    const compatibilitySource = fs.readFileSync(
      path.join(root, 'src/modules/notifications/notifications.gateway.ts'),
      'utf8',
    );

    expect(compatibilitySource).toContain(
      "from './presentation/gateways/notifications.gateway'",
    );
    expect(compatibilitySource).not.toContain('@WebSocketGateway');
    expect(compatibilitySource).not.toContain("origin: '*'");
    expect(compatibilitySource).not.toContain('fallback_secret');
    expect(compatibilitySource).not.toContain('data: any');
  });

  it('records an unchanged read-only protected database snapshot', () => {
    expect(evidence.protectedDatabase.unchanged).toBe(true);
  });
});
