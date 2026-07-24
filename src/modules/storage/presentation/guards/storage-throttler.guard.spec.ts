import { StorageThrottlerGuard } from './storage-throttler.guard';

describe('StorageThrottlerGuard', () => {
  it('uses the authenticated subject as the rate-limit tracker', async () => {
    const guard = Object.create(StorageThrottlerGuard.prototype) as StorageThrottlerGuard;

    await expect(guard['getTracker']({ user: { sub: 'user-1' }, ip: '127.0.0.1' })).resolves.toBe('user-1');
  });
});
