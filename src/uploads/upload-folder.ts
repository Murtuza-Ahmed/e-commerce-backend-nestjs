/**
 * Upload folder resolve karta hai — project ki har cheez Cloudinary me
 * `al-ucaaz/` root folder ke ANDAR jayegi, bahar kuch nahi.
 *
 * - khaali/missing  -> 'al-ucaaz'
 * - 'products'      -> 'al-ucaaz/products'
 * - 'al-ucaaz/x'    -> 'al-ucaaz/x' (pehle se sahi)
 */
export function resolveUploadFolder(requested?: string): string {
  const raw = (requested ?? '').trim() || 'al-ucaaz';
  if (raw === 'al-ucaaz' || raw.startsWith('al-ucaaz/')) return raw;
  return `al-ucaaz/${raw}`;
}
