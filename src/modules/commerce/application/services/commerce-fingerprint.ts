import { createHash } from 'crypto';

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, canonicalize(child)]),
    );
  }
  return value;
}

export function createCommerceFingerprint(
  operationType: string,
  actorId: string,
  payload: unknown,
): string {
  return createHash('sha256')
    .update(JSON.stringify(canonicalize({ actorId, operationType, payload })))
    .digest('hex');
}
