import {
  assertAllowedExternalSource,
  downloadExternalSource,
  PRIVATE_DOCUMENT_SOURCES,
  rolloutDataSource,
} from './storage-phase9-rollout';

describe('Storage Phase 9 rollout source policy', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('always disables schema synchronization and query logging', () => {
    expect(rolloutDataSource.options.synchronize).toBe(false);
    expect(rolloutDataSource.options.logging).toBe(false);
  });

  it('does not retain quality_certificates as a persistence target', () => {
    expect(PRIVATE_DOCUMENT_SOURCES.map((source) => source.table)).not.toContain('quality_certificates');
  });

  it('rejects external hosts outside the approved provider list', () => {
    expect(() =>
      assertAllowedExternalSource('https://example.com/private.pdf'),
    ).toThrow('host is not approved');
  });

  it('rejects a redirect before it can leave the approved provider list', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { location: 'http://127.0.0.1/internal' },
      }),
    );

    await expect(
      downloadExternalSource(
        'https://res.cloudinary.com/agrilink/private-document.pdf',
      ),
    ).rejects.toThrow('must use HTTPS');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('rejects a declared response larger than the private-document limit', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(new Uint8Array(), {
        status: 200,
        headers: { 'content-length': String(10 * 1024 * 1024 + 1) },
      }),
    );

    await expect(
      downloadExternalSource(
        'https://res.cloudinary.com/agrilink/private-document.pdf',
      ),
    ).rejects.toThrow('exceeds the private document size limit');
  });
});
