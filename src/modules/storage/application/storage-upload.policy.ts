const CONTROL_CHARACTER = /[\u0000-\u001F\u007F]/;
const PRIVATE_IMAGE_TYPES = new Set(['cccd', 'business_license', 'document']);

export class InvalidStoragePathError extends Error {}

export class PrivateDocumentImageTypeError extends Error {}

export function buildOwnedStoragePath(ownerId: string, relativePath: string): string {
  if (!ownerId || CONTROL_CHARACTER.test(ownerId) || ownerId.includes('/') || ownerId.includes('\\')) {
    throw new InvalidStoragePathError('Invalid authenticated user identifier');
  }

  const path = relativePath?.trim();
  if (!path || path.startsWith('/') || path.includes('\\') || CONTROL_CHARACTER.test(path)) {
    throw new InvalidStoragePathError('Storage path must be a relative path');
  }

  const segments = path.split('/').filter(Boolean);
  if (
    !segments.length ||
    segments.some((segment) => segment === '.' || segment === '..') ||
    segments[0].toLowerCase() === 'users'
  ) {
    throw new InvalidStoragePathError('Invalid storage path');
  }

  return `users/${ownerId}/${segments.join('/')}`;
}

export function assertPublicImageType(type?: string): string | undefined {
  const normalizedType = type?.trim().toLowerCase();
  if (normalizedType && PRIVATE_IMAGE_TYPES.has(normalizedType)) {
    throw new PrivateDocumentImageTypeError(
      'Private documents must be uploaded through the file upload endpoint',
    );
  }
  return normalizedType;
}
