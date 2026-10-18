import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

export interface UploadedImage {
  url: string;
  publicId: string;
}

/**
 * Cloudinary image service.
 * CLOUDINARY_* env set hon to asli upload hota hai, warna har upload
 * saaf 400 error deta hai (khamoshi se fail nahi hota).
 */
@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private readonly configured: boolean;

  constructor(config: ConfigService) {
    const cloudName = config.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = config.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = config.get<string>('CLOUDINARY_API_SECRET');

    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
      });
      this.configured = true;
      this.logger.log('Cloudinary configured — image uploads live hain.');
    } else {
      this.configured = false;
      this.logger.warn(
        'CLOUDINARY_* set nahi — upload endpoints 400 denge. Cloudinary dashboard se credentials le kar .env me dalen.',
      );
    }
  }

  get isConfigured(): boolean {
    return this.configured;
  }

  private assertConfigured(): void {
    if (!this.configured) {
      throw new BadRequestException(
        'Image upload configure nahi hai — CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET .env me set karen.',
      );
    }
  }

  uploadImage(
    buffer: Buffer,
    opts: { folder: string },
  ): Promise<UploadedImage> {
    this.assertConfigured();
    return new Promise<UploadedImage>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: opts.folder, resource_type: 'image' },
        (error: unknown, result) => {
          if (error) {
            reject(
              error instanceof Error
                ? error
                : new Error('Cloudinary upload failed'),
            );
            return;
          }
          if (!result) {
            reject(new Error('Cloudinary upload failed'));
            return;
          }
          resolve({ url: result.secure_url, publicId: result.public_id });
        },
      );
      stream.end(buffer);
    });
  }

  async deleteImage(publicId: string): Promise<void> {
    this.assertConfigured();
    await cloudinary.uploader.destroy(publicId);
  }
}
