import { BadRequestException } from '@nestjs/common';
import { assertImageBuffer, detectImageType } from './image-type';

// Minimal valid headers (pehle bytes hi kafi hain detection ke liye)
const JPEG = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
]);
const PNG = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
]);
const GIF = Buffer.from('GIF89a..........');
const WEBP = Buffer.from([
  0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
]);
const BMP = Buffer.from([
  0x42, 0x4d, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
]);

describe('detectImageType (magic bytes)', () => {
  it('JPEG pehchanta hai — .jfif bhi (andar se JPEG hi hota hai)', () => {
    expect(detectImageType(JPEG)).toBe('image/jpeg');
  });

  it('PNG / GIF / WebP / BMP pehchanta hai', () => {
    expect(detectImageType(PNG)).toBe('image/png');
    expect(detectImageType(GIF)).toBe('image/gif');
    expect(detectImageType(WEBP)).toBe('image/webp');
    expect(detectImageType(BMP)).toBe('image/bmp');
  });

  it('non-image buffer ko reject karta hai', () => {
    expect(detectImageType(Buffer.from('ye koi image nahi'))).toBeNull();
    expect(detectImageType(Buffer.from([0x25, 0x50, 0x44, 0x46]))).toBeNull(); // %PDF
    expect(detectImageType(Buffer.alloc(0))).toBeNull();
    expect(detectImageType(Buffer.from([0xff, 0xd8]))).toBeNull(); // bohat chhota
  });
});

describe('assertImageBuffer', () => {
  it('valid image par kuch nahi kehta', () => {
    expect(() => assertImageBuffer(JPEG)).not.toThrow();
    expect(() => assertImageBuffer(PNG)).not.toThrow();
  });

  it('non-image par 400 deta hai', () => {
    expect(() => assertImageBuffer(Buffer.from('fake-image'))).toThrow(
      BadRequestException,
    );
    try {
      assertImageBuffer(Buffer.from('fake-image'));
    } catch (e) {
      expect((e as BadRequestException).message).toMatch(/image/i);
    }
  });
});
