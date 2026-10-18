import { Global, Module } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';
import { UploadsController } from './uploads.controller';

/** Global — users module avatar ke liye CloudinaryService use karta hai. */
@Global()
@Module({
  controllers: [UploadsController],
  providers: [CloudinaryService],
  exports: [CloudinaryService],
})
export class UploadsModule {}
