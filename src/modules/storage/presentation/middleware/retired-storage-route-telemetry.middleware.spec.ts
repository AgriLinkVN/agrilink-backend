import {
  classifyRetiredStorageRoute,
  RetiredStorageRouteTelemetryMiddleware,
} from './retired-storage-route-telemetry.middleware';

describe('retired storage route telemetry', () => {
  it.each([
    ['POST', '/api/v1/storage/files/presign', 'presign'],
    ['POST', '/storage/files/upload?path=private.pdf', 'multipart_upload'],
    [
      'GET',
      '/api/v1/storage/files/download-url?path=private.pdf',
      'path_download',
    ],
  ])(
    'classifies %s %s without retaining query values',
    (method, url, route) => {
      expect(classifyRetiredStorageRoute(method, url)).toBe(route);
    },
  );

  it('does not classify the file-id download route', () => {
    expect(
      classifyRetiredStorageRoute(
        'GET',
        '/api/v1/storage/files/file-id/download-url',
      ),
    ).toBeNull();
  });

  it('logs only safe route metadata and continues to the 404 handler', () => {
    const middleware = new RetiredStorageRouteTelemetryMiddleware();
    const warn = jest
      .spyOn(
        (
          middleware as unknown as {
            logger: { warn: (message: string) => void };
          }
        ).logger,
        'warn',
      )
      .mockImplementation();
    const next = jest.fn();

    middleware.use(
      {
        method: 'GET',
        originalUrl:
          '/api/v1/storage/files/download-url?path=users/owner/private.pdf',
        header: () => 'request-1',
      } as never,
      {} as never,
      next,
    );

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('"route":"path_download"'),
    );
    expect(warn.mock.calls[0][0]).not.toContain('private.pdf');
    expect(next).toHaveBeenCalled();
  });
});
