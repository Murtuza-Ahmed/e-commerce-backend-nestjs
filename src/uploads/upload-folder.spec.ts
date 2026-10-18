import { resolveUploadFolder } from './upload-folder';

describe('resolveUploadFolder', () => {
  it('default al-ucaaz', () => {
    expect(resolveUploadFolder()).toBe('al-ucaaz');
    expect(resolveUploadFolder('')).toBe('al-ucaaz');
    expect(resolveUploadFolder('   ')).toBe('al-ucaaz');
  });

  it('custom folder ko al-ucaaz ke andar rakhta hai', () => {
    expect(resolveUploadFolder('products')).toBe('al-ucaaz/products');
    expect(resolveUploadFolder('banners/home')).toBe('al-ucaaz/banners/home');
  });

  it('pehle se sahi path ko nahi badalta', () => {
    expect(resolveUploadFolder('al-ucaaz')).toBe('al-ucaaz');
    expect(resolveUploadFolder('al-ucaaz/products')).toBe('al-ucaaz/products');
  });
});
