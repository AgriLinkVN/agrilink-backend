import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

type CorsOriginCallback = (error: Error | null, allow?: boolean) => void;

function assertExactHttpOrigin(origin: string): void {
  if (origin === '*') {
    throw new Error(
      'CORS_ORIGINS must not contain "*" when credentials are enabled',
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    throw new Error(`Invalid CORS origin: ${origin}`);
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`CORS origin must use http or https: ${origin}`);
  }

  if (parsed.origin !== origin) {
    throw new Error(
      `CORS origin must not contain a path, query, fragment, or trailing slash: ${origin}`,
    );
  }
}

export function parseCorsOrigins(value: string | undefined): string[] {
  const origins = (value ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  origins.forEach(assertExactHttpOrigin);
  return [...new Set(origins)];
}

export function isCorsOriginAllowed(
  requestOrigin: string | undefined,
  allowedOrigins: readonly string[],
): boolean {
  return requestOrigin === undefined || allowedOrigins.includes(requestOrigin);
}

export function buildCorsOptions(
  allowedOrigins: readonly string[],
): CorsOptions {
  return {
    origin: (
      requestOrigin: string | undefined,
      callback: CorsOriginCallback,
    ) => {
      callback(
        null,
        isCorsOriginAllowed(requestOrigin, allowedOrigins),
      );
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  };
}
