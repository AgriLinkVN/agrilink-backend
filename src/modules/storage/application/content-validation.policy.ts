import { createHash } from 'crypto';
import { fromBuffer } from 'file-type';
import * as sharp from 'sharp';

const ALLOWED = new Map([['image/jpeg', 'jpg'], ['image/png', 'png'], ['application/pdf', 'pdf']]);
export class InvalidStoredContentError extends Error {}
export interface ValidatedContent { detectedMime: string; extension: string; checksumSha256: string; }

export async function validatePrivateContent(buffer: Buffer): Promise<ValidatedContent> {
  const detected = await fromBuffer(buffer);
  if (!detected || !ALLOWED.has(detected.mime)) throw new InvalidStoredContentError('Unsupported or spoofed file content');
  if (detected.mime.startsWith('image/')) {
    const metadata = await sharp(buffer, { limitInputPixels: 40_000_000, failOn: 'error' }).metadata();
    if (!metadata.width || !metadata.height) throw new InvalidStoredContentError('Invalid image dimensions');
  }
  return { detectedMime: detected.mime, extension: ALLOWED.get(detected.mime)!, checksumSha256: createHash('sha256').update(buffer).digest('hex') };
}
