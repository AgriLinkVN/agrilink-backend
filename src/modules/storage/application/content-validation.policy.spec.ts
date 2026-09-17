import { validatePrivateContent } from './content-validation.policy';

describe('validatePrivateContent', () => {
  it('detects image MIME, normalizes extension, and calculates checksum from bytes', async () => {
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WlG6A4AAAAASUVORK5CYII=', 'base64');
    await expect(validatePrivateContent(png)).resolves.toMatchObject({ detectedMime: 'image/png', extension: 'png', checksumSha256: expect.stringMatching(/^[a-f0-9]{64}$/) });
  });
  it('rejects spoofed or truncated content', async () => {
    await expect(validatePrivateContent(Buffer.from('not an image'))).rejects.toThrow('Unsupported or spoofed file content');
  });
});
