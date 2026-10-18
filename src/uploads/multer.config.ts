import { memoryStorage } from 'multer';

/**
 * Memory storage (buffer seedha Cloudinary jata hai, disk par nahi),
 * 5MB limit.
 *
 * NOTE: image type ka check yahan mimetype se NAHI hota — client ka bheja
 * type jhoota ya unknown ho sakta hai (`.jfif` ka masla). Asal check
 * `assertImageBuffer()` (image-type.ts) se hota hai, buffer milne ke baad.
 */
export const imageUploadOptions = {
  storage: memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
};
