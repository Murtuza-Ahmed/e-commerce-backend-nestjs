import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../common/decorators';
import { CloudinaryService } from './cloudinary.service';
import { imageUploadOptions } from './multer.config';
import { assertImageBuffer } from './image-type';
import { resolveUploadFolder } from './upload-folder';
import { UploadDto } from './dto/upload.dto';

/**
 * Image uploads (Cloudinary). Product/category images aur general
 * uploads ke liye — staff only (uploads:create / uploads:delete).
 * User apna avatar /users/me/avatar se lagata hai (self-service).
 */
@ApiTags('uploads')
@ApiBearerAuth('JWT-auth')
@Controller('uploads')
export class UploadsController {
  constructor(private readonly cloudinary: CloudinaryService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('uploads:create')
  @UseInterceptors(FileInterceptor('file', imageUploadOptions))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        folder: { type: 'string', example: 'al-ucaaz/products' },
      },
      required: ['file'],
    },
  })
  async upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: UploadDto,
  ) {
    if (!file) {
      throw new BadRequestException(
        "'file' field me image bhejen (multipart/form-data).",
      );
    }
    // Asal image check — magic bytes se (extension/mimetype par bharosa nahi).
    assertImageBuffer(file.buffer);
    // Har upload al-ucaaz/ root folder ke andar — project ki koi cheez bahar nahi.
    return this.cloudinary.uploadImage(file.buffer, {
      folder: resolveUploadFolder(dto.folder),
    });
  }

  @Delete()
  @RequirePermissions('uploads:delete')
  async remove(@Query('publicId') publicId: string) {
    if (!publicId?.trim()) {
      throw new BadRequestException('publicId query param lazmi hai.');
    }
    await this.cloudinary.deleteImage(publicId.trim());
    return { message: 'Image delete ho gayi.' };
  }
}
