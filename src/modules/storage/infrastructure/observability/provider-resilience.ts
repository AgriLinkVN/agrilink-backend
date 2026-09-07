const PROVIDER_TIMEOUT_MS = 10_000;
const MAX_TRANSIENT_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [100, 300] as const;

export class ProviderTimeoutError extends Error {
  constructor() {
    super(`Storage provider request timed out after ${PROVIDER_TIMEOUT_MS}ms`);
    this.name = ProviderTimeoutError.name;
  }
}

export class ProviderOperationError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = ProviderOperationError.name;
  }
}

export async function runWithProviderResilience<T>(
  operation: () => Promise<T>,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_TRANSIENT_ATTEMPTS; attempt += 1) {
    try {
      return await withTimeout(operation());
    } catch (error) {
      lastError = error;
      if (
        !isTransientProviderError(error) ||
        attempt === MAX_TRANSIENT_ATTEMPTS
      )
        throw error;
      await delay(RETRY_DELAYS_MS[attempt - 1]);
    }
  }

  throw lastError;
}

export function runWithProviderTimeout<T>(
  operation: () => Promise<T>,
): Promise<T> {
  return withTimeout(operation());
}

export function isTransientProviderError(error: unknown): boolean {
  if (error instanceof ProviderTimeoutError) return true;
  if (!(error instanceof ProviderOperationError)) return false;
  if (
    error.status === 408 ||
    error.status === 429 ||
    (error.status !== undefined && error.status >= 500)
  )
    return true;
  return ["ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "EAI_AGAIN"].includes(
    error.code ?? "",
  );
}

function withTimeout<T>(operation: Promise<T>): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new ProviderTimeoutError()),
      PROVIDER_TIMEOUT_MS,
    );
  });
  return Promise.race([operation, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function delay(durationMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, durationMs));
}
