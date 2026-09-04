import {
  assertPublicImageType,
  buildOwnedStoragePath,
  InvalidStoragePathError,
  PrivateDocumentImageTypeError,
} from './storage-upload.policy';

describe('storage upload policy', () => {
  const ownerId = 'user-123';

  it('scopes normalized document paths to the authenticated owner', () => {
    expect(buildOwnedStoragePath(ownerId, 'certifications//vietgap.pdf')).toBe(
      'users/user-123/certifications/vietgap.pdf',
    );
  });

  it.each(['/documents/a.pdf', '../a.pdf', 'users/another-user/a.pdf', 'a\\b.pdf'])
    ('rejects unsafe or cross-owner paths: %s', (path) => {
      expect(() => buildOwnedStoragePath(ownerId, path)).toThrow(InvalidStoragePathError);
    });

  it.each(['cccd', 'business_license', 'document'])
    ('rejects private document image type: %s', (type) => {
      expect(() => assertPublicImageType(type)).toThrow(PrivateDocumentImageTypeError);
    });

  it('keeps public image types available', () => {
    expect(assertPublicImageType(' Product ')).toBe('product');
  });
});
