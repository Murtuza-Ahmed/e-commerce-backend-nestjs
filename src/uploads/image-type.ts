import { BadRequestException } from '@nestjs/common';

/**
 * Image type file ke ANDAR ke magic bytes se pehchano — client ke bheje
 * mimetype ya file extension par bharosa nahi karte. (`.jfif` jaisi files
 * ka mimetype system par aksar unknown hota hai, lekin andar se wo JPEG
 * hi hoti hain — magic bytes se pakri jati hain.)
 *
 * Supported: JPEG (JFIF samet), PNG, GIF, WebP, BMP.
 */
export function detectImageType(buffer: Buffer): string | null {
  if (!buffer || buffer.length < 12) return null;

  // JPEG: FF D8 FF (JFIF/EXIF sab isi se shuru hote hain)
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }
  // GIF: "GIF8" (GIF87a / GIF89a)
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38
  ) {
    return 'image/gif';
  }
  // WebP: "RIFF" + 4 bytes size + "WEBP"
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'image/webp';
  }
  // BMP: "BM"
  if (buffer[0] === 0x42 && buffer[1] === 0x4d) {
    return 'image/bmp';
  }
  return null;
}

/** Buffer asal image nahi to saaf 400 — upload se pehle lazmi check. */
export function assertImageBuffer(buffer: Buffer): void {
  if (!detectImageType(buffer)) {
    throw new BadRequestException(
      'Sirf image files allowed hain (JPEG, PNG, GIF, WebP, BMP).',
    );
  }
}
