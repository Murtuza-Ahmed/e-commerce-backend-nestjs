import { memoryStorage } from 'multer';
import { BadRequestException } from '@nestjs/common';

/** Sirf images — baqi files seedha reject. */
export const imageFileFilter = (
  _req: unknown,
  file: Express.Multer.File,
  cb: (error: Error | null, acceptFile: boolean) => void,
): void => {
  if (!file.mimetype.startsWith('image/')) {
    cb(
      new BadRequestException(
        `Sirf image files allowed hain (mila: ${file.mimetype}).`,
      ),
      false,
    );
    return;
  }
  cb(null, true);
};

/**
 * Memory storage (buffer seedha Cloudinary jata hai, disk par nahi),
 * 5MB limit. FileInterceptor me spread karke use karo.
 */
export const imageUploadOptions = {
  storage: memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFileFilter,
};
